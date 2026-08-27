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
 * Centralized Application Version & Release Distribution Config
 * Automatically synced with project releases and GitHub asset distribution.
 */

export const APP_VERSION = "1.4.3";
export const GITHUB_REPO = "sainibhaowal/Aurelinx";
export const GITHUB_REPO_URL = `https://github.com/${GITHUB_REPO}`;
export const GITHUB_RELEASES_URL = `${GITHUB_REPO_URL}/releases`;
export const GITHUB_LATEST_RELEASE_URL = `${GITHUB_RELEASES_URL}/latest`;

export function getReleaseDownloadUrls(version = APP_VERSION) {
  const cleanVersion = version.replace(/^v/, "");
  const tag = `v${cleanVersion}`;
  const baseDownloadUrl = `${GITHUB_REPO_URL}/releases/download/${tag}`;

  return {
    version: tag,
    cleanVersion,
    releasePage: `${GITHUB_RELEASES_URL}/tag/${tag}`,
    latestPage: GITHUB_LATEST_RELEASE_URL,
    windows: {
      label: "Windows (x64)",
      fileName: `Aurelinx_${cleanVersion}_x64-setup.exe`,
      url: `${baseDownloadUrl}/Aurelinx_${cleanVersion}_x64-setup.exe`,
      ext: ".exe",
      arch: "x64 installer",
    },
    linuxDeb: {
      label: "Linux Debian / Ubuntu (.deb)",
      fileName: `aurelinx_${cleanVersion}_amd64.deb`,
      url: `${baseDownloadUrl}/aurelinx_${cleanVersion}_amd64.deb`,
      ext: ".deb",
      arch: "amd64",
    },
    linuxAppImage: {
      label: "Linux Universal (.AppImage)",
      fileName: `Aurelinx_${cleanVersion}_amd64.AppImage`,
      url: `${baseDownloadUrl}/Aurelinx_${cleanVersion}_amd64.AppImage`,
      ext: ".AppImage",
      arch: "amd64 standalone",
    },
    macos: {
      label: "macOS (Apple Silicon & Intel)",
      fileName: `Aurelinx_${cleanVersion}_universal.dmg`,
      url: `${baseDownloadUrl}/Aurelinx_${cleanVersion}_universal.dmg`,
      ext: ".dmg",
      arch: "Universal DMG",
    },
  };
}

export function detectUserPlatform() {
  if (typeof window === "undefined") return "linux";
  const userAgent = window.navigator.userAgent.toLowerCase();

  if (userAgent.includes("win")) return "windows";
  if (userAgent.includes("mac")) return "macos";
  return "linux";
}
