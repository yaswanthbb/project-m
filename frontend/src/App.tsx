import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BellRing,
  BookOpen,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  Clock3,
  CloudOff,
  Code2,
  ExternalLink,
  Gift,
  Globe2,
  Heart,
  KeyRound,
  Leaf,
  Lightbulb,
  LoaderCircle,
  Search,
  Settings2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sprout,
  Tag,
  Trash2,
  Wallet,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  API,
  TOKEN_KEY,
  dateLabel,
  expired,
  groupItems,
  localDate,
  request,
  safeUrl,
  storage,
} from "./lib/data";
import type { Item, Topic } from "./lib/data";
import {
  navigate,
  useFeeds,
  useInstall,
  useOnline,
  usePullRefresh,
  usePush,
  useRoute,
} from "./lib/hooks";
import type { DeleteTarget } from "./lib/hooks";
import { checkUpdate, pwaEvents, updateReady } from "./lib/pwa";
import { firebaseConfigured } from "./lib/firebase-config";

const categories = [
  "All finds",
  "AI",
  "Dev tools",
  "SaaS",
  "Software",
  "Cloud",
  "Data",
  "Security",
  "Design",
  "Learning",
];
const topicInfo: Record<
  Topic,
  {
    label: string;
    eyebrow: string;
    title: ReactNode;
    subtitle: string;
    icon: LucideIcon;
  }
> = {
  deals: {
    label: "Deals",
    eyebrow: "A LITTLE DISCOVERY. A LOT OF VALUE.",
    title: (
      <>
        Good tools.
        <br />
        Even better deals<span>.</span>
      </>
    ),
    subtitle: "Free software, AI perks, and dev tools worth making room for.",
    icon: Gift,
  },
  picks: {
    label: "Machine’s Picks",
    eyebrow: "YOUR NEXT “GLAD I FOUND THIS.”",
    title: (
      <>
        A fresh thought.
        <br />A new rabbit hole<span>.</span>
      </>
    ),
    subtitle:
      "Quick reads, useful ideas, and things that deserve a little attention.",
    icon: Sparkles,
  },
  airdrops: {
    label: "Crypto Airdrops",
    eyebrow: "EXPLORE WITH YOUR EYES OPEN.",
    title: (
      <>
        New projects.
        <br />
        Informed moves<span>.</span>
      </>
    ),
    subtitle:
      "Explore airdrops, check the details, and always do your own research.",
    icon: Wallet,
  },
  tips: {
    label: "Financial Tips",
    eyebrow: "A LITTLE KNOW-HOW GOES A LONG WAY.",
    title: (
      <>
        Small lessons.
        <br />
        Better money habits<span>.</span>
      </>
    ),
    subtitle: "Bite-sized financial education for your everyday curiosity.",
    icon: Lightbulb,
  },
};
const categoryStyle: Record<string, { className: string; icon: LucideIcon }> = {
  AI: { className: "lavender", icon: Sparkles },
  "Dev tools": { className: "blue", icon: Code2 },
  SaaS: { className: "peach", icon: Zap },
  Software: { className: "mint", icon: Globe2 },
  Cloud: { className: "blue", icon: CloudOff },
  Data: { className: "lavender", icon: Code2 },
  Security: { className: "mint", icon: ShieldCheck },
  Design: { className: "peach", icon: Leaf },
  Learning: { className: "yellow", icon: BookOpen },
};
function Brand({ small = false }: { small?: boolean }) {
  return (
    <a
      className={`brand ${small ? "small" : ""}`}
      href="#/deals"
      aria-label="Daily Drop home"
    >
      <span className="brand-symbol">
        <Sparkles size={23} strokeWidth={2.3} />
      </span>
      <span>
        daily<span className="brand-drop">drop</span>
        <span className="brand-period">.</span>
      </span>
    </a>
  );
}
function FindArt({ topic }: { topic: Topic }) {
  return (
    <div className={`find-art art-${topic}`} aria-hidden="true">
      <div className="art-orbit orbit-one" />
      <div className="art-orbit orbit-two" />
      <span className="art-spark spark-one">✦</span>
      <span className="art-spark spark-two">✧</span>
      <span className="art-dot dot-one" />
      <span className="art-dot dot-two" />
      <div className="art-back-card">
        <Code2 size={28} />
        <div />
        <div />
      </div>
      <div className="art-front-card">
        <span className="art-card-top">
          <span />
          <span />
          <span />
        </span>
        <div className="art-gift">
          <Gift size={55} strokeWidth={1.5} />
        </div>
        <strong>
          {topic === "deals"
            ? "a little win."
            : topic === "picks"
              ? "stay curious."
              : topic === "airdrops"
                ? "look closer."
                : "keep growing."}
        </strong>
        <span className="art-line" />
      </div>
      <div className="art-ticket">
        {topic === "deals" ? (
          <>
            <span>THE BEST PRICE?</span>
            <strong>
              FREE<span>!</span>
            </strong>
          </>
        ) : (
          <>
            <span>YOUR DAILY DOSE</span>
            <strong>
              GOOD<span>!</span>
            </strong>
          </>
        )}
      </div>
      <div className="art-cursor">
        <ArrowUpRight size={31} strokeWidth={2} />
      </div>
    </div>
  );
}
function BadgeIcon({
  item,
  topic,
  large = false,
}: {
  item?: Item;
  topic: Topic;
  large?: boolean;
}) {
  const style = categoryStyle[item?.tag || ""] || {
    className:
      topic === "picks" ? "lavender" : topic === "tips" ? "yellow" : "mint",
    icon: topicInfo[topic].icon,
  };
  const Icon = style.icon;
  return (
    <span className={`item-icon ${style.className} ${large ? "large" : ""}`}>
      <Icon size={large ? 34 : 25} strokeWidth={1.8} />
    </span>
  );
}
function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div className={`notice ${error ? "notice-error" : ""}`} role="status">
      {error ? <CircleHelp size={19} /> : <ShieldCheck size={19} />}
      <span>{children}</span>
    </div>
  );
}
function Safety({ topic }: { topic: Topic }) {
  if (topic === "airdrops")
    return (
      <div className="safety-note">
        <ShieldCheck size={20} />
        <p>
          <strong>A quick safety check</strong>
          <span>
            Never share seed phrases or private keys. Only use official links.
          </span>
        </p>
      </div>
    );
  if (topic === "tips")
    return (
      <p className="education-line">
        <BookOpen size={15} />
        Educational only, not financial advice.
      </p>
    );
  return null;
}
function FeedCard({
  item,
  topic,
  onDelete,
}: {
  item: Item;
  topic: Topic;
  onDelete(): void;
}) {
  const isOffer = topic === "deals" || topic === "airdrops";
  return (
    <article className={`feed-card ${isOffer ? "offer-card" : "note-card"}`}>
      <div className="card-top">
        <BadgeIcon item={item} topic={topic} />
        <span
          className={`category-label ${categoryStyle[item.tag || ""]?.className || (topic === "picks" ? "lavender" : "mint")}`}
        >
          {item.tag ||
            (topic === "picks"
              ? "THE DAILY READ"
              : topic === "tips"
                ? "MONEY KNOW-HOW"
                : "AIRDROP")}
        </span>
        <button
          className="icon-button delete-button"
          onClick={onDelete}
          aria-label={`Delete ${item.title}`}
        >
          <Trash2 size={17} />
        </button>
      </div>
      <a className="card-content" href={`#/${topic}/${item.id}`}>
        <h3>{item.title}</h3>
        <p className="card-description">
          {item.description ||
            item.body ||
            "Open this find for the full story."}
        </p>
        {topic === "airdrops" && (
          <p className="reward-line">
            <Gift size={15} />
            <span>
              {item.reward ||
                item.offer_details ||
                "Reward details on the project page"}
            </span>
          </p>
        )}
        <div className="card-source">
          {isOffer ? (
            <>
              <span className="source-dot" />
              {item.source || "Official source"}
            </>
          ) : (
            <>
              <Clock3 size={14} />
              {Math.max(
                1,
                Math.ceil((item.body?.split(/\s+/).length || 0) / 200),
              )}{" "}
              min read<span className="source-separator">·</span>
              {dateLabel(item.date)}
            </>
          )}
        </div>
        <div className="card-footer">
          <span className={expired(item) ? "expiry expired" : "expiry"}>
            {isOffer ? (
              <>
                <Clock3 size={14} />
                {expired(item)
                  ? "Expired"
                  : item.expires
                    ? `Until ${dateLabel(item.expires)}`
                    : "No deadline listed"}
              </>
            ) : (
              <span className="read-note">A little food for thought</span>
            )}
          </span>
          <span className="card-link">
            {topic === "deals"
              ? "View deal"
              : topic === "airdrops"
                ? "Explore"
                : "Read more"}
            <ArrowUpRight size={17} />
          </span>
        </div>
      </a>
    </article>
  );
}
function Sidebar({
  topic,
  count,
  install,
}: {
  topic: Topic;
  count: number;
  install: ReturnType<typeof useInstall>;
}) {
  return (
    <aside className="sidebar">
      <div className="side-note">
        <span className="mini-eyebrow">A SMALL CORNER OF THE INTERNET</span>
        <h3>
          Less noise.
          <br />
          More good stuff.
        </h3>
        <p>
          A few useful things to make your day a little better. That’s the whole
          idea.
        </p>
        <div className="handwritten">
          Happy discovering <Heart size={15} />
        </div>
      </div>
      <div className="side-menu">
        <span className="mini-eyebrow">TAKE A LOOK AROUND</span>
        {(["deals", "picks", "tips"] as Topic[])
          .filter((value) => value !== topic)
          .slice(0, 2)
          .map((value) => {
            const Icon = topicInfo[value].icon;
            return (
              <a key={value} href={`#/${value}`}>
                <span
                  className={`side-link-icon ${value === "picks" ? "lavender" : value === "tips" ? "yellow" : "mint"}`}
                >
                  <Icon size={19} />
                </span>
                <span>
                  <strong>{topicInfo[value].label}</strong>
                  <small>
                    {value === "deals"
                      ? "Useful tools. On the house."
                      : value === "picks"
                        ? "Something worth your time."
                        : "Grow your money know-how."}
                  </small>
                </span>
                <ChevronRight size={17} />
              </a>
            );
          })}
      </div>
      <div className="install-card">
        <div className="install-icon">
          <Smartphone size={28} />
          <span>
            <Check size={11} strokeWidth={3} />
          </span>
        </div>
        <h3>
          A home for your
          <br />
          daily finds.
        </h3>
        <p>
          Keep Daily Drop one tap away. Your saved feeds travel offline, too.
        </p>
        <button className="text-button" onClick={() => navigate("/settings")}>
          {install.installed ? "App settings" : "Add to your Home Screen"}
          <ArrowRight size={17} />
        </button>
      </div>
      <p className="side-footer">
        <Leaf size={14} />
        {count
          ? `${count} ${topicInfo[topic].label.toLowerCase()} to explore`
          : "Good things are worth a little wait."}
      </p>
    </aside>
  );
}
function Detail({
  item,
  topic,
  onDelete,
}: {
  item: Item;
  topic: Topic;
  onDelete(): void;
}) {
  const isOffer = topic === "deals" || topic === "airdrops";
  const url = safeUrl(item.url);
  return (
    <div className="detail-wrap">
      <a className="back-link" href={`#/${topic}`}>
        <ArrowLeft size={18} />
        Back to {topicInfo[topic].label}
      </a>
      <article className="detail-card">
        <div className="detail-top">
          <BadgeIcon item={item} topic={topic} large />
          <button
            className="icon-button delete-button"
            aria-label={`Delete ${item.title}`}
            onClick={onDelete}
          >
            <Trash2 size={20} />
          </button>
        </div>
        <span className="eyebrow green-text">
          {item.tag || topicInfo[topic].label}
        </span>
        <h1>{item.title}</h1>
        <div className="detail-meta">
          {item.source && (
            <span>
              <Globe2 size={16} />
              {item.source}
            </span>
          )}
          <span>
            <Clock3 size={16} />
            {isOffer ? dateLabel(item.expires) : dateLabel(item.date)}
          </span>
          {expired(item) && <span className="expired">Expired</span>}
        </div>
        {isOffer ? (
          <>
            <p className="detail-intro">{item.description}</p>
            {topic === "airdrops" && (
              <section className="detail-section">
                <h2>Who’s eligible?</h2>
                <p>
                  {item.eligibility ||
                    "Eligibility hasn’t been provided in this feed. Check the official project page for requirements, regional restrictions, and any costs before taking part."}
                </p>
              </section>
            )}
            <section className="detail-section">
              <h2>
                <Gift size={21} />
                What you get
              </h2>
              <p>
                {item.offer_details ||
                  item.reward ||
                  "The publisher hasn’t added further reward details. Read the official page to confirm exactly what’s included."}
              </p>
            </section>
            <section className="detail-section">
              <h2>How to claim</h2>
              {item.claim_steps?.length ? (
                <ol className="claim-steps">
                  {item.claim_steps.map((step, index) => (
                    <li key={index}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <p>{step}</p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p>
                  Claim instructions haven’t been added yet. Follow the
                  instructions on the official page.
                </p>
              )}
            </section>
            <div className="deadline-box">
              <Clock3 size={21} />
              <div>
                <strong>
                  {expired(item)
                    ? "This offer has expired"
                    : "Keep an eye on the date"}
                </strong>
                <span>
                  {item.expires
                    ? `${topic === "airdrops" ? "Deadline" : "Expires"}: ${dateLabel(item.expires)}`
                    : "No expiry was provided. Availability can change."}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="article-body">
            {item.body?.split(/\n\s*\n/).map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        )}
        <Safety topic={topic} />
        <div className="detail-actions">
          {url ? (
            <a
              className="primary-button"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {isOffer
                ? expired(item)
                  ? "Visit official page"
                  : "Claim on official site"
                : "Visit original source"}
              <ExternalLink size={18} />
            </a>
          ) : (
            <Notice error>
              The publisher’s link is invalid. This item can’t be opened safely.
            </Notice>
          )}
          {isOffer && (
            <p>
              You’ll continue on{" "}
              {url ? new URL(url).hostname : "the official website"}.<br />
              Check the terms before you claim.
            </p>
          )}
        </div>
      </article>
    </div>
  );
}
function DeleteDialog({
  target,
  onClose,
  onDeleted,
  online,
}: {
  target: DeleteTarget;
  onClose(): void;
  onDeleted(): void;
  online: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const hasToken = Boolean(storage.get(TOKEN_KEY));
  useEffect(() => {
    const element = dialog.current!;
    if (!element.open) element.showModal();
    return () => element.close();
  }, []);
  const submit = async () => {
    if (!online || !hasToken || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `${API}/api/${target.topic}/${target.item.id}`,
        {
          method: "DELETE",
          headers: { "X-Publish-Token": storage.get(TOKEN_KEY) || "" },
          signal: AbortSignal.timeout(30000),
        },
      );
      if (response.status !== 404 && !response.ok) {
        if (response.status === 401)
          throw new Error("Your token wasn’t accepted. Update it in Settings.");
        throw new Error(
          `Couldn’t remove this item (${response.status}). Try again.`,
        );
      }
      onDeleted();
    } catch (error) {
      setError(
        error instanceof Error &&
          error.name !== "TypeError" &&
          error.name !== "TimeoutError"
          ? error.message
          : "We couldn’t confirm deletion. Refresh the feed to check before trying again.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <dialog
      ref={dialog}
      className="confirm-dialog"
      aria-labelledby="delete-title"
      aria-describedby="delete-description"
      onCancel={(event) => {
        if (busy) event.preventDefault();
        else onClose();
      }}
      onClick={(event) => {
        if (event.target === dialog.current && !busy) onClose();
      }}
    >
      <div className="dialog-content">
        <span className="dialog-icon">
          <Trash2 size={26} />
        </span>
        <h2 id="delete-title">Remove this find?</h2>
        <p id="delete-description">
          “{target.item.title}” will be deleted from the feed for everyone. This
          can’t be undone.
        </p>
        {!hasToken && (
          <Notice>Add your publish token in Settings to delete items.</Notice>
        )}
        {!online && <Notice error>Reconnect to delete this item.</Notice>}
        {error && <Notice error>{error}</Notice>}
        <div className="dialog-actions">
          <button
            autoFocus
            className="secondary-button"
            disabled={busy}
            onClick={onClose}
          >
            Keep it
          </button>
          {hasToken ? (
            <button
              className="danger-button"
              disabled={busy || !online}
              onClick={() => void submit()}
            >
              {busy ? (
                <LoaderCircle className="spin" size={18} />
              ) : (
                <Trash2 size={17} />
              )}
              {busy ? "Removing…" : "Yes, remove"}
            </button>
          ) : (
            <button
              className="primary-button"
              onClick={() => {
                onClose();
                navigate("/settings");
              }}
            >
              Open Settings
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}
function SettingsPage({
  push,
  install,
  savedCount,
}: {
  push: ReturnType<typeof usePush>;
  install: ReturnType<typeof useInstall>;
  savedCount: number;
}) {
  const [token, setToken] = useState("");
  const [hasToken, setHasToken] = useState(Boolean(storage.get(TOKEN_KEY)));
  const [message, setMessage] = useState("");
  const [updating, setUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("");
  const [installMessage, setInstallMessage] = useState("");
  const [ready, setReady] = useState(updateReady);
  useEffect(() => {
    const change = () => setReady(updateReady);
    pwaEvents.addEventListener("change", change);
    return () => pwaEvents.removeEventListener("change", change);
  }, []);
  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!token.trim()) return;
    if (storage.set(TOKEN_KEY, token.trim())) {
      setToken("");
      setHasToken(true);
      setMessage(
        "Token saved on this device. You’re ready to manage your feeds.",
      );
    } else
      setMessage(
        "Your browser couldn’t save the token. Allow local storage and try again.",
      );
  };
  const update = async () => {
    setUpdating(true);
    setUpdateMessage("Checking for a fresh version…");
    try {
      const changed = await checkUpdate();
      setUpdateMessage(
        changed
          ? "Updating Daily Drop…"
          : "You’re on the latest version. All good!",
      );
    } catch (error) {
      setUpdateMessage(
        error instanceof Error
          ? error.message
          : "Couldn’t check for updates. Please try again.",
      );
    } finally {
      setUpdating(false);
    }
  };
  return (
    <div className="settings-wrap">
      <a className="back-link" href="#/deals">
        <ArrowLeft size={18} />
        Back to your finds
      </a>
      <span className="eyebrow green-text">MAKE YOURSELF AT HOME</span>
      <h1>Your little preferences.</h1>
      <p className="page-intro">
        A few settings to make Daily Drop work for you.
      </p>
      <section className="settings-card">
        <div className="settings-card-heading">
          <span className="settings-icon mint">
            <Bell size={23} />
          </span>
          <div>
            <h2>A heads-up for good things</h2>
            <p>
              New deals, picks, airdrops, and tips. Straight to this device.
            </p>
          </div>
          <span className={`status-pill ${push.subscribed ? "active" : ""}`}>
            {push.subscribed ? "Connected" : "Off"}
          </span>
        </div>
        {!firebaseConfigured && (
          <Notice>
            Firebase isn’t configured yet. The feeds are ready to use; alerts
            will be available after your Firebase environment variables are
            added.
          </Notice>
        )}
        <button
          className="primary-button"
          disabled={push.busy}
          onClick={() => void push.enable()}
        >
          {push.busy ? (
            <LoaderCircle size={18} className="spin" />
          ) : (
            <BellRing size={18} />
          )}
          {push.busy
            ? "Connecting…"
            : push.subscribed
              ? "Reconnect notifications"
              : "Enable notifications"}
        </button>
        {push.status && (
          <p className="setting-feedback" role="status">
            {push.status}
          </p>
        )}
      </section>
      <section className="settings-card">
        <div className="settings-card-heading">
          <span className="settings-icon lavender">
            <KeyRound size={23} />
          </span>
          <div>
            <h2>Your publish token</h2>
            <p>Needed only to delete items. Stored locally on this device.</p>
          </div>
          {hasToken && (
            <span className="status-pill active">
              <Check size={13} />
              Saved
            </span>
          )}
        </div>
        <form onSubmit={save}>
          <label htmlFor="publish-token">
            {hasToken ? "Replace saved token" : "Publish token"}
          </label>
          <div className="token-form">
            <input
              id="publish-token"
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder={
                hasToken
                  ? "Enter a new token to replace it"
                  : "Enter your publish token"
              }
              autoComplete="new-password"
              spellCheck={false}
              autoCapitalize="off"
            />
            <button
              className="primary-button"
              disabled={!token.trim()}
              type="submit"
            >
              Save token
              <Check size={17} />
            </button>
          </div>
        </form>
        <p className="field-help">
          <ShieldCheck size={14} />
          Your saved token is never shown. Sent only with delete requests.
        </p>
        {hasToken && (
          <button
            className="text-button muted-button"
            onClick={() => {
              if (storage.remove(TOKEN_KEY)) {
                setHasToken(false);
                setToken("");
                setMessage(
                  "The saved token has been removed from this device.",
                );
              } else
                setMessage(
                  "Couldn’t remove the token. Please check browser storage permissions.",
                );
            }}
          >
            Remove saved token
          </button>
        )}
        {message && (
          <p className="setting-feedback" role="status">
            {message}
          </p>
        )}
      </section>
      <section className="settings-card">
        <div className="settings-card-heading">
          <span className="settings-icon peach">
            <Smartphone size={23} />
          </span>
          <div>
            <h2>A spot on your Home Screen</h2>
            <p>One tap to open. No app store needed.</p>
          </div>
        </div>
        {install.installed ? (
          <Notice>Daily Drop is installed. Nice to see you here.</Notice>
        ) : (
          <>
            <button
              className="secondary-button"
              onClick={async () => {
                if (install.available) {
                  try {
                    const accepted = await install.install();
                    setInstallMessage(
                      accepted
                        ? "Daily Drop is being added to your Home Screen."
                        : "No rush. You can install it any time.",
                    );
                  } catch {
                    setInstallMessage(
                      "Installation couldn’t start. Use your browser’s menu to add this app.",
                    );
                  }
                } else
                  setInstallMessage(
                    "On iPhone or iPad: open in Safari, tap Share, then Add to Home Screen. On Android or desktop: open the browser menu and choose Install app or Add to Home Screen. Installation needs HTTPS and a supported browser.",
                  );
              }}
            >
              <ArrowDownToLine size={18} />
              Add to Home Screen
            </button>
            {installMessage && (
              <p className="setting-feedback" role="status">
                {installMessage}
              </p>
            )}
          </>
        )}
      </section>
      <section className="settings-card">
        <div className="settings-card-heading">
          <span className="settings-icon blue">
            <ArrowDownToLine size={23} />
          </span>
          <div>
            <h2>Fresh app. Fresh finds.</h2>
            <p>
              {ready
                ? "A new version is ready for you."
                : "Check for the latest version of Daily Drop."}
            </p>
          </div>
        </div>
        <button
          className="secondary-button"
          disabled={updating}
          onClick={() => void update()}
        >
          {updating ? (
            <LoaderCircle className="spin" size={18} />
          ) : (
            <ArrowDownToLine size={18} />
          )}
          {updating ? "Checking…" : ready ? "Update & reload" : "Update app"}
        </button>
        {updateMessage && (
          <p className="setting-feedback" role="status">
            {updateMessage}
          </p>
        )}
        <div className="offline-info">
          <CloudOff size={17} />
          <span>
            {savedCount} {savedCount === 1 ? "find" : "finds"} in your saved
            feeds. The last successful feed loads are kept for offline reading
            when browser storage is available.
          </span>
        </div>
      </section>
      <p className="settings-footnote">
        Made for a little discovery, every day.<span>Daily Drop · v1.0.0</span>
      </p>
    </div>
  );
}
export default function App() {
  const route = useRoute();
  const { feeds, refresh, remove } = useFeeds();
  const online = useOnline();
  const install = useInstall();
  const [category, setCategory] = useState("All finds");
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [toast, setToast] = useState<{ message: string; hash?: string } | null>(
    null,
  );
  const topic = route.section === "settings" ? "deals" : route.section;
  const feed = feeds[topic];
  const push = usePush((newTopic, title, hash) => {
    void refresh(newTopic);
    if (title) setToast({ message: title, hash });
  });
  const pull = usePullRefresh(
    () => void refresh(topic),
    route.section !== "settings" && !route.id && !feed.loading && !deleteTarget,
  );
  const [today, setToday] = useState(localDate());
  useEffect(() => {
    const timer = setInterval(() => setToday(localDate()), 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    setCategory("All finds");
    setSearch("");
  }, [topic]);
  useEffect(() => {
    if (!toast || toast.hash) return;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  const visible = feed.items.filter(
    (item) =>
      (topic !== "deals" ||
        category === "All finds" ||
        item.tag === category) &&
      `${item.title} ${item.description || item.body || ""} ${item.source || ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const groups = groupItems(visible, today);
  const selected = route.id
    ? feed.items.find((item) => item.id === route.id)
    : undefined;
  const isMoney = topic === "airdrops" || topic === "tips";
  const deleteItem = (item: Item) => setDeleteTarget({ topic, item });
  const total = Object.values(feeds).reduce(
    (sum, value) => sum + value.items.length,
    0,
  );
  return (
    <>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <span className="header-tagline">Good things, daily.</span>
          <div className="header-right">
            <span className="header-date">
              <span className="live-dot" />
              {new Date().toLocaleDateString(undefined, {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </span>
            <button
              className="icon-button header-bell"
              aria-label="Notification settings"
              onClick={() => navigate("/settings")}
            >
              <Bell size={21} />
              {push.showPrompt && <span />}
            </button>
            <button
              className={`icon-button ${route.section === "settings" ? "selected" : ""}`}
              aria-label="Settings"
              onClick={() => navigate("/settings")}
            >
              <Settings2 size={21} />
            </button>
          </div>
        </div>
      </header>
      {!online && (
        <div className="offline-banner">
          <WifiOff size={16} />
          You’re offline. Browse your last saved finds.
        </div>
      )}
      {pull > 0 && (
        <div className="pull-indicator" style={{ height: pull }}>
          <ArrowDown size={19} className={pull >= 65 ? "rotated" : ""} />
          {pull >= 65 ? "Release to refresh" : "Pull to refresh"}
        </div>
      )}
      <main id="main-content" tabIndex={-1} className="main-shell">
        {route.section === "settings" ? (
          <SettingsPage push={push} install={install} savedCount={total} />
        ) : route.id ? (
          selected ? (
            <Detail
              item={selected}
              topic={topic}
              onDelete={() => deleteItem(selected)}
            />
          ) : (
            <div className="missing-item">
              <a className="back-link" href={`#/${topic}`}>
                <ArrowLeft size={18} />
                Back to {topicInfo[topic].label}
              </a>
              {feed.loading ? (
                <div className="empty-state">
                  <LoaderCircle size={30} className="spin" />
                  <h2>Finding that one for you…</h2>
                </div>
              ) : (
                <div className="empty-state">
                  <Search size={32} />
                  <h1>
                    {feed.error
                      ? "This find is out of reach."
                      : "This find has moved on."}
                  </h1>
                  <p>
                    {feed.error ||
                      "It may have been removed from the feed. There are more good things to discover."}
                  </p>
                  <button
                    className="primary-button"
                    onClick={() => void refresh(topic)}
                  >
                    Try again
                    <ArrowRight size={17} />
                  </button>
                </div>
              )}
            </div>
          )
        ) : (
          <>
            <div className="page-topline">
              <div>
                <span className="eyebrow">YOUR DAILY SHORTLIST</span>
                <h1>
                  {isMoney
                    ? "Money, a little wiser."
                    : topic === "picks"
                      ? "Machine’s Picks"
                      : "The good stuff."}
                  <span className="title-dot">{isMoney ? "" : "✦"}</span>
                </h1>
              </div>
              <button
                className="refresh-button"
                onClick={() => void refresh(topic)}
                disabled={feed.loading}
                aria-label="Refresh feed"
              >
                <span className={feed.loading ? "refresh-spinner" : ""}>↻</span>
                <span>{feed.loading ? "Refreshing" : "Refresh feed"}</span>
              </button>
            </div>
            {isMoney && (
              <div
                className="money-tabs"
                role="tablist"
                aria-label="Money feeds"
                onKeyDown={(event) => {
                  if (
                    !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                      event.key,
                    )
                  )
                    return;
                  event.preventDefault();
                  const next =
                    event.key === "Home"
                      ? "airdrops"
                      : event.key === "End"
                        ? "tips"
                        : topic === "airdrops"
                          ? "tips"
                          : "airdrops";
                  navigate(`/${next}`);
                  document.getElementById(`tab-${next}`)?.focus();
                }}
              >
                <button
                  id="tab-airdrops"
                  role="tab"
                  aria-selected={topic === "airdrops"}
                  tabIndex={topic === "airdrops" ? 0 : -1}
                  aria-controls="money-feed"
                  onClick={() => navigate("/airdrops")}
                >
                  <Wallet size={18} />
                  Crypto Airdrops
                </button>
                <button
                  id="tab-tips"
                  role="tab"
                  aria-selected={topic === "tips"}
                  tabIndex={topic === "tips" ? 0 : -1}
                  aria-controls="money-feed"
                  onClick={() => navigate("/tips")}
                >
                  <Lightbulb size={18} />
                  Financial Tips
                </button>
              </div>
            )}
            <section className={`hero hero-${topic}`}>
              <div className="hero-copy">
                <span className="eyebrow">
                  <span className="tiny-star">✦</span>
                  {topicInfo[topic].eyebrow}
                </span>
                <h2>{topicInfo[topic].title}</h2>
                <p>{topicInfo[topic].subtitle}</p>
                <a
                  className="hero-action"
                  href="#feed"
                  onClick={(event) => {
                    event.preventDefault();
                    document.getElementById("feed")?.scrollIntoView({
                      behavior: window.matchMedia(
                        "(prefers-reduced-motion: reduce)",
                      ).matches
                        ? "instant"
                        : "smooth",
                      block: "start",
                    });
                  }}
                >
                  {topic === "deals"
                    ? "Find your next favourite"
                    : topic === "picks"
                      ? "Find a little inspiration"
                      : "Take a closer look"}
                  <ArrowDown size={16} />
                </a>
              </div>
              <FindArt topic={topic} />
            </section>
            {push.showPrompt && (
              <div className="notification-prompt">
                <span className="prompt-icon">
                  <BellRing size={21} />
                </span>
                <div>
                  <strong>Good finds move fast.</strong>
                  <span>Get a little nudge when something new drops.</span>
                </div>
                <button
                  className="small-primary"
                  disabled={push.busy}
                  onClick={() => void push.enable()}
                >
                  {push.busy ? "Connecting…" : "Keep me posted"}
                  <ArrowRight size={15} />
                </button>
                <button
                  className="icon-button prompt-dismiss"
                  onClick={push.dismiss}
                  aria-label="Maybe later"
                >
                  <X size={18} />
                </button>
              </div>
            )}
            {push.showPrompt && push.status && <Notice>{push.status}</Notice>}
            <div className="content-layout">
              <div
                className="feed-column"
                id={isMoney ? "money-feed" : undefined}
                role={isMoney ? "tabpanel" : undefined}
                aria-labelledby={isMoney ? `tab-${topic}` : undefined}
              >
                <section id="feed" className="feed-section">
                  <div className="feed-heading">
                    <div>
                      <span className="eyebrow green-text">
                        {topic === "deals"
                          ? "NICE FINDS. NICER PRICE TAGS."
                          : topic === "picks"
                            ? "A FEW THINGS WORTH YOUR TIME."
                            : topic === "airdrops"
                              ? "LOOK INTO THE DETAILS."
                              : "LEARN A LITTLE. EVERY DAY."}
                      </span>
                      <h2>
                        {topic === "deals"
                          ? "Fresh off the feed"
                          : topic === "picks"
                            ? "A moment of curiosity"
                            : topic === "airdrops"
                              ? "On the radar"
                              : "Good sense, in small doses"}
                        <span className="count-badge">{feed.items.length}</span>
                      </h2>
                    </div>
                    <span className="feed-subnote">
                      <CheckCheck size={15} />
                      {feed.cached
                        ? "Saved on this device"
                        : feed.updated
                          ? "You’re up to date"
                          : "Your daily discoveries"}
                    </span>
                  </div>
                  <div className="feed-controls">
                    <label className="search-box">
                      <Search size={18} />
                      <input
                        aria-label={`Search ${topicInfo[topic].label}`}
                        placeholder={
                          topic === "deals"
                            ? "Find a tool, a perk, a little win…"
                            : "Find something interesting…"
                        }
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                      />
                      {search && (
                        <button
                          className="search-clear"
                          onClick={() => setSearch("")}
                          aria-label="Clear search"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </label>
                  </div>
                  {topic === "deals" && (
                    <div
                      className="category-chips"
                      aria-label="Filter deals by category"
                    >
                      {categories.map((value) => (
                        <button
                          key={value}
                          className={value === category ? "active" : ""}
                          aria-pressed={value === category}
                          onClick={() => setCategory(value)}
                        >
                          {value === "All finds" && <Tag size={14} />}
                          {value}
                        </button>
                      ))}
                    </div>
                  )}
                  <Safety topic={topic} />
                  {feed.error && (
                    <div className="feed-error" role="status">
                      <WifiOff size={19} />
                      <span>
                        {feed.error}
                        {feed.updated > 0 && (
                          <small>
                            Last saved {new Date(feed.updated).toLocaleString()}
                            .
                          </small>
                        )}
                      </span>
                      <button
                        className="text-button"
                        disabled={feed.loading}
                        onClick={() => void refresh(topic)}
                      >
                        Retry
                      </button>
                    </div>
                  )}
                  {feed.loading && !feed.updated ? (
                    <div
                      className="feed-grid"
                      aria-label="Loading feed"
                      aria-busy="true"
                    >
                      {[0, 1, 2, 3].map((value) => (
                        <div className="skeleton-card" key={value}>
                          <div className="skeleton-icon" />
                          <div className="skeleton-line" />
                          <div className="skeleton-line short" />
                          <div className="skeleton-line" />
                          <div className="skeleton-line short" />
                        </div>
                      ))}
                    </div>
                  ) : visible.length ? (
                    Object.entries(groups).map(
                      ([label, items]) =>
                        items.length > 0 && (
                          <div className="feed-group" key={label}>
                            <div className="group-heading">
                              <h3>{label}</h3>
                              <span>
                                {label === "Today"
                                  ? "THE LATEST LITTLE WINS"
                                  : "STILL WORTH A LOOK"}
                              </span>
                              <div />
                            </div>
                            <div className="feed-grid">
                              {items.map((item) => (
                                <FeedCard
                                  key={item.id}
                                  item={item}
                                  topic={topic}
                                  onDelete={() => deleteItem(item)}
                                />
                              ))}
                            </div>
                          </div>
                        ),
                    )
                  ) : (
                    <div className="empty-state">
                      <span className="empty-illustration">
                        {search || category !== "All finds" ? (
                          <Search size={32} strokeWidth={1.5} />
                        ) : (
                          <Sprout size={38} strokeWidth={1.5} />
                        )}
                      </span>
                      <span className="eyebrow green-text">
                        {search || category !== "All finds"
                          ? "LET’S TRY ANOTHER WAY"
                          : "A LITTLE ROOM FOR GOOD THINGS"}
                      </span>
                      <h3>
                        {search || category !== "All finds"
                          ? "No finds match just yet."
                          : feed.error
                            ? "A small pause in the feed."
                            : "Your next good find is on its way."}
                      </h3>
                      <p>
                        {search || category !== "All finds"
                          ? "Try another search or take a look at all the finds."
                          : feed.error
                            ? "Try refreshing in a moment. Your saved finds will appear here when available."
                            : `No ${topicInfo[topic].label.toLowerCase()} have landed yet. Check back soon, or explore another corner of Daily Drop.`}
                      </p>
                      {search || category !== "All finds" ? (
                        <button
                          className="secondary-button"
                          onClick={() => {
                            setSearch("");
                            setCategory("All finds");
                          }}
                        >
                          Show all finds
                          <ArrowRight size={16} />
                        </button>
                      ) : (
                        <a
                          className="secondary-button"
                          href={`#/${topic === "picks" ? "deals" : "picks"}`}
                        >
                          {topic === "picks"
                            ? "Explore deals"
                            : "Explore Machine’s Picks"}
                          <ArrowRight size={16} />
                        </a>
                      )}
                    </div>
                  )}
                  <div className="feed-end">
                    <span />
                    <Leaf size={15} />
                    <p>A little less scrolling. A little more discovering.</p>
                    <span />
                  </div>
                </section>
              </div>
              <Sidebar
                topic={topic}
                count={feed.items.length}
                install={install}
              />
            </div>
          </>
        )}
      </main>
      <nav className="bottom-nav" aria-label="Main navigation">
        <a
          href="#/deals"
          className={
            route.section !== "settings" && topic === "deals" ? "active" : ""
          }
          aria-current={
            route.section !== "settings" && topic === "deals"
              ? "page"
              : undefined
          }
        >
          <Gift size={22} />
          <span>Deals</span>
        </a>
        <a
          href="#/picks"
          className={
            route.section !== "settings" && topic === "picks" ? "active" : ""
          }
          aria-current={
            route.section !== "settings" && topic === "picks"
              ? "page"
              : undefined
          }
        >
          <Sparkles size={22} />
          <span>Machine’s Picks</span>
        </a>
        <a
          href={`#/${isMoney ? topic : "airdrops"}`}
          className={route.section !== "settings" && isMoney ? "active" : ""}
          aria-current={
            route.section !== "settings" && isMoney ? "page" : undefined
          }
        >
          <Wallet size={22} />
          <span>Money</span>
        </a>
      </nav>
      {toast && (
        <div className="toast" role="status">
          <span className="toast-icon">
            <Check size={19} />
          </span>
          {toast.hash ? (
            <button
              onClick={() => {
                window.location.hash = toast.hash!;
                setToast(null);
              }}
            >
              {toast.message}
              <ArrowRight size={17} />
            </button>
          ) : (
            <span>{toast.message}</span>
          )}
          <button
            className="icon-button"
            aria-label="Dismiss message"
            onClick={() => setToast(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {deleteTarget && (
        <DeleteDialog
          target={deleteTarget}
          online={online}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            remove(deleteTarget.topic, deleteTarget.item.id);
            if (route.id === deleteTarget.item.id)
              navigate(`/${deleteTarget.topic}`);
            setDeleteTarget(null);
            setToast({ message: "Removed from the feed." });
          }}
        />
      )}
    </>
  );
}
