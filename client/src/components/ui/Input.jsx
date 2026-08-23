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

const Input = ({
  label,
  icon,
  error,
  id,
  type = "text",
  placeholder = "",
  className = "",
  ...props
}) => {
  return (
    <div className={`flex flex-col gap-1.5 w-full text-left ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 select-none pl-1"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center w-full">
        {icon && (
          <span className="absolute left-4 text-slate-400 shrink-0 select-none pointer-events-none">
            {icon}
          </span>
        )}
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          className={`w-full rounded-xl bg-slate-950/50 border border-white/10 outline-none transition-all py-3 px-4 ${
            icon ? "pl-11" : ""
          } ${
            error
              ? "border-rose-500/50 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20"
              : "focus:border-indigo-500/50 focus:bg-slate-900/40 focus:ring-1 focus:ring-indigo-500/20"
          }`}
          {...props}
        />
      </div>
      {error && (
        <span className="text-[10px] font-bold text-rose-400 pl-1 uppercase tracking-wider">
          {error}
        </span>
      )}
    </div>
  );
};

export default Input;
