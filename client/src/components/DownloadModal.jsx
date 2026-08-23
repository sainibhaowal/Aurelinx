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
  GITHUB_LATEST_RELEASE_URL,
} from "../config/version";

export const DownloadModal = ({ isOpen, onClose }) => {
  const [selectedOS, setSelectedOS] = useState("linux");
  const [copiedCmd, setCopiedCmd] = useState(false);
  const release = getReleaseDownloadUrls(APP_VERSION);

  useEffect(() => {
    if (isOpen) {
      const platform = detectUserPlatform();
      setSelectedOS(platform);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const platforms = [
    {
      id: "linux",
      name: "Linux",
      icon: Terminal,
      badge: "Ubuntu / Debian / Arch",
      recommended: selectedOS === "linux",
      downloads: [
        {
          title: "Debian / Ubuntu Package",
          file: release.linuxDeb.fileName,
          url: release.linuxDeb.url,
          format: ".deb (amd64)",
          desc: "Recommended for Ubuntu, Debian, Pop!_OS, Mint",
        },
        {
          title: "Universal Standalone AppImage",
          file: release.linuxAppImage.fileName,
          url: release.linuxAppImage.url,
          format: ".AppImage",
          desc: "Runs directly on Fedora, Arch, openSUSE, RHEL",
        },
      ],
      installCmd: `sudo dpkg -i ${release.linuxDeb.fileName}`,
    },
    {
      id: "windows",
      name: "Windows",
      icon: Monitor,
      badge: "Windows 10 / 11 (64-bit)",
      recommended: selectedOS === "windows",
      downloads: [
        {
          title: "Windows Setup Installer",
          file: release.windows.fileName,
          url: release.windows.url,
          format: ".exe (x64)",
          desc: "Publisher: Aurelinx OS - Signed installer with desktop shortcuts",
        },
      ],
      installCmd: `${release.windows.fileName}`,
    },
    {
      id: "macos",
      name: "macOS",
      icon: Cpu,
      badge: "Apple Silicon & Intel",
      recommended: selectedOS === "macos",
      downloads: [
        {
          title: "macOS Universal Disk Image",
          file: release.macos.fileName,
          url: release.macos.url,
          format: ".dmg (Universal)",
          desc: "Native M1/M2/M3/M4 & Intel architecture support",
        },
      ],
      installCmd: `open ${release.macos.fileName}`,
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
                    v{APP_VERSION}
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

          {/* Download Options for Selected OS */}
          <div className="mt-5 space-y-3">
            {currentPlatform.downloads.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-all hover:border-emerald-400/30 hover:bg-white/[0.05]"
              >
                <div className="flex items-start gap-3">
                  <Package className="mt-0.5 h-5 w-5 text-emerald-400" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">
                        {item.title}
                      </span>
                      <span className="rounded border border-white/10 bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] text-cyan-300">
                        {item.format}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">{item.desc}</p>
                    <span className="font-mono text-[11px] text-slate-500">
                      {item.file}
                    </span>
                  </div>
                </div>

                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-lime-400 px-4 py-2.5 text-xs font-bold text-slate-950 transition-all hover:opacity-90 active:scale-95 shadow-md shadow-emerald-500/20"
                >
                  <Download className="h-4 w-4" /> Download
                </a>
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
              <code className="mt-1 block font-mono text-xs text-emerald-300">
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
              href={GITHUB_LATEST_RELEASE_URL}
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
