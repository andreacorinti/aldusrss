const { contextBridge } = require("electron");

// Flag esplicito per riconoscere la build desktop vera, non uno sniffing
// dello user agent (rilevava "Electron/x.y.z" anche fuori dalla nostra app:
// qualunque webview ospitato da un programma basato su Electron, come il
// browser integrato di VS Code, restituisce lo stesso user agent — risultato,
// aprire "npm run dev" dentro VS Code mostrava il layout desktop a colonne
// invece della cornice-telefono usata per il test della UI mobile). Questo
// preload gira solo nelle finestre create da electron/main.cjs.
contextBridge.exposeInMainWorld("__ALDUSRSS_DESKTOP__", true);
