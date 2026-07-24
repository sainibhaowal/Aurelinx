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
} from "lucide-react";
import TalentCard from "./components/TalentCard";
import AurelinxLogo from "./components/AurelinxLogo";
import Toast from "./components/Toast";
import AuthScreen from "./components/AuthScreen";
import WindowControls from "./components/WindowControls";
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

const isAppPath = (pathname = "") =>
  pathname === "/app" ||
  pathname.startsWith("/app?") ||
  pathname.startsWith("/app#");

const App = () => {
  const { isAuthenticated, loading: authLoading, logout, user } = useAuth();

  const EMPLOYEE_CACHE_KEY = "aurelinx_dashboard_employees_cache";
  const CANDIDATE_CACHE_KEY = "aurelinx_dashboard_candidates_cache";
  const SNAPSHOT_CACHE_KEY = "aurelinx_dashboard_snapshot_cache";
  const [employees, setEmployees] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const defaultWorkspaceTab = "dashboard";
  const [route, setRoute] = useState(() => {
    if (typeof window === "undefined") return "landing";
    return isAppPath(window.location.pathname) ? "app" : "landing";
  });
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === "undefined") return defaultWorkspaceTab;
    return isAppPath(window.location.pathname)
      ? defaultWorkspaceTab
      : "landing";
  });
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
  });

  const navigate = (path, tab = null) => {
    if (typeof window === "undefined") return;
    window.history.pushState({}, "", path);
    setRoute(isAppPath(path) ? "app" : "landing");
    if (tab) setActiveTab(tab);
  };

  const showToast = (message, type = "info") => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 4000);
  };

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
    return employeesAPI
      .list(0, 12)
      .then((data) => {
        setEmployees(data);
        localStorage.setItem(EMPLOYEE_CACHE_KEY, JSON.stringify(data));
        setLoading(false);
        return data;
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
        if (employees.length === 0)
          showToast("Failed to load dashboard data", "error");
        throw err;
      });
  };

  const loadCandidates = () => {
    if (candidates.length === 0) setLoading(true);
    return candidatesAPI
      .list(0, 12)
      .then((data) => {
        setCandidates(data);
        localStorage.setItem(CANDIDATE_CACHE_KEY, JSON.stringify(data));
        setLoading(false);
        return data;
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
        if (candidates.length === 0)
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
        console.error(err);
        setAnalyticsLoading(false);
        showToast("Failed to load analytics snapshot", "error");
        throw err;
      });
  };

  const openDriverDrilldown = async (factor) => {
    try {
      const res = await enterpriseAPI.getRiskDriverDrilldown(factor, 20);
      setDriverModal({ open: true, factor, items: res.items || [] });
    } catch (err) {
      console.error(err);
      showToast("Failed to load risk driver drilldown", "error");
    }
  };

  const createInterventionFromDriver = async (employee, factor) => {
    try {
      await enterpriseAPI.createIntervention({
        title: `Mitigate ${factor} for ${employee.full_name}`,
        target_scope: "employee",
        target_employee_id: employee.employee_id,
        target_department: employee.department,
        priority: employee.risk_probability >= 0.6 ? "high" : "medium",
        owner_name: "HRBP",
        expected_impact: `Reduce attrition risk for ${employee.full_name} by targeted retention action.`,
      });
      showToast("Intervention created from risk evidence", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to create intervention", "error");
    }
  };

  const exportCurrentReport = async (format = "pdf") => {
    const primaryRecords = employees.length > 0 ? employees : candidates;
    const atRisk = primaryRecords.filter((e) => e.is_at_risk).length;
    const ratio =
      primaryRecords.length > 0
        ? ((atRisk / primaryRecords.length) * 100).toFixed(1)
        : "0.0";
    const summary = `Aurelinx: ${employees.length} employees, ${candidates.length} candidates, Risk ${ratio}%.`;
    const { generateAurelinxReport } = await import("./utils/reportGenerator");
    generateAurelinxReport(primaryRecords, summary, format);
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
    const syncRoute = () => {
      if (typeof window === "undefined") return;
      setRoute(isAppPath(window.location.pathname) ? "app" : "landing");
    };

    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
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
      transition: { staggerChildren: 0.03, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  let content;
  if (route !== "app") {
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
      <div className="flex h-screen bg-[#030712] text-slate-100 relative overflow-hidden selection:bg-cyan-500/30 antialiased">
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

      <div className="relative z-20 flex w-full h-full p-0 gap-1.5 md:gap-2 overflow-hidden">
        <motion.aside
          initial={false}
          animate={{ width: isSidebarCollapsed ? 64 : 220 }}
          transition={{ duration: 0.3, ease: "circOut" }}
          className="bg-slate-950/65 backdrop-blur-2xl border border-white/10 flex flex-col h-full relative overflow-hidden shadow-2xl rounded-2xl"
        >
          <div
            data-tauri-drag-region
            className={`h-14 px-2 mb-2 flex items-center ${isSidebarCollapsed ? "justify-center" : "justify-start"} cursor-move`}
          >
            <AurelinxLogo collapsed={isSidebarCollapsed} size={24} />
          </div>

          {!isSidebarCollapsed && (
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
            className={`flex-1 ${isSidebarCollapsed ? "px-1" : "px-2"} space-y-1`}
          >
            <SidebarItem
              icon={<LayoutDashboard size={16} />}
              label="Dashboard"
              active={activeTab === "dashboard"}
              collapsed={isSidebarCollapsed}
              onClick={() => setActiveTab("dashboard")}
            />
            <SidebarItem
              icon={<Users size={16} />}
              label="Directory"
              active={activeTab === "directory"}
              collapsed={isSidebarCollapsed}
              onClick={() => setActiveTab("directory")}
            />
            <SidebarItem
              icon={<MessageSquare size={16} />}
              label="Sentiment"
              active={activeTab === "sentiment"}
              collapsed={isSidebarCollapsed}
              onClick={() => setActiveTab("sentiment")}
            />
            <SidebarItem
              icon={<TrendingUp size={16} />}
              label="Analytics"
              active={activeTab === "analytics"}
              collapsed={isSidebarCollapsed}
              onClick={() => setActiveTab("analytics")}
            />
            <SidebarItem
              icon={<Search size={16} />}
              label="Scout"
              active={activeTab === "scout"}
              collapsed={isSidebarCollapsed}
              onClick={() => setActiveTab("scout")}
            />
            <SidebarItem
              icon={<Bot size={16} />}
              label="Workflow"
              active={activeTab === "intelligence"}
              collapsed={isSidebarCollapsed}
              onClick={() => setActiveTab("intelligence")}
            />
            <SidebarItem
              icon={<Cpu size={16} />}
              label="Intel Center"
              active={activeTab === "intel-center"}
              collapsed={isSidebarCollapsed}
              onClick={() => setActiveTab("intel-center")}
            />
            <SidebarItem
              icon={<Database size={16} />}
              label="Data Ops"
              active={activeTab === "enterprise"}
              collapsed={isSidebarCollapsed}
              onClick={() => setActiveTab("enterprise")}
            />
          </nav>

          <div className={`${isSidebarCollapsed ? "px-1" : "px-2"} pb-1`}>
            <SidebarItem
              icon={<Settings size={16} />}
              label="Settings"
              active={activeTab === "providers"}
              collapsed={isSidebarCollapsed}
              onClick={() => setActiveTab("providers")}
            />
          </div>

          <div className="mt-auto pb-2 text-center select-none pointer-events-none">
            <span className="text-[10px] text-slate-500 font-mono tracking-wider">
              {isSidebarCollapsed ? "v1.0.0" : "AURELINX v1.0.0"}
            </span>
          </div>

          <div className={`${isSidebarCollapsed ? "px-1" : "px-2"} pb-2`}>
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

        <main className={`flex-1 h-full min-h-0 relative z-10 custom-scrollbar ${activeTab === "intelligence" ? "p-0 overflow-hidden" : "p-3 md:p-5 lg:p-6 overflow-y-auto"}`}>
          <Suspense fallback={<LoadingScreen label={`Loading ${activeTab}`} />}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="h-full min-h-0"
              >
                {activeTab === "dashboard" && (
                  <>
                    <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                      <motion.div variants={itemVariants} className="text-left">
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
                        <button
                          onClick={() => {
                            loadEmployees();
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 mb-8">
                      <motion.div variants={itemVariants}>
                        <StatCard
                          title="Workforce"
                          value={
                            analyticsLoading ? "—" : analyticsSnapshot.total
                          }
                          delta="Enterprise total count"
                          color="primary"
                          icon={<Users size={16} />}
                        />
                      </motion.div>
                      <motion.div variants={itemVariants}>
                        <StatCard
                          title="Candidates"
                          value={candidates.length}
                          delta="Imported candidate pool"
                          color="accent"
                          icon={<Search size={16} />}
                        />
                      </motion.div>
                      <motion.div variants={itemVariants}>
                        <StatCard
                          title="Risk Cluster"
                          value={
                            analyticsLoading ? "—" : analyticsSnapshot.atRisk
                          }
                          delta={
                            analyticsLoading
                              ? "Loading snapshot"
                              : `${analyticsSnapshot.atRiskPct}% needs review`
                          }
                          color="risk"
                          icon={<TrendingUp size={16} />}
                        />
                      </motion.div>
                      <motion.div variants={itemVariants}>
                        <StatCard
                          title="Avg Morale"
                          value={
                            analyticsLoading
                              ? "—"
                              : Number(
                                  analyticsSnapshot.avgSentiment || 0,
                                ).toFixed(2)
                          }
                          delta="Model snapshot"
                          color="accent"
                          icon={<Activity size={16} />}
                        />
                      </motion.div>
                    </div>

                    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 mb-8">
                      {(analyticsSnapshot.topRiskDrivers || []).map(
                        (driver) => (
                          <button
                            key={driver.factor}
                            onClick={() => openDriverDrilldown(driver.factor)}
                            className="premium-card p-4 border border-rose-300/20 text-left hover:border-rose-300/50 transition-all"
                          >
                            <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400 mb-2">
                              Top Risk Driver
                            </div>
                            <div className="text-sm font-bold text-white mb-1">
                              {driver.factor}
                            </div>
                            <div className="text-2xl font-extrabold text-rose-300">
                              {driver.count}
                            </div>
                          </button>
                        ),
                      )}
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
                        {employees.length === 0 && candidates.length > 0 && (
                          <div className="premium-card p-4 border border-cyan-400/20 bg-cyan-500/5 text-cyan-50">
                            <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-200/80 mb-1">
                              Candidate dataset available
                            </div>
                            <div className="text-sm text-cyan-50/90">
                              {candidates.length} candidate records are loaded.
                              Open Directory or Talent Scout to browse them.
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
                                <AlertTriangle size={18} /> No employee records
                                imported yet. Candidate records are loaded
                                separately below.
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
                                <AlertTriangle size={18} /> No candidate records
                                imported yet.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </section>
                  </>
                )}
                {activeTab === "directory" && (
                  <DirectoryView onExport={exportCurrentReport} />
                )}
                {activeTab === "analytics" && <AnalyticsView />}
                {activeTab === "scout" && <TalentScoutView />}
                {activeTab === "intelligence" && (
                  <div className="h-full min-h-0">
                    <IntelligenceChatView />
                  </div>
                )}
                {activeTab === "intel-center" && <IntelligenceCenterView />}
                {activeTab === "sentiment" && <SentimentPulseView />}
                {activeTab === "enterprise" && <EnterpriseOpsView />}
                {activeTab === "providers" && <SettingsWorkspaceView />}
              </motion.div>
            </AnimatePresence>
          </Suspense>
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
              setDriverModal({ open: false, factor: "", items: [] })
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
                Create interventions directly from evidence-backed at-risk
                profiles.
              </p>
              <div className="max-h-[50vh] overflow-auto space-y-2">
                {driverModal.items.map((item) => (
                  <div
                    key={item.employee_id}
                    className="rounded-lg border border-white/10 bg-white/5 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold">{item.full_name}</div>
                        <div className="text-xs text-slate-300">
                          {item.role} | {item.department}
                        </div>
                        <div className="text-xs text-rose-300 mt-1">
                          Risk {(item.risk_probability * 100).toFixed(1)}% |{" "}
                          {item.evidence}
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          createInterventionFromDriver(item, driverModal.factor)
                        }
                        className="h-8 px-3 rounded border border-white/15 hover:bg-white/10 text-xs font-bold"
                      >
                        Create Action
                      </button>
                    </div>
                  </div>
                ))}
                {!driverModal.items.length && (
                  <div className="text-sm text-slate-400">
                    No impacted employees found.
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
            className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedProfile(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              className="w-full max-w-2xl premium-card p-6 md:p-8 border border-white/15"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-extrabold mb-2">
                {selectedProfile.full_name}
              </h3>
              <p className="text-slate-300 mb-6">
                {selectedProfile.role} - {selectedProfile.department}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-6">
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1">
                    Email
                  </div>
                  <div>{selectedProfile.email || "N/A"}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1">
                    Retention
                  </div>
                  <div>
                    {selectedProfile.retention_prob
                      ? `${(selectedProfile.retention_prob * 100).toFixed(1)}%`
                      : "N/A"}
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1">
                    Sentiment
                  </div>
                  <div>{selectedProfile.sentiment_score ?? "N/A"}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1">
                    Risk
                  </div>
                  <div>
                    {selectedProfile.is_at_risk
                      ? "High Attrition Risk"
                      : "Optimal Retention"}
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-2">
                  Skills
                </div>
                <div className="flex flex-wrap gap-2">
                  {(selectedProfile.skills || [])
                    .slice(0, 12)
                    .map((skill, idx) => (
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

  return (
    <div className={`w-full h-full relative overflow-hidden flex flex-col ${isTauri ? "pt-10" : ""}`}>
      <WindowControls />
      <div className="flex-1 w-full overflow-hidden relative">
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

const STAT_COLOR_MAP = {
  primary: { icon: "text-cyan-300", dot: "bg-cyan-300" },
  risk: { icon: "text-rose-400", dot: "bg-rose-400" },
  accent: { icon: "text-emerald-300", dot: "bg-emerald-300" },
};

const StatCard = ({ title, value, delta, color, icon }) => {
  const style = STAT_COLOR_MAP[color] || STAT_COLOR_MAP.primary;

  return (
    <div className="premium-card p-5 group transition-all duration-200 hover:border-cyan-300/40">
      <div className="flex justify-between items-center mb-5">
        <h4 className="text-slate-300 text-[10px] font-bold tracking-[0.18em] uppercase">
          {title}
        </h4>
        <div
          className={`p-2 rounded-lg bg-white/[0.04] ${style.icon} transition-colors border border-white/10`}
        >
          {icon}
        </div>
      </div>
      <div className="text-3xl font-extrabold mb-1 tracking-tight">{value}</div>
      <div className="text-slate-300 text-[10px] font-semibold flex items-center gap-2 uppercase tracking-[0.15em]">
        <div className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
        {delta}
      </div>
    </div>
  );
};

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
