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

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Info, AlertTriangle } from "lucide-react";

const Toast = ({ message, type = "info", isVisible, onClose }) => {
  const icons = {
    success: <CheckCircle className="text-accent" size={20} />,
    error: <XCircle className="text-risk" size={20} />,
    info: <Info className="text-primary" size={20} />,
    warning: <AlertTriangle className="text-yellow-500" size={20} />,
  };

  const colors = {
    success: "border-accent/45 bg-[#14231f]",
    error: "border-risk/45 bg-[#28161d]",
    info: "border-primary/45 bg-[#10232d]",
    warning: "border-yellow-500/45 bg-[#282217]",
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
          className={`fixed top-5 right-5 z-[200] flex min-w-[280px] max-w-[calc(100vw-2rem)] items-center gap-4 rounded-xl border bg-opacity-100 px-5 py-3.5 shadow-[0_18px_45px_rgba(0,0,0,.42)] backdrop-blur-xl sm:min-w-[320px] sm:max-w-[420px] ${colors[type]}`}
        >
          <div className="p-2 rounded-full bg-white/5">{icons[type]}</div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-white/45 transition-colors hover:bg-white/10 hover:text-white"
          >
            <XCircle size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast;
