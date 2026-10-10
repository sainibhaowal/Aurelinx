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

import React, { lazy, Suspense, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  TrendingUp,
  Settings,
  Loader2,
  ChevronRight,
  Activity,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Bot,
  Cpu,
  Database,
  Upload,
  Download,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  AlertTriangle,
  Menu,
  ShieldCheck,
} from "lucide-react";
import TalentCard from "./components/TalentCard";
import ErrorBoundary from "./components/ErrorBoundary";
import { UserManualButton } from "./components/UserManual";
import AurelinxLogo from "./components/AurelinxLogo";
import Toast from "./components/Toast";
import AuthScreen from "./components/AuthScreen";
import WindowControls from "./components/WindowControls";
import { APP_VERSION } from "./config/version";
import {
  analysisAPI,
  candidatesAPI,
  employeesAPI,
  enterpriseAPI,
} from "./services/apiClient";
import { useAuth } from "./contexts/AuthContext";

const LandingPage = lazy(() => import("./components/LandingPage"));
const TalentScoutView = lazy(() => import("./components/TalentScoutView"));
const SentimentPulseView = lazy(
  () => import("./components/SentimentPulseView"),
);
const DirectoryView = lazy(() => import("./components/DirectoryView"));
const AnalyticsView = lazy(() => import("./components/AnalyticsView"));
const IntelligenceChatView = lazy(
  () => import("./components/IntelligenceChatView"),
);
const IntelligenceCenterView = lazy(
  () => import("./components/IntelligenceCenterView"),
);
const SettingsWorkspaceView = lazy(
  () => import("./components/SettingsWorkspaceView"),
);
const EnterpriseOpsView = lazy(() => import("./components/EnterpriseOpsView"));
const RetentionOpsView = lazy(() => import("./components/RetentionOpsView"));

const VALID_APP_TABS = [
  "dashboard",
  "directory",
  "sentiment",
  "analytics",
  "scout",
  "intelligence",
  "intel-center",
  "enterprise",
  "retention",
  "providers",
];

const recentStartupErrors = new Map();
const reportStartupErrorOnce = (key, error) => {
  if (error?.name === "AbortError") return false;
  const now = Date.now();
  if (now - (recentStartupErrors.get(key) || 0) < 5000) return false;
  recentStartupErrors.set(key, now);
  console.error(`[startup:${key}]`, error);
  return true;
};

const isAppPath = (pathname = "") =>
  pathname === "/app" ||
  pathname.startsWith("/app/") ||
  pathname.startsWith("/app?") ||
  pathname.startsWith("/app#");

const isAuthPath = (pathname = "") =>
  pathname === "/login" || pathname === "/signup";

const getTabFromPathname = (pathname = "") => {
  if (!isAppPath(pathname)) return null;
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length >= 2 && VALID_APP_TABS.includes(parts[1])) {
    return parts[1];
  }
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("aurelinx_active_tab");
    if (saved && VALID_APP_TABS.includes(saved)) return saved;
  }
  return "dashboard";
};

const getPathnameForTab = (tab) => {
  if (tab && VALID_APP_TABS.includes(tab)) {
    return `/app/${tab}`;
  }
  return "/app/dashboard";
};

const App = () => {
  const { isAuthenticated, loading: authLoading, logout, user } = useAuth();

  const EMPLOYEE_CACHE_KEY = "aurelinx_dashboard_employees_cache";
  const CANDIDATE_CACHE_KEY = "aurelinx_dashboard_candidates_cache";
  const SNAPSHOT_CACHE_KEY = "aurelinx_dashboard_snapshot_cache";
  const [employees, setEmployees] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [employeeTotal, setEmployeeTotal] = useState(null);
  const [candidateTotal, setCandidateTotal] = useState(null);
  const [loading, setLoading] = useState(false);
  const defaultWorkspaceTab = "dashboard";
  const [route, setRoute] = useState(() => {
    if (typeof window === "undefined") return "landing";
    if (isAppPath(window.location.pathname)) return "app";
    return isAuthPath(window.location.pathname) ? "auth" : "landing";
  });
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === "undefined") return defaultWorkspaceTab;
    if (!isAppPath(window.location.pathname)) return "landing";
    return getTabFromPathname(window.location.pathname) || defaultWorkspaceTab;
  });
  const userScope = user
    ? `${user.tenant_id || user.workspace_id || "tenant"}:${user.id || user.user_id || user.email || "user"}`
    : "anonymous";
  const [visitedTabs, setVisitedTabs] = useState(() => new Set([activeTab]));
  const [visitedTabsUserScope, setVisitedTabsUserScope] = useState(userScope);

  useEffect(() => {
    if (visitedTabsUserScope !== userScope) {
      setVisitedTabs(new Set([activeTab]));
      setVisitedTabsUserScope(userScope);
      return;
    }
    setVisitedTabs((visited) =>
      visited.has(activeTab) ? visited : new Set([...visited, activeTab]),
    );
  }, [activeTab, userScope, visitedTabsUserScope]);

  useEffect(() => {
    if (typeof window === "undefined" || !isAppPath(window.location.pathname))
      return;
    if (activeTab && VALID_APP_TABS.includes(activeTab)) {
      localStorage.setItem("aurelinx_active_tab", activeTab);
      const targetPath = getPathnameForTab(activeTab);
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ tab: activeTab }, "", targetPath);
      }
    }
  }, [activeTab]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    typeof window !== "undefined" ? window.innerWidth < 1200 : false,
  );
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "info",
  });
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [selectedProfileLoading, setSelectedProfileLoading] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [isTauri, setIsTauri] = useState(false);
  const isEmbeddedWindow =
    typeof window !== "undefined" && window !== window.parent;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isTauriEnv = !!(
        window.__TAURI_INTERNALS__ ||
        window.__TAURI__ ||
        navigator.userAgent.includes("Aurelinx-Desktop-App") ||
        window.location.search.includes("tauri=true") ||
        sessionStorage.getItem("isTauri") === "true"
      );
      setIsTauri(isTauriEnv);
    }
  }, []);

  useEffect(() => {
    const handleNavigate = (event) => {
      const tab = event?.detail?.tab;
      if (tab) setActiveTab(tab);
    };
    window.addEventListener("aurelinx:navigate", handleNavigate);
    return () =>
      window.removeEventListener("aurelinx:navigate", handleNavigate);
  }, []);

  const [analyticsSnapshot, setAnalyticsSnapshot] = useState({
    total: 0,
    atRisk: 0,
    atRiskPct: 0,
    avgSentiment: 0,
    topRiskDrivers: [],
  });
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [driverModal, setDriverModal] = useState({
    open: false,
    factor: "",
    items: [],
    message: "",
  });

  const navigate = (path, tab = null) => {
    if (typeof window === "undefined") return;
    const isApp = isAppPath(path);
    let targetTab = tab;
    if (isApp && !targetTab) {
      targetTab = getTabFromPathname(path);
    }
    const finalPath = isApp && targetTab ? getPathnameForTab(targetTab) : path;
    window.history.pushState({ tab: targetTab }, "", finalPath);
    setRoute(isApp ? "app" : isAuthPath(finalPath) ? "auth" : "landing");
    if (targetTab) setActiveTab(targetTab);
  };

  const showToast = (message, type = "info") => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 4000);
  };

  useEffect(() => {
    const handleAppToast = (event) => {
      const detail = event?.detail || {};
      if (detail.message) showToast(detail.message, detail.type || "info");
    };
    window.addEventListener("aurelinx:toast", handleAppToast);
    return () => window.removeEventListener("aurelinx:toast", handleAppToast);
  }, []);

  const isCandidateRecord = (person) =>
    Boolean(person?.match_score !== undefined || person?.application_date);

  const openProfileDetails = async (person) => {
    if (!person?.id) return;

    setSelectedProfileLoading(true);
    try {
      const record = isCandidateRecord(person)
        ? await candidatesAPI.get(person.id)
        : await employeesAPI.get(person.id);
      setSelectedProfile(record);
    } catch (err) {
      console.error(err);
      showToast("Failed to load full profile details", "error");
    } finally {
      setSelectedProfileLoading(false);
    }
  };

  const loadEmployees = () => {
    if (employees.length === 0) setLoading(true);
    return Promise.all([employeesAPI.list(0, 12), employeesAPI.count()])
      .then(([data, count]) => {
        setEmployees(data);
        setEmployeeTotal(Number(count?.count ?? data.length));
        localStorage.setItem(EMPLOYEE_CACHE_KEY, JSON.stringify(data));
        setLoading(false);
        return data;
      })
      .catch((err) => {
        const shouldReport = reportStartupErrorOnce("employees", err);
        setLoading(false);
        if (shouldReport && employees.length === 0)
          showToast("Failed to load dashboard data", "error");
        throw err;
      });
  };

  const loadCandidates = () => {
    if (candidates.length === 0) setLoading(true);
    return Promise.all([candidatesAPI.list(0, 12), candidatesAPI.count()])
      .then(([data, count]) => {
        setCandidates(data);
        setCandidateTotal(Number(count?.count ?? data.length));
        localStorage.setItem(CANDIDATE_CACHE_KEY, JSON.stringify(data));
        setLoading(false);
        return data;
      })
      .catch((err) => {
        const shouldReport = reportStartupErrorOnce("candidates", err);
        setLoading(false);
        if (shouldReport && candidates.length === 0)
          showToast("Failed to load candidate data", "error");
        throw err;
      });
  };

  const loadAnalyticsSnapshot = () => {
    setAnalyticsLoading(true);
    return analysisAPI
      .getAnalyticsSnapshot()
      .then((snap) => {
        const nextSnapshot = {
          total: snap.total || 0,
          atRisk: snap.atRisk || 0,
          atRiskPct: snap.atRiskPct || 0,
          avgSentiment: snap.avgSentiment || 0,
          topRiskDrivers: snap.topRiskDrivers || [],
        };
        setAnalyticsSnapshot(nextSnapshot);
        localStorage.setItem(SNAPSHOT_CACHE_KEY, JSON.stringify(nextSnapshot));
        setAnalyticsLoading(false);
        return nextSnapshot;
      })
      .catch((err) => {
        const shouldReport = reportStartupErrorOnce("analytics", err);
        setAnalyticsLoading(false);
        if (shouldReport)
          showToast("Failed to load analytics snapshot", "error");
        throw err;
      });
  };

  const openDriverDrilldown = async (factor) => {
    try {
      const res = await enterpriseAPI.getRiskDriverDrilldown(factor, 500);
      const validated =
        res.status === "validated" &&
        res.validation?.holdout_evaluated === true &&
        res.validation?.calibration_passed === true;
      setDriverModal({
        open: true,
        factor,
        items: validated ? res.items || [] : [],
        message:
          validated && res.items?.length
            ? ""
            : res.message ||
              "Validated departure and censoring data are required before individual attrition results are available.",
      });
    } catch (err) {
      console.error(err);
      showToast("Failed to load risk driver drilldown", "error");
    }
  };

  const createInterventionFromDriver = async (employee, factor) => {
    const priority = employee.risk_probability >= 0.6 ? "high" : "medium";
    if (priority === "high" && !user?.is_admin) {
      showToast(
        "High-priority retention actions require administrator approval",
        "error",
      );
      return;
    }
    try {
      await enterpriseAPI.createIntervention({
        title: `Mitigate ${factor} for ${employee.full_name}`,
        target_scope: "employee",
        target_employee_id: employee.employee_id,
        target_department: employee.department,
        priority,
        owner_name: "HRBP",
        expected_impact: `Reduce attrition risk for ${employee.full_name} by targeted retention action.`,
      });
      showToast("Intervention created from risk evidence", "success");
    } catch (err) {
      console.error(err);
      if (err?.status === 403) {
        showToast(
          "Admin approval is required for high-priority interventions",
          "error",
        );
      } else if (err?.status === 422) {
        showToast(
          err.message || "The intervention details need correction",
          "error",
        );
      } else {
        showToast(err?.message || "Failed to create intervention", "error");
      }
    }
  };

  const exportCurrentReport = async (request = "pdf") => {
    const scope =
      typeof request === "string" ? { format: request } : request || {};
    const {
      format = "pdf",
      query = null,
      viewMode = "all",
      department = null,
      riskOnly = false,
      sentimentMin = null,
      sentimentMax = null,
      employmentStatus = null,
    } = scope;
    const loadAllRecords = async (listFn, args = []) => {
      const pageSize = 1000;
      const rows = [];
      for (let offset = 0; ; offset += pageSize) {
        const page = await listFn(offset, pageSize, ...args);
        if (!Array.isArray(page) || page.length === 0) break;
        rows.push(...page);
        if (page.length < pageSize) break;
      }
      return rows;
    };
    const allEmployees =
      viewMode === "all" || viewMode === "employees"
        ? await loadAllRecords(employeesAPI.list, [
            department,
            riskOnly,
            query,
            sentimentMin,
            sentimentMax,
            employmentStatus,
          ])
        : [];
    const allCandidates =
      viewMode === "all" || viewMode === "candidates"
        ? await loadAllRecords(candidatesAPI.list, [
            department,
            query,
            sentimentMin,
            sentimentMax,
          ])
        : [];
    const atRisk = allEmployees.filter((e) => e.is_at_risk).length;
    const ratio = allEmployees.length
      ? ((atRisk / allEmployees.length) * 100).toFixed(1)
      : "0.0";
    const summary = `Aurelinx Directory export: ${allEmployees.length} employees, ${allCandidates.length} candidates, ${atRisk} imported risk flags (${ratio}%). Filters: ${query || "none"}; tab: ${viewMode}; department: ${department || "all"}; employment status: ${employmentStatus || "all"}; risk-only: ${riskOnly ? "yes" : "no"}; sentiment: ${sentimentMin ?? "-"} to ${sentimentMax ?? "-"}.`;
    const { generateAurelinxReport } = await import("./utils/reportGenerator");
    generateAurelinxReport(
      { employees: allEmployees, candidates: allCandidates },
      summary,
      format,
    );
    showToast(`Exported ${String(format).toUpperCase()}`, "success");
  };

  useEffect(() => {
    try {
      const cachedEmployees = JSON.parse(
        localStorage.getItem(EMPLOYEE_CACHE_KEY) || "[]",
      );
      if (Array.isArray(cachedEmployees) && cachedEmployees.length > 0) {
        setEmployees(cachedEmployees);
        setLoading(false);
      }
      const cachedCandidates = JSON.parse(
        localStorage.getItem(CANDIDATE_CACHE_KEY) || "[]",
      );
      if (Array.isArray(cachedCandidates) && cachedCandidates.length > 0) {
        setCandidates(cachedCandidates);
        setLoading(false);
      }
      const cachedSnapshot = JSON.parse(
        localStorage.getItem(SNAPSHOT_CACHE_KEY) || "null",
      );
      if (cachedSnapshot && typeof cachedSnapshot === "object") {
        setAnalyticsSnapshot((prev) => ({ ...prev, ...cachedSnapshot }));
        setAnalyticsLoading(false);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (route !== "app" || authLoading || !isAuthenticated) {
      return;
    }

    loadEmployees().catch(() => {});
    loadCandidates().catch(() => {});
    loadAnalyticsSnapshot().catch(() => {});
  }, [route, authLoading, isAuthenticated]);

  useEffect(() => {
    const syncRouteAndTab = () => {
      if (typeof window === "undefined") return;
      const path = window.location.pathname;
      const isApp = isAppPath(path);
      setRoute(isApp ? "app" : isAuthPath(path) ? "auth" : "landing");
      if (isApp) {
        const tabFromUrl = getTabFromPathname(path);
        if (tabFromUrl) {
          setActiveTab(tabFromUrl);
        }
      }
    };

    window.addEventListener("popstate", syncRouteAndTab);
    return () => window.removeEventListener("popstate", syncRouteAndTab);
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 1200) {
        setIsSidebarCollapsed(true);
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  let content;
  if (route === "auth") {
    content = <AuthScreen />;
  } else if (route !== "app") {
    content = (
      <Suspense fallback={<LoadingScreen label="Loading landing page" />}>
        <LandingPage
          onEnterWorkspace={() => navigate("/app", defaultWorkspaceTab)}
          onOpenEnterprise={() => navigate("/app", "enterprise")}
        />
      </Suspense>
    );
  } else if (authLoading) {
    content = <LoadingScreen label="Checking account access" />;
  } else if (!isAuthenticated) {
    content = <AuthScreen />;
  } else {
    content = (
      <div className="absolute inset-0 flex min-h-0 w-full bg-[#030712] text-slate-100 overflow-hidden selection:bg-cyan-500/30 antialiased">
        {/* AMBIENT MESH LIGHT FLARES */}
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-cyan-600/15 blur-[120px] pointer-events-none z-0" />
        <div className="absolute top-1/2 -right-40 h-96 w-96 rounded-full bg-emerald-600/10 blur-[140px] pointer-events-none z-0" />
        <div className="absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-blue-600/10 blur-[130px] pointer-events-none z-0" />

        {/* DOTTED GRID BACKGROUND */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none z-0" />

        <Toast
          isVisible={toast.visible}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast((p) => ({ ...p, visible: false }))}
        />

        <div className="absolute inset-0 z-20 flex w-full min-h-0 p-0 gap-1.5 md:gap-2 overflow-hidden">
          {/* Mobile Standalone Floating Hamburger Menu Trigger */}
          {isSidebarCollapsed && (
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setIsSidebarCollapsed(false)}
              className="fixed left-3 top-3 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-slate-950/85 text-cyan-300 shadow-xl backdrop-blur-md transition hover:border-cyan-300/40 hover:bg-cyan-300/10 md:hidden cursor-pointer"
            >
              <Menu size={20} />
            </button>
          )}

          {/* Mobile Overlay Backdrop */}
          {!isSidebarCollapsed && (
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setIsSidebarCollapsed(true)}
              className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm transition-opacity md:hidden"
            />
          )}

          <motion.aside
            initial={false}
            animate={{
              width:
                typeof window !== "undefined" && window.innerWidth < 768
                  ? 220
                  : isSidebarCollapsed
                    ? 64
                    : 220,
            }}
            transition={{ duration: 0.3, ease: "circOut" }}
            className={`relative z-50 flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/90 shadow-2xl backdrop-blur-2xl transition-transform duration-300 max-md:fixed max-md:inset-y-2 max-md:left-2 max-md:w-[220px] ${
              isSidebarCollapsed
                ? "max-md:-translate-x-[calc(100%+20px)] max-md:pointer-events-none max-md:opacity-0"
                : "max-md:translate-x-0 max-md:pointer-events-auto max-md:opacity-100"
            }`}
          >
            <div
              onClick={() => navigate("/")}
              className={`h-14 px-2 mb-2 flex items-center ${isSidebarCollapsed ? "md:justify-center" : "justify-start"} cursor-pointer hover:opacity-80 transition-opacity`}
              title="Go to Landing Page"
            >
              <AurelinxLogo
                collapsed={
                  typeof window !== "undefined" && window.innerWidth < 768
                    ? false
                    : isSidebarCollapsed
                }
                size={24}
              />
            </div>

            {(!isSidebarCollapsed ||
              (typeof window !== "undefined" && window.innerWidth < 768)) && (
              <div className="px-3 pb-3">
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                    Signed In
                  </div>
                  <div className="mt-1 text-sm font-bold text-white truncate">
                    {user?.full_name || "Workspace User"}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    {user?.email || "No email loaded"}
                  </div>
                  <button
                    onClick={logout}
                    className="mt-3 h-9 w-full rounded-lg border border-white/10 bg-white/5 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-200 hover:bg-white/10"
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}

            <nav
              onClick={() => {
                if (typeof window !== "undefined" && window.innerWidth < 768) {
                  setIsSidebarCollapsed(true);
                }
              }}
              className={`flex-1 px-2 space-y-1`}
            >
              <SidebarItem
                icon={<LayoutDashboard size={16} />}
                label="Dashboard"
                active={activeTab === "dashboard"}
                collapsed={
                  typeof window !== "undefined" && window.innerWidth < 768
                    ? false
                    : isSidebarCollapsed
                }
                onClick={() => setActiveTab("dashboard")}
              />
              <SidebarItem
                icon={<Users size={16} />}
                label="Directory"
                active={activeTab === "directory"}
                collapsed={
                  typeof window !== "undefined" && window.innerWidth < 768
                    ? false
                    : isSidebarCollapsed
                }
                onClick={() => setActiveTab("directory")}
              />
              <SidebarItem
                icon={<MessageSquare size={16} />}
                label="Sentiment"
                active={activeTab === "sentiment"}
                collapsed={
                  typeof window !== "undefined" && window.innerWidth < 768
                    ? false
                    : isSidebarCollapsed
                }
                onClick={() => setActiveTab("sentiment")}
              />
              <SidebarItem
                icon={<TrendingUp size={16} />}
                label="Analytics"
                active={activeTab === "analytics"}
                collapsed={
                  typeof window !== "undefined" && window.innerWidth < 768
                    ? false
                    : isSidebarCollapsed
                }
                onClick={() => setActiveTab("analytics")}
              />
              <SidebarItem
                icon={<Search size={16} />}
                label="Scout"
                active={activeTab === "scout"}
                collapsed={
                  typeof window !== "undefined" && window.innerWidth < 768
                    ? false
                    : isSidebarCollapsed
                }
                onClick={() => setActiveTab("scout")}
              />
              <SidebarItem
                icon={<Bot size={16} />}
                label="Workflow"
                active={activeTab === "intelligence"}
                collapsed={
                  typeof window !== "undefined" && window.innerWidth < 768
                    ? false
                    : isSidebarCollapsed
                }
                onClick={() => setActiveTab("intelligence")}
              />
              <SidebarItem
                icon={<Cpu size={16} />}
                label="Intel Center"
                active={activeTab === "intel-center"}
                collapsed={
                  typeof window !== "undefined" && window.innerWidth < 768
                    ? false
                    : isSidebarCollapsed
                }
                onClick={() => setActiveTab("intel-center")}
              />
              <SidebarItem
                icon={<Database size={16} />}
                label="Data Ops"
                active={activeTab === "enterprise"}
                collapsed={
                  typeof window !== "undefined" && window.innerWidth < 768
                    ? false
                    : isSidebarCollapsed
                }
                onClick={() => setActiveTab("enterprise")}
              />
              <SidebarItem
                icon={<ShieldCheck size={16} />}
                label="Retention"
                active={activeTab === "retention"}
                collapsed={
                  typeof window !== "undefined" && window.innerWidth < 768
                    ? false
                    : isSidebarCollapsed
                }
                onClick={() => setActiveTab("retention")}
              />
            </nav>

            <div className={`px-2 pb-1`}>
              <SidebarItem
                icon={<Settings size={16} />}
                label="Settings"
                active={activeTab === "providers"}
                collapsed={
                  typeof window !== "undefined" && window.innerWidth < 768
                    ? false
                    : isSidebarCollapsed
                }
                onClick={() => setActiveTab("providers")}
              />
            </div>

            <div
              className={`mt-auto pb-2 text-center select-none pointer-events-none`}
            >
              <span className="text-[10px] text-slate-500 font-mono tracking-wider">
                {isSidebarCollapsed
                  ? `v${APP_VERSION}`
                  : `AURELINX v${APP_VERSION}`}
              </span>
            </div>

            <div className={`px-2 pb-2 max-md:hidden`}>
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className={`${isSidebarCollapsed ? "h-11 w-11 mx-auto" : "h-10 w-full"} flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-200 hover:bg-white/10 transition-all`}
              >
                {isSidebarCollapsed ? (
                  <PanelLeftOpen size={18} />
                ) : (
                  <PanelLeftClose size={18} />
                )}
              </button>
            </div>
          </motion.aside>

          <main
            className={`workspace-main-scale flex-1 h-full min-h-0 relative z-10 custom-scrollbar max-md:pt-14 ${activeTab === "intelligence" ? "p-0 overflow-hidden" : activeTab === "intel-center" || activeTab === "enterprise" ? "p-3 md:p-5 lg:p-6 overflow-y-auto lg:overflow-hidden flex flex-col" : "p-3 md:p-5 lg:p-6 overflow-y-auto"}`}
          >
            <ErrorBoundary>
              <Suspense
                fallback={<LoadingScreen label={`Loading ${activeTab}`} />}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    variants={containerVariants}
                    initial={false}
                    animate="visible"
                    className={`relative min-h-0 flex flex-col ${activeTab === "intelligence" ? "h-full" : activeTab === "intel-center" || activeTab === "enterprise" ? "h-auto lg:h-full" : "h-auto"}`}
                  >
                    {activeTab === "dashboard" && (
                      <>
                        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                          <motion.div
                            variants={itemVariants}
                            className="text-left"
                          >
                            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2 text-white">
                              Executive Dashboard
                            </h1>
                            <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-3xl">
                              Strategic workforce oversight and operational
                              intelligence.
                            </p>
                          </motion.div>
                          <motion.div
                            variants={itemVariants}
                            className="flex gap-2"
                          >
                            <UserManualButton defaultTab="dashboard" />
                            <button
                              onClick={() => {
                                loadEmployees();
                                loadCandidates();
                                loadAnalyticsSnapshot();
                              }}
                              className="px-4 py-2 rounded-lg border border-white/15 hover:bg-white/10 transition-all text-xs font-bold tracking-wide inline-flex items-center gap-2"
                            >
                              <RefreshCw size={14} /> Refresh
                            </button>
                            <div className="relative">
                              <button
                                onClick={() => setExportMenuOpen((v) => !v)}
                                className="px-4 py-2 rounded-lg border border-white/15 hover:bg-white/10 transition-all text-xs font-bold tracking-wide inline-flex items-center gap-2"
                              >
                                <Download size={14} /> Export{" "}
                                <ChevronDown size={13} />
                              </button>
                              {exportMenuOpen && (
                                <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-white/10 bg-[#0f1f33] shadow-2xl overflow-hidden z-50">
                                  <button
                                    onClick={async () => {
                                      setExportMenuOpen(false);
                                      await exportCurrentReport("pdf");
                                    }}
                                    className="w-full px-4 py-3 text-left text-sm hover:bg-white/5 flex items-center gap-2"
                                  >
                                    <FileText size={14} /> Export PDF
                                  </button>
                                  <button
                                    onClick={async () => {
                                      setExportMenuOpen(false);
                                      await exportCurrentReport("excel");
                                    }}
                                    className="w-full px-4 py-3 text-left text-sm hover:bg-white/5 flex items-center gap-2"
                                  >
                                    <FileSpreadsheet size={14} /> Export Excel
                                  </button>
                                  <button
                                    onClick={async () => {
                                      setExportMenuOpen(false);
                                      await exportCurrentReport("markdown");
                                    }}
                                    className="w-full px-4 py-3 text-left text-sm hover:bg-white/5 flex items-center gap-2"
                                  >
                                    <FileText size={14} /> Export Markdown
                                  </button>
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => navigate("/app", "enterprise")}
                              className="px-4 py-2 rounded-lg border border-cyan-400/20 bg-cyan-500/10 hover:bg-cyan-500/15 transition-all text-xs font-bold tracking-wide inline-flex items-center gap-2 text-cyan-100"
                            >
                              <Upload size={14} /> Import Data
                            </button>
                          </motion.div>
                        </header>

                        <section
                          className="dashboard-hero mb-10"
                          aria-label="Current workforce snapshot"
                        >
                          <div className="dashboard-hero-copy">
                            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-cyan-200/80 font-bold">
                              <span className="dashboard-live-dot" /> Current
                              data snapshot
                            </div>
                            <h2 className="mt-3 text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                              The shape of your organization, at a glance.
                            </h2>
                            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
                              Employee and candidate totals are sourced from
                              their separate profile records. Risk flags and
                              morale scores are stored indicators, not validated
                              attrition predictions.
                            </p>
                            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] uppercase tracking-[0.14em] text-slate-500">
                              <span>
                                Employees{" "}
                                <strong className="text-slate-200">
                                  {analyticsLoading
                                    ? "—"
                                    : (employeeTotal ??
                                      analyticsSnapshot.total)}
                                </strong>
                              </span>
                              <span className="h-1 w-1 rounded-full bg-slate-600" />
                              <span>
                                Candidates{" "}
                                <strong className="text-slate-200">
                                  {candidateTotal ?? candidates.length}
                                </strong>
                              </span>
                              <span className="h-1 w-1 rounded-full bg-slate-600" />
                              <span>Snapshot scope: current records</span>
                            </div>
                          </div>
                          <div className="dashboard-hero-metrics">
                            <div className="dashboard-metric dashboard-metric-primary">
                              <div className="dashboard-metric-label">
                                <Users size={14} /> Employee records
                              </div>
                              <div className="dashboard-metric-value">
                                {analyticsLoading
                                  ? "—"
                                  : (employeeTotal ?? analyticsSnapshot.total)}
                              </div>
                              <div className="dashboard-metric-note">
                                employee records
                              </div>
                            </div>
                            <div className="dashboard-metric">
                              <div className="dashboard-metric-label">
                                <Search size={14} /> Candidates
                              </div>
                              <div className="dashboard-metric-value">
                                {candidateTotal ?? candidates.length}
                              </div>
                              <div className="dashboard-metric-note">
                                candidate records
                              </div>
                            </div>
                            <div className="dashboard-metric dashboard-metric-risk">
                              <div className="dashboard-metric-label">
                                <TrendingUp size={14} /> At risk
                              </div>
                              <div className="dashboard-metric-value">
                                {analyticsLoading
                                  ? "—"
                                  : analyticsSnapshot.atRisk}
                              </div>
                              <div className="dashboard-metric-note">
                                {analyticsLoading
                                  ? "loading"
                                  : `source flags · ${analyticsSnapshot.atRiskPct}% of active employees`}
                              </div>
                            </div>
                            <div className="dashboard-metric">
                              <div className="dashboard-metric-label">
                                <Activity size={14} /> Avg morale
                              </div>
                              <div className="dashboard-metric-value">
                                {analyticsLoading
                                  ? "—"
                                  : Number(
                                      analyticsSnapshot.avgSentiment || 0,
                                    ).toFixed(2)}
                              </div>
                              <div className="dashboard-metric-note">
                                stored profile score
                              </div>
                            </div>
                          </div>
                        </section>

                        <section className="mb-8">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
                                Workspace Overview
                              </h2>
                              <p className="text-xs text-slate-500 mt-1">
                                Open each operational area from the same
                                authoritative dataset.
                              </p>
                            </div>
                          </div>
                          <div className="dashboard-command-grid">
                            {[
                              [
                                "analytics",
                                "Analytics",
                                "Distribution, sentiment, and risk trends.",
                                TrendingUp,
                              ],
                              [
                                "scout",
                                "Talent Scout",
                                "Candidate search and matching evidence.",
                                Search,
                              ],
                              [
                                "intelligence",
                                "Workflows",
                                "Auditable actions and tool execution.",
                                Bot,
                              ],
                              [
                                "intel-center",
                                "Intel Center",
                                "Signals, forecasts, and decision context.",
                                Cpu,
                              ],
                              [
                                "enterprise",
                                "Data Ops",
                                "Imports, governance, and data quality.",
                                Database,
                              ],
                              [
                                "retention",
                                "Retention",
                                "Sync health, risk proof, approvals.",
                                ShieldCheck,
                              ],
                            ].map(([tab, label, description, Icon]) => (
                              <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className="dashboard-command-link"
                              >
                                <span className="dashboard-command-icon">
                                  <Icon size={17} />
                                </span>
                                <span className="min-w-0">
                                  <span className="block text-sm font-bold text-white">
                                    {label}
                                  </span>
                                  <span className="mt-1 block text-[11px] leading-relaxed text-slate-400">
                                    {description}
                                  </span>
                                </span>
                                <ChevronRight
                                  size={14}
                                  className="ml-auto shrink-0 text-slate-600 transition-transform group-hover:translate-x-1"
                                />
                              </button>
                            ))}
                          </div>
                        </section>

                        <section className="dashboard-insight-grid mb-10">
                          <div className="dashboard-insight-panel dashboard-risk-panel">
                            <div className="flex items-start justify-between gap-4 mb-6">
                              <div>
                                <div className="dashboard-kicker">
                                  Risk composition
                                </div>
                                <h2 className="mt-1 text-lg font-extrabold text-white">
                                  Where attention is concentrated
                                </h2>
                              </div>
                              <div
                                className="dashboard-risk-ring"
                                style={{
                                  "--risk": `${Math.min(100, Number(analyticsSnapshot.atRiskPct || 0))}%`,
                                }}
                              >
                                <span>
                                  {analyticsLoading
                                    ? "—"
                                    : `${analyticsSnapshot.atRiskPct}%`}
                                </span>
                              </div>
                            </div>
                            <div className="space-y-4">
                              {(analyticsSnapshot.topRiskDrivers || [])
                                .length ? (
                                analyticsSnapshot.topRiskDrivers.map(
                                  (driver, index, rows) => {
                                    const max = Math.max(
                                      ...rows.map((item) =>
                                        Number(item.count || 0),
                                      ),
                                      1,
                                    );
                                    return (
                                      <button
                                        key={driver.factor}
                                        onClick={() =>
                                          openDriverDrilldown(driver.factor)
                                        }
                                        className="dashboard-risk-row group"
                                      >
                                        <span className="dashboard-risk-rank">
                                          0{index + 1}
                                        </span>
                                        <span className="min-w-0 flex-1 text-left">
                                          <span className="block text-sm font-semibold text-slate-200 group-hover:text-white">
                                            {driver.factor}
                                          </span>
                                          <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white/10">
                                            <span
                                              className="block h-full rounded-full bg-gradient-to-r from-rose-400 to-orange-300"
                                              style={{
                                                width: `${(Number(driver.count || 0) / max) * 100}%`,
                                              }}
                                            />
                                          </span>
                                        </span>
                                        <strong className="text-sm text-rose-300">
                                          {driver.count}
                                        </strong>
                                      </button>
                                    );
                                  },
                                )
                              ) : (
                                <div className="text-sm text-slate-500">
                                  No risk-driver data in the current snapshot.
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="dashboard-insight-panel dashboard-morale-panel">
                            <div className="dashboard-kicker">
                              Workforce health
                            </div>
                            <h2 className="mt-1 text-lg font-extrabold text-white">
                              Morale signal
                            </h2>
                            <div className="dashboard-morale-visual">
                              <div
                                className="dashboard-morale-gauge"
                                style={{
                                  "--morale": `${Math.max(0, Math.min(100, Number(analyticsSnapshot.avgSentiment || 0) * 100))}%`,
                                }}
                              >
                                <span>
                                  {analyticsLoading
                                    ? "—"
                                    : Number(
                                        analyticsSnapshot.avgSentiment || 0,
                                      ).toFixed(2)}
                                </span>
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-slate-200">
                                  Current model indicator
                                </div>
                                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                                  This is an observed snapshot, not a historical
                                  trend. Open Sentiment for department and
                                  time-based analysis.
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => setActiveTab("sentiment")}
                              className="dashboard-text-action"
                            >
                              Open sentiment intelligence{" "}
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        </section>

                        <section className="pb-10">
                          <motion.div
                            variants={itemVariants}
                            className="flex items-center justify-between mb-4 border-b border-white/5 pb-3"
                          >
                            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
                              Real-Time Talent Stream
                            </h2>
                            <button
                              onClick={() => setActiveTab("directory")}
                              className="text-xs text-cyan-300 hover:text-cyan-100 transition-all flex items-center gap-1 font-bold uppercase tracking-wide"
                            >
                              Full Directory <ChevronRight size={10} />
                            </button>
                          </motion.div>

                          <div className="space-y-6">
                            {employees.length === 0 &&
                              candidates.length > 0 && (
                                <div className="premium-card p-4 border border-cyan-400/20 bg-cyan-500/5 text-cyan-50">
                                  <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-200/80 mb-1">
                                    Candidate dataset available
                                  </div>
                                  <div className="text-sm text-cyan-50/90">
                                    {candidates.length} candidate records are
                                    loaded. Open Directory or Talent Scout to
                                    browse them.
                                  </div>
                                </div>
                              )}
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
                                  Employees
                                </h3>
                                <span className="text-[10px] text-slate-500">
                                  {employees.length} loaded
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                                {loading && employees.length === 0 ? (
                                  Array.from({ length: 4 }).map((_, idx) => (
                                    <div
                                      key={`employee-skel-${idx}`}
                                      className="premium-card p-4 min-h-[180px] animate-pulse border border-white/10 bg-white/5"
                                    >
                                      <div className="h-4 w-24 rounded bg-white/10 mb-3" />
                                      <div className="h-3 w-40 rounded bg-white/10 mb-6" />
                                      <div className="h-16 rounded bg-white/10" />
                                    </div>
                                  ))
                                ) : employees.length > 0 ? (
                                  employees.slice(0, 6).map((emp) => (
                                    <motion.div
                                      key={emp.id}
                                      variants={itemVariants}
                                    >
                                      <TalentCard
                                        talent={emp}
                                        onOpenProfile={() =>
                                          openProfileDetails(emp)
                                        }
                                      />
                                    </motion.div>
                                  ))
                                ) : (
                                  <div className="premium-card p-6 text-slate-300 flex items-center gap-3 md:col-span-3">
                                    <AlertTriangle size={18} /> No employee
                                    records imported yet. Candidate records are
                                    loaded separately below.
                                  </div>
                                )}
                              </div>
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
                                  Candidates
                                </h3>
                                <span className="text-[10px] text-slate-500">
                                  {candidates.length} loaded
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                                {loading && candidates.length === 0 ? (
                                  Array.from({ length: 4 }).map((_, idx) => (
                                    <div
                                      key={`candidate-skel-${idx}`}
                                      className="premium-card p-4 min-h-[180px] animate-pulse border border-white/10 bg-white/5"
                                    >
                                      <div className="h-4 w-24 rounded bg-white/10 mb-3" />
                                      <div className="h-3 w-40 rounded bg-white/10 mb-6" />
                                      <div className="h-16 rounded bg-white/10" />
                                    </div>
                                  ))
                                ) : candidates.length > 0 ? (
                                  candidates.slice(0, 6).map((cand) => (
                                    <motion.div
                                      key={cand.id}
                                      variants={itemVariants}
                                    >
                                      <TalentCard
                                        talent={cand}
                                        onOpenProfile={() =>
                                          openProfileDetails(cand)
                                        }
                                      />
                                    </motion.div>
                                  ))
                                ) : (
                                  <div className="premium-card p-6 text-slate-300 flex items-center gap-3 md:col-span-3">
                                    <AlertTriangle size={18} /> No candidate
                                    records imported yet.
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </section>
                      </>
                    )}
                    {visitedTabs.has("directory") && (
                      <div
                        hidden={activeTab !== "directory"}
                        style={{
                          display:
                            activeTab === "directory" ? undefined : "none",
                        }}
                        className="flex min-h-0 flex-1 flex-col"
                      >
                        <Suspense
                          fallback={<LoadingScreen label="Directory" />}
                        >
                          <DirectoryView
                            onExport={exportCurrentReport}
                            isAdmin={Boolean(user?.is_admin)}
                            cacheScope={
                              user?.tenant_id ||
                              user?.workspace_id ||
                              user?.user_id ||
                              "workspace"
                            }
                          />
                        </Suspense>
                      </div>
                    )}
                    {visitedTabs.has("analytics") && (
                      <div
                        hidden={activeTab !== "analytics"}
                        style={{
                          display:
                            activeTab === "analytics" ? undefined : "none",
                        }}
                        className="flex min-h-0 flex-1 flex-col"
                      >
                        <Suspense
                          fallback={<LoadingScreen label="Analytics" />}
                        >
                          <AnalyticsView />
                        </Suspense>
                      </div>
                    )}
                    {visitedTabs.has("scout") && (
                      <div
                        hidden={activeTab !== "scout"}
                        style={{
                          display: activeTab === "scout" ? undefined : "none",
                        }}
                        className="flex min-h-0 flex-1 flex-col"
                      >
                        <Suspense
                          fallback={<LoadingScreen label="Talent Scout" />}
                        >
                          <TalentScoutView />
                        </Suspense>
                      </div>
                    )}
                    {visitedTabs.has("intelligence") && (
                      <div
                        hidden={activeTab !== "intelligence"}
                        style={{
                          display:
                            activeTab === "intelligence" ? undefined : "none",
                        }}
                        className="absolute inset-0 flex min-h-0 flex-col"
                      >
                        <Suspense
                          fallback={<LoadingScreen label="Intelligence" />}
                        >
                          <IntelligenceChatView />
                        </Suspense>
                      </div>
                    )}
                    {visitedTabs.has("intel-center") && (
                      <div
                        hidden={activeTab !== "intel-center"}
                        style={{
                          display:
                            activeTab === "intel-center" ? undefined : "none",
                        }}
                        className="flex min-h-0 flex-1 flex-col"
                      >
                        <Suspense
                          fallback={
                            <LoadingScreen label="Intelligence Center" />
                          }
                        >
                          <IntelligenceCenterView />
                        </Suspense>
                      </div>
                    )}
                    {visitedTabs.has("sentiment") && (
                      <div
                        hidden={activeTab !== "sentiment"}
                        style={{
                          display:
                            activeTab === "sentiment" ? undefined : "none",
                        }}
                        className="flex min-h-0 flex-1 flex-col"
                      >
                        <Suspense
                          fallback={<LoadingScreen label="Sentiment" />}
                        >
                          <SentimentPulseView />
                        </Suspense>
                      </div>
                    )}
                    {visitedTabs.has("enterprise") && (
                      <div
                        hidden={activeTab !== "enterprise"}
                        style={{
                          display:
                            activeTab === "enterprise" ? undefined : "none",
                        }}
                        className="flex min-h-0 flex-1 flex-col"
                      >
                        <Suspense
                          fallback={<LoadingScreen label="Enterprise Ops" />}
                        >
                          <EnterpriseOpsView />
                        </Suspense>
                      </div>
                    )}
                    {visitedTabs.has("retention") && (
                      <div
                        hidden={activeTab !== "retention"}
                        style={{
                          display:
                            activeTab === "retention" ? undefined : "none",
                        }}
                        className="flex min-h-0 flex-1 flex-col"
                      >
                        <Suspense
                          fallback={<LoadingScreen label="Retention" />}
                        >
                          <RetentionOpsView />
                        </Suspense>
                      </div>
                    )}
                    {visitedTabs.has("providers") && (
                      <div
                        hidden={activeTab !== "providers"}
                        style={{
                          display:
                            activeTab === "providers" ? undefined : "none",
                        }}
                        className="flex min-h-0 flex-1 flex-col"
                      >
                        <Suspense fallback={<LoadingScreen label="Settings" />}>
                          <SettingsWorkspaceView />
                        </Suspense>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </Suspense>
            </ErrorBoundary>
          </main>
        </div>

        <AnimatePresence>
          {driverModal.open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[260] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() =>
                setDriverModal({
                  open: false,
                  factor: "",
                  items: [],
                  message: "",
                })
              }
            >
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                className="w-full max-w-3xl premium-card p-6 border border-white/15"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-extrabold mb-2">
                  {driverModal.factor} - Drilldown
                </h3>
                <p className="text-sm text-slate-300 mb-4">
                  Employee-specific attrition results appear here only when
                  validated departure and censoring data support them.
                </p>
                <div className="mb-3 flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-500">
                  <span>All matching records</span>
                  <span className="text-cyan-200">
                    {driverModal.items.length} total
                  </span>
                </div>
                <div className="max-h-[50vh] overflow-auto space-y-2">
                  {driverModal.items.map((item, index) => (
                    <div
                      key={item.employee_id}
                      className="rounded-lg border border-white/10 bg-white/5 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="mt-0.5 w-7 shrink-0 text-right font-mono text-[11px] text-slate-500">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="font-bold">{item.full_name}</div>
                            <div className="text-xs text-slate-300">
                              {item.role} | {item.department}
                            </div>
                            <div className="text-xs text-rose-300 mt-1">
                              Estimated attrition risk{" "}
                              {(item.risk_probability * 100).toFixed(1)}% |{" "}
                              {item.evidence}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            createInterventionFromDriver(
                              item,
                              driverModal.factor,
                            )
                          }
                          className="h-8 px-3 rounded border border-white/15 hover:bg-white/10 text-xs font-bold"
                        >
                          Create Intervention
                        </button>
                      </div>
                    </div>
                  ))}
                  {!driverModal.items.length && (
                    <div className="text-sm text-slate-400">
                      {driverModal.message ||
                        "No validated attrition results are available."}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
          {selectedProfile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden"
              onClick={() => setSelectedProfile(null)}
            >
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                className="w-full max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto overscroll-contain premium-card p-6 md:p-8 border border-white/15"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-2xl font-extrabold mb-2">
                  {selectedProfile.full_name}
                </h3>
                <p className="text-slate-300 mb-6">
                  {selectedProfile.role} - {selectedProfile.department}
                </p>
                {String(selectedProfile.email || "")
                  .toLowerCase()
                  .endsWith("@public.local") && (
                  <div className="mb-5 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-[11px] leading-relaxed text-amber-100">
                    Pseudonymous offline demo profile. Stored sentiment, risk,
                    retention, and candidate match values are sample indicators,
                    not validated individual predictions or hiring decisions.
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-6">
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1">
                      Email
                    </div>
                    <div className="break-all text-slate-200">
                      {selectedProfile.email || "N/A"}
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1">
                      {isCandidateRecord(selectedProfile)
                        ? "Stored match score"
                        : "Stored retention indicator"}
                    </div>
                    <div>
                      {isCandidateRecord(selectedProfile)
                        ? selectedProfile.match_score == null
                          ? "N/A"
                          : `${(Number(selectedProfile.match_score) * 100).toFixed(1)}%`
                        : selectedProfile.retention_prob == null
                          ? "N/A"
                          : `${(Number(selectedProfile.retention_prob) * 100).toFixed(1)}%`}
                      {!isCandidateRecord(selectedProfile) && (
                        <div className="mt-1 text-[10px] text-slate-500">
                          Stored source value; not an individual forecast.
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1">
                      {isCandidateRecord(selectedProfile)
                        ? "Stored candidate score"
                        : "Stored sentiment score"}
                    </div>
                    <div>{selectedProfile.sentiment_score ?? "N/A"}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1">
                      {isCandidateRecord(selectedProfile)
                        ? "Attrition status"
                        : "Imported risk flag"}
                    </div>
                    <div>
                      {isCandidateRecord(selectedProfile)
                        ? "Not an attrition label"
                        : selectedProfile.is_at_risk
                          ? "Flagged at risk in source"
                          : "Not flagged in source"}
                    </div>
                  </div>
                </div>

                {!isCandidateRecord(selectedProfile) && user?.is_admin && (
                  <section className="mb-6 rounded-lg border border-indigo-300/15 bg-indigo-300/[0.03] p-3 text-xs">
                    <h4 className="mb-2 font-semibold uppercase tracking-[0.16em] text-indigo-200">
                      Employment &amp; outcome record
                    </h4>
                    <div className="grid grid-cols-1 gap-2 text-slate-400 sm:grid-cols-2">
                      <span>
                        Status:{" "}
                        <strong className="text-slate-200">
                          {selectedProfile.employment_status || "Not provided"}
                        </strong>
                      </span>
                      <span>
                        Departure flag:{" "}
                        <strong className="text-slate-200">
                          {selectedProfile.departure_event == null
                            ? "Not provided"
                            : selectedProfile.departure_event
                              ? "Departed"
                              : "Active/censored"}
                        </strong>
                      </span>
                      <span>
                        Employment start:{" "}
                        <strong className="text-slate-200">
                          {selectedProfile.employment_start_date
                            ? new Date(
                                selectedProfile.employment_start_date,
                              ).toLocaleDateString()
                            : "Not provided"}
                        </strong>
                      </span>
                      <span>
                        Employment end:{" "}
                        <strong className="text-slate-200">
                          {selectedProfile.employment_end_date
                            ? new Date(
                                selectedProfile.employment_end_date,
                              ).toLocaleDateString()
                            : "Not provided"}
                        </strong>
                      </span>
                      <span>
                        Censor date:{" "}
                        <strong className="text-slate-200">
                          {selectedProfile.employment_censor_date
                            ? new Date(
                                selectedProfile.employment_censor_date,
                              ).toLocaleDateString()
                            : "Not provided"}
                        </strong>
                      </span>
                      <span>
                        Duration:{" "}
                        <strong className="text-slate-200">
                          {selectedProfile.employment_duration_years == null
                            ? "Not provided"
                            : `${Number(selectedProfile.employment_duration_years).toFixed(2)} years`}
                        </strong>
                      </span>
                      <span>
                        Compensation:{" "}
                        <strong className="text-slate-200">
                          {selectedProfile.salary == null
                            ? "Not provided"
                            : `${selectedProfile.salary_currency || "Currency not specified"} ${Number(selectedProfile.salary).toLocaleString()} per ${selectedProfile.salary_period || "period not specified"}`}
                        </strong>
                      </span>
                    </div>
                  </section>
                )}

                <div className="mb-6">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-2">
                    Skills
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(selectedProfile.skills || []).map((skill, idx) => (
                      <span
                        key={`${skill.name}-${idx}`}
                        className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs"
                      >
                        {skill.name} (L{skill.level})
                      </span>
                    ))}
                    {(!selectedProfile.skills ||
                      selectedProfile.skills.length === 0) && (
                      <span className="text-slate-400 text-sm">
                        No skills found.
                      </span>
                    )}
                  </div>
                </div>

                <div className="mb-6 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1">
                      Record ID
                    </div>
                    <div className="break-all font-mono text-slate-300">
                      {selectedProfile.id || "N/A"}
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1">
                      Join date
                    </div>
                    <div className="text-slate-300">
                      {selectedProfile.join_date
                        ? new Date(
                            selectedProfile.join_date,
                          ).toLocaleDateString()
                        : "N/A"}
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-2">
                    Experience history
                  </div>
                  <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
                    {(selectedProfile.experiences || []).map(
                      (experience, idx) => (
                        <div
                          key={`${experience.company}-${experience.position}-${idx}`}
                          className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs"
                        >
                          <div className="font-semibold text-slate-200">
                            {experience.position || "Role unavailable"}
                          </div>
                          <div className="text-slate-400">
                            {experience.company || "Company unavailable"} ·{" "}
                            {experience.duration_years ?? "N/A"} years
                          </div>
                          <div className="mt-1 text-[10px] text-slate-500">
                            {experience.effective_start
                              ? new Date(
                                  experience.effective_start,
                                ).toLocaleDateString()
                              : "Start date not provided"}
                            {" — "}
                            {experience.is_current
                              ? "Current"
                              : experience.effective_end
                                ? new Date(
                                    experience.effective_end,
                                  ).toLocaleDateString()
                                : "End date not provided"}
                          </div>
                          {experience.description && (
                            <div className="mt-1 text-slate-500">
                              {experience.description}
                            </div>
                          )}
                        </div>
                      ),
                    )}
                    {(!selectedProfile.experiences ||
                      selectedProfile.experiences.length === 0) && (
                      <div className="text-xs italic text-slate-500">
                        No experience records found.
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => setSelectedProfile(null)}
                    className="h-10 px-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
          {selectedProfileLoading && !selectedProfile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <div className="w-full max-w-md premium-card p-6 md:p-8 border border-white/15 flex items-center gap-3">
                <Loader2 className="animate-spin text-cyan-300" size={20} />
                <div>
                  <div className="font-bold text-white">Loading profile</div>
                  <div className="text-sm text-slate-400">
                    Fetching skills and experience from Postgres...
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  const showLocalWindowControls = isTauri && !isEmbeddedWindow;

  return (
    <div className="fixed inset-0 flex min-h-0 w-full flex-col overflow-hidden">
      <WindowControls />
      {showLocalWindowControls && (
        <div className="h-10 flex-none" aria-hidden="true" />
      )}
      <div className="relative flex-1 min-h-0 w-full overflow-hidden">
        {content}
      </div>
    </div>
  );
};

const SidebarItem = ({
  icon,
  label,
  active = false,
  onClick,
  collapsed = false,
}) => (
  <motion.button
    onClick={onClick}
    whileTap={{ scale: 0.98 }}
    className={`w-full flex items-center transition-all duration-200 group relative ${
      collapsed
        ? "h-11 w-11 mx-auto justify-center rounded-xl"
        : "gap-3 px-3 py-2 rounded-lg"
    } ${active ? "bg-primary/15 text-primary border border-primary/40 shadow-[0_0_0_1px_rgba(45,212,191,0.35)]" : "text-slate-400 hover:bg-white/8 hover:text-slate-100"}`}
  >
    {active && !collapsed && (
      <motion.div
        layoutId="nav-active-pill"
        className="absolute inset-0 rounded-lg bg-gradient-to-r from-teal-400/10 to-cyan-300/5"
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
      />
    )}
    <div
      className={`relative z-10 ${active ? "text-primary" : "group-hover:text-white"} transition-colors`}
    >
      {icon}
    </div>
    {!collapsed && (
      <span className="font-semibold text-[11px] uppercase tracking-[0.14em] relative z-10">
        {label}
      </span>
    )}
    {active && !collapsed && (
      <div className="ml-auto w-1.5 h-1.5 bg-primary rounded-full relative z-10" />
    )}
  </motion.button>
);

export default App;

const LoadingScreen = ({ label = "Loading" }) => (
  <div className="min-h-screen flex items-center justify-center bg-[#07111f] text-slate-100">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="animate-spin text-cyan-300" size={24} />
      <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
        {label}
      </div>
    </div>
  </div>
);
