"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Square, X, Monitor, ChevronDown } from "lucide-react";

let getCurrentWindow = null;
let LogicalSize = null;
let LogicalPosition = null;

if (typeof window !== "undefined") {
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

const WindowControls = () => {
  const [isTauri, setIsTauri] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null); // 'minimize' | 'maximize' | 'close' | null
  const [isMaximized, setIsMaximized] = useState(false);
  let hoverTimeout = null;

  useEffect(() => {
    // Check if running inside Tauri or preview mode
    if (typeof window !== "undefined") {
      const isTauriEnv = !!(window.__TAURI_INTERNALS__ || window.__TAURI__);
      const isPreview = window.location.search.includes("preview-controls") || localStorage.getItem("PREVIEW_WINDOW_CONTROLS") === "true";
      
      if (isTauriEnv || isPreview) {
        setIsTauri(true);

        // Track maximization state if possible
        const checkMaximized = async () => {
          if (getCurrentWindow) {
            try {
              const win = getCurrentWindow();
              const max = await win.isMaximized();
              setIsMaximized(max);
            } catch (e) {
              console.error(e);
            }
          }
        };
        
        const interval = setInterval(checkMaximized, 1000);
        return () => clearInterval(interval);
      }
    }
  }, []);

  if (!isTauri) return null;

  const handleMinimize = async (toTray = false) => {
    if (!getCurrentWindow) return;
    try {
      const win = getCurrentWindow();
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
    if (!getCurrentWindow) return;
    try {
      const win = getCurrentWindow();
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
    if (!getCurrentWindow) return;
    try {
      const win = getCurrentWindow();
      await win.close();
    } catch (err) {
      console.error("Close error:", err);
    }
  };

  const handleSnap = async (zone) => {
    if (!getCurrentWindow || !LogicalSize || !LogicalPosition) return;
    try {
      const win = getCurrentWindow();
      
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
        await win.setSize(new LogicalSize(logicalW / 2, adjustedH));
        await win.setPosition(new LogicalPosition(logicalX, logicalY));
      } else if (zone === "right") {
        await win.setSize(new LogicalSize(logicalW / 2, adjustedH));
        await win.setPosition(new LogicalPosition(logicalX + logicalW / 2, logicalY));
      } else if (zone === "top") {
        await win.setSize(new LogicalSize(logicalW, adjustedH / 2));
        await win.setPosition(new LogicalPosition(logicalX, logicalY));
      } else if (zone === "bottom") {
        await win.setSize(new LogicalSize(logicalW, adjustedH / 2));
        await win.setPosition(new LogicalPosition(logicalX, logicalY + adjustedH / 2));
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
  return (
    <div className="relative flex items-center gap-1.5 p-1 rounded-full bg-slate-950/40 border border-white/5 backdrop-blur-md z-[9999]">
      {/* DRAG ZONES */}
      {isTauri && (
        <div 
          data-tauri-drag-region 
          className="absolute -left-[50vw] top-0 h-10 w-[50vw] pointer-events-auto cursor-move z-[-1]"
        />
      )}

      {/* MINIMIZE BUTTON */}
      <div
        className="relative"
        onMouseEnter={() => showMenu("minimize")}
        onMouseLeave={hideMenu}
      >
        <button
          onClick={() => handleMinimize(false)}
          className="w-7 h-7 rounded-full flex items-center justify-center border border-cyan-500/10 bg-cyan-950/20 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-200 transition-all duration-300 relative group overflow-hidden"
          title="Minimize Window"
        >
          <span className="absolute inset-0 bg-cyan-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full blur-sm" />
          <Minus size={12} className="relative z-10" />
        </button>

        <AnimatePresence>
          {activeMenu === "minimize" && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              className="absolute right-0 top-9 w-40 rounded-xl border border-white/10 bg-slate-950/90 p-1.5 shadow-2xl backdrop-blur-md z-[99999]"
            >
              <button
                onClick={() => {
                  handleMinimize(false);
                  setActiveMenu(null);
                }}
                className="w-full text-left px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                Standard Minimize
              </button>
              <button
                onClick={() => {
                  handleMinimize(true);
                  setActiveMenu(null);
                }}
                className="w-full text-left px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
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
          className="w-7 h-7 rounded-full flex items-center justify-center border border-emerald-500/10 bg-emerald-955/20 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-200 transition-all duration-300 relative group overflow-hidden"
          title="Maximize / Snapping Layouts"
        >
          <span className="absolute inset-0 bg-emerald-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full blur-sm" />
          <Square size={10} className="relative z-10" />
        </button>

        <AnimatePresence>
          {activeMenu === "maximize" && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              className="absolute right-0 top-9 w-44 rounded-2xl border border-white/10 bg-slate-950/90 p-2.5 shadow-2xl backdrop-blur-md z-[99999]"
            >
              <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 px-1">
                Snap Window Layouts
              </div>
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                <button
                  onClick={() => handleSnap("left")}
                  className="flex flex-col items-center justify-center p-2 rounded-lg border border-white/5 hover:border-emerald-500/30 hover:bg-white/5 transition-all group"
                >
                  <div className="w-8 h-5 border border-slate-700 rounded flex overflow-hidden">
                    <div className="w-1/2 bg-emerald-500/20 border-r border-slate-800" />
                    <div className="w-1/2" />
                  </div>
                  <span className="text-[7px] font-bold uppercase tracking-wider text-slate-400 mt-1">Left Half</span>
                </button>

                <button
                  onClick={() => handleSnap("right")}
                  className="flex flex-col items-center justify-center p-2 rounded-lg border border-white/5 hover:border-emerald-500/30 hover:bg-white/5 transition-all group"
                >
                  <div className="w-8 h-5 border border-slate-700 rounded flex overflow-hidden">
                    <div className="w-1/2" />
                    <div className="w-1/2 bg-emerald-500/20 border-l border-slate-800" />
                  </div>
                  <span className="text-[7px] font-bold uppercase tracking-wider text-slate-400 mt-1">Right Half</span>
                </button>

                <button
                  onClick={() => handleSnap("top")}
                  className="flex flex-col items-center justify-center p-2 rounded-lg border border-white/5 hover:border-emerald-500/30 hover:bg-white/5 transition-all group"
                >
                  <div className="w-8 h-5 border border-slate-700 rounded flex flex-col overflow-hidden">
                    <div className="h-1/2 bg-emerald-500/20 border-b border-slate-800" />
                    <div className="h-1/2" />
                  </div>
                  <span className="text-[7px] font-bold uppercase tracking-wider text-slate-400 mt-1">Top Half</span>
                </button>

                <button
                  onClick={() => handleSnap("bottom")}
                  className="flex flex-col items-center justify-center p-2 rounded-lg border border-white/5 hover:border-emerald-500/30 hover:bg-white/5 transition-all group"
                >
                  <div className="w-8 h-5 border border-slate-700 rounded flex flex-col overflow-hidden">
                    <div className="h-1/2" />
                    <div className="h-1/2 bg-emerald-500/20 border-t border-slate-800" />
                  </div>
                  <span className="text-[7px] font-bold uppercase tracking-wider text-slate-400 mt-1">Bottom Half</span>
                </button>
              </div>

              <div className="border-t border-white/5 pt-1.5">
                <button
                  onClick={handleMaximizeToggle}
                  className="w-full text-left px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center justify-between"
                >
                  <span>{isMaximized ? "Restore Size" : "Full Maximize"}</span>
                  <Monitor size={10} className="text-emerald-400" />
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
          className="w-7 h-7 rounded-full flex items-center justify-center border border-rose-500/10 bg-rose-950/20 text-rose-400 hover:bg-rose-500/20 hover:text-rose-200 transition-all duration-300 relative group overflow-hidden"
          title="Close Application"
        >
          <span className="absolute inset-0 bg-rose-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full blur-sm" />
          <X size={12} className="relative z-10" />
        </button>

        <AnimatePresence>
          {activeMenu === "close" && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              className="absolute right-0 top-9 w-40 rounded-xl border border-white/10 bg-slate-950/90 p-1.5 shadow-2xl backdrop-blur-md z-[99999]"
            >
              <button
                onClick={handleClose}
                className="w-full text-left px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-300 hover:text-rose-100 hover:bg-rose-500/10 rounded-lg transition-colors"
              >
                Exit Application
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default WindowControls;
