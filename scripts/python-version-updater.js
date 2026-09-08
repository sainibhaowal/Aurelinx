// Copyright 2026 Ravinder Singh
// Licensed under the Apache License, Version 2.0

/** standard-version updater for Python project/runtime metadata files. */
module.exports.readVersion = function (contents) {
  const match = contents.match(/(?:^|\n)version\s*=\s*["']([^"']+)["']/);
  return match ? match[1] : "0.1.0";
};

module.exports.writeVersion = function (contents, version) {
  return contents.replace(
    /(^|\n)version\s*=\s*["'][^"']+["']/,
    `$1version = "${version}"`,
  );
};
