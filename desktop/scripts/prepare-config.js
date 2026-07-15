const fs = require("fs");
const path = require("path");

const appUrl = process.env.AURELIUS_APP_URL;

if (!appUrl) {
  throw new Error(
    "AURELIUS_APP_URL is required. Set it in GitHub Actions or your local shell before building.",
  );
}

// Update tauri.conf.json with the real app URL
const configPath = path.join(__dirname, "..", "src-tauri", "tauri.conf.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

config.build.devUrl = appUrl;
config.app.windows[0].url = appUrl;

fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");

// Create dist dir (required by Tauri build)
const distDir = path.join(__dirname, "..", "dist");
fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(path.join(distDir, ".keep"), "");

console.log(`Prepared Aurelius desktop config for ${appUrl}`);