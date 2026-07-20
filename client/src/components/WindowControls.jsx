"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Square, X, Monitor, ChevronDown } from "lucide-react";

let getCurrentWindow = null;
let LogicalSize = null;
let LogicalPosition = null;

// Dynamically import Tauri APIs if available at import time
if (typeof window !== "undefined" && (window.__TAURI_INTERNALS__ || window.__TAURI__)) {
  import("@tauri-apps/api/window")
    .then((mod) => {
      getCurrentWindow = mod.getCurrentWindow;
      LogicalSize = mod.LogicalSize;
      LogicalPosition = mod.LogicalPosition;
    })
    .catch((err) => {
      console.warn("Tauri Window APIs not available in this environment.", err);
    });
}

// Robust resolver to look up Tauri APIs globally or via dynamic imports
const getTauriApi = () => {
  if (typeof window !== "undefined") {
    // Try global window.__TAURI__ first (withGlobalTauri: true exposes this on remote domains)
    if (window.__TAURI__ && window.__TAURI__.window) {
      return {
        getCurrentWindow: window.__TAURI__.window.getCurrentWindow,
        LogicalSize: window.__TAURI__.window.LogicalSize,
        LogicalPosition: window.__TAURI__.window.LogicalPosition
      };
    }
  }
  // Fallback to NPM module imports
  return {
    getCurrentWindow,
    LogicalSize,
    LogicalPosition
  };
};

const WindowControls = () => {
  const [isTauri, setIsTauri] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null); // 'minimize' | 'maximize' | 'close' | null
  const [isMaximized, setIsMaximized] = useState(false);
  let hoverTimeout = null;

  useEffect(() => {
    // Check if running inside Tauri or preview mode
    if (typeof window !== "undefined") {
      const isTauriEnv = !!(
        window.__TAURI_INTERNALS__ ||
        window.__TAURI__ ||
        navigator.userAgent.includes("Aurelinx-Desktop-App") ||
        window.location.search.includes("tauri=true") ||
        sessionStorage.getItem("isTauri") === "true"
      );
      const isPreview = window.location.search.includes("preview-controls") || localStorage.getItem("PREVIEW_WINDOW_CONTROLS") === "true";
      
      if (isTauriEnv || isPreview) {
        setIsTauri(true);
        if (isTauriEnv) {
          sessionStorage.setItem("isTauri", "true");
        }

        // Dynamically import Tauri window APIs if they aren't loaded yet
        const loadTauriApis = async () => {
          const apis = getTauriApi();
          if (!apis.getCurrentWindow) {
            try {
              const mod = await import("@tauri-apps/api/window");
              getCurrentWindow = mod.getCurrentWindow;
              LogicalSize = mod.LogicalSize;
              LogicalPosition = mod.LogicalPosition;
            } catch (err) {
              console.warn("Failed to load Tauri window APIs dynamically:", err);
            }
          }
        };

        loadTauriApis();

        // Track maximization state if possible
        const checkMaximized = async () => {
          const apis = getTauriApi();
          if (apis.getCurrentWindow) {
            try {
              const win = apis.getCurrentWindow();
              const max = await win.isMaximized();
              setIsMaximized(max);
            } catch (e) {
              // Ignore API failures on non-Tauri preview environments
            }
          }
        };
        
        const interval = setInterval(checkMaximized, 1000);
        return () => clearInterval(interval);
      }
    }
  }, []);

  if (!isTauri || (typeof window !== "undefined" && window !== window.parent)) return null;

  const handleMinimize = async (toTray = false) => {
    const apis = getTauriApi();
    if (!apis.getCurrentWindow) return;
    try {
      const win = apis.getCurrentWindow();
      if (toTray) {
        // In Tauri v2 we can hide the window
        await win.hide();
      } else {
        await win.minimize();
      }
    } catch (err) {
      console.error("Minimize error:", err);
    }
  };

  const handleMaximizeToggle = async () => {
    const apis = getTauriApi();
    if (!apis.getCurrentWindow) return;
    try {
      const win = apis.getCurrentWindow();
      if (await win.isMaximized()) {
        await win.unmaximize();
        setIsMaximized(false);
      } else {
        await win.maximize();
        setIsMaximized(true);
      }
    } catch (err) {
      console.error("Maximize error:", err);
    }
  };

  const handleClose = async () => {
    const apis = getTauriApi();
    if (!apis.getCurrentWindow) return;
    try {
      const win = apis.getCurrentWindow();
      await win.close();
    } catch (err) {
      console.error("Close error:", err);
    }
  };

  const handleSnap = async (zone) => {
    const apis = getTauriApi();
    if (!apis.getCurrentWindow || !apis.LogicalSize || !apis.LogicalPosition) return;
    try {
      const win = apis.getCurrentWindow();
      
      if (await win.isMaximized()) {
        await win.unmaximize();
      }
      
      const monitor = await win.currentMonitor();
      if (!monitor) return;

      const { width: monitorWidth, height: monitorHeight } = monitor.size;
      const { x: monitorX, y: monitorY } = monitor.position;
      const scaleFactor = monitor.scaleFactor || 1;

      // Convert physical pixels to logical units
      const logicalW = monitorWidth / scaleFactor;
      const logicalH = monitorHeight / scaleFactor;
      const logicalX = monitorX / scaleFactor;
      const logicalY = monitorY / scaleFactor;

      // Adjust height to account for potential taskbars (safety padding)
      const adjustedH = logicalH - 10;

      if (zone === "left") {
        await win.setSize(new apis.LogicalSize(logicalW / 2, adjustedH));
        await win.setPosition(new apis.LogicalPosition(logicalX, logicalY));
      } else if (zone === "right") {
        await win.setSize(new apis.LogicalSize(logicalW / 2, adjustedH));
        await win.setPosition(new apis.LogicalPosition(logicalX + logicalW / 2, logicalY));
      } else if (zone === "top") {
        await win.setSize(new apis.LogicalSize(logicalW, adjustedH / 2));
        await win.setPosition(new apis.LogicalPosition(logicalX, logicalY));
      } else if (zone === "bottom") {
        await win.setSize(new apis.LogicalSize(logicalW, adjustedH / 2));
        await win.setPosition(new apis.LogicalPosition(logicalX, logicalY + adjustedH / 2));
      }
      setActiveMenu(null);
    } catch (err) {
      console.error("Snap error:", err);
    }
  };

  const showMenu = (menu) => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    setActiveMenu(menu);
  };

  const hideMenu = () => {
    hoverTimeout = setTimeout(() => {
      setActiveMenu(null);
    }, 300);
  };

  // If not running in Tauri, render developer simulator for web debugging
  // so the user can see and enjoy the UI features anyway!
  // Beautiful theme-matched custom title bar header
  return (
    <div className="fixed top-0 left-0 right-0 w-full h-10 flex items-center justify-between px-4 bg-[#0a0f1d] border-b border-white/5 select-none z-[99999]">
      {/* Draggable region spanning the title bar except the buttons area */}
      <div 
        data-tauri-drag-region 
        className="absolute inset-0 right-36 h-full cursor-grab active:cursor-grabbing z-0"
      />
      
      {/* App branding on the left */}
      <div className="flex items-center gap-2 relative z-10 pointer-events-none">
        <span className="text-xs font-extrabold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent tracking-widest uppercase">
          Aurelinx
        </span>
      </div>

      {/* Control Buttons on the right */}
      <div className="flex items-center gap-2 relative z-20 pointer-events-auto">
        {/* MINIMIZE BUTTON */}
        <div
          className="relative"
          onMouseEnter={() => showMenu("minimize")}
          onMouseLeave={hideMenu}
        >
          <button
            onClick={() => handleMinimize(false)}
            className="w-6 h-6 rounded-full flex items-center justify-center border border-cyan-500/10 bg-cyan-950/20 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-200 transition-all duration-300 relative group overflow-hidden"
            title="Minimize"
          >
            <span className="absolute inset-0 bg-cyan-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full blur-sm" />
            <Minus size={10} className="relative z-10" />
          </button>

          <AnimatePresence>
            {activeMenu === "minimize" && (
              <motion.div
                initial={{ opacity: 0, y: 5, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 3, scale: 0.95 }}
                className="absolute right-0 top-8 w-36 rounded-lg border border-white/10 bg-slate-950/90 p-1 shadow-2xl backdrop-blur-md z-[99999]"
              >
                <button
                  onClick={() => {
                    handleMinimize(false);
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-300 hover:text-white hover:bg-white/5 rounded transition-colors"
                >
                  Standard Minimize
                </button>
                <button
                  onClick={() => {
                    handleMinimize(true);
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-300 hover:text-white hover:bg-white/5 rounded transition-colors"
                >
                  Minimize to Tray
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* MAXIMIZE BUTTON */}
        <div
          className="relative"
          onMouseEnter={() => showMenu("maximize")}
          onMouseLeave={hideMenu}
        >
          <button
            onClick={handleMaximizeToggle}
            className="w-6 h-6 rounded-full flex items-center justify-center border border-emerald-500/10 bg-emerald-955/20 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-200 transition-all duration-300 relative group overflow-hidden"
            title="Maximize"
          >
            <span className="absolute inset-0 bg-emerald-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full blur-sm" />
            <Square size={8} className="relative z-10" />
          </button>

          <AnimatePresence>
            {activeMenu === "maximize" && (
              <motion.div
                initial={{ opacity: 0, y: 5, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 3, scale: 0.95 }}
                className="absolute right-0 top-8 w-40 rounded-xl border border-white/10 bg-slate-950/90 p-2 shadow-2xl backdrop-blur-md z-[99999]"
              >
                <div className="text-[7px] font-black uppercase tracking-[0.15em] text-slate-500 mb-1.5 px-1">
                  Snap Window Layouts
                </div>
                <div className="grid grid-cols-2 gap-1 mb-1.5">
                  <button
                    onClick={() => handleSnap("left")}
                    className="flex flex-col items-center justify-center p-1.5 rounded border border-white/5 hover:border-emerald-500/30 hover:bg-white/5 transition-all"
                  >
                    <div className="w-6 h-4 border border-slate-700 rounded flex overflow-hidden">
                      <div className="w-1/2 bg-emerald-500/20 border-r border-slate-800" />
                      <div className="w-1/2" />
                    </div>
                    <span className="text-[6px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Left Half</span>
                  </button>

                  <button
                    onClick={() => handleSnap("right")}
                    className="flex flex-col items-center justify-center p-1.5 rounded border border-white/5 hover:border-emerald-500/30 hover:bg-white/5 transition-all"
                  >
                    <div className="w-6 h-4 border border-slate-700 rounded flex overflow-hidden">
                      <div className="w-1/2" />
                      <div className="w-1/2 bg-emerald-500/20 border-l border-slate-800" />
                    </div>
                    <span className="text-[6px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Right Half</span>
                  </button>
                </div>
                <div className="border-t border-white/5 pt-1.5">
                  <button
                    onClick={handleMaximizeToggle}
                    className="w-full text-left px-1.5 py-1 text-[8px] font-bold uppercase tracking-wider text-slate-300 hover:text-white hover:bg-white/5 rounded transition-colors flex items-center justify-between"
                  >
                    <span>{isMaximized ? "Restore Size" : "Full Maximize"}</span>
                    <Monitor size={8} className="text-emerald-400" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* CLOSE BUTTON */}
        <div
          className="relative"
          onMouseEnter={() => showMenu("close")}
          onMouseLeave={hideMenu}
        >
          <button
            onClick={handleClose}
            className="w-6 h-6 rounded-full flex items-center justify-center border border-rose-500/10 bg-rose-950/20 text-rose-400 hover:bg-rose-500/20 hover:text-rose-200 transition-all duration-300 relative group overflow-hidden"
            title="Close"
          >
            <span className="absolute inset-0 bg-rose-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full blur-sm" />
            <X size={10} className="relative z-10" />
          </button>

          <AnimatePresence>
            {activeMenu === "close" && (
              <motion.div
                initial={{ opacity: 0, y: 5, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 3, scale: 0.95 }}
                className="absolute right-0 top-8 w-32 rounded-lg border border-white/10 bg-slate-950/90 p-1 shadow-2xl backdrop-blur-md z-[99999]"
              >
                <button
                  onClick={handleClose}
                  className="w-full text-left px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-rose-300 hover:text-rose-100 hover:bg-rose-500/10 rounded transition-colors"
                >
                  Exit Application
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default WindowControls;
