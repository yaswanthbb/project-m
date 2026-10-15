import { registerSW } from "virtual:pwa-register";
let registration: ServiceWorkerRegistration | undefined;
let registrationError = false;
export const pwaEvents = new EventTarget();
export let updateReady = false;
registerSW({
  immediate: true,
  onNeedRefresh() {
    updateReady = true;
    pwaEvents.dispatchEvent(new Event("change"));
  },
  onRegisteredSW(_url, value) {
    registration = value;
    pwaEvents.dispatchEvent(new Event("change"));
  },
  onRegisterError() {
    registrationError = true;
    pwaEvents.dispatchEvent(new Event("change"));
  },
});
export async function getRegistration() {
  if (!("serviceWorker" in navigator))
    throw new Error("This browser does not support offline installation.");
  if (registrationError)
    throw new Error(
      "Offline setup couldn’t start. Check your connection and reload.",
    );
  return (
    registration ||
    (await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                "Offline setup is still starting. Please try again shortly.",
              ),
            ),
          15000,
        ),
      ),
    ]))
  );
}
export async function checkUpdate() {
  const sw = await getRegistration();
  if (!navigator.onLine)
    throw new Error("Connect to the internet to check for updates.");
  await sw.update();
  const installing = sw.installing;
  if (installing && installing.state !== "installed")
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(
          new Error(
            "The update is taking longer than expected. Try again shortly.",
          ),
        );
      }, 60000);
      const cleanup = () => {
        clearTimeout(timeout);
        installing.removeEventListener("statechange", changed);
      };
      const changed = () => {
        if (installing.state === "installed") {
          cleanup();
          resolve();
        }
        if (installing.state === "redundant") {
          cleanup();
          reject(
            new Error("The update couldn’t be installed. Please try again."),
          );
        }
      };
      installing.addEventListener("statechange", changed);
    });
  if (sw.waiting) {
    // Listen before SKIP_WAITING: a worker installed immediately after first
    // launch can activate before Workbox's delayed waiting event is delivered.
    const waiting = sw.waiting;
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        navigator.serviceWorker.removeEventListener(
          "controllerchange",
          changed,
        );
        reject(
          new Error(
            "The update is ready but couldn’t activate. Close other app tabs and try again.",
          ),
        );
      }, 20000);
      const changed = () => {
        clearTimeout(timeout);
        window.location.reload();
        resolve();
      };
      navigator.serviceWorker.addEventListener("controllerchange", changed, {
        once: true,
      });
      waiting.postMessage({ type: "SKIP_WAITING" });
    });
    return true;
  }
  return false;
}
