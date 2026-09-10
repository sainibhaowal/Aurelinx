// Copyright 2026 Ravinder Singh
// Licensed under the Apache License, Version 2.0

/**
 * Align release metadata with the most recent semantic tag reachable from HEAD.
 *
 * This is intentionally used only by the release workflow before standard-version
 * calculates the next release.  It prevents a stale branch package.json from
 * generating a tag that has already been published.
 */
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const files = [
  { file: "package.json", kind: "json" },
  { file: "client/package.json", kind: "json" },
  { file: "desktop/package.json", kind: "json" },
  { file: "desktop/src-tauri/tauri.conf.json", kind: "json" },
  {
    file: "client/src/config/version.js",
    pattern: /(export const APP_VERSION = )["'][^"']+["']/,
    value: (version) => `$1"${version}"`,
  },
  {
    file: "server/pyproject.toml",
    pattern: /(^|\n)version\s*=\s*["'][^"']+["']/,
    value: (version) => `$1version = "${version}"`,
  },
  {
    file: "server/app/core/config.py",
    pattern: /(VERSION:\s*str\s*=\s*)["'][^"']+["']/,
    value: (version) => `$1"${version}"`,
  },
];

function latestReachableTag() {
  const tags = execFileSync(
    "git",
    ["tag", "--merged", "HEAD", "--list", "v[0-9]*", "--sort=-version:refname"],
    { cwd: root, encoding: "utf8" },
  )
    .split("\n")
    .map((tag) => tag.trim())
    .filter((tag) => /^v\d+\.\d+\.\d+$/.test(tag));
  return tags[0] || null;
}

function writeVersion(version) {
  for (const entry of files) {
    const target = path.join(root, entry.file);
    const contents = fs.readFileSync(target, "utf8");
    let updated;
    if (entry.kind === "json") {
      const data = JSON.parse(contents);
      data.version = version;
      updated = `${JSON.stringify(data, null, 2)}\n`;
    } else {
      updated = contents.replace(entry.pattern, entry.value(version));
      if (updated === contents) {
        throw new Error(`Could not update version in ${entry.file}`);
      }
    }
    fs.writeFileSync(target, updated);
  }
}

const tag = latestReachableTag();
if (!tag) {
  console.log("No reachable semantic tag found; retaining repository version.");
  process.exit(0);
}

const version = tag.slice(1);
const current = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version;
if (current === version) {
  console.log(`Release metadata already matches ${tag}.`);
  process.exit(0);
}

writeVersion(version);
console.log(`Reconciled release metadata from ${current} to ${tag}.`);
