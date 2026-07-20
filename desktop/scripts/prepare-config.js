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
config.app.windows[0].url = "index.html";

fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");

// Create dist directory
const distDir = path.join(__dirname, "..", "dist");
fs.mkdirSync(distDir, { recursive: true });

// Create the gateway HTML page with image-based favicon health checks
const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aurelinx Gateway</title>
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
      display: flex;
      justify-content: center;
      align-items: center;
      overflow: hidden;
      background-image: 
        radial-gradient(circle at 10% 20%, rgba(59, 130, 246, 0.08) 0%, transparent 40%),
        radial-gradient(circle at 90% 80%, rgba(147, 51, 234, 0.08) 0%, transparent 40%);
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

    .badge {
      font-size: 0.75rem;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
    }

    .badge.online {
      background: rgba(34, 197, 94, 0.2);
      color: #4ade80;
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
  <div class="container">
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

  <script>
    const PRIMARY_URL = "${appUrl}";
    
    function updateText(text, subtext) {
      document.getElementById('statusText').innerText = text;
      document.getElementById('statusSubtext').innerText = subtext;
    }

    function redirectTo(url) {
      updateText("Connecting...", "Redirecting to " + url);
      window.location.replace(url);
    }

    // Elegant Image-based check to bypass CORS and accurately detect real images vs Cloudflare HTML error pages
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
        
        img.src = url.replace(/\/+$/, "") + "/favicon.ico?_cb=" + Date.now();
      });
    }

    async function retryPrimary() {
      document.getElementById('fallback').style.display = 'none';
      document.getElementById('loader').style.display = 'block';
      initConnection();
    }

    function connectCustom() {
      const val = document.getElementById('customUrl').value.trim();
      if (val) {
        let url = val;
        if (!/^https?:\/\//i.test(url)) {
          url = "https://" + url;
        }
        redirectTo(url);
      }
    }

    async function initConnection() {
      updateText("Connecting to server...", "Checking " + PRIMARY_URL);
      
      const primaryOnline = await checkServerActive(PRIMARY_URL, 3000);
      if (primaryOnline) {
        redirectTo(PRIMARY_URL);
      } else {
        document.getElementById('loader').style.display = 'none';
        document.getElementById('fallback').style.display = 'block';
      }
    }

    window.onload = initConnection;
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(distDir, "index.html"), htmlContent);
console.log(`Prepared Aurelinx desktop config. Primary URL set to ${appUrl}`);