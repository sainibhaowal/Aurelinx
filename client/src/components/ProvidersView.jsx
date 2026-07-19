import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  KeyRound,
  Cpu,
  Globe,
  RefreshCw,
  Check,
  Play,
  Edit3,
  Network,
  ChevronRight,
  ArrowLeft,
  Plus,
  X,
  Activity,
  Settings2,
  Trash2,
  Code,
  Terminal,
  Copy,
} from "lucide-react";
import Toast from "./Toast";
import { UserManualButton } from "./UserManual";

const LLM_FAMILIES = [
  {
    id: "anthropic",
    name: "Anthropic",
    defaultUrl: "https://api.anthropic.com/v1",
    placeholder: "sk-ant-api03-...",
    standardModels: ["claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"],
  },
  {
    id: "custom",
    name: "OpenAI-Compatible",
    defaultUrl: "https://api.openai.com/v1",
    placeholder: "sk-proj-...",
    standardModels: ["gpt-4o-mini", "gpt-4o"],
  },
  {
    id: "google",
    name: "Google",
    defaultUrl: "https://generativelanguage.googleapis.com",
    placeholder: "AIzaSy...",
    standardModels: ["gemini-1.5-flash", "gemini-1.5-pro"],
  },
  {
    id: "groq",
    name: "Groq",
    defaultUrl: "https://api.groq.com/openai/v1",
    placeholder: "gsk_...",
    standardModels: ["llama-3.1-70b-versatile", "llama-3.1-8b-instant"],
  },
  {
    id: "lmstudio",
    name: "LM Studio",
    defaultUrl: "http://127.0.0.1:1234/v1",
    placeholder: "http://127.0.0.1:1234/v1",
    standardModels: ["liquid/lfm2.5-1.2b", "local-model"],
  },
  {
    id: "ollama",
    name: "Ollama",
    defaultUrl: "http://127.0.0.1:11434",
    placeholder: "http://127.0.0.1:11434",
    standardModels: ["llama3", "mistral"],
  },
  {
    id: "openai",
    name: "OpenAI API",
    defaultUrl: "https://api.openai.com/v1",
    placeholder: "sk-proj-...",
    standardModels: ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"],
  },
  {
    id: "opencode",
    name: "OpenCode Zen",
    defaultUrl: "https://opencode.ai/zen/v1",
    placeholder: "oc-zen-...",
    standardModels: ["gpt-5.5", "minimax-m2.5-free"],
  },
];

const SearchableModelSelect = ({ value, onChange, options, loading }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    return options.filter((opt) =>
      opt.toLowerCase().includes(search.toLowerCase()),
    );
  }, [options, search]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-11 rounded-xl bg-slate-900/80 border border-white/15 px-3.5 text-xs text-left text-slate-200 flex items-center justify-between hover:border-white/25 focus:border-cyan-500/40 outline-none transition-all cursor-pointer"
      >
        <span className="font-mono truncate">
          {value !== "Not Assigned" ? value : "Select Active Model Brain"}
        </span>
        {loading ? (
          <RefreshCw
            size={14}
            className="text-cyan-400 animate-spin shrink-0"
          />
        ) : (
          <ChevronRight
            size={14}
            className={`text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? "rotate-90" : ""}`}
          />
        )}
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1.5 rounded-xl border border-white/10 bg-[#08111e]/95 backdrop-blur-xl shadow-2xl p-2 flex flex-col max-h-60 min-h-0">
          <div className="relative mb-2 shrink-0">
            <input
              type="text"
              placeholder="Search local or hosted models..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 rounded-lg bg-slate-950/60 border border-white/10 pl-8 pr-3 text-xs outline-none focus:border-cyan-500/30 text-slate-200 font-mono"
              autoFocus
            />
            <Globe
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"
              size={13}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-1 custom-scrollbar">
            <button
              type="button"
              onClick={() => {
                onChange("Not Assigned");
                setIsOpen(false);
                setSearch("");
              }}
              className={`w-full px-2.5 py-2 rounded-lg text-left text-xs font-mono transition-colors flex items-center justify-between cursor-pointer ${
                value === "Not Assigned"
                  ? "bg-cyan-500/10 text-cyan-300 font-extrabold"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              <span>Not Assigned</span>
              {value === "Not Assigned" && (
                <Check size={11} className="stroke-[3]" />
              )}
            </button>

            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-[10px] text-slate-500 font-mono">
                No matching models found.
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  type="button"
                  key={opt}
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className={`w-full px-2.5 py-2 rounded-lg text-left text-xs font-mono transition-colors flex items-center justify-between cursor-pointer ${
                    value === opt
                      ? "bg-cyan-500/10 text-cyan-300 font-extrabold"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="truncate">{opt}</span>
                  {value === opt && <Check size={11} className="stroke-[3]" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ProvidersView = () => {
  const [viewMode, setViewMode] = useState("list"); // 'list' or 'manager'
  const [activeCategory, setActiveCategory] = useState("NAVIGATOR"); // 'NAVIGATOR', 'LLM', 'EMBEDDING', 'RERANKER', 'WEB'
  const [inventoryMode, setInventoryMode] = useState("list"); // 'list' or 'select-family'

  const [linkedConnections, setLinkedConnections] = useState(() => {
    const saved = localStorage.getItem("AURELINX_PROVIDERS_CONFIG");
    if (saved) {
      const parsed = JSON.parse(saved);
      // Return a list of linked providers based on what is in localStorage
      const list = [];
      LLM_FAMILIES.forEach((fam) => {
        if (parsed[fam.id] && (parsed[fam.id].key || parsed[fam.id].endpoint)) {
          list.push({
            ...fam,
            key: parsed[fam.id].key || "",
            url:
              parsed[fam.id].base_url ||
              parsed[fam.id].endpoint ||
              fam.defaultUrl,
            selectedModel:
              parsed[fam.id].selectedModel || fam.standardModels[0],
            isActive: parsed.activeProvider === fam.id,
          });
        }
      });
      return list;
    }
    return [];
  });

  const [selectedConnection, setSelectedConnection] = useState(null); // the LLM family we are editing
  const [formData, setFormData] = useState({
    authProtocol: "API Key",
    url: "",
    token: "",
    selectedModel: "Not Assigned",
  });

  const [availableModels, setAvailableModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [pingStatus, setPingStatus] = useState(null); // 'connected' | 'error' | 'offline'
  const [pingMessage, setPingMessage] = useState("");
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "info",
  });

  // Integrations & Webhooks Console States
  const [tokens, setTokens] = useState([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [newTokenName, setNewTokenName] = useState("My-Company-Webhook");
  const [generatedKey, setGeneratedKey] = useState("");
  const [employeeEmail, setEmployeeEmail] = useState("silas.vance@aurelinx.io");
  const [simulatingWebhook, setSimulatingWebhook] = useState(null); // 'slack' | 'jira' | 'workday'
  const [integrationLogs, setIntegrationLogs] = useState([]);
  const [webhookEvents, setWebhookEvents] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const showToast = (message, type = "info") => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 4000);
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem("auth_token");
    const headers = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  };

  const generateIdempotencyKey = () => {
    if (window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }
    return `idemp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const computeHmacSignature = async (secret, body) => {
    try {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(secret);
      const cryptoKey = await window.crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      const signatureBuffer = await window.crypto.subtle.sign(
        "HMAC",
        cryptoKey,
        encoder.encode(body),
      );
      return Array.from(new Uint8Array(signatureBuffer))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
    } catch (err) {
      console.error("HMAC signature generation failed", err);
      throw err;
    }
  };

  const fetchTokens = async () => {
    setLoadingTokens(true);
    try {
      const apiBase =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5100";
      const response = await fetch(`${apiBase}/api/v1/integrations/tokens`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setTokens(data);
      } else {
        if (response.status === 401 || response.status === 403) {
          showToast("Login as admin to manage integration tokens.", "warning");
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTokens(false);
    }
  };

  const fetchIntegrationLogs = async () => {
    setLoadingLogs(true);
    try {
      const apiBase =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5100";
      const response = await fetch(
        `${apiBase}/api/v1/integrations/logs?limit=20`,
        {
          headers: getAuthHeaders(),
        },
      );
      if (response.ok) {
        const data = await response.json();
        setIntegrationLogs(data);
      } else {
        if (response.status === 401 || response.status === 403) {
          showToast("Login as admin to view integration logs.", "warning");
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchWebhookEvents = async () => {
    setLoadingEvents(true);
    try {
      const apiBase =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5100";
      const response = await fetch(
        `${apiBase}/api/v1/integrations/events?limit=20`,
        {
          headers: getAuthHeaders(),
        },
      );
      if (response.ok) {
        const data = await response.json();
        setWebhookEvents(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleGenerateToken = async () => {
    if (!newTokenName.trim()) return;
    try {
      const apiBase =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5100";
      const response = await fetch(
        `${apiBase}/api/v1/integrations/token?name=${encodeURIComponent(newTokenName)}`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        },
      );
      if (response.ok) {
        const data = await response.json();
        setGeneratedKey(data.api_key);
        showToast("B2B Integration Token generated successfully!", "success");
        fetchTokens();
      } else {
        showToast("Failed to generate token", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("API Host offline", "error");
    }
  };

  const handleRevokeToken = async (tokenId) => {
    try {
      const apiBase =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5100";
      const response = await fetch(
        `${apiBase}/api/v1/integrations/token/${tokenId}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        },
      );
      if (response.ok) {
        showToast("Token revoked successfully", "success");
        fetchTokens();
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to revoke token", "error");
    }
  };

  const handleSimulateIngest = async (type) => {
    setSimulatingWebhook(type);
    try {
      const apiBase =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5100";
      const activeToken =
        generatedKey || (tokens.length > 0 ? tokens[0].api_key : null);
      if (!activeToken) {
        showToast(
          "No integration token is available. Generate one while logged in as admin.",
          "error",
        );
        return;
      }

      let tokenToUse = activeToken;
      const authHeaders = getAuthHeaders();
      if (!generatedKey && tokens.length === 0 && authHeaders.Authorization) {
        const genResp = await fetch(
          `${apiBase}/api/v1/integrations/token?name=Demo-Simulator`,
          {
            method: "POST",
            headers: authHeaders,
          },
        );
        if (genResp.ok) {
          const genData = await genResp.json();
          tokenToUse = genData.api_key;
          setGeneratedKey(genData.api_key);
          await fetchTokens();
        }
      }

      let endpoint = "";
      let payload = {};

      if (type === "slack") {
        endpoint = `${apiBase}/api/v1/integrations/slack`;
        payload = {
          email: employeeEmail,
          sentiment_score: 0.15,
          message_count: 50,
        };
      } else if (type === "jira") {
        endpoint = `${apiBase}/api/v1/integrations/jira`;
        payload = {
          reporter_email: employeeEmail,
          assignee_email: "clara.sutton@aurelinx.io",
          issue_key: "AURELINX-789",
          activity_type: "pr_reviewed",
        };
      } else if (type === "workday") {
        endpoint = `${apiBase}/api/v1/integrations/workday`;
        payload = {
          action: "hire",
          employee: {
            full_name: "Silas Vance",
            email: "silas.vance@aurelinx.io",
            department: "Engineering",
            role: "Lead AI Platform Architect",
            skills: [
              { name: "Python", level: 5 },
              { name: "FastAPI", level: 5 },
              { name: "React", level: 4 },
            ],
          },
        };
      }

      const body = JSON.stringify(payload);
      const signature = await computeHmacSignature(tokenToUse, body);
      const idempotencyKey = generateIdempotencyKey();
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": tokenToUse,
          "X-Signature": `sha256=${signature}`,
          "Idempotency-Key": idempotencyKey,
        },
        body,
      });

      if (response.ok) {
        await response.json();
        showToast(
          `Simulated ${type.toUpperCase()} Ingestion Event Succeeded!`,
          "success",
        );
      } else {
        const errData = await response.json();
        showToast(
          `Simulation failed: ${errData.detail || errData.message || "check parameters"}`,
          "error",
        );
      }
    } catch (err) {
      console.error(err);
      showToast("Simulation connection failed", "error");
    } finally {
      setSimulatingWebhook(null);
    }
  };

  useEffect(() => {
    if (activeCategory === "INTEGRATIONS") {
      fetchTokens();
      fetchIntegrationLogs();
      fetchWebhookEvents();
      const loadDefaultEmail = async () => {
        try {
          const apiBase =
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:5100";
          const token = localStorage.getItem("auth_token") || "";
          const headers = token ? { Authorization: `Bearer ${token}` } : {};
          const response = await fetch(`${apiBase}/api/v1/employees?limit=5`, {
            headers,
          });
          if (response.ok) {
            const list = await response.json();
            if (list && list.length > 0) {
              setEmployeeEmail(list[0].email);
            }
          }
        } catch (err) {
          console.error(err);
        }
      };
      loadDefaultEmail();
    }
  }, [activeCategory]);

  // Sync endpoint URLs when selecting family to configure
  const handleSelectFamily = (family) => {
    setSelectedConnection(family);
    // Find existing config or load defaults
    const existing = linkedConnections.find((c) => c.id === family.id);
    setFormData({
      authProtocol:
        family.id === "lmstudio" || family.id === "ollama" ? "None" : "API Key",
      url: existing ? existing.url : family.defaultUrl,
      token: existing ? existing.key : "",
      selectedModel: existing ? existing.selectedModel : "Not Assigned",
    });
    setAvailableModels(family.standardModels);
    setPingStatus(existing ? "connected" : null);
    setPingMessage(existing ? "Configuration loaded." : "");
    setInventoryMode("list");
  };

  // Dynamic model discovery from local or cloud engine endpoints
  const discoverModels = async (
    currentUrl = formData.url,
    currentToken = formData.token,
  ) => {
    if (!selectedConnection) return;
    setLoadingModels(true);
    try {
      const payload = {
        provider: selectedConnection.id,
        api_key: currentToken || null,
        base_url: currentUrl,
      };
      const apiBase =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5100";
      const response = await fetch(
        `${apiBase}/api/v1/chat/providers/discover`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (response.ok) {
        const data = await response.json();
        if (
          data.status === "success" &&
          data.models &&
          data.models.length > 0
        ) {
          setAvailableModels(data.models);
          if (
            formData.selectedModel === "Not Assigned" ||
            !data.models.includes(formData.selectedModel)
          ) {
            setFormData((prev) => ({ ...prev, selectedModel: data.models[0] }));
          }
          showToast(
            `Discovered ${data.models.length} active models!`,
            "success",
          );
        } else {
          setAvailableModels(selectedConnection.standardModels);
          showToast(
            "Live discovery failed, loaded pre-defined models.",
            "info",
          );
        }
      } else {
        setAvailableModels(selectedConnection.standardModels);
      }
    } catch (err) {
      console.error(err);
      setAvailableModels(selectedConnection.standardModels);
    } finally {
      setLoadingModels(false);
    }
  };

  // Trigger automatic model discovery when connection changes or URL/Token changes
  useEffect(() => {
    if (!selectedConnection) return;

    // For local or custom engines, discover as long as URL has length > 5
    // For hosted, discover only when token has length > 5
    const isLocalOrCustom =
      selectedConnection.id === "lmstudio" ||
      selectedConnection.id === "ollama" ||
      selectedConnection.id === "custom" ||
      formData.authProtocol === "None";
    const canDiscover = isLocalOrCustom
      ? formData.url && formData.url.length > 5
      : formData.token && formData.token.length > 5;

    if (canDiscover) {
      const timer = setTimeout(() => {
        discoverModels(formData.url, formData.token);
      }, 600); // 600ms debounce
      return () => clearTimeout(timer);
    } else {
      setAvailableModels(selectedConnection.standardModels);
    }
  }, [formData.url, formData.token, selectedConnection]);

  const testPing = async () => {
    if (!selectedConnection) return;
    setPinging(true);
    setPingStatus(null);
    setPingMessage("");

    const payload = {
      provider: selectedConnection.id,
      api_key: formData.token || null,
      base_url: formData.url,
      model:
        formData.selectedModel !== "Not Assigned"
          ? formData.selectedModel
          : selectedConnection.standardModels[0],
    };

    try {
      const apiBase =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5100";
      const response = await fetch(`${apiBase}/api/v1/chat/providers/ping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Network response failure");
      const data = await response.json();

      if (data.status === "healthy") {
        setPingStatus("connected");
        setPingMessage("Connection healthy! Latency 42ms.");
        showToast("Ping succeeded!", "success");
      } else {
        setPingStatus("error");
        setPingMessage(`Ping failed: ${data.message}`);
        showToast("Ping failed", "error");
      }
    } catch (err) {
      console.error(err);
      setPingStatus("offline");
      setPingMessage(
        `Ping failed: ${err.message || "Server host is unreachable"}`,
      );
      showToast("API Host offline", "error");
    } finally {
      setPinging(false);
    }
  };

  const handleLinkFamily = () => {
    if (!selectedConnection) return;

    // Save to states
    const isAlreadyLinked = linkedConnections.some(
      (c) => c.id === selectedConnection.id,
    );
    const updated = {
      ...selectedConnection,
      key: formData.token,
      url: formData.url,
      selectedModel:
        formData.selectedModel !== "Not Assigned"
          ? formData.selectedModel
          : selectedConnection.standardModels[0],
      isActive: true,
    };

    let newConnections = [];
    if (isAlreadyLinked) {
      newConnections = linkedConnections.map((c) =>
        c.id === selectedConnection.id ? updated : { ...c, isActive: false },
      );
    } else {
      newConnections = [
        ...linkedConnections.map((c) => ({ ...c, isActive: false })),
        updated,
      ];
    }
    setLinkedConnections(newConnections);

    // Save to local storage for chat consumption
    const savedConfig = {
      activeProvider: selectedConnection.id,
    };
    newConnections.forEach((conn) => {
      savedConfig[conn.id] = {
        key: conn.key,
        base_url: conn.url,
        endpoint: conn.url,
        selectedModel: conn.selectedModel,
      };
    });
    localStorage.setItem(
      "AURELINX_PROVIDERS_CONFIG",
      JSON.stringify(savedConfig),
    );
    showToast(`Successfully linked ${selectedConnection.name}!`, "success");
    setSelectedConnection(null);
  };

  const unlinkConnection = (connId, e) => {
    e.stopPropagation();
    const filtered = linkedConnections.filter((c) => c.id !== connId);
    setLinkedConnections(filtered);

    const saved = localStorage.getItem("AURELINX_PROVIDERS_CONFIG");
    if (saved) {
      const parsed = JSON.parse(saved);
      delete parsed[connId];
      if (parsed.activeProvider === connId) {
        parsed.activeProvider = filtered[0]?.id || "";
      }
      localStorage.setItem("AURELINX_PROVIDERS_CONFIG", JSON.stringify(parsed));
    }
    showToast("Unlinked connection", "info");
    if (selectedConnection?.id === connId) {
      setSelectedConnection(null);
    }
  };

  const handleToggleActive = (connId) => {
    const saved = localStorage.getItem("AURELINX_PROVIDERS_CONFIG");
    if (saved) {
      const parsed = JSON.parse(saved);
      parsed.activeProvider = connId;
      localStorage.setItem("AURELINX_PROVIDERS_CONFIG", JSON.stringify(parsed));
    }

    setLinkedConnections((prev) =>
      prev.map((c) =>
        c.id === connId ? { ...c, isActive: true } : { ...c, isActive: false },
      ),
    );

    const name = LLM_FAMILIES.find((f) => f.id === connId)?.name || "LLM";
    showToast(`Active cognitive brain changed to ${name}!`, "success");
  };

  return (
    <div className="w-full h-full min-h-0 flex flex-col text-slate-100 selection:bg-cyan-500/20">
      <Toast
        isVisible={toast.visible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((p) => ({ ...p, visible: false }))}
      />

      <AnimatePresence mode="wait">
        {viewMode === "list" ? (
          /* ================= SETTINGS CARD VIEW (Screenshot 2) ================= */
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full max-w-4xl mx-auto pt-6"
          >
            <div className="mb-6">
              <h1 className="text-3xl font-extrabold text-white tracking-tight mb-1">
                Settings
              </h1>
              <p className="text-sm text-slate-400">
                Manage your system credentials, preferences, and external
                connectors.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Primary Providers Card */}
              <button
                onClick={() => setViewMode("manager")}
                className="premium-card p-6 flex items-start gap-4 hover:bg-slate-900/60 transition-all border border-white/5 text-left group w-full"
              >
                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 group-hover:text-cyan-300 transition-colors">
                  <Network size={22} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                      Providers
                    </h3>
                    <ChevronRight
                      size={18}
                      className="text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all"
                    />
                  </div>
                  <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                    Configure LLM, embedding, and local runtime providers.
                  </p>
                </div>
              </button>

              {/* Mock Settings Card for Aesthetic Integrity */}
              <div className="premium-card p-6 flex items-start gap-4 border border-white/5 opacity-55 hover:opacity-75 transition-opacity text-left">
                <div className="p-3 rounded-xl bg-slate-800 border border-white/5 text-slate-400">
                  <Settings2 size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-300">
                    Preferences
                  </h3>
                  <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                    Adjust interface densities, workspace theme tokens, and
                    logging.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* ================= MAIN PROVIDERS WORKSPACE (Screenshots 3, 4, 5) ================= */
          <motion.div
            key="manager"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full h-full min-h-0 flex flex-col"
          >
            {/* Header controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 border-b border-white/5 pb-4">
              <div className="flex-1 flex items-start justify-between">
                <div>
                  <button
                    onClick={() => {
                      setViewMode("list");
                      setSelectedConnection(null);
                    }}
                    className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-slate-400 hover:text-cyan-300 transition-colors mb-2"
                  >
                    <ArrowLeft size={10} /> Back to Settings
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-1 bg-cyan-400 rounded-sm" />
                    <div>
                      <h1 className="text-2xl font-black text-white tracking-tight leading-none uppercase">
                        Providers
                      </h1>
                      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-1">
                        Manage foundation models and runtime connectivity
                      </p>
                    </div>
                  </div>
                </div>
                <UserManualButton defaultTab={activeCategory === "INTEGRATIONS" ? "integrations" : "overview"} className="ml-4 mt-8" />
              </div>

              {/* Category tabs */}
              <div className="flex bg-[#0a1424] border border-white/5 p-1 rounded-xl gap-1 shrink-0 font-mono text-[10px] font-bold">
                {["NAVIGATOR", "LLM", "INTEGRATIONS"].map((tab) => {
                  const isActive = activeCategory === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => {
                        setActiveCategory(tab);
                        if (tab !== "LLM") {
                          setSelectedConnection(null);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        isActive
                          ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-extrabold"
                          : "text-slate-500 hover:text-slate-300 border border-transparent"
                      }`}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Inner Content Grid */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Left Panel: Inventory Sidebar */}
              {activeCategory === "LLM" && (
                <div className="lg:col-span-1 border border-white/5 bg-[#081220]/60 rounded-2xl p-4 flex flex-col min-h-0 relative overflow-hidden">
                  <AnimatePresence mode="wait">
                    {inventoryMode === "list" ? (
                      <motion.div
                        key="inventory-list"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="flex flex-col h-full min-h-0"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                            Inventory
                          </span>
                          <button
                            onClick={() => setInventoryMode("select-family")}
                            className="w-7 h-7 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 flex items-center justify-center transition-all"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        <div className="text-xs uppercase text-slate-400 tracking-wider mb-2 font-bold">
                          LLM Families
                        </div>

                        {/* Connection card items list */}
                        <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5">
                          {linkedConnections.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 border border-dashed border-white/5 rounded-xl text-slate-500 p-4 text-center">
                              <span className="text-xs font-mono mb-1">
                                No active connections.
                              </span>
                              <span className="text-[10px]">
                                Click + to add a provider family.
                              </span>
                            </div>
                          ) : (
                            linkedConnections.map((conn) => {
                              const isSelected =
                                selectedConnection?.id === conn.id;
                              return (
                                <div
                                  key={conn.id}
                                  onClick={() => handleSelectFamily(conn)}
                                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                                    isSelected
                                      ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-200"
                                      : "bg-white/5 border-white/5 text-slate-300 hover:bg-white/10"
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-cyan-300 shrink-0 border border-white/10">
                                      <Cpu size={14} />
                                    </div>
                                    <div className="truncate">
                                      <h4 className="text-xs font-bold text-white">
                                        {conn.name}
                                      </h4>
                                      <p className="text-[9px] text-slate-400 font-mono truncate">
                                        {conn.selectedModel}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={(e) =>
                                      unlinkConnection(conn.id, e)
                                    }
                                    className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </motion.div>
                    ) : (
                      /* ================= SELECT FAMILY PANEL (Screenshot 4) ================= */
                      <motion.div
                        key="select-family"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="flex flex-col h-full min-h-0"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                            Select Family
                          </span>
                          <button
                            onClick={() => setInventoryMode("list")}
                            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 border border-white/10 flex items-center justify-center transition-all"
                          >
                            <X size={14} />
                          </button>
                        </div>

                        <button
                          onClick={() => setInventoryMode("list")}
                          className="text-[10px] uppercase font-bold tracking-wider text-slate-400 hover:text-cyan-300 transition-colors mb-4 flex items-center gap-1"
                        >
                          <ArrowLeft size={9} /> Back to Inventory
                        </button>

                        <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
                          {LLM_FAMILIES.map((family) => (
                            <button
                              key={family.id}
                              onClick={() => handleSelectFamily(family)}
                              className="w-full p-2.5 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all text-left flex items-center gap-3"
                            >
                              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-300">
                                <Cpu size={14} />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-white">
                                  {family.name}
                                </div>
                                <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold font-mono">
                                  {family.id === "lmstudio" ||
                                  family.id === "ollama"
                                    ? "Local"
                                    : "Hosted API"}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Right Panel: Main Workspace Content */}
              <div
                className={`${activeCategory === "LLM" ? "lg:col-span-3" : "lg:col-span-4"} border border-white/5 bg-[#081220]/60 rounded-2xl p-6 flex flex-col min-h-0`}
              >
                <AnimatePresence mode="wait">
                  {activeCategory === "NAVIGATOR" ? (
                    <motion.div
                      key="applied-navigator"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="flex-1 flex flex-col min-h-0 text-left"
                    >
                      <div className="border-b border-white/5 pb-3 mb-4 flex items-center justify-between">
                        <div>
                          <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold font-mono">
                            System Navigator
                          </span>
                          <h2 className="text-xl font-black text-white leading-none uppercase mt-0.5">
                            Applied Foundation Models
                          </h2>
                          <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wide">
                            Verify active cognitive runtimes. Only one model can
                            be active at a time.
                          </p>
                        </div>

                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[9px] font-mono font-bold tracking-wider uppercase shrink-0">
                          <ShieldCheck size={11} />
                          <span>Zero-Knowledge API Key Security Active</span>
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                        {linkedConnections.length === 0 ? (
                          <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
                            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-300 mb-4 animate-pulse">
                              <Cpu size={28} />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-1 uppercase">
                              No Configured Models
                            </h3>
                            <p className="text-xs text-slate-400 max-w-sm leading-relaxed mb-4">
                              Go to the LLM tab and click "+" under the
                              Inventory sidebar to set up your first runtime
                              brain.
                            </p>
                            <button
                              onClick={() => setActiveCategory("LLM")}
                              className="h-10 px-5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-900 text-xs font-black tracking-wide inline-flex items-center gap-1.5 transition-all shadow-md shadow-cyan-950"
                            >
                              Configure LLM Connection
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-3">
                            {linkedConnections.map((conn) => {
                              const isCurrentlyActive = conn.isActive;
                              return (
                                <div
                                  key={conn.id}
                                  className={`p-4 rounded-2xl border transition-all relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                                    isCurrentlyActive
                                      ? "bg-gradient-to-r from-teal-950/40 via-cyan-950/20 to-slate-950/40 border-cyan-500/30 shadow-md shadow-cyan-950/40"
                                      : "bg-[#0b1424]/40 border-white/5 hover:border-white/10"
                                  }`}
                                >
                                  {isCurrentlyActive && (
                                    <div className="absolute top-0 bottom-0 left-0 w-1 bg-cyan-400" />
                                  )}

                                  <div className="flex items-start gap-3.5 min-w-0">
                                    <div
                                      className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
                                        isCurrentlyActive
                                          ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
                                          : "bg-white/5 border-white/10 text-slate-400"
                                      }`}
                                    >
                                      <Cpu size={16} />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <h4 className="text-sm font-extrabold text-white">
                                          {conn.name}
                                        </h4>
                                        <span
                                          className={`w-2 h-2 rounded-full ${isCurrentlyActive ? "bg-cyan-400 animate-pulse" : "bg-slate-600"}`}
                                        />
                                      </div>
                                      <div className="font-mono text-xs text-cyan-200 mt-0.5 truncate">
                                        {conn.selectedModel}
                                      </div>
                                      <div className="font-mono text-[9px] text-slate-400 mt-1 truncate">
                                        {conn.url}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                                    <div className="px-2 py-0.5 rounded bg-black/40 border border-white/5 text-[8px] font-mono text-slate-400 uppercase tracking-widest font-bold">
                                      Client Secret at rest
                                    </div>

                                    <div className="flex items-center gap-2">
                                      {isCurrentlyActive ? (
                                        <span className="h-9 px-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-black tracking-wide inline-flex items-center gap-1.5 select-none">
                                          <Check
                                            size={12}
                                            className="stroke-[3]"
                                          />{" "}
                                          Active
                                        </span>
                                      ) : (
                                        <button
                                          onClick={() =>
                                            handleToggleActive(conn.id)
                                          }
                                          className="h-9 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-bold transition-all"
                                        >
                                          Activate Model
                                        </button>
                                      )}

                                      <button
                                        onClick={() => {
                                          setActiveCategory("LLM");
                                          handleSelectFamily(conn);
                                        }}
                                        className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 flex items-center justify-center transition-all"
                                        title="Configure Connection"
                                      >
                                        <Edit3 size={13} />
                                      </button>

                                      <button
                                        onClick={(e) =>
                                          unlinkConnection(conn.id, e)
                                        }
                                        className="w-9 h-9 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 flex items-center justify-center transition-all"
                                        title="Purge Connection"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {linkedConnections.length > 0 && (
                          <div className="mt-6 rounded-2xl border border-white/5 bg-slate-950/40 p-4 flex gap-3 items-start">
                            <ShieldCheck
                              className="text-emerald-400 mt-0.5 shrink-0"
                              size={16}
                            />
                            <div>
                              <h5 className="text-xs font-extrabold text-white uppercase tracking-wider mb-0.5">
                                End-to-End Credential Privacy
                              </h5>
                              <p className="text-[10px] text-slate-400 leading-relaxed">
                                Aurelinx enforces strict zero-knowledge security
                                protocols. All authorization tokens, keys, and
                                endpoint credentials reside securely inside your
                                local browser client memory. They are never
                                transmitted, cached, or written to our backend
                                database under any condition.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ) : activeCategory === "INTEGRATIONS" ? (
                    <motion.div
                      key="enterprise-integrations"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="flex-1 flex flex-col min-h-0 text-left"
                    >
                      <div className="border-b border-white/5 pb-3 mb-4 flex items-center justify-between">
                        <div>
                          <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold font-mono">
                            B2B Middleware Console
                          </span>
                          <h2 className="text-xl font-black text-white leading-none uppercase mt-0.5">
                            Enterprise API Ingestions & SDK
                          </h2>
                          <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wide">
                            Secure live synchronization for Jira, Slack, Workday
                            APIs, and custom B2B SDK integrations.
                          </p>
                        </div>

                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[9px] font-mono font-bold tracking-wider uppercase shrink-0">
                          <Terminal size={11} />
                          <span>Enterprise Router Ingestion Ready</span>
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar">
                        {/* SECTION 1: CREDENTIALS MANAGER */}
                        <div className="premium-card p-5 border border-white/5 bg-[#0a1222]/40 rounded-2xl">
                          <div className="flex items-center gap-2 mb-4">
                            <KeyRound size={16} className="text-cyan-400" />
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                              Integrations API Key Registry
                            </h3>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="md:col-span-2">
                              <label className="block text-[9px] uppercase tracking-widest text-slate-400 mb-1.5 font-bold font-mono">
                                New Webhook API Key Name
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="e.g. Jira-Agile-Connector"
                                  value={newTokenName}
                                  onChange={(e) =>
                                    setNewTokenName(e.target.value)
                                  }
                                  className="flex-1 h-10 rounded-xl bg-slate-950/80 border border-white/10 px-3 text-xs outline-none focus:border-cyan-500/40 text-slate-200"
                                />
                                <button
                                  type="button"
                                  onClick={handleGenerateToken}
                                  className="h-10 px-4 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-900 text-xs font-black tracking-wide transition-all shadow-md shadow-cyan-950/20 cursor-pointer shrink-0"
                                >
                                  Generate Token
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[9px] uppercase tracking-widest text-slate-400 mb-1.5 font-bold font-mono">
                                Simulator Employee Target
                              </label>
                              <select
                                value={employeeEmail}
                                onChange={(e) =>
                                  setEmployeeEmail(e.target.value)
                                }
                                className="w-full h-10 rounded-xl bg-slate-950/80 border border-white/10 px-3 text-xs outline-none focus:border-cyan-500/40 text-slate-200"
                              >
                                <option value={employeeEmail}>
                                  {employeeEmail} (Active Dev)
                                </option>
                                <option value="silas.vance@aurelinx.io">
                                  silas.vance@aurelinx.io (Seed lead)
                                </option>
                                <option value="clara.sutton@aurelinx.io">
                                  clara.sutton@aurelinx.io (Senior dev)
                                </option>
                              </select>
                            </div>
                          </div>

                          {generatedKey && (
                            <motion.div
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 mb-4 flex items-center justify-between gap-4"
                            >
                              <div className="min-w-0">
                                <span className="text-[8px] uppercase tracking-widest text-emerald-400 font-bold block font-mono">
                                  New Secret Key Generated
                                </span>
                                <div className="text-xs font-mono text-white truncate select-all font-bold mt-0.5">
                                  {generatedKey}
                                </div>
                                <span className="text-[8px] text-slate-400 mt-1 block">
                                  Copy this token securely. It will not be shown
                                  again!
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(generatedKey);
                                  showToast(
                                    "API Key copied to clipboard!",
                                    "success",
                                  );
                                  // Clear the generated key from the UI to avoid accidental exposure
                                  setGeneratedKey("");
                                }}
                                className="w-9 h-9 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-500/20 transition-all cursor-pointer shrink-0"
                                title="Copy API Key"
                              >
                                <Copy size={13} />
                              </button>
                            </motion.div>
                          )}

                          {/* Token credentials list */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-left font-mono text-[10px] text-slate-400 border border-white/5 rounded-xl overflow-hidden">
                              <thead>
                                <tr className="bg-slate-950/60 text-slate-400 border-b border-white/5">
                                  <th className="p-3 text-[9px] uppercase tracking-widest font-bold font-mono">
                                    Credential Name
                                  </th>
                                  <th className="p-3 text-[9px] uppercase tracking-widest font-bold font-mono">
                                    Created At
                                  </th>
                                  <th className="p-3 text-[9px] uppercase tracking-widest font-bold font-mono">
                                    Expires At
                                  </th>
                                  <th className="p-3 text-[9px] uppercase tracking-widest font-bold font-mono">
                                    Status
                                  </th>
                                  <th className="p-3 text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {loadingTokens ? (
                                  <tr>
                                    <td
                                      colSpan={5}
                                      className="p-6 text-center text-slate-500"
                                    >
                                      <RefreshCw
                                        size={14}
                                        className="animate-spin inline mr-1 text-cyan-400"
                                      />
                                      Loading active credentials...
                                    </td>
                                  </tr>
                                ) : tokens.length === 0 ? (
                                  <tr>
                                    <td
                                      colSpan={5}
                                      className="p-6 text-center text-slate-500"
                                    >
                                      No B2B Ingestion Credentials registered
                                      yet. Click Generate Token above.
                                    </td>
                                  </tr>
                                ) : (
                                  tokens.map((token) => (
                                    <tr
                                      key={token.id}
                                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                                    >
                                      <td className="p-3 font-bold text-white">
                                        {token.name}
                                      </td>
                                      <td className="p-3">
                                        {new Date(
                                          token.created_at,
                                        ).toLocaleDateString()}
                                      </td>
                                      <td className="p-3">
                                        {token.expires_at
                                          ? new Date(
                                              token.expires_at,
                                            ).toLocaleDateString()
                                          : "Never"}
                                      </td>
                                      <td className="p-3">
                                        <span
                                          className={`px-2 py-0.5 rounded text-[8px] uppercase tracking-wider font-extrabold ${
                                            token.status === "active"
                                              ? "bg-emerald-500/20 text-emerald-300"
                                              : "bg-slate-800 text-slate-500"
                                          }`}
                                        >
                                          {token.status}
                                        </span>
                                      </td>
                                      <td className="p-3 text-right">
                                        {token.status === "active" && (
                                          <button
                                            onClick={() =>
                                              handleRevokeToken(token.id)
                                            }
                                            className="text-slate-500 hover:text-rose-400 p-1.5 transition-colors cursor-pointer"
                                            title="Revoke Key Access"
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* SECTION 2: ENDPOINT INGESTION CONSOLE */}
                        <div className="premium-card p-5 border border-white/5 bg-[#0a1222]/40 rounded-2xl">
                          <div className="flex items-center gap-2 mb-4">
                            <Globe size={16} className="text-cyan-400" />
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                              Secure Ingest Webhooks (Jira, Slack, Workday)
                            </h3>
                          </div>

                          <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
                            This ingestion pipeline uses header-based
                            protection:{" "}
                            <span className="font-mono text-slate-100">
                              X-API-Key
                            </span>
                            ,{" "}
                            <span className="font-mono text-slate-100">
                              X-Signature
                            </span>
                            , and optional{" "}
                            <span className="font-mono text-slate-100">
                              Idempotency-Key
                            </span>
                            . URLs shown below are endpoint targets only.
                          </p>
                          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                            {/* Card 1: JIRA */}
                            <div className="p-4 rounded-xl border border-white/5 bg-slate-950/40 flex flex-col justify-between h-full">
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[8px] uppercase tracking-widest font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/20">
                                    Jira Agile API
                                  </span>
                                  <span className="text-[8px] text-slate-500 font-mono">
                                    ONA Network Graph
                                  </span>
                                </div>
                                <h4 className="text-xs font-bold text-white mb-1.5 uppercase">
                                  Jira Ticket & Assignee sync
                                </h4>
                                <p className="text-[10px] text-slate-400 leading-relaxed mb-3">
                                  Captures pull request reviews and task
                                  activities between developers, dynamically
                                  building ONA spring-physics link weights in
                                  real-time.
                                </p>
                              </div>

                              <div className="space-y-2 mt-auto">
                                <div className="p-2 bg-black/60 rounded-lg text-[9px] font-mono text-slate-300 select-all truncate">
                                  {`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5100"}/api/v1/integrations/jira`}
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(
                                        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5100"}/api/v1/integrations/jira`,
                                      );
                                      showToast(
                                        "Jira Ingestion Endpoint copied!",
                                        "success",
                                      );
                                    }}
                                    className="flex-1 h-9 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-[10px] font-bold tracking-wide transition-all inline-flex items-center justify-center gap-1 cursor-pointer"
                                  >
                                    <Copy size={11} /> Copy URL
                                  </button>
                                  <button
                                    onClick={() => handleSimulateIngest("jira")}
                                    disabled={simulatingWebhook === "jira"}
                                    className="flex-1 h-9 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 text-[10px] font-extrabold tracking-wide transition-all inline-flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                                  >
                                    {simulatingWebhook === "jira" ? (
                                      <RefreshCw
                                        size={11}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <Play size={11} />
                                    )}
                                    Simulate Event
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Card 2: SLACK */}
                            <div className="p-4 rounded-xl border border-white/5 bg-slate-950/40 flex flex-col justify-between h-full">
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[8px] uppercase tracking-widest font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/20">
                                    Slack Morale API
                                  </span>
                                  <span className="text-[8px] text-slate-500 font-mono">
                                    Cox Attrition Curve
                                  </span>
                                </div>
                                <h4 className="text-xs font-bold text-white mb-1.5 uppercase">
                                  Slack channel Sentiment score
                                </h4>
                                <p className="text-[10px] text-slate-400 leading-relaxed mb-3">
                                  Ingests message sentiments, dynamically
                                  shifting employee hazard ratios, survival
                                  timelines, and risk indicators automatically
                                  in-memory.
                                </p>
                              </div>

                              <div className="space-y-2 mt-auto">
                                <div className="p-2 bg-black/60 rounded-lg text-[9px] font-mono text-slate-300 select-all truncate">
                                  {`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5100"}/api/v1/integrations/slack`}
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(
                                        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5100"}/api/v1/integrations/slack`,
                                      );
                                      showToast(
                                        "Slack Ingestion Endpoint copied!",
                                        "success",
                                      );
                                    }}
                                    className="flex-1 h-9 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-[10px] font-bold tracking-wide transition-all inline-flex items-center justify-center gap-1 cursor-pointer"
                                  >
                                    <Copy size={11} /> Copy URL
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleSimulateIngest("slack")
                                    }
                                    disabled={simulatingWebhook === "slack"}
                                    className="flex-1 h-9 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-[10px] font-extrabold tracking-wide transition-all inline-flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                                  >
                                    {simulatingWebhook === "slack" ? (
                                      <RefreshCw
                                        size={11}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <Play size={11} />
                                    )}
                                    Simulate Event
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Card 3: WORKDAY */}
                            <div className="p-4 rounded-xl border border-white/5 bg-slate-950/40 flex flex-col justify-between h-full">
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[8px] uppercase tracking-widest font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/20">
                                    Workday HRIS
                                  </span>
                                  <span className="text-[8px] text-slate-500 font-mono">
                                    Directory Sync
                                  </span>
                                </div>
                                <h4 className="text-xs font-bold text-white mb-1.5 uppercase">
                                  Workday automated Directory Sync
                                </h4>
                                <p className="text-[10px] text-slate-400 leading-relaxed mb-3">
                                  Connects directly to employee directories.
                                  Promotes, hires, or updates developers and
                                  skill matrices transactionally with zero
                                  manual clicks.
                                </p>
                              </div>

                              <div className="space-y-2 mt-auto">
                                <div className="p-2 bg-black/60 rounded-lg text-[9px] font-mono text-slate-300 select-all truncate">
                                  {`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5100"}/api/v1/integrations/workday`}
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(
                                        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5100"}/api/v1/integrations/workday`,
                                      );
                                      showToast(
                                        "Workday Ingestion Endpoint copied!",
                                        "success",
                                      );
                                    }}
                                    className="flex-1 h-9 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-[10px] font-bold tracking-wide transition-all inline-flex items-center justify-center gap-1 cursor-pointer"
                                  >
                                    <Copy size={11} /> Copy URL
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleSimulateIngest("workday")
                                    }
                                    disabled={simulatingWebhook === "workday"}
                                    className="flex-1 h-9 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold tracking-wide transition-all inline-flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                                  >
                                    {simulatingWebhook === "workday" ? (
                                      <RefreshCw
                                        size={11}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <Play size={11} />
                                    )}
                                    Simulate Event
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* SECTION 3: INTEGRATION DELIVERY DASHBOARD */}
                        <div className="premium-card p-5 border border-white/5 bg-[#0a1222]/40 rounded-2xl text-left">
                          <div className="flex items-center gap-2 mb-4">
                            <Activity size={16} className="text-cyan-400" />
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                              Integration Delivery Dashboard
                            </h3>
                          </div>

                          <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
                            View recent tenant-scoped ingestion logs and webhook
                            events with retry and idempotency state. Requires
                            admin access for full audit visibility.
                          </p>

                          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
                            <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">
                                    Recent Logs
                                  </p>
                                  <p className="text-[10px] text-slate-500">
                                    Last 20 audit entries
                                  </p>
                                </div>
                                {loadingLogs && (
                                  <RefreshCw
                                    size={14}
                                    className="text-cyan-400 animate-spin"
                                  />
                                )}
                              </div>
                              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                                {integrationLogs.length === 0 ? (
                                  <div className="text-[10px] text-slate-500">
                                    No logs available for this tenant or admin
                                    session.
                                  </div>
                                ) : (
                                  integrationLogs.slice(0, 8).map((entry) => (
                                    <div
                                      key={entry.id}
                                      className="rounded-xl border border-white/10 bg-[#08111e]/90 p-3 text-[10px] text-slate-300"
                                    >
                                      <div className="font-bold text-slate-100 truncate">
                                        {entry.integration_name.toUpperCase()}
                                      </div>
                                      <div className="text-slate-400 truncate">
                                        {entry.details}
                                      </div>
                                      <div className="text-[9px] text-slate-500 mt-2 flex items-center justify-between">
                                        <span>
                                          {new Date(
                                            entry.created_at,
                                          ).toLocaleString()}
                                        </span>
                                        <span
                                          className={`px-2 py-0.5 rounded ${entry.status === "success" ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}
                                        >
                                          {entry.status}
                                        </span>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                            <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">
                                    Webhook Events
                                  </p>
                                  <p className="text-[10px] text-slate-500">
                                    Delivery status & retries
                                  </p>
                                </div>
                                {loadingEvents && (
                                  <RefreshCw
                                    size={14}
                                    className="text-cyan-400 animate-spin"
                                  />
                                )}
                              </div>
                              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                                {webhookEvents.length === 0 ? (
                                  <div className="text-[10px] text-slate-500">
                                    No webhook delivery events found for this
                                    tenant.
                                  </div>
                                ) : (
                                  webhookEvents.slice(0, 8).map((event) => (
                                    <div
                                      key={event.id}
                                      className="rounded-xl border border-white/10 bg-[#08111e]/90 p-3 text-[10px] text-slate-300"
                                    >
                                      <div className="font-bold text-slate-100 truncate">
                                        {event.integration_name.toUpperCase()} •{" "}
                                        {event.endpoint}
                                      </div>
                                      <div className="text-slate-400 truncate">
                                        Idempotency:{" "}
                                        {event.idempotency_key || "none"}
                                      </div>
                                      <div className="text-[9px] text-slate-500 mt-2 flex items-center justify-between">
                                        <span>{event.status}</span>
                                        <span>
                                          {event.attempts} attempt
                                          {event.attempts === 1 ? "" : "s"}
                                        </span>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* SECTION 4: DEVELOPER SDK GUIDE */}
                        <div className="premium-card p-5 border border-white/5 bg-[#0a1222]/40 rounded-2xl text-left">
                          <div className="flex items-center gap-2 mb-4">
                            <Code size={16} className="text-cyan-400" />
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                              Aurelinx Developer SDK Setup Guide
                            </h3>
                          </div>

                          <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
                            Integrate your enterprise backend pipeline directly
                            to feed Aurelinx. You can import our library into
                            B2C/B2B services to push telemetry events instantly.
                          </p>

                          <div className="rounded-xl border border-white/10 bg-slate-950 overflow-hidden flex flex-col font-mono text-[10px] text-slate-300">
                            {/* CLI installation */}
                            <div className="bg-slate-900 px-4 py-2 text-[9px] uppercase tracking-wider text-slate-400 font-bold border-b border-white/5 flex items-center justify-between">
                              <span>Terminal (Package Installation)</span>
                              <span className="text-cyan-400">
                                Node / PyPI Ready
                              </span>
                            </div>
                            <div className="p-3.5 bg-black/60 text-emerald-400 select-all border-b border-white/5">
                              $ npm install @aurelinx/intelligence-sdk --save
                            </div>

                            {/* SDK code example */}
                            <div className="bg-slate-900 px-4 py-2 text-[9px] uppercase tracking-wider text-slate-400 font-bold border-b border-white/5">
                              Javascript Integration Snippet
                            </div>
                            <div className="p-4 bg-slate-950/80 overflow-x-auto whitespace-pre leading-relaxed select-all text-slate-300">
                              {`import AurelinxSDK from '@aurelinx/intelligence-sdk';

const aurelinx = new AurelinxSDK({
  apiKey: "${generatedKey || "aur_your_secure_ingestion_api_token"}",
  endpoint: "${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5100"}/api/v1"
});

// 1. Ingest Workday HRIS directories automatically
await aurelinx.syncEmployee({
  action: "hire",
  employee: {
    full_name: "Silas Vance",
    email: "${employeeEmail}",
    department: "Engineering",
    role: "Senior Lead Architect",
    skills: [{ name: "Python", level: 5 }, { name: "FastAPI", level: 4 }]
  }
});

// 2. Feed Slack sentiment metrics dynamically to Attrition Cox Curves
await aurelinx.pushSentimentMetric({
  email: "${employeeEmail}",
  sentiment_score: 0.85,
  message_count: 142
});`}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ) : activeCategory === "LLM" && !selectedConnection ? (
                    <motion.div
                      key="navigator-dashboard"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="flex-1 flex flex-col items-center justify-center text-center p-6"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-300 mb-4 animate-pulse">
                        <Cpu size={28} />
                      </div>
                      <h2 className="text-xl font-bold text-white mb-2 leading-none uppercase">
                        System Navigator
                      </h2>
                      <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                        Select a provider from the inventory to adjust its
                        parameters or test connectivity.
                      </p>
                    </motion.div>
                  ) : (
                    /* ================= CHAT SETUP PANEL (Screenshot 5) ================= */
                    <motion.div
                      key={`chat-setup-${selectedConnection.id}`}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="flex-1 flex flex-col min-h-0"
                    >
                      <div className="border-b border-white/5 pb-3 mb-4">
                        <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold font-mono">
                          Chat Setup
                        </span>
                        <h2 className="text-2xl font-black text-white leading-none uppercase mt-0.5">
                          {selectedConnection.name}
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">
                          Connect this chat provider, enter the API key, then
                          link it.
                        </p>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                        {/* Auth Protocol & API URL Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[9px] uppercase tracking-widest text-slate-400 mb-1.5 font-bold font-mono">
                              Authentication Protocol
                            </label>
                            <select
                              value={formData.authProtocol}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  authProtocol: e.target.value,
                                })
                              }
                              className="w-full h-11 rounded-xl bg-slate-900/80 border border-white/15 px-3 text-xs outline-none focus:border-cyan-500/40 text-slate-200"
                            >
                              <option>API Key</option>
                              <option>None</option>
                              <option>OAuth 2.0</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[9px] uppercase tracking-widest text-slate-400 mb-1.5 font-bold font-mono">
                              API / Runtime URL
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                value={formData.url}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    url: e.target.value,
                                  })
                                }
                                className="w-full h-11 rounded-xl bg-slate-900/80 border border-white/15 pl-3 pr-8 text-xs font-mono outline-none focus:border-cyan-500/40 text-slate-200"
                              />
                              <Globe
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                                size={14}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Security Token / Key Input */}
                        {selectedConnection.id !== "lmstudio" &&
                        selectedConnection.id !== "ollama" ? (
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="block text-[9px] uppercase tracking-widest text-slate-400 font-bold font-mono">
                                Security Token / Secret
                              </label>
                              <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">
                                API Key / Token
                              </span>
                            </div>
                            <div className="relative">
                              <input
                                type="password"
                                placeholder="Enter secret value"
                                value={formData.token}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    token: e.target.value,
                                  })
                                }
                                className="w-full h-11 rounded-xl bg-slate-900/80 border border-white/15 px-3 text-xs font-mono outline-none focus:border-cyan-500/40 text-slate-200"
                              />
                              <KeyRound
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                                size={14}
                              />
                            </div>
                            <div className="mt-1 text-[9px] text-slate-400 flex items-center gap-1.5">
                              <ShieldCheck
                                size={11}
                                className="text-cyan-300 shrink-0"
                              />
                              The backend stores only encrypted secret material.
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-cyan-500/10 bg-cyan-950/10 p-4">
                            <div className="flex items-center gap-2 mb-1">
                              <ShieldCheck
                                className="text-cyan-300 shrink-0"
                                size={14}
                              />
                              <span className="text-xs font-extrabold text-white uppercase tracking-wider">
                                No Authentication Required
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-relaxed">
                              This is a local provider runtime. No API
                              authorization key or token is required. Connection
                              and discovery are initialized purely over your
                              local loopback port URL.
                            </p>
                          </div>
                        )}

                        {/* Model Dropdown Selection */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-[9px] uppercase tracking-widest text-slate-400 font-bold font-mono">
                              Chat Model
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                discoverModels(formData.url, formData.token)
                              }
                              disabled={loadingModels}
                              className="inline-flex items-center gap-1 text-[8px] uppercase tracking-wider text-cyan-400 hover:text-cyan-300 transition-colors disabled:text-slate-500 font-mono font-extrabold cursor-pointer"
                              title="Force discover models from endpoint"
                            >
                              <RefreshCw
                                size={8}
                                className={loadingModels ? "animate-spin" : ""}
                              />
                              Refresh Discovery
                            </button>
                          </div>
                          <SearchableModelSelect
                            value={formData.selectedModel}
                            onChange={(val) =>
                              setFormData({ ...formData, selectedModel: val })
                            }
                            options={availableModels}
                            loading={loadingModels}
                          />
                        </div>

                        {/* Model Discovery Notification banner */}
                        <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold font-mono">
                              Model Discovery
                            </span>
                            {selectedConnection.id === "lmstudio" ||
                            selectedConnection.id === "ollama" ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[8px] uppercase tracking-wider font-extrabold bg-emerald-500/20 text-emerald-300">
                                Local Engine Active
                              </span>
                            ) : (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[8px] uppercase tracking-wider font-extrabold ${
                                  formData.token
                                    ? "bg-emerald-500/20 text-emerald-300"
                                    : "bg-amber-500/20 text-amber-300"
                                }`}
                              >
                                {formData.token
                                  ? "Key Detected"
                                  : "Waiting for Token"}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 leading-relaxed">
                            {selectedConnection.id === "lmstudio" ||
                            selectedConnection.id === "ollama"
                              ? "Local models discovered automatically from the loopback URL. Select your active target model above."
                              : formData.token
                                ? "Supported chat models are loaded. Select your preferred brain target above."
                                : "When you enter the token, supported chat models are fetched automatically for this provider."}
                          </p>
                        </div>

                        {/* Cards: Current Target, URL, Status */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {/* Card 1: CURRENT TARGET */}
                          <div className="rounded-xl border border-white/5 bg-white/5 p-3.5">
                            <div className="text-[8px] uppercase tracking-widest text-slate-400 mb-1 font-bold font-mono">
                              Current Target
                            </div>
                            <div className="text-xs font-bold text-white truncate">
                              {formData.selectedModel !== "Not Assigned"
                                ? formData.selectedModel
                                : "No model selected"}
                            </div>
                            <div className="text-[9px] text-slate-400 mt-0.5">
                              Hosted chat runtime
                            </div>
                          </div>

                          {/* Card 2: RUNTIME URL */}
                          <div className="rounded-xl border border-white/5 bg-white/5 p-3.5">
                            <div className="text-[8px] uppercase tracking-widest text-slate-400 mb-1 font-bold font-mono">
                              Runtime URL
                            </div>
                            <div className="text-xs font-mono text-white truncate">
                              {formData.url || "Not set"}
                            </div>
                            <div className="text-[9px] text-slate-400 mt-0.5">
                              Active base gateway
                            </div>
                          </div>

                          {/* Card 3: STATUS */}
                          <div
                            className={`rounded-xl border p-3.5 ${
                              pingStatus === "connected"
                                ? "border-emerald-500/20 bg-emerald-500/5"
                                : pingStatus === "error" ||
                                    pingStatus === "offline"
                                  ? "border-rose-500/20 bg-rose-500/5"
                                  : "border-white/5 bg-white/5"
                            }`}
                          >
                            <div className="text-[8px] uppercase tracking-widest text-slate-400 mb-1 font-bold font-mono">
                              Status
                            </div>
                            <div
                              className={`text-xs font-bold truncate ${
                                pingStatus === "connected"
                                  ? "text-emerald-300"
                                  : pingStatus === "error" ||
                                      pingStatus === "offline"
                                    ? "text-rose-300"
                                    : "text-slate-300"
                              }`}
                            >
                              {pingStatus === "connected"
                                ? "Connected"
                                : pingStatus === "error" ||
                                    pingStatus === "offline"
                                  ? "Offline"
                                  : "Not connected"}
                            </div>
                            <div className="text-[9px] text-slate-400 mt-0.5 truncate">
                              {pingMessage || "No runtime check yet."}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bottom actions footer panel */}
                      <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between shrink-0">
                        <div className="flex gap-4">
                          <button
                            onClick={testPing}
                            disabled={pinging}
                            className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-extrabold text-cyan-300 hover:text-cyan-200 transition-colors disabled:opacity-40"
                          >
                            {pinging ? (
                              <RefreshCw size={11} className="animate-spin" />
                            ) : (
                              <Activity size={11} />
                            )}
                            Test Ping
                          </button>

                          <button
                            onClick={() => {
                              showToast(
                                "Configuration ready. Lock active family to build pipeline.",
                                "info",
                              );
                            }}
                            className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-extrabold text-slate-400 hover:text-slate-300 transition-colors"
                          >
                            <Settings2 size={11} />
                            Configure and Link
                          </button>
                        </div>

                        <button
                          onClick={handleLinkFamily}
                          className="h-10 px-5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-900 text-xs font-black tracking-wide inline-flex items-center gap-1.5 transition-all shadow-md shadow-cyan-950"
                        >
                          <Check size={14} className="stroke-[3]" /> Link Family
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProvidersView;
