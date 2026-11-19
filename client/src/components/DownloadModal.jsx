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

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  ExternalLink,
  ShieldCheck,
  Terminal,
  Cpu,
  Monitor,
  Package,
} from "lucide-react";
import {
  APP_VERSION,
  getReleaseDownloadUrls,
  detectUserPlatform,
  detectUserArchitecture,
  fetchLatestGithubRelease,
  formatAssetSize,
} from "../config/version";

export const DownloadModal = ({ isOpen, onClose }) => {
  const [detectedOS, setDetectedOS] = useState("linux");
  const [selectedOS, setSelectedOS] = useState("linux");
  const [detectedArch, setDetectedArch] = useState("x64");
  const [selectedArch, setSelectedArch] = useState("x64");
  const [release, setRelease] = useState(() =>
    getReleaseDownloadUrls(APP_VERSION),
  );
  const [copiedCmd, setCopiedCmd] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;

    const platform = detectUserPlatform();
    setDetectedOS(platform);
    setSelectedOS(platform);

    detectUserArchitecture().then((arch) => {
      if (!active) return;
      setDetectedArch(arch);
      setSelectedArch(arch);
    });

    fetchLatestGithubRelease(APP_VERSION).then((latest) => {
      if (!active) return;
      setRelease(latest);
    });

    return () => {
      active = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isArm64 = selectedArch === "arm64";
  const linuxDebAsset = isArm64 ? release.linuxDebArm64 : release.linuxDeb;
  const linuxRpmAsset = isArm64 ? release.linuxRpmArm64 : release.linuxRpm;
  const linuxAppImageAsset = isArm64
    ? release.linuxAppImageArm64
    : release.linuxAppImage;
  const windowsExeAsset = isArm64 ? release.windowsArm64 : release.windows;
  const windowsMsiAsset = isArm64
    ? release.windowsMsiArm64
    : release.windowsMsi;
  const macosAsset = isArm64 ? release.macosArm64 : release.macos;

  const platforms = [
    {
      id: "linux",
      name: "Linux",
      icon: Terminal,
      badge: "Ubuntu / Debian / Fedora",
      recommended: detectedOS === "linux",
      downloads: [
        {
          title: "Debian / Ubuntu Package",
          file: linuxDebAsset.fileName,
          url: linuxDebAsset.url,
          format: `.deb (${linuxDebAsset.arch})`,
          size: formatAssetSize(linuxDebAsset.sizeBytes),
          available: linuxDebAsset.available,
          desc: "Recommended for Ubuntu, Debian, Pop!_OS, Linux Mint",
        },
        {
          title: "Fedora / RHEL / openSUSE",
          file: linuxRpmAsset.fileName,
          url: linuxRpmAsset.url,
          format: `.rpm (${linuxRpmAsset.arch})`,
          size: formatAssetSize(linuxRpmAsset.sizeBytes),
          available: linuxRpmAsset.available,
          desc: "Native RPM package for Fedora, RHEL, Rocky, openSUSE",
        },
        {
          title: "Universal Standalone AppImage",
          file: linuxAppImageAsset.fileName,
          url: linuxAppImageAsset.url,
          format: `.AppImage (${linuxAppImageAsset.arch})`,
          size: formatAssetSize(linuxAppImageAsset.sizeBytes),
          available: linuxAppImageAsset.available,
          desc: "Portable binary for Arch, Fedora, Ubuntu, openSUSE",
        },
      ],
      installCmd: `sudo dpkg -i ${linuxDebAsset.fileName}  # or: sudo dnf install ./${linuxRpmAsset.fileName}`,
    },
    {
      id: "windows",
      name: "Windows",
      icon: Monitor,
      badge: "Windows 10 / 11 (x64 & ARM64)",
      recommended: detectedOS === "windows",
      downloads: [
        {
          title: "Windows Setup Installer",
          file: windowsExeAsset.fileName,
          url: windowsExeAsset.url,
          format: `.exe (${windowsExeAsset.arch})`,
          size: formatAssetSize(windowsExeAsset.sizeBytes),
          available: windowsExeAsset.available,
          desc: "Standard desktop setup wizard with system tray integration",
        },
        {
          title: "Windows Enterprise Installer",
          file: windowsMsiAsset.fileName,
          url: windowsMsiAsset.url,
          format: `.msi (${windowsMsiAsset.arch})`,
          size: formatAssetSize(windowsMsiAsset.sizeBytes),
          available: windowsMsiAsset.available,
          desc: "Microsoft Installer package for managed/GPO deployments",
        },
      ],
      installCmd: `${windowsExeAsset.fileName}`,
    },
    {
      id: "macos",
      name: "macOS",
      icon: Cpu,
      badge: "Apple Silicon & Intel",
      recommended: detectedOS === "macos",
      downloads: [
        {
          title: isArm64
            ? "macOS Apple Silicon Disk Image"
            : "macOS Intel Disk Image",
          file: macosAsset.fileName,
          url: macosAsset.url,
          format: `.dmg (${macosAsset.arch})`,
          size: formatAssetSize(macosAsset.sizeBytes),
          available: macosAsset.available,
          desc: isArm64
            ? "Native M1 / M2 / M3 / M4 Apple Silicon build"
            : "Native x86_64 Intel Mac build",
        },
      ],
      installCmd: `open ${macosAsset.fileName}`,
    },
  ];

  const currentPlatform =
    platforms.find((p) => p.id === selectedOS) || platforms[0];

  const handleCopyCmd = (cmd) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 14 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#06120b] p-6 shadow-2xl"
          style={{
            boxShadow:
              "0 24px 70px -12px rgba(0,0,0,0.85), 0 0 45px rgba(52,211,153,0.12)",
          }}
        >
          {/* Top Header */}
          <div className="flex items-start justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-950/40 text-emerald-400">
                <Download className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">
                    Download Aurelinx Desktop
                  </h3>
                  <span className="rounded-md border border-emerald-400/30 bg-emerald-950/50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-300">
                    {release.version}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Native desktop runtime with OS tray telemetry and low-latency
                  workspace bridge.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* OS Selector Tabs */}
          <div className="mt-5 grid grid-cols-3 gap-2">
            {platforms.map((p) => {
              const Icon = p.icon;
              const isSelected = selectedOS === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedOS(p.id)}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-center transition-all ${
                    isSelected
                      ? "border-emerald-400/50 bg-emerald-950/30 text-white shadow-lg shadow-emerald-950/40"
                      : "border-white/5 bg-white/[0.02] text-slate-400 hover:border-white/15 hover:bg-white/[0.05] hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Icon
                      className={`h-4 w-4 ${
                        isSelected ? "text-emerald-400" : "text-slate-400"
                      }`}
                    />
                    <span className="text-xs font-bold">{p.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {p.badge}
                  </span>
                  {p.recommended && (
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-semibold text-emerald-300">
                      Detected OS
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* CPU Architecture Selector */}
          <div className="mt-3 flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
            <span className="text-[11px] font-medium text-slate-400">
              CPU Architecture
            </span>
            <div className="flex items-center gap-1.5">
              {[
                { id: "x64", label: "x64 (Intel / AMD)" },
                { id: "arm64", label: "ARM64 (aarch64 / Apple Silicon)" },
              ].map((arch) => {
                const active = selectedArch === arch.id;
                const isDetected = detectedArch === arch.id;
                return (
                  <button
                    key={arch.id}
                    type="button"
                    onClick={() => setSelectedArch(arch.id)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                      active
                        ? "border border-emerald-400/40 bg-emerald-950/50 text-emerald-300"
                        : "border border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    }`}
                  >
                    {arch.label}
                    {isDetected ? " · Detected" : ""}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Download Options for Selected OS */}
          <div className="mt-4 space-y-2.5">
            {currentPlatform.downloads.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-all hover:border-emerald-400/30 hover:bg-white/[0.05]"
              >
                <div className="flex items-start gap-3">
                  <Package className="mt-0.5 h-5 w-5 text-emerald-400" />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-white">
                        {item.title}
                      </span>
                      <span className="rounded border border-white/10 bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] text-cyan-300">
                        {item.format}
                      </span>
                      {item.size && (
                        <span className="font-mono text-[10px] text-slate-400">
                          {item.size}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">{item.desc}</p>
                    <span className="font-mono text-[11px] text-slate-500">
                      {item.file}
                    </span>
                  </div>
                </div>

                {item.available ? (
                  <a
                    href={item.url}
                    download={item.file}
                    className="flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-lime-400 px-4 py-2.5 text-xs font-bold text-slate-950 transition-all hover:opacity-90 active:scale-95 shadow-md shadow-emerald-500/20"
                  >
                    <Download className="h-4 w-4" /> Download
                  </a>
                ) : (
                  <span className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-slate-400">
                    Not Attached
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Command helper */}
          {currentPlatform.installCmd && (
            <div className="mt-4 rounded-xl border border-white/5 bg-black/40 p-3">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Terminal className="h-3.5 w-3.5 text-slate-500" /> Quick
                  Install Command:
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyCmd(currentPlatform.installCmd)}
                  className="text-emerald-400 hover:underline"
                >
                  {copiedCmd ? "Copied!" : "Copy"}
                </button>
              </div>
              <code className="mt-1 block overflow-x-auto font-mono text-xs text-emerald-300">
                {currentPlatform.installCmd}
              </code>
            </div>
          )}

          {/* Footer details */}
          <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>SHA-256 verified release binaries</span>
            </div>

            <a
              href={release.releasePage}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 hover:underline"
            >
              View GitHub Release Notes <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
