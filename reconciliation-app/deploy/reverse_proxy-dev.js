/**
 * Reverse proxy ReconciliApp DEV — HTTP (8082 par defaut) + HTTPS (8444)
 * Frontend statique dist-dev + proxy /api/* vers backend Spring Boot :8081
 */
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const BUILD = path.resolve(
  process.env.RECON_DEV_BUILD ||
    "C:/reconciliation-app/frontend/dist-dev/csv-reconciliation"
);
const SSL_DIR = process.env.RECON_SSL_DIR || "C:/Certs/reconciliation";
const BACKEND_HOST = process.env.RECON_DEV_BACKEND_HOST || "127.0.0.1";
const BACKEND_PORT = Number(process.env.RECON_DEV_BACKEND_PORT || 8081);
const HTTP_PORT = Number(process.env.RECON_DEV_HTTP_PORT || 8082);
const HTTPS_PORT = Number(process.env.RECON_DEV_HTTPS_PORT || 8444);
const DOMAIN =
  process.env.RECON_DEV_DOMAIN || "dev.reconciliation.intouchgroup.net";
const FORCE_HTTPS = process.env.RECON_DEV_FORCE_HTTPS !== "0";

const CERT_CANDIDATES = [
  process.env.RECON_DEV_SSL_CERT,
  path.join(SSL_DIR, "reconciliation.intouchgroup.net-chain.pem"),
  path.join(SSL_DIR, "full_bundle.pem"),
  path.join(SSL_DIR, "reconciliation.intouchgroup.net-chain-only.pem"),
].filter(Boolean);

const KEY_CANDIDATES = [
  process.env.RECON_DEV_SSL_KEY,
  path.join(SSL_DIR, "reconciliation.intouchgroup.net-key.pem"),
].filter(Boolean);

const LOG_DIR = path.join(__dirname, "logs");
const APP_LOG = path.join(LOG_DIR, "reverse-proxy-dev.log");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json",
};

function log(level, message) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  const line = `${ts} | ${level} | ${message}\n`;
  fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.appendFile(APP_LOG, line, () => {});
  console.log(`[${level}] ${message}`);
}

function firstExisting(paths) {
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function loadTlsOptions() {
  const certPath = firstExisting(CERT_CANDIDATES);
  const keyPath = firstExisting(KEY_CANDIDATES);
  if (!certPath || !keyPath) return null;
  return { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath), certPath, keyPath };
}

function proxyApi(req, res, proto) {
  const opts = {
    hostname: BACKEND_HOST,
    port: BACKEND_PORT,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: `${BACKEND_HOST}:${BACKEND_PORT}`,
      "x-forwarded-proto": proto,
      "x-forwarded-for": req.headers["x-forwarded-for"] || req.socket.remoteAddress,
      "x-environment": "DEV",
    },
  };

  const proxyReq = http.request(opts, (proxyRes) => {
    const headers = { ...proxyRes.headers, "x-environment": "DEV" };
    res.writeHead(proxyRes.statusCode, headers);
    proxyRes.pipe(res);
  });

  proxyReq.on("error", (err) => {
    log("ERROR", `Proxy API: ${err.message}`);
    res.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(`Backend DEV indisponible (port ${BACKEND_PORT})`);
  });

  req.pipe(proxyReq);
}

function safeDecodePath(raw) {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function serveStatic(req, res) {
  let urlPath = safeDecodePath(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";

  let filePath = path.join(BUILD, urlPath);
  if (!filePath.startsWith(BUILD)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(BUILD, "index.html");
  }

  const ext = path.extname(filePath).toLowerCase();
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end("Not found");
    }
    const headers = {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "X-Environment": "DEV",
    };
    if (ext === ".html") {
      headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
    }
    res.writeHead(200, headers);
    res.end(data);
  });
}

function handleApp(req, res, proto) {
  if (req.url.startsWith("/api/") || req.url === "/health" || req.url.startsWith("/actuator/")) {
    return proxyApi(req, res, proto);
  }
  serveStatic(req, res);
}

function redirectToHttps(req, res) {
  const host = (req.headers.host || DOMAIN).split(":")[0];
  const target = `https://${host}:${HTTPS_PORT}${req.url}`;
  res.writeHead(301, { Location: target });
  res.end();
}

if (!fs.existsSync(path.join(BUILD, "index.html"))) {
  log("ERROR", `Build frontend DEV manquant: ${BUILD}`);
  process.exit(1);
}

const tls = loadTlsOptions();
const httpServer = http.createServer((req, res) => {
  if (tls && FORCE_HTTPS) return redirectToHttps(req, res);
  handleApp(req, res, "http");
});

httpServer.listen(HTTP_PORT, "0.0.0.0", () => {
  const mode = tls && FORCE_HTTPS ? "redirect HTTPS" : "app directe";
  log("INFO", `HTTP DEV -> http://0.0.0.0:${HTTP_PORT} (${mode})`);
  if (!FORCE_HTTPS || !tls) {
    console.log(`  Lien local: http://localhost:${HTTP_PORT}`);
  }
});

if (tls) {
  https.createServer({ cert: tls.cert, key: tls.key }, (req, res) =>
    handleApp(req, res, "https")
  ).listen(HTTPS_PORT, "0.0.0.0", () => {
    log("INFO", `HTTPS DEV -> https://0.0.0.0:${HTTPS_PORT}`);
    log("INFO", `Domaine: ${DOMAIN}`);
    log("INFO", `Static: ${BUILD}`);
    log("INFO", `API: http://${BACKEND_HOST}:${BACKEND_PORT}`);
    console.log("");
    console.log("========================================");
    console.log(`  Lien testeurs (DNS requis): https://${DOMAIN}:${HTTPS_PORT}`);
    console.log(`  Lien alternatif (DNS OK):   https://reconciliation.intouchgroup.net:${HTTPS_PORT}`);
    console.log("========================================");
  });
} else {
  log("WARN", "HTTPS desactive — certificats introuvables dans C:/Certs/reconciliation");
  httpServer.removeAllListeners("request");
  http.createServer((req, res) => handleApp(req, res, "http")).listen(HTTP_PORT, "0.0.0.0", () => {
    log("INFO", `HTTP seul -> http://0.0.0.0:${HTTP_PORT}`);
  });
}
