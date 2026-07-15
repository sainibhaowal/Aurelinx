const fs = require("fs");
const path = require("path");

const appUrl = process.env.AURELIUS_APP_URL;

if (!appUrl) {
  throw new Error(
    "AURELIUS_APP_URL is required. Set it in GitHub Actions or your local shell before building.",
  );
}

const distDir = path.join(__dirname, "..", "dist");
const configPath = path.join(distDir, "app-config.js");

fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(
  configPath,
  `window.__AURELIUS_APP_URL__ = ${JSON.stringify(appUrl)};\n`,
);
console.log(`Prepared Aurelius desktop config for ${appUrl}`);