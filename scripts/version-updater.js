// Copyright 2026 Ravinder Singh
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
