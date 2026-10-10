// Copyright 2026 Ravinder Singh
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.

export const getExplanationProviderConfig = () => {
  if (typeof window === "undefined")
    return { provider: "lmstudio", key: null, baseUrl: null, model: null };
  try {
    const raw = localStorage.getItem("AURELINX_PROVIDERS_CONFIG");
    if (raw) {
      const config = JSON.parse(raw);
      const active = config.activeProvider || "lmstudio";
      const providerConfig = config[active] || config.providers?.[active] || {};
      return {
        provider: active,
        key: providerConfig.key || providerConfig.api_key || null,
        baseUrl: providerConfig.endpoint || providerConfig.base_url || null,
        model: providerConfig.selectedModel || providerConfig.model || null,
      };
    }
  } catch {
    // Invalid local provider configuration falls back to the local default.
  }
  return { provider: "lmstudio", key: null, baseUrl: null, model: null };
};
