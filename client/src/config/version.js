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

export const APP_VERSION = "0.2.9";
export const GITHUB_REPO = "sainibhaowal/Aurelinx";
export const GITHUB_REPO_URL = `https://github.com/${GITHUB_REPO}`;
export const GITHUB_RELEASES_URL = `${GITHUB_REPO_URL}/releases`;
export const GITHUB_LATEST_RELEASE_URL = `${GITHUB_RELEASES_URL}/latest`;
export const GITHUB_LATEST_RELEASE_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

export function getReleaseDownloadUrls(version = APP_VERSION) {
  const cleanVersion = version.replace(/^v/, "");
  const tag = `v${cleanVersion}`;
  const baseDownloadUrl = `${GITHUB_REPO_URL}/releases/download/${tag}`;

  const asset = (fileName, label, ext, arch) => ({
    label,
    fileName,
    url: `${baseDownloadUrl}/${fileName}`,
    ext,
    arch,
    sizeBytes: null,
    available: true,
  });

  return {
    version: tag,
    cleanVersion,
    releasePage: `${GITHUB_RELEASES_URL}/tag/${tag}`,
    latestPage: GITHUB_LATEST_RELEASE_URL,
    windows: asset(
      `Aurelinx_${cleanVersion}_x64-setup.exe`,
      "Windows Setup (x64)",
      ".exe",
      "x64",
    ),
    windowsMsi: asset(
      `Aurelinx_${cleanVersion}_x64_en-US.msi`,
      "Windows MSI (x64)",
      ".msi",
      "x64",
    ),
    windowsArm64: asset(
      `Aurelinx_${cleanVersion}_arm64-setup.exe`,
      "Windows Setup (ARM64)",
      ".exe",
      "arm64",
    ),
    windowsMsiArm64: asset(
      `Aurelinx_${cleanVersion}_arm64_en-US.msi`,
      "Windows MSI (ARM64)",
      ".msi",
      "arm64",
    ),
    linuxDeb: asset(
      `Aurelinx_${cleanVersion}_amd64.deb`,
      "Debian / Ubuntu (.deb)",
      ".deb",
      "amd64",
    ),
    linuxDebArm64: asset(
      `Aurelinx_${cleanVersion}_arm64.deb`,
      "Debian / Ubuntu ARM64 (.deb)",
      ".deb",
      "arm64",
    ),
    linuxRpm: asset(
      `Aurelinx-${cleanVersion}-1.x86_64.rpm`,
      "Fedora / RHEL (.rpm)",
      ".rpm",
      "x86_64",
    ),
    linuxRpmArm64: asset(
      `Aurelinx-${cleanVersion}-1.aarch64.rpm`,
      "Fedora / RHEL ARM64 (.rpm)",
      ".rpm",
      "aarch64",
    ),
    linuxAppImage: asset(
      `Aurelinx_${cleanVersion}_amd64.AppImage`,
      "Universal AppImage (x64)",
      ".AppImage",
      "amd64",
    ),
    linuxAppImageArm64: asset(
      `Aurelinx_${cleanVersion}_aarch64.AppImage`,
      "Universal AppImage (ARM64)",
      ".AppImage",
      "aarch64",
    ),
    macosArm64: asset(
      `Aurelinx_${cleanVersion}_aarch64.dmg`,
      "macOS Apple Silicon (.dmg)",
      ".dmg",
      "aarch64",
    ),
    macos: asset(
      `Aurelinx_${cleanVersion}_x64.dmg`,
      "macOS Intel (.dmg)",
      ".dmg",
      "x64",
    ),
  };
}

export function detectUserPlatform() {
  if (typeof window === "undefined") return "linux";
  const userAgent = window.navigator.userAgent.toLowerCase();

  if (userAgent.includes("win")) return "windows";
  if (userAgent.includes("mac")) return "macos";
  return "linux";
}

export async function detectUserArchitecture() {
  if (typeof window === "undefined") return "x64";

  try {
    const uaData = window.navigator.userAgentData;
    if (uaData?.getHighEntropyValues) {
      const hints = await uaData.getHighEntropyValues(["architecture"]);
      const arch = String(hints?.architecture || "").toLowerCase();
      if (arch.includes("arm") || arch.includes("aarch64")) {
        return "arm64";
      }
      if (arch.includes("x86") || arch.includes("amd64")) {
        return "x64";
      }
    }
  } catch {
    // Ignore unsupported User-Agent Client Hints errors.
  }

  const combined =
    `${window.navigator.userAgent} ${window.navigator.platform || ""}`.toLowerCase();
  if (
    combined.includes("arm64") ||
    combined.includes("aarch64") ||
    combined.includes("armv8")
  ) {
    return "arm64";
  }
  return "x64";
}

export function formatAssetSize(bytes) {
  if (!bytes || bytes <= 0) return null;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

/**
 * Fetch the latest GitHub release and map its attached installers so the
 * landing page always displays the real live version and verified links.
 */
export async function fetchLatestGithubRelease(fallbackVersion = APP_VERSION) {
  const fallback = getReleaseDownloadUrls(fallbackVersion);
  if (typeof fetch !== "function") return { ...fallback, isLive: false };

  try {
    const res = await fetch(GITHUB_LATEST_RELEASE_API_URL, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) return { ...fallback, isLive: false };

    const data = await res.json();
    const tagName = String(data?.tag_name || fallback.version);
    const live = getReleaseDownloadUrls(tagName);
    const assets = Array.isArray(data?.assets) ? data.assets : [];

    const matchAsset = (patterns, fallbackEntry) => {
      const found = assets.find((item) =>
        patterns.every((rx) => rx.test(item.name || "")),
      );
      if (!found) {
        return { ...fallbackEntry, available: false };
      }
      return {
        ...fallbackEntry,
        fileName: found.name,
        url: found.browser_download_url,
        sizeBytes: found.size ?? null,
        available: true,
      };
    };

    return {
      ...live,
      releasePage: data?.html_url || live.releasePage,
      isLive: true,
      windows: matchAsset([/_x64-setup\.exe$/i], live.windows),
      windowsMsi: matchAsset([/_x64.*\.msi$/i], live.windowsMsi),
      windowsArm64: matchAsset([/_arm64-setup\.exe$/i], live.windowsArm64),
      windowsMsiArm64: matchAsset([/_arm64.*\.msi$/i], live.windowsMsiArm64),
      linuxDeb: matchAsset([/_(amd64|x86_64)\.deb$/i], live.linuxDeb),
      linuxDebArm64: matchAsset(
        [/_(arm64|aarch64)\.deb$/i],
        live.linuxDebArm64,
      ),
      linuxRpm: matchAsset([/\.(x86_64|amd64)\.rpm$/i], live.linuxRpm),
      linuxRpmArm64: matchAsset(
        [/\.(aarch64|arm64)\.rpm$/i],
        live.linuxRpmArm64,
      ),
      linuxAppImage: matchAsset(
        [/_(amd64|x86_64)\.AppImage$/i],
        live.linuxAppImage,
      ),
      linuxAppImageArm64: matchAsset(
        [/_(aarch64|arm64)\.AppImage$/i],
        live.linuxAppImageArm64,
      ),
      macosArm64: matchAsset([/_(aarch64|arm64)\.dmg$/i], live.macosArm64),
      macos: matchAsset([/_(x64|x86_64)\.dmg$/i], live.macos),
    };
  } catch {
    return { ...fallback, isLive: false };
  }
}
