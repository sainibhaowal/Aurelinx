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
import { Loader2 } from "lucide-react";

const Spinner = ({
  size = "md", // sm, md, lg
  color = "primary", // primary, secondary, accent, white
  label = "",
  className = "",
  ...props
}) => {
  const sizes = {
    sm: 16,
    md: 28,
    lg: 40,
  };

  const colors = {
    primary: "text-indigo-500",
    secondary: "text-cyan-400",
    accent: "text-emerald-400",
    white: "text-white",
  };

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
      {...props}
    >
      <Loader2
        size={sizes[size]}
        className={`animate-spin ${colors[color]} shrink-0`}
      />
      {label && (
        <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400 select-none animate-pulse">
          {label}
        </span>
      )}
    </div>
  );
};

export default Spinner;
