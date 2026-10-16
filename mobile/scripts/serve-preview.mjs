import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
const directory = resolve("dist");
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".ttf": "font/ttf",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};
createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname,
    );
    const file = resolve(
      directory,
      `.${pathname === "/" ? "/index.html" : pathname}`,
    );
    if (!file.startsWith(`${directory}/`)) {
      response.writeHead(403).end();
      return;
    }
    let bytes,
      type = types[extname(file)] || "application/octet-stream";
    try {
      bytes = await readFile(file);
    } catch {
      if (extname(file)) {
        response.writeHead(404).end();
        return;
      }
      bytes = await readFile(resolve(directory, "index.html"));
      type = "text/html";
    }
    response.writeHead(200, {
      "Content-Type": type,
      "Cache-Control": "no-store",
    });
    response.end(bytes);
  } catch {
    response.writeHead(500).end();
  }
}).listen(8081, "0.0.0.0", () =>
  console.log("Native screen browser preview: http://localhost:8081"),
);
