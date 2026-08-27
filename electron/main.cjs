const { app, BrowserWindow } = require("electron");
const path = require("path");
const http = require("http");
const fs = require("fs");

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json",
  ".ico": "image/x-icon",
};

// Serve la build statica via http://localhost invece di file://: l'origine
// "null" di file:// complica l'header Access-Control-Allow-Origin dei proxy
// CORS usati dall'app (già verificato funzionante con Vite in dev, che serve
// allo stesso modo su http://localhost).
function serveStatic(rootDir) {
  const server = http.createServer((req, res) => {
    const reqPath = decodeURIComponent(req.url.split("?")[0]);
    let filePath = path.join(rootDir, reqPath === "/" ? "index.html" : reqPath);
    if (!filePath.startsWith(rootDir)) filePath = path.join(rootDir, "index.html");
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(rootDir, "index.html");
    }
    const type = MIME_TYPES[path.extname(filePath)] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    fs.createReadStream(filePath).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server.address().port)));
}

async function createWindow() {
  const port = await serveStatic(path.join(__dirname, "..", "dist"));
  // Finestra desktop orizzontale ("da browser"): l'app rileva Electron
  // dallo user agent (vedi IS_ELECTRON in App.jsx) e passa a un layout a
  // colonne pensato per questa larghezza invece della cornice-telefono
  // verticale usata nella demo browser/Android.
  const win = new BrowserWindow({
    width: 1180,
    height: 800,
    minWidth: 480,
    minHeight: 600,
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  win.loadURL(`http://127.0.0.1:${port}`);
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
