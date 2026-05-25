import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, Users, MessageSquare, TrendingUp, Settings, Loader2, ChevronRight, Activity, Search, PanelLeftClose, PanelLeftOpen, RefreshCw, Bot, Building2, Cpu, Database } from 'lucide-react'
import TalentCard from './components/TalentCard'
import AureliusLogo from './components/AureliusLogo'
import Toast from './components/Toast'
import AuthScreen from './components/AuthScreen'
import { analysisAPI, employeesAPI, enterpriseAPI } from './services/apiClient'
import { useAuth } from './contexts/AuthContext'

const LandingPage = lazy(() => import('./components/LandingPage'))
const TalentScoutView = lazy(() => import('./components/TalentScoutView'))
const SentimentPulseView = lazy(() => import('./components/SentimentPulseView'))
const DirectoryView = lazy(() => import('./components/DirectoryView'))
const AnalyticsView = lazy(() => import('./components/AnalyticsView'))
const IntelligenceChatView = lazy(() => import('./components/IntelligenceChatView'))
const IntelligenceCenterView = lazy(() => import('./components/IntelligenceCenterView'))
const SettingsWorkspaceView = lazy(() => import('./components/SettingsWorkspaceView'))
const EnterpriseOpsView = lazy(() => import('./components/EnterpriseOpsView'))

const isAppPath = (pathname = '') => pathname === '/app' || pathname.startsWith('/app?') || pathname.startsWith('/app#')

const App = () => {
  const { isAuthenticated, loading: authLoading, logout, user } = useAuth()
  const EMPLOYEE_CACHE_KEY = 'aurelius_dashboard_employees_cache'
  const SNAPSHOT_CACHE_KEY = 'aurelius_dashboard_snapshot_cache'
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(false)
  const defaultWorkspaceTab = useMemo(() => 'dashboard', [])
  const [route, setRoute] = useState(() => {
    if (typeof window === 'undefined') return 'landing'
    return isAppPath(window.location.pathname) ? 'app' : 'landing'
  })
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === 'undefined') return defaultWorkspaceTab
    return isAppPath(window.location.pathname) ? defaultWorkspaceTab : 'landing'
  })
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 1200 : false
  )
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' })
  const [selectedProfile, setSelectedProfile] = useState(null)

  const [analyticsSnapshot, setAnalyticsSnapshot] = useState({
    total: 0,
    atRisk: 0,
    atRiskPct: 0,
    avgSentiment: 0,
    topRiskDrivers: [],
  })
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [driverModal, setDriverModal] = useState({ open: false, factor: '', items: [] })

  const navigate = (path, tab = null) => {
    if (typeof window === 'undefined') return
    window.history.pushState({}, '', path)
    setRoute(isAppPath(path) ? 'app' : 'landing')
    if (tab) setActiveTab(tab)
  }

  const showToast = (message, type = 'info') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 4000);
  };

  const loadEmployees = () => {
    if (employees.length === 0) setLoading(true)
    return employeesAPI.list(0, 12)
      .then(data => {
        setEmployees(data)
        localStorage.setItem(EMPLOYEE_CACHE_KEY, JSON.stringify(data))
        setLoading(false)
        return data
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
        if (employees.length === 0) showToast('Failed to load dashboard data', 'error')
        throw err
      })
  }

  const loadAnalyticsSnapshot = () => {
    setAnalyticsLoading(true)
    return analysisAPI.getAnalyticsSnapshot()
      .then((snap) => {
        const nextSnapshot = {
          total: snap.total || 0,
          atRisk: snap.atRisk || 0,
          atRiskPct: snap.atRiskPct || 0,
          avgSentiment: snap.avgSentiment || 0,
          topRiskDrivers: snap.topRiskDrivers || [],
        }
        setAnalyticsSnapshot(nextSnapshot)
        localStorage.setItem(SNAPSHOT_CACHE_KEY, JSON.stringify(nextSnapshot))
        setAnalyticsLoading(false)
        return nextSnapshot
      })
      .catch((err) => {
        console.error(err)
        setAnalyticsLoading(false)
        showToast('Failed to load analytics snapshot', 'error')
        throw err
      })
  }

  const openDriverDrilldown = async (factor) => {
    try {
      const res = await enterpriseAPI.getRiskDriverDrilldown(factor, 20)
      setDriverModal({ open: true, factor, items: res.items || [] })
    } catch (err) {
      console.error(err)
      showToast('Failed to load risk driver drilldown', 'error')
    }
  }

  const createInterventionFromDriver = async (employee, factor) => {
    try {
      await enterpriseAPI.createIntervention({
        title: `Mitigate ${factor} for ${employee.full_name}`,
        target_scope: 'employee',
        target_employee_id: employee.employee_id,
        target_department: employee.department,
        priority: employee.risk_probability >= 0.6 ? 'high' : 'medium',
        owner_name: 'HRBP',
        expected_impact: `Reduce attrition risk for ${employee.full_name} by targeted retention action.`,
      })
      showToast('Intervention created from risk evidence', 'success')
    } catch (err) {
      console.error(err)
      showToast('Failed to create intervention', 'error')
    }
  }

  const createTopRiskIntervention = async () => {
    const candidate = [...employees].sort((a, b) => {
      const aScore = (a.retention_prob ?? 0.5) - (a.sentiment_score ?? 0.5)
      const bScore = (b.retention_prob ?? 0.5) - (b.sentiment_score ?? 0.5)
      return aScore - bScore
    })[0]

    if (!candidate) {
      showToast('No employee records available for action', 'error')
      return
    }

    await enterpriseAPI.createIntervention({
      title: `Retention action for ${candidate.full_name}`,
      target_scope: 'employee',
      target_employee_id: candidate.employee_id,
      target_department: candidate.department,
      priority: candidate.risk_probability >= 0.6 ? 'high' : 'medium',
      owner_name: 'HRBP',
      expected_impact: `Reduce attrition risk for ${candidate.full_name} with targeted action.`,
    })
    showToast('Created top-risk intervention', 'success')
  }

  const exportCurrentReport = async () => {
    const atRisk = employees.filter(e => e.is_at_risk).length
    const ratio = employees.length > 0 ? ((atRisk / employees.length) * 100).toFixed(1) : '0.0'
    const summary = `Aurelius: ${employees.length} employees, Risk ${ratio}%.`
    const { generateAureliusReport } = await import('./utils/reportGenerator')
    generateAureliusReport(employees, summary)
    showToast('Intel Exported', 'success')
  }

  const refreshCoreData = async () => {
    await Promise.all([loadEmployees(), loadAnalyticsSnapshot()])
  }

  useEffect(() => {
    try {
      const cachedEmployees = JSON.parse(localStorage.getItem(EMPLOYEE_CACHE_KEY) || '[]')
      if (Array.isArray(cachedEmployees) && cachedEmployees.length > 0) {
        setEmployees(cachedEmployees)
        setLoading(false)
      }
      const cachedSnapshot = JSON.parse(localStorage.getItem(SNAPSHOT_CACHE_KEY) || 'null')
      if (cachedSnapshot && typeof cachedSnapshot === 'object') {
        setAnalyticsSnapshot((prev) => ({ ...prev, ...cachedSnapshot }))
        setAnalyticsLoading(false)
      }
    } catch (err) {
      console.error(err)
    }
  }, [])

  useEffect(() => {
    if (route !== 'app' || authLoading || !isAuthenticated) {
      return
    }

    loadEmployees().catch(() => {})
    loadAnalyticsSnapshot().catch(() => {})
  }, [route, authLoading, isAuthenticated])

  useEffect(() => {
    const syncRoute = () => {
      if (typeof window === 'undefined') return
      setRoute(isAppPath(window.location.pathname) ? 'app' : 'landing')
    }

    window.addEventListener('popstate', syncRoute)
    return () => window.removeEventListener('popstate', syncRoute)
  }, [])

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 1200) {
        setIsSidebarCollapsed(true)
      }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])



  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.03, delayChildren: 0.1 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  }

  const pageAgentConfig = useMemo(() => {
    const topDriver = analyticsSnapshot.topRiskDrivers?.[0]
    const surfaceMap = {
      dashboard: 'dashboard',
      directory: 'directory',
      analytics: 'dashboard',
      scout: 'scout',
      intelligence: 'workflow',
      'intel-center': 'workflow',
      sentiment: 'workflow',
    }
    const surface = surfaceMap[activeTab] || 'workflow'
    const factsByTab = {
      dashboard: [
        { label: 'Workforce', value: analyticsLoading ? '...' : analyticsSnapshot.total },
        { label: 'At Risk', value: analyticsLoading ? '...' : analyticsSnapshot.atRisk },
        { label: 'Top Driver', value: topDriver?.factor || 'n/a' },
      ],
      directory: [
        { label: 'Loaded', value: employees.length },
        { label: 'Total', value: analyticsSnapshot.total || employees.length },
        { label: 'At Risk', value: employees.filter((e) => e.is_at_risk).length },
      ],
      analytics: [
        { label: 'Total', value: analyticsSnapshot.total || 0 },
        { label: 'Risk %', value: analyticsLoading ? '...' : `${analyticsSnapshot.atRiskPct}%` },
        { label: 'Morale', value: analyticsLoading ? '...' : Number(analyticsSnapshot.avgSentiment || 0).toFixed(2) },
      ],
      scout: [
        { label: 'Candidates', value: employees.length },
        { label: 'Risk', value: analyticsSnapshot.atRisk || 0 },
        { label: 'Mode', value: 'Search' },
      ],
      sentiment: [
        { label: 'Morale', value: Number(analyticsSnapshot.avgSentiment || 0).toFixed(2) },
        { label: 'Risk %', value: analyticsLoading ? '...' : `${analyticsSnapshot.atRiskPct}%` },
        { label: 'Trend', value: 'Live' },
      ],
      'intel-center': [
        { label: 'Calculators', value: '5 Algorithmic' },
        { label: 'Graph Model', value: 'PageRank + Dijkstra' },
        { label: 'Survival Ratio', value: 'Tenure-Scale' },
      ],
    }
    const actionsByTab = {
      dashboard: [
        { key: 'refresh', label: 'Refresh dashboard', description: 'Reload live workforce and snapshot data.', onClick: refreshCoreData },
        { key: 'drilldown', label: 'Open top risk driver', description: topDriver ? `Inspect ${topDriver.factor} across employees.` : 'No driver available.', onClick: async () => { if (topDriver) await openDriverDrilldown(topDriver.factor) }, disabled: !topDriver },
        { key: 'retain', label: 'Create top-risk intervention', description: 'Create a retention action for the highest-risk employee.', onClick: createTopRiskIntervention },
        { key: 'export', label: 'Export report', description: 'Generate the leadership report as a PDF.', onClick: exportCurrentReport },
      ],
      directory: [
        { key: 'refresh', label: 'Refresh directory', description: 'Reload the visible employee slice and totals.', onClick: refreshCoreData },
        { key: 'export', label: 'Export report', description: 'Generate a PDF from the current workforce.', onClick: exportCurrentReport },
        { key: 'dashboard', label: 'Open dashboard', description: 'Move to the executive dashboard.', onClick: async () => navigate('/app', 'dashboard') },
      ],
      analytics: [
        { key: 'refresh', label: 'Refresh metrics', description: 'Reload the live analytics stream and snapshot.', onClick: refreshCoreData },
        { key: 'drilldown', label: 'Open top driver', description: topDriver ? `Inspect ${topDriver.factor}.` : 'No driver available.', onClick: async () => { if (topDriver) await openDriverDrilldown(topDriver.factor) }, disabled: !topDriver },
        { key: 'export', label: 'Export report', description: 'Generate the leadership report as a PDF.', onClick: exportCurrentReport },
      ],
      scout: [
        { key: 'directory', label: 'Open directory', description: 'See the broader employee directory and profiles.', onClick: async () => navigate('/app', 'directory') },
        { key: 'refresh', label: 'Refresh data', description: 'Reload employees before running another search.', onClick: refreshCoreData },
        { key: 'dashboard', label: 'Open dashboard', description: 'Move back to executive oversight.', onClick: async () => navigate('/app', 'dashboard') },
      ],
      intelligence: [
        { key: 'workflow', label: 'Open workflow view', description: 'Keep the full chat workflow in focus.', onClick: async () => navigate('/app', 'intelligence') },
        { key: 'dashboard', label: 'Open dashboard', description: 'Move to executive metrics and risk.', onClick: async () => navigate('/app', 'dashboard') },
      ],
      sentiment: [
        { key: 'refresh', label: 'Refresh sentiment', description: 'Reload the current workforce snapshot.', onClick: refreshCoreData },
        { key: 'dashboard', label: 'Open dashboard', description: 'Move to the executive dashboard.', onClick: async () => navigate('/app', 'dashboard') },
        { key: 'export', label: 'Export report', description: 'Generate the leadership report as a PDF.', onClick: exportCurrentReport },
      ],
      'intel-center': [
        { key: 'refresh', label: 'Recalculate Centralities', description: 'Run all advanced mathematical models on the active roster.', onClick: refreshCoreData },
        { key: 'dashboard', label: 'Open dashboard', description: 'Move to the executive dashboard.', onClick: async () => navigate('/app', 'dashboard') },
      ],
    }
    const titles = {
      dashboard: 'Dashboard AI',
      directory: 'Directory AI',
      analytics: 'Analytics AI',
      scout: 'Scout AI',
      intelligence: 'Workflow AI',
      sentiment: 'Sentiment AI',
      'intel-center': 'Intel Center AI',
    }
    const subtitles = {
      dashboard: 'Ask anything about this page.',
      directory: 'Ask anything about this page.',
      analytics: 'Ask anything about this page.',
      scout: 'Ask anything about this page.',
      intelligence: 'Ask anything about this page.',
      sentiment: 'Ask anything about this page.',
      'intel-center': 'Ask anything about this page.',
    }
    return {
      surface,
      title: titles[activeTab] || 'Page Copilot',
      subtitle: subtitles[activeTab] || 'Ask questions about this page or run actions.',
      facts: factsByTab[activeTab] || [],
      actions: actionsByTab[activeTab] || [],
      context: {
        route: activeTab,
        totalEmployees: employees.length,
        analyticsSnapshot,
        workspaceReady: employees.length > 0 || analyticsSnapshot.total > 0,
      },
    }
  }, [activeTab, analyticsSnapshot, analyticsLoading, employees, loadAnalyticsSnapshot, loadEmployees])

  if (route !== 'app') {
    return (
      <Suspense fallback={<LoadingScreen label="Loading landing page" />}>
        <LandingPage
          onEnterWorkspace={() => navigate('/app', defaultWorkspaceTab)}
          onOpenEnterprise={() => navigate('/app', 'enterprise')}
        />
      </Suspense>
    )
  }

  if (authLoading) {
    return <LoadingScreen label="Checking account access" />
  }

  if (!isAuthenticated) {
    return <AuthScreen />
  }

  return (
    <div className="flex h-screen bg-[#07111f] text-slate-100 relative overflow-hidden selection:bg-primary/30 antialiased">
      <Toast 
        isVisible={toast.visible} 
        message={toast.message} 
        type={toast.type} 
        onClose={() => setToast(p => ({ ...p, visible: false }))} 
      />
      
      {/* ATMOSPHERE - SUBTLE */}
      <div className="absolute top-0 right-0 w-[680px] h-[680px] bg-cyan-400/10 blur-[130px] rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none z-0" />
      <div className="absolute bottom-0 left-1/3 w-[520px] h-[520px] bg-amber-300/5 blur-[140px] rounded-full pointer-events-none z-0" />
      
      <div className="relative z-20 flex w-full h-full p-1.5 md:p-2 gap-1.5 md:gap-2">
        <motion.aside 
          initial={false}
          animate={{ width: isSidebarCollapsed ? 64 : 220 }}
          transition={{ duration: 0.3, ease: "circOut" }}
          className="bg-[#0f1f33]/85 border border-white/10 flex flex-col h-full relative overflow-hidden shadow-2xl rounded-2xl"
        >
          <div className={`h-14 px-2 mb-2 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-start'}`}>
            <AureliusLogo collapsed={isSidebarCollapsed} size={24} />
          </div>

          {!isSidebarCollapsed && (
            <div className="px-3 pb-3">
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Signed In</div>
                <div className="mt-1 text-sm font-bold text-white truncate">{user?.full_name || 'Workspace User'}</div>
                <div className="text-xs text-slate-400 truncate">{user?.email || 'No email loaded'}</div>
                <button
                  onClick={logout}
                  className="mt-3 h-9 w-full rounded-lg border border-white/10 bg-white/5 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-200 hover:bg-white/10"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
          
          <nav className={`flex-1 ${isSidebarCollapsed ? 'px-1' : 'px-2'} space-y-1`}>
            <SidebarItem icon={<LayoutDashboard size={16} />} label="Dashboard" active={activeTab === 'dashboard'} collapsed={isSidebarCollapsed} onClick={() => setActiveTab('dashboard')} />
            <SidebarItem icon={<Users size={16} />} label="Directory" active={activeTab === 'directory'} collapsed={isSidebarCollapsed} onClick={() => setActiveTab('directory')} />
            <SidebarItem icon={<MessageSquare size={16} />} label="Sentiment" active={activeTab === 'sentiment'} collapsed={isSidebarCollapsed} onClick={() => setActiveTab('sentiment')} />
            <SidebarItem icon={<TrendingUp size={16} />} label="Analytics" active={activeTab === 'analytics'} collapsed={isSidebarCollapsed} onClick={() => setActiveTab('analytics')} />
            <SidebarItem icon={<Search size={16} />} label="Scout" active={activeTab === 'scout'} collapsed={isSidebarCollapsed} onClick={() => setActiveTab('scout')} />
            <SidebarItem icon={<Bot size={16} />} label="Workflow" active={activeTab === 'intelligence'} collapsed={isSidebarCollapsed} onClick={() => setActiveTab('intelligence')} />
            <SidebarItem icon={<Cpu size={16} />} label="Intel Center" active={activeTab === 'intel-center'} collapsed={isSidebarCollapsed} onClick={() => setActiveTab('intel-center')} />
            <SidebarItem icon={<Database size={16} />} label="Data Ops" active={activeTab === 'enterprise'} collapsed={isSidebarCollapsed} onClick={() => setActiveTab('enterprise')} />
          </nav>

          <div className={`${isSidebarCollapsed ? 'px-1' : 'px-2'} pb-1`}>
            <SidebarItem icon={<Settings size={16} />} label="Settings" active={activeTab === 'providers'} collapsed={isSidebarCollapsed} onClick={() => setActiveTab('providers')} />
          </div>

          <div className={`${isSidebarCollapsed ? 'px-1' : 'px-2'} pb-2`}>
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={`${isSidebarCollapsed ? 'h-11 w-11 mx-auto' : 'h-10 w-full'} flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-200 hover:bg-white/10 transition-all`}
            >
              {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </div>
        </motion.aside>

        <main className="flex-1 h-[calc(100vh-0.75rem)] md:h-[calc(100vh-1rem)] overflow-y-auto p-3 md:p-5 lg:p-6 relative z-10 custom-scrollbar">
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
              {activeTab === 'dashboard' && (
                <>
                  <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                    <motion.div variants={itemVariants} className="text-left">
                      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2 text-white">Executive Dashboard</h1>
                      <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-3xl">Strategic workforce oversight and operational intelligence.</p>
                    </motion.div>
                    <motion.div variants={itemVariants} className="flex gap-2">
                      <button
                        onClick={() => {
                          loadEmployees()
                          loadAnalyticsSnapshot()
                        }}
                        className="px-4 py-2 rounded-lg border border-white/15 hover:bg-white/10 transition-all text-xs font-bold tracking-wide inline-flex items-center gap-2"
                      >
                        <RefreshCw size={14} /> Refresh
                      </button>
                      <button 
                        onClick={exportCurrentReport}
                        className="px-4 py-2 rounded-lg border border-white/15 hover:bg-white/10 transition-all text-xs font-bold tracking-wide"
                      >
                        Export Report
                      </button>
                    </motion.div>
                  </header>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 mb-8">
                    <motion.div variants={itemVariants}><StatCard title="Workforce" value={analyticsLoading ? '—' : analyticsSnapshot.total} delta="Enterprise total count" color="primary" icon={<Users size={16} />} /></motion.div>
                    <motion.div variants={itemVariants}><StatCard title="Risk Cluster" value={analyticsLoading ? '—' : analyticsSnapshot.atRisk} delta={analyticsLoading ? 'Loading snapshot' : `${analyticsSnapshot.atRiskPct}% needs review`} color="risk" icon={<TrendingUp size={16} />} /></motion.div>
                    <motion.div variants={itemVariants}><StatCard title="Avg Morale" value={analyticsLoading ? '—' : Number(analyticsSnapshot.avgSentiment || 0).toFixed(2)} delta="Model snapshot" color="accent" icon={<Activity size={16} />} /></motion.div>
                  </div>

                  <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 mb-8">
                    {(analyticsSnapshot.topRiskDrivers || []).map((driver) => (
                      <button key={driver.factor} onClick={() => openDriverDrilldown(driver.factor)} className="premium-card p-4 border border-rose-300/20 text-left hover:border-rose-300/50 transition-all">
                        <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400 mb-2">Top Risk Driver</div>
                        <div className="text-sm font-bold text-white mb-1">{driver.factor}</div>
                        <div className="text-2xl font-extrabold text-rose-300">{driver.count}</div>
                      </button>
                    ))}
                  </section>

                  <section className="pb-10">
                    <motion.div variants={itemVariants} className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                      <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
                        Real-Time Talent Stream
                      </h2>
                      <button 
                        onClick={() => setActiveTab('directory')}
                        className="text-xs text-cyan-300 hover:text-cyan-100 transition-all flex items-center gap-1 font-bold uppercase tracking-wide"
                      >
                        Full Directory <ChevronRight size={10} />
                      </button>
                    </motion.div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                      {loading && employees.length === 0 ? (
                        Array.from({ length: 6 }).map((_, idx) => (
                          <div key={`employee-skel-${idx}`} className="premium-card p-4 min-h-[180px] animate-pulse border border-white/10 bg-white/5">
                            <div className="h-4 w-24 rounded bg-white/10 mb-3" />
                            <div className="h-3 w-40 rounded bg-white/10 mb-6" />
                            <div className="h-16 rounded bg-white/10" />
                          </div>
                        ))
                      ) : (
                        employees.slice(0, 6).map((emp) => (
                          <motion.div key={emp.id} variants={itemVariants}>
                            <TalentCard talent={emp} onOpenProfile={() => setSelectedProfile(emp)} />
                          </motion.div>
                        ))
                      )}
                    </div>
                  </section>
                </>
              )}
              {activeTab === 'directory' && <DirectoryView onExport={exportCurrentReport} />}
              {activeTab === 'analytics' && <AnalyticsView />}
              {activeTab === 'scout' && <TalentScoutView />}
              {activeTab === 'intelligence' && <div className="h-full min-h-0"><IntelligenceChatView /></div>}
              {activeTab === 'intel-center' && <IntelligenceCenterView />}
              {activeTab === 'sentiment' && <SentimentPulseView />}
              {activeTab === 'enterprise' && <EnterpriseOpsView />}
              {activeTab === 'providers' && <SettingsWorkspaceView />}
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
            onClick={() => setDriverModal({ open: false, factor: '', items: [] })}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              className="w-full max-w-3xl premium-card p-6 border border-white/15"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-extrabold mb-2">{driverModal.factor} - Drilldown</h3>
              <p className="text-sm text-slate-300 mb-4">Create interventions directly from evidence-backed at-risk profiles.</p>
              <div className="max-h-[50vh] overflow-auto space-y-2">
                {driverModal.items.map((item) => (
                  <div key={item.employee_id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold">{item.full_name}</div>
                        <div className="text-xs text-slate-300">{item.role} | {item.department}</div>
                        <div className="text-xs text-rose-300 mt-1">
                          Risk {(item.risk_probability * 100).toFixed(1)}% | {item.evidence}
                        </div>
                      </div>
                      <button
                        onClick={() => createInterventionFromDriver(item, driverModal.factor)}
                        className="h-8 px-3 rounded border border-white/15 hover:bg-white/10 text-xs font-bold"
                      >
                        Create Action
                      </button>
                    </div>
                  </div>
                ))}
                {!driverModal.items.length && <div className="text-sm text-slate-400">No impacted employees found.</div>}
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
              <h3 className="text-2xl font-extrabold mb-2">{selectedProfile.full_name}</h3>
              <p className="text-slate-300 mb-6">{selectedProfile.role} - {selectedProfile.department}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-6">
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1">Email</div>
                  <div>{selectedProfile.email || 'N/A'}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1">Retention</div>
                  <div>{selectedProfile.retention_prob ? `${(selectedProfile.retention_prob * 100).toFixed(1)}%` : 'N/A'}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1">Sentiment</div>
                  <div>{selectedProfile.sentiment_score ?? 'N/A'}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1">Risk</div>
                  <div>{selectedProfile.is_at_risk ? 'High Attrition Risk' : 'Optimal Retention'}</div>
                </div>
              </div>

              <div className="mb-6">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-2">Skills</div>
                <div className="flex flex-wrap gap-2">
                  {(selectedProfile.skills || []).slice(0, 12).map((skill, idx) => (
                    <span key={`${skill.name}-${idx}`} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs">
                      {skill.name} (L{skill.level})
                    </span>
                  ))}
                  {(!selectedProfile.skills || selectedProfile.skills.length === 0) && (
                    <span className="text-slate-400 text-sm">No skills found.</span>
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
      </AnimatePresence>
    </div>
  )
}

const SidebarItem = ({ icon, label, active = false, onClick, collapsed = false }) => (
  <motion.button 
    onClick={onClick}
    whileTap={{ scale: 0.98 }}
    className={`w-full flex items-center transition-all duration-200 group relative ${
      collapsed ? 'h-11 w-11 mx-auto justify-center rounded-xl' : 'gap-3 px-3 py-2 rounded-lg'
    } ${active ? 'bg-primary/15 text-primary border border-primary/40 shadow-[0_0_0_1px_rgba(45,212,191,0.35)]' : 'text-slate-400 hover:bg-white/8 hover:text-slate-100'}`}
  >
    {active && !collapsed && (
      <motion.div
        layoutId="nav-active-pill"
        className="absolute inset-0 rounded-lg bg-gradient-to-r from-teal-400/10 to-cyan-300/5"
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
      />
    )}
    <div className={`relative z-10 ${active ? 'text-primary' : 'group-hover:text-white'} transition-colors`}>
      {icon}
    </div>
    {!collapsed && (
      <span className="font-semibold text-[11px] uppercase tracking-[0.14em] relative z-10">
        {label}
      </span>
    )}
    {active && !collapsed && <div className="ml-auto w-1.5 h-1.5 bg-primary rounded-full relative z-10" />}
  </motion.button>
)

const STAT_COLOR_MAP = {
  primary: { icon: 'text-cyan-300', dot: 'bg-cyan-300' },
  risk: { icon: 'text-rose-400', dot: 'bg-rose-400' },
  accent: { icon: 'text-emerald-300', dot: 'bg-emerald-300' },
}

const StatCard = ({ title, value, delta, color, icon }) => {
  const style = STAT_COLOR_MAP[color] || STAT_COLOR_MAP.primary

  return (
  <div className="premium-card p-5 group transition-all duration-200 hover:border-cyan-300/40">
    <div className="flex justify-between items-center mb-5">
      <h4 className="text-slate-300 text-[10px] font-bold tracking-[0.18em] uppercase">{title}</h4>
      <div className={`p-2 rounded-lg bg-white/[0.04] ${style.icon} transition-colors border border-white/10`}>
        {icon}
      </div>
    </div>
    <div className="text-3xl font-extrabold mb-1 tracking-tight">{value}</div>
    <div className="text-slate-300 text-[10px] font-semibold flex items-center gap-2 uppercase tracking-[0.15em]">
      <div className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {delta}
    </div>
  </div>
)
}

export default App

const LoadingScreen = ({ label = 'Loading' }) => (
  <div className="min-h-screen flex items-center justify-center bg-[#07111f] text-slate-100">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="animate-spin text-cyan-300" size={24} />
      <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</div>
    </div>
  </div>
)
