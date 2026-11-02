import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");
const mime = { ".html": "text/html; charset=utf-8" };

http.createServer(async (req, res) => {
  if (req.method !== "GET") {
    res.writeHead(405, { Allow: "GET" }).end("Method not allowed");
    return;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch {
    res.writeHead(400).end("Bad request");
    return;
  }
  const name = path.basename(pathname);
  if (!name.endsWith(".html") || name !== pathname.replace(/^\/+/, "")) {
    res.writeHead(404).end("Not found");
    return;
  }
  try {
    const body = await readFile(path.join(root, name));
    res.writeHead(200, { "Content-Type": mime[path.extname(name)], "Content-Length": body.length });
    res.end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
}).listen(4000, "127.0.0.1", () => console.log("Fixture pages available at http://localhost:4000 (port 4000)"));
