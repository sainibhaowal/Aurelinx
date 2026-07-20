const fs = require("fs");
const path = require("path");

const appUrl = process.env.AURELINX_APP_URL;

if (!appUrl) {
  throw new Error(
    "AURELINX_APP_URL is required. Set it in GitHub Actions or your local shell before building.",
  );
}

// Update tauri.conf.json
const configPath = path.join(__dirname, "..", "src-tauri", "tauri.conf.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

config.build.frontendDist = "../dist";
config.build.devUrl = "http://localhost:3100";
config.app.windows[0].label = "main";
config.app.windows[0].url = "index.html";
config.app.windows[0].userAgent = "Aurelinx-Desktop-App";
config.app.withGlobalTauri = true;
config.app.security = {
  csp: null
};

fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");

// Update/create src-tauri/capabilities/default.json
const capabilitiesDir = path.join(__dirname, "..", "src-tauri", "capabilities");
if (!fs.existsSync(capabilitiesDir)) {
  fs.mkdirSync(capabilitiesDir, { recursive: true });
}

// Clean appUrl to get just the protocol + host (no trailing paths)
let originUrl = appUrl.trim();
try {
  const parsed = new URL(originUrl);
  originUrl = `${parsed.protocol}//${parsed.host}`;
} catch (e) {
  // Fallback if parsing fails
}

const capabilityConfig = {
  "$schema": "../schemas/capability-schema.json",
  "identifier": "default",
  "description": "Default permissions for Aurelinx desktop application",
  "windows": [
    "main"
  ],
  "permissions": [
    "core:default",
    "core:window:allow-minimize",
    "core:window:allow-maximize",
    "core:window:allow-unmaximize",
    "core:window:allow-close",
    "core:window:allow-is-maximized",
    "core:window:allow-hide",
    "core:window:allow-show",
    "core:window:allow-set-size",
    "core:window:allow-set-position",
    "core:window:allow-current-monitor",
    "core:window:allow-start-dragging",
    "core:window:allow-toggle-maximize"
  ],
  "webviews": [
    "main"
  ],
  "remote": {
    "urls": [
      originUrl + "/*",
      "http://localhost:3100/*"
    ]
  }
};

fs.writeFileSync(
  path.join(capabilitiesDir, "default.json"),
  JSON.stringify(capabilityConfig, null, 2) + "\n"
);
console.log(`Generated Tauri capabilities for remote origin: ${originUrl}`);

// Create dist directory
const distDir = path.join(__dirname, "..", "dist");
fs.mkdirSync(distDir, { recursive: true });

// Create the gateway HTML page with custom local Titlebar and iframe content wrapper
const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aurelinx</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap');
    
    :root {
      --bg-color: #0b0f19;
      --accent-color: #3b82f6;
      --accent-glow: rgba(59, 130, 246, 0.15);
      --text-main: #f3f4f6;
      --text-muted: #9ca3af;
      --card-bg: rgba(17, 24, 39, 0.7);
      --card-border: rgba(255, 255, 255, 0.08);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg-color);
      color: var(--text-main);
      font-family: 'Outfit', sans-serif;
      height: 100vh;
      overflow: hidden;
      margin: 0;
      padding: 0;
    }

    .titlebar {
      height: 38px;
      width: 100%;
      background: #080B10;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 99999;
      user-select: none;
    }

    .drag-region {
      position: absolute;
      inset: 0;
      right: 120px;
      cursor: grab;
      z-index: 1;
    }
    .drag-region:active {
      cursor: grabbing;
    }

    .brand {
      position: relative;
      z-index: 10;
      padding-left: 16px;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.25em;
      background: linear-gradient(135deg, #60a5fa 0%, #a855f7 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      pointer-events: none;
    }

    .controls {
      position: relative;
      z-index: 20;
      display: flex;
      align-items: center;
      gap: 8px;
      padding-right: 12px;
    }

    .control-btn {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.03);
      color: #9ca3af;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease-in-out;
      outline: none;
      padding: 0;
    }

    .control-btn:hover {
      transform: scale(1.05);
    }

    .control-btn.minimize:hover {
      border-color: rgba(34, 211, 238, 0.4);
      background: rgba(34, 211, 238, 0.1);
      color: #22d3ee;
      box-shadow: 0 0 8px rgba(34, 211, 238, 0.2);
    }

    .control-btn.maximize:hover {
      border-color: rgba(16, 185, 129, 0.4);
      background: rgba(16, 185, 129, 0.1);
      color: #10b981;
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.2);
    }

    .control-btn.close:hover {
      border-color: rgba(244, 63, 94, 0.4);
      background: rgba(244, 63, 94, 0.1);
      color: #f43f5e;
      box-shadow: 0 0 8px rgba(244, 63, 94, 0.2);
    }

    .content-area {
      position: absolute;
      top: 38px;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: var(--bg-color);
      background-image: 
        radial-gradient(circle at 10% 20%, rgba(59, 130, 246, 0.08) 0%, transparent 40%),
        radial-gradient(circle at 90% 80%, rgba(147, 51, 234, 0.08) 0%, transparent 40%);
      display: flex;
      justify-content: center;
      align-items: center;
      overflow: hidden;
    }

    #app-frame {
      width: 100%;
      height: 100%;
      border: none;
      display: none;
      background: var(--bg-color);
      opacity: 0;
      transition: opacity 0.5s ease;
    }

    .container {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      backdrop-filter: blur(16px);
      padding: 3rem;
      border-radius: 24px;
      width: 100%;
      max-width: 480px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
      transform: translateY(0);
      transition: all 0.3s ease;
      opacity: 1;
      position: relative;
      z-index: 10;
    }

    .logo-container {
      margin-bottom: 2rem;
      position: relative;
      display: inline-block;
    }

    .logo-glow {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 80px;
      height: 80px;
      background: var(--accent-color);
      filter: blur(40px);
      opacity: 0.5;
      border-radius: 50%;
      z-index: 0;
      animation: pulseGlow 3s infinite ease-in-out;
    }

    .logo {
      font-size: 2.5rem;
      font-weight: 800;
      background: linear-gradient(135deg, #60a5fa 0%, #a855f7 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      position: relative;
      z-index: 1;
      letter-spacing: -0.05em;
    }

    .status-text {
      font-size: 1.1rem;
      color: var(--text-main);
      margin-bottom: 0.5rem;
      font-weight: 600;
    }

    .status-subtext {
      font-size: 0.875rem;
      color: var(--text-muted);
      margin-bottom: 2rem;
    }

    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid rgba(255, 255, 255, 0.1);
      border-left-color: var(--accent-color);
      border-radius: 50%;
      margin: 0 auto 2rem;
      animation: spin 1s linear infinite;
    }

    .fallback-container {
      display: none;
      animation: fadeIn 0.5s ease forwards;
    }

    .fallback-title {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 1rem;
      color: #ef4444;
    }

    .btn-group {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }

    .btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--card-border);
      color: var(--text-main);
      padding: 0.75rem 1rem;
      border-radius: 12px;
      cursor: pointer;
      font-family: inherit;
      font-weight: 600;
      font-size: 0.9rem;
      transition: all 0.2s ease;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .btn:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.2);
      transform: translateY(-1px);
    }

    .btn-primary {
      background: var(--accent-color);
      border-color: var(--accent-color);
    }

    .btn-primary:hover {
      background: #2563eb;
      border-color: #2563eb;
      box-shadow: 0 0 15px rgba(59, 130, 246, 0.4);
    }

    .custom-url-input {
      display: flex;
      gap: 0.5rem;
    }

    .input {
      flex: 1;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid var(--card-border);
      color: var(--text-main);
      padding: 0.75rem 1rem;
      border-radius: 12px;
      font-family: inherit;
      font-size: 0.9rem;
      outline: none;
      transition: border-color 0.2s ease;
    }

    .input:focus {
      border-color: var(--accent-color);
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes pulseGlow {
      0%, 100% { opacity: 0.4; transform: translate(-50%, -50%) scale(1); }
      50% { opacity: 0.7; transform: translate(-50%, -50%) scale(1.1); }
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  </style>
</head>
<body>
  <div class="titlebar">
    <div class="drag-region" data-tauri-drag-region></div>
    <div class="brand">Aurelinx</div>
    <div class="controls">
      <button class="control-btn minimize" onclick="handleMinimize()" title="Minimize">
        <svg viewBox="0 0 24 24" width="10" height="10"><rect y="11" width="24" height="2" fill="currentColor"/></svg>
      </button>
      <button class="control-btn maximize" onclick="handleMaximize()" title="Maximize">
        <svg viewBox="0 0 24 24" width="8" height="8"><rect x="2" y="2" width="20" height="20" fill="none" stroke="currentColor" stroke-width="3"/></svg>
      </button>
      <button class="control-btn close" onclick="handleClose()" title="Close">
        <svg viewBox="0 0 24 24" width="10" height="10"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/></svg>
      </button>
    </div>
  </div>

  <div class="content-area">
    <div class="container" id="gateway-card">
      <div class="logo-container">
        <div class="logo-glow"></div>
        <div class="logo">Aurelinx</div>
      </div>
      
      <div id="loader">
        <div class="spinner"></div>
        <div class="status-text" id="statusText">Connecting to server...</div>
        <div class="status-subtext" id="statusSubtext">Checking connection...</div>
      </div>

      <div class="fallback-container" id="fallback">
        <div class="fallback-title">Could not reach the server</div>
        <div class="status-subtext" style="margin-bottom: 2rem;">Please check your internet connection or try again.</div>
        <div class="btn-group">
          <button class="btn btn-primary" onclick="retryPrimary()" style="justify-content: center; width: 100%;">
            <span>Retry Connection</span>
          </button>
        </div>

        <div class="custom-url-input" style="margin-top: 1.5rem;">
          <input type="text" id="customUrl" class="input" placeholder="Enter custom URL (e.g. https://example.com)">
          <button class="btn btn-primary" onclick="connectCustom()">Connect</button>
        </div>
      </div>
    </div>
    
    <iframe id="app-frame" src="about:blank"></iframe>
  </div>

  <script>
    const PRIMARY_URL = "${appUrl}";
    const frame = document.getElementById('app-frame');
    const gatewayCard = document.getElementById('gateway-card');

    function getWindow() {
      if (window.__TAURI__ && window.__TAURI__.window) {
        return window.__TAURI__.window.getCurrentWindow();
      }
      return null;
    }

    async function handleMinimize() {
      const win = getWindow();
      if (win) {
        await win.minimize();
      }
    }

    async function handleMaximize() {
      const win = getWindow();
      if (win) {
        await win.toggleMaximize();
      }
    }

    async function handleClose() {
      const win = getWindow();
      if (win) {
        await win.close();
      }
    }
    
    function updateText(text, subtext) {
      document.getElementById('statusText').innerText = text;
      document.getElementById('statusSubtext').innerText = subtext;
    }

    frame.onload = () => {
      if (frame.src !== "about:blank" && frame.src !== "") {
        gatewayCard.style.opacity = '0';
        setTimeout(() => {
          gatewayCard.style.display = 'none';
          frame.style.display = 'block';
          setTimeout(() => {
            frame.style.opacity = '1';
          }, 50);
        }, 300);
      }
    };

    function checkServerActive(url, timeoutMs = 3000) {
      return new Promise((resolve) => {
        const img = new Image();
        const timer = setTimeout(() => {
          img.src = "";
          resolve(false);
        }, timeoutMs);
        
        img.onload = () => {
          clearTimeout(timer);
          resolve(true);
        };
        
        img.onerror = () => {
          clearTimeout(timer);
          resolve(false);
        };
        
        let checkUrl = url || "";
        if (checkUrl.endsWith("/")) {
          checkUrl = checkUrl.slice(0, -1);
        }
        img.src = checkUrl + "/favicon.ico?_cb=" + Date.now();
      });
    }

    async function loadIframe(url) {
      document.getElementById('fallback').style.display = 'none';
      document.getElementById('loader').style.display = 'block';
      gatewayCard.style.display = 'block';
      gatewayCard.style.opacity = '1';
      frame.style.display = 'none';
      frame.style.opacity = '0';
      frame.src = "about:blank";
      
      updateText("Connecting...", "Contacting server at " + url);
      
      const isUp = await checkServerActive(url);
      if (isUp) {
        let targetUrl = url;
        if (targetUrl.includes("?")) {
          targetUrl += "&tauri=true";
        } else {
          targetUrl += "?tauri=true";
        }
        frame.src = targetUrl;
      } else {
        document.getElementById('loader').style.display = 'none';
        document.getElementById('fallback').style.display = 'block';
      }
    }

    async function retryPrimary() {
      await loadIframe(PRIMARY_URL);
    }

    function connectCustom() {
      const val = document.getElementById('customUrl').value.trim();
      if (val) {
        let url = val;
        const lowerUrl = url.toLowerCase();
        if (!lowerUrl.startsWith("http://") && !lowerUrl.startsWith("https://")) {
          url = "https://" + url;
        }
        loadIframe(url);
      }
    }

    async function initConnection() {
      await loadIframe(PRIMARY_URL);
    }

    window.onload = initConnection;
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(distDir, "index.html"), htmlContent);
console.log(`Prepared Aurelinx desktop config. Primary URL set to ${appUrl}`);