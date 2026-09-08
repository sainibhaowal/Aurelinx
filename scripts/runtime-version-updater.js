// Copyright 2026 Ravinder Singh
// Licensed under the Apache License, Version 2.0

/** standard-version updater for the backend's development fallback version. */
module.exports.readVersion = function (contents) {
  const match = contents.match(/VERSION:\s*str\s*=\s*["']([^"']+)["']/);
  return match ? match[1] : "0.1.0";
};

module.exports.writeVersion = function (contents, version) {
  return contents.replace(
    /(VERSION:\s*str\s*=\s*)["'][^"']+["']/,
    `$1"${version}"`,
  );
};
