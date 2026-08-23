/**
 * Custom standard-version updater for client/src/config/version.js
 */
module.exports.readVersion = function (contents) {
  const match = contents.match(/export const APP_VERSION = ["']([^"']+)["']/);
  return match ? match[1] : "1.2.0";
};

module.exports.writeVersion = function (contents, version) {
  return contents.replace(
    /export const APP_VERSION = ["'][^"']+["']/,
    `export const APP_VERSION = "${version}"`
  );
};
