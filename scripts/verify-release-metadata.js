// Copyright 2026 Ravinder Singh
// Licensed under the Apache License, Version 2.0

/** Fails fast when any user-visible or runtime release version drifts. */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const rootVersion = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version;
const checks = [
  ["client/package.json", (text) => JSON.parse(text).version],
  ["desktop/package.json", (text) => JSON.parse(text).version],
  ["desktop/src-tauri/tauri.conf.json", (text) => JSON.parse(text).version],
  ["client/src/config/version.js", (text) => text.match(/APP_VERSION = ["']([^"']+)["']/)?.[1]],
  ["server/pyproject.toml", (text) => text.match(/(?:^|\n)version\s*=\s*["']([^"']+)["']/)?.[1]],
  ["server/app/core/config.py", (text) => text.match(/VERSION:\s*str\s*=\s*["']([^"']+)["']/)?.[1]],
];

const failures = [];
for (const [file, read] of checks) {
  const value = read(fs.readFileSync(path.join(root, file), "utf8"));
  if (value !== rootVersion) failures.push(`${file}: expected ${rootVersion}, found ${value || "missing"}`);
}

if (failures.length) {
  console.error("Release metadata is inconsistent:\n" + failures.join("\n"));
  process.exit(1);
}

console.log(`Release metadata is consistent: v${rootVersion}`);
