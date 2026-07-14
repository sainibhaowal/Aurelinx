const fs = require("fs");
const path = require("path");

const appUrl = process.env.AURELIUS_APP_URL;

if (!appUrl) {
  throw new Error(
    "AURELIUS_APP_URL is required. Set it in GitHub Actions or your local shell before building.",
  );
}

const configPath = path.join(__dirname, "..", "dist", "app-config.js");
const contents = fs
  .readFileSync(configPath, "utf8")
  .replace("__AURELIUS_APP_URL__", appUrl);

fs.writeFileSync(configPath, contents);
console.log(`Prepared Aurelius desktop config for ${appUrl}`);