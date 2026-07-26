import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  Users,
  Download,
  AlertTriangle,
  FileText,
  FileSpreadsheet,
  ChevronDown,
  Fingerprint,
  Globe,
  Cpu,
  DollarSign,
} from "lucide-react";
import TalentCard from "./TalentCard";
import { UserManualButton } from "./UserManual";
import { candidatesAPI, employeesAPI } from "../services/apiClient";

const DirectoryView = ({ onExport }) => {
  // Keep the first paint light. Counts remain authoritative while records are
  // paged in as the user requests them.
  const DIRECTORY_PAGE_SIZE = 100;
  const [employees, setEmployees] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [selectedProfileLoading, setSelectedProfileLoading] = useState(false);
  const [workforceTotal, setWorkforceTotal] = useState(null);
  const [candidateTotal, setCandidateTotal] = useState(null);
  const [atRiskTotal, setAtRiskTotal] = useState(null);
  const [employeeDepartmentTotal, setEmployeeDepartmentTotal] = useState(null);
  const [candidateDepartmentTotal, setCandidateDepartmentTotal] = useState(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState("all");
  const [employeeOffset, setEmployeeOffset] = useState(0);
  const [candidateOffset, setCandidateOffset] = useState(0);
  const [hasMoreEmployees, setHasMoreEmployees] = useState(false);
  const [hasMoreCandidates, setHasMoreCandidates] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreSentinelRef = useRef(null);
  const searchInitialized = useRef(false);

  useEffect(() => {
    let alive = true;
    const DIRECTORY_CACHE_KEY = "aurelinx_directory_cache_v5";
    let cachedAt = 0;
    try {
      const cached = JSON.parse(localStorage.getItem(DIRECTORY_CACHE_KEY) || "null");
      if (cached?.employees && cached?.candidates) {
        setEmployees(cached.employees);
        setCandidates(cached.candidates);
        setWorkforceTotal(cached.workforceTotal ?? null);
        setCandidateTotal(cached.candidateTotal ?? cached.candidates.length);
        setAtRiskTotal(cached.atRiskTotal ?? null);
        setEmployeeDepartmentTotal(cached.employeeDepartmentTotal ?? null);
        setCandidateDepartmentTotal(cached.candidateDepartmentTotal ?? null);
        setEmployeeOffset(cached.employees.length);
        setCandidateOffset(cached.candidates.length);
        setHasMoreEmployees(cached.employees.length < Number(cached.workforceTotal || 0));
        setHasMoreCandidates(cached.candidates.length < Number(cached.candidateTotal || 0));
        setLoading(false);
        cachedAt = cached.updatedAt || 0;
      }
    } catch {
      // Ignore an invalid cache and load from the API.
    }
    // A fresh cache is immediately usable and avoids reloading on every tab
    // visit. Refresh only after the short-lived cache window expires.
    if (cachedAt && Date.now() - cachedAt < 10 * 60_000) {
      return () => { alive = false; };
    }
    Promise.allSettled([
      employeesAPI.list(0, DIRECTORY_PAGE_SIZE),
      candidatesAPI.list(0, DIRECTORY_PAGE_SIZE),
      employeesAPI.count(),
      candidatesAPI.count(),
      employeesAPI.count(null, true),
      employeesAPI.departments(),
      candidatesAPI.departments(),
    ])
      .then(([employeesRes, candidatesRes, employeesCountRes, candidatesCountRes, atRiskCountRes, employeeDepartmentsRes, candidateDepartmentsRes]) => {
        if (!alive) return;
        if (employeesRes.status === "fulfilled") {
          setEmployees(employeesRes.value || []);
        } else {
          console.error(employeesRes.reason);
        }
        if (candidatesRes.status === "fulfilled") {
          setCandidates(candidatesRes.value || []);
        } else {
          console.error(candidatesRes.reason);
        }
        if (employeesCountRes.status === "fulfilled") {
          setWorkforceTotal(employeesCountRes.status === "fulfilled" ? employeesCountRes.value?.count ?? null : null);
        } else {
          console.error(employeesCountRes.reason);
        }
        setCandidateTotal(
          candidatesCountRes.status === "fulfilled" ? candidatesCountRes.value?.count ?? null : null,
        );
        setAtRiskTotal(
          atRiskCountRes.status === "fulfilled" ? atRiskCountRes.value?.count ?? null : null,
        );
        setEmployeeDepartmentTotal(employeeDepartmentsRes.status === "fulfilled" ? employeeDepartmentsRes.value?.length ?? null : null);
        setCandidateDepartmentTotal(candidateDepartmentsRes.status === "fulfilled" ? candidateDepartmentsRes.value?.length ?? null : null);
        setEmployeeOffset(employeesRes.status === "fulfilled" ? (employeesRes.value || []).length : 0);
        setCandidateOffset(candidatesRes.status === "fulfilled" ? (candidatesRes.value || []).length : 0);
        setHasMoreEmployees(employeesRes.status === "fulfilled" && employeesCountRes.status === "fulfilled" && (employeesRes.value || []).length < Number(employeesCountRes.value?.count || 0));
        setHasMoreCandidates(candidatesRes.status === "fulfilled" && candidatesCountRes.status === "fulfilled" && (candidatesRes.value || []).length < Number(candidatesCountRes.value?.count || 0));
        try {
          localStorage.setItem(
            DIRECTORY_CACHE_KEY,
            JSON.stringify({
              employees: employeesRes.status === "fulfilled" ? employeesRes.value || [] : [],
              candidates: candidatesRes.status === "fulfilled" ? candidatesRes.value || [] : [],
              workforceTotal: employeesCountRes.status === "fulfilled" ? employeesCountRes.value?.count ?? null : null,
              candidateTotal: candidatesCountRes.status === "fulfilled" ? candidatesCountRes.value?.count ?? null : null,
              atRiskTotal: atRiskCountRes.status === "fulfilled" ? atRiskCountRes.value?.count ?? null : null,
              employeeDepartmentTotal: employeeDepartmentsRes.status === "fulfilled" ? employeeDepartmentsRes.value?.length ?? null : null,
              candidateDepartmentTotal: candidateDepartmentsRes.status === "fulfilled" ? candidateDepartmentsRes.value?.length ?? null : null,
              updatedAt: Date.now(),
            }),
          );
        } catch {
          // Storage limits should never block the directory.
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!alive) return;
        console.error(err);
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  // Search is executed against the complete database, not only the currently
  // loaded page. Debouncing keeps typing smooth while the server performs the
  // indexed, paginated query.
  useEffect(() => {
    if (!searchInitialized.current) {
      searchInitialized.current = true;
      return undefined;
    }
    const query = filter.trim();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const [employeeRows, candidateRows, employeeCount, candidateCount, atRiskCount] = await Promise.all([
          employeesAPI.list(0, DIRECTORY_PAGE_SIZE, null, false, query || null),
          candidatesAPI.list(0, DIRECTORY_PAGE_SIZE, null, query || null),
          employeesAPI.count(query || null),
          candidatesAPI.count(query || null),
          employeesAPI.count(query || null, true),
        ]);
        setEmployees(employeeRows || []);
        setCandidates(candidateRows || []);
        setWorkforceTotal(employeeCount?.count ?? 0);
        setCandidateTotal(candidateCount?.count ?? 0);
        setAtRiskTotal(atRiskCount?.count ?? 0);
        setEmployeeOffset((employeeRows || []).length);
        setCandidateOffset((candidateRows || []).length);
        setHasMoreEmployees((employeeRows || []).length < Number(employeeCount?.count || 0));
        setHasMoreCandidates((candidateRows || []).length < Number(candidateCount?.count || 0));
      } catch (error) {
        console.error("Directory search failed", error);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [filter]);

  const loadMore = async () => {
    if (loadingMore || (!hasMoreEmployees && !hasMoreCandidates)) return;
    setLoadingMore(true);
    try {
      const requests = [];
      const query = filter.trim() || null;
      if ((viewMode === "all" || viewMode === "employees") && hasMoreEmployees) {
        requests.push(employeesAPI.list(employeeOffset, DIRECTORY_PAGE_SIZE, null, false, query).then((rows) => ({ type: "employees", rows })));
      }
      if ((viewMode === "all" || viewMode === "candidates") && hasMoreCandidates) {
        requests.push(candidatesAPI.list(candidateOffset, DIRECTORY_PAGE_SIZE, null, query).then((rows) => ({ type: "candidates", rows })));
      }
      const results = await Promise.all(requests);
      for (const result of results) {
        const rows = Array.isArray(result.rows) ? result.rows : [];
        if (result.type === "employees") {
          setEmployees((previous) => [...previous, ...rows]);
          setEmployeeOffset((previous) => previous + rows.length);
          setHasMoreEmployees(rows.length === DIRECTORY_PAGE_SIZE);
        } else {
          setCandidates((previous) => [...previous, ...rows]);
          setCandidateOffset((previous) => previous + rows.length);
          setHasMoreCandidates(rows.length === DIRECTORY_PAGE_SIZE);
        }
      }
    } catch (error) {
      console.error("Failed to load more directory records", error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Fetch the next lightweight metadata page as the user approaches the end
  // of the directory. Full profile payloads are still requested only on click.
  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel || loadingMore || (!hasMoreEmployees && !hasMoreCandidates)) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadMore();
    }, { rootMargin: "700px 0px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadingMore, hasMoreEmployees, hasMoreCandidates, employeeOffset, candidateOffset, viewMode, filter]);

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
    } finally {
      setSelectedProfileLoading(false);
    }
  };

  useEffect(() => {
    if (
      !loading &&
      viewMode === "all" &&
      employees.length === 0 &&
      candidates.length > 0
    ) {
      setViewMode("candidates");
    }
  }, [loading, viewMode, employees.length, candidates.length]);

  const normalize = (value) => String(value || "").toLowerCase();
  const matchesFilter = (person) =>
    normalize(person.full_name).includes(filter.toLowerCase()) ||
    normalize(person.role).includes(filter.toLowerCase()) ||
    normalize(person.department).includes(filter.toLowerCase()) ||
    normalize(person.email).includes(filter.toLowerCase());

  const visibleEmployees = useMemo(() => employees.filter(matchesFilter), [employees, filter]);
  const visibleCandidates = useMemo(() => candidates.filter(matchesFilter), [candidates, filter]);
  const showEmployees = viewMode === "employees" || viewMode === "all";
  const showCandidates = viewMode === "candidates" || viewMode === "all";
  const visibleCount =
    (showEmployees ? visibleEmployees.length : 0) +
    (showCandidates ? visibleCandidates.length : 0);
  const employeeDepartmentCount = new Set(
    (showEmployees ? visibleEmployees : [])
      .map((person) => person.department)
      .filter(Boolean),
  ).size;
  const candidateDepartmentCount = new Set(
    (showCandidates ? visibleCandidates : [])
      .map((person) => person.department)
      .filter(Boolean),
  ).size;
  const departmentCount = new Set(
    [
      ...(showEmployees ? visibleEmployees : []),
      ...(showCandidates ? visibleCandidates : []),
    ]
      .map((person) => person.department)
      .filter(Boolean),
  ).size;

  return (
    <div className="w-full pb-20">
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-5 mb-8 min-w-0">
        <div className="flex-1 min-w-0 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2 text-white">
              Talent Directory
            </h1>
            <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-3xl">
              Centralized governance for your entire organizational workforce.
            </p>
          </div>
          <UserManualButton defaultTab="directory" className="shrink-0 mt-2" />
        </div>
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <div className="flex max-w-full overflow-x-auto rounded-xl border border-white/10">
            {[
              { id: "all", label: "All" },
              { id: "employees", label: "Employees" },
              { id: "candidates", label: "Candidates" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id)}
                className={`shrink-0 px-3 sm:px-4 py-3 text-[10px] sm:text-xs font-bold uppercase tracking-[0.14em] transition-colors ${
                  viewMode === tab.id
                    ? "bg-cyan-500/15 text-cyan-200"
                    : "bg-white/5 text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <button
              onClick={() => setExportMenuOpen((v) => !v)}
              className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-white/50 cursor-pointer inline-flex items-center gap-2"
            >
              <Download size={20} />
              <ChevronDown size={12} />
            </button>
            {exportMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-white/10 bg-[#0f1f33] shadow-2xl overflow-hidden z-50">
                <button
                  onClick={() => {
                    setExportMenuOpen(false);
                    onExport?.("pdf");
                  }}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-white/5 flex items-center gap-2"
                >
                  <FileText size={14} /> PDF
                </button>
                <button
                  onClick={() => {
                    setExportMenuOpen(false);
                    onExport?.("excel");
                  }}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-white/5 flex items-center gap-2"
                >
                  <FileSpreadsheet size={14} /> Excel
                </button>
                <button
                  onClick={() => {
                    setExportMenuOpen(false);
                    onExport?.("markdown");
                  }}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-white/5 flex items-center gap-2"
                >
                  <FileText size={14} /> Markdown
                </button>
              </div>
            )}
          </div>
          <div className="max-w-full flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary/10 rounded-xl text-primary text-[10px] sm:text-xs font-bold uppercase tracking-widest whitespace-normal break-words">
            <Users size={16} /> Total records: {(workforceTotal ?? 0) + (candidateTotal ?? 0)}
          </div>
        </div>
      </header>

      <div className="premium-card p-4 flex flex-col md:flex-row gap-3 mb-8">
        <div className="flex-1 relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Search by name, role, or department..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-12 pr-4 h-11 rounded-xl bg-slate-950/50 border border-white/10 focus:border-primary/50 focus:bg-white/10 outline-none transition-all text-sm"
          />
        </div>
        <button
          onClick={() => onExport?.("pdf")}
          className="px-5 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center gap-2 text-white/70 hover:bg-white/10 transition-all font-semibold cursor-pointer text-sm"
        >
          <Download size={18} /> Quick PDF
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 mb-10">
        <div className="premium-card p-4">
          <div className="text-xs text-slate-300 uppercase tracking-[0.14em] mb-2">
            Visible Records
          </div>
          <div className="text-2xl font-extrabold">
            {(showEmployees ? workforceTotal ?? 0 : 0) + (showCandidates ? candidateTotal ?? 0 : 0)}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-slate-400">
            <span>Employees: <strong className="text-slate-200">{workforceTotal ?? "—"}</strong></span>
            <span>Candidates: <strong className="text-slate-200">{candidateTotal ?? "—"}</strong></span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Authoritative totals; profile details load only when opened.
          </div>
        </div>
        <div className="premium-card p-4">
          <div className="text-xs text-slate-300 uppercase tracking-[0.14em] mb-2">
            At-Risk in Directory
          </div>
          <div className="text-2xl font-extrabold text-rose-300">
            {(showEmployees ? visibleEmployees : []).filter((e) => e.is_at_risk).length} <span className="text-sm font-semibold text-slate-500">/ {showEmployees ? (atRiskTotal ?? "—") : 0}</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Loaded matching rows / total at-risk employees
          </div>
        </div>
        <div className="premium-card p-4">
          <div className="text-xs text-slate-300 uppercase tracking-[0.14em] mb-2">
            Departments Across Loaded Records
          </div>
          <div className="text-2xl font-extrabold">
            {departmentCount}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-slate-400">
            <span>Employees: <strong className="text-slate-200">{employeeDepartmentTotal ?? employeeDepartmentCount}</strong></span>
            <span>Candidates: <strong className="text-slate-200">{candidateDepartmentTotal ?? candidateDepartmentCount}</strong></span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Authoritative department totals across each database; shared departments are counted once in the union.</div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={`directory-skel-${idx}`}
              className="premium-card p-4 min-h-[180px] animate-pulse border border-white/10 bg-white/5"
            >
              <div className="h-4 w-24 rounded bg-white/10 mb-3" />
              <div className="h-3 w-40 rounded bg-white/10 mb-6" />
              <div className="h-16 rounded bg-white/10" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {showEmployees && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
                  Employees
                </h2>
                <span className="text-[10px] text-slate-500">
                  {visibleEmployees.length} shown
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                {employees.length === 0 && (
                  <div className="premium-card p-8 text-slate-300 flex items-center gap-3 col-span-full">
                    <AlertTriangle size={18} /> No employee records imported
                    yet. Candidate records are loaded separately below.
                  </div>
                )}
                {visibleEmployees.map((emp) => (
                  <div key={emp.id} className="[content-visibility:auto] [contain-intrinsic-size:220px]">
                    <TalentCard
                      talent={emp}
                      onOpenProfile={() => openProfileDetails(emp)}
                    />
                  </div>
                ))}
                {employees.length > 0 && !visibleEmployees.length && (
                  <div className="premium-card p-8 text-slate-300 flex items-center gap-3 md:col-span-3">
                    <AlertTriangle size={18} /> No employee records matched your
                    search.
                  </div>
                )}
              </div>
            </section>
          )}

          {showCandidates && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
                  Candidates
                </h2>
                <span className="text-[10px] text-slate-500">
                  {visibleCandidates.length} shown
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                {candidates.length === 0 && (
                  <div className="premium-card p-8 text-slate-300 flex items-center gap-3 col-span-full">
                    <AlertTriangle size={18} /> No candidate records imported
                    yet.
                  </div>
                )}
                {visibleCandidates.map((cand) => (
                  <div key={cand.id} className="[content-visibility:auto] [contain-intrinsic-size:220px]">
                    <TalentCard
                      talent={cand}
                      onOpenProfile={() => openProfileDetails(cand)}
                    />
                  </div>
                ))}
                {candidates.length > 0 && !visibleCandidates.length && (
                  <div className="premium-card p-8 text-slate-300 flex items-center gap-3 md:col-span-3">
                    <AlertTriangle size={18} /> No candidate records matched
                    your search.
                  </div>
                )}
              </div>
            </section>
          )}

          <div ref={loadMoreSentinelRef} className="flex min-h-12 items-center justify-center pt-2 text-[10px] text-slate-500" aria-live="polite">
            {loadingMore ? "Loading lightweight metadata…" : ((hasMoreEmployees && showEmployees) || (hasMoreCandidates && showCandidates) ? "Scroll to load more metadata" : "All matching metadata loaded")}
          </div>

          {!showEmployees && !showCandidates && (
            <div className="premium-card p-8 text-slate-300 flex items-center gap-3">
              <AlertTriangle size={18} /> No records available.
            </div>
          )}
        </div>
      )}

      {selectedProfile && (
        <div
          className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSelectedProfile(null)}
        >
          <div
            className={`relative w-full max-w-3xl my-8 overflow-hidden rounded-xl border bg-[#0b1329] p-6 md:p-8 text-slate-100 shadow-[0_0_50px_rgba(0,0,0,0.5)] ${
              selectedProfile.is_at_risk
                ? "border-red-500/40 shadow-red-950/20"
                : "border-blue-500/40 shadow-blue-950/20"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Dossier Title */}
            <div className="flex justify-between items-center mb-6 pb-2 border-b border-white/10 text-xs font-mono tracking-widest text-slate-400">
              <span className="flex items-center gap-1.5 font-bold">
                <Cpu size={12} className={selectedProfile.is_at_risk ? "text-red-400" : "text-blue-400"} />
                PERSONNEL REPORT // CONFIDENTIAL
              </span>
              <span className={selectedProfile.is_at_risk ? "text-red-400 font-bold" : "text-blue-400 font-bold"}>
                {selectedProfile.is_at_risk ? "RISK LEVEL: AT RISK" : "RISK LEVEL: MINIMAL"}
              </span>
            </div>

            {/* Personnel Basic info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Initials Avatar Badge */}
              <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-slate-900/60 border border-white/5 relative overflow-hidden">
                <div className={`w-20 h-20 rounded-full border flex items-center justify-center bg-slate-950 font-bold text-2xl tracking-wider ${
                  selectedProfile.is_at_risk ? "border-red-500/40 text-red-400" : "border-blue-500/40 text-blue-400"
                }`}>
                  {selectedProfile.full_name
                    ? selectedProfile.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
                    : "EE"}
                </div>
                <div className="text-[9px] font-mono mt-3 tracking-widest text-slate-400 uppercase">
                  Active Directory
                </div>
              </div>

              {/* Core Details */}
              <div className="md:col-span-2 flex flex-col justify-between">
                <div>
                  <h3 className="text-3xl font-extrabold tracking-tight text-white mb-1">
                    {selectedProfile.full_name}
                  </h3>
                  <p className="text-slate-300 font-semibold text-sm mb-3">
                    {selectedProfile.role} — {selectedProfile.department}
                  </p>
                  <p className="text-xs text-slate-400 font-mono flex items-center gap-1">
                    <Globe size={12} className="text-slate-500" /> {selectedProfile.email}
                  </p>
                </div>
                
                {/* Micro Metadata */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-white/5 font-mono text-[10px] text-slate-500">
                  <div>RECORD ID: <span className="text-slate-300">{selectedProfile.id ? selectedProfile.id.slice(0, 8) : "N/A"}</span></div>
                  <div>JOIN DATE: <span className="text-slate-300">{selectedProfile.join_date ? new Date(selectedProfile.join_date).toLocaleDateString() : "N/A"}</span></div>
                </div>
              </div>
            </div>

            {/* Core Diagnostics & Salary Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Retention probability */}
              <div className="p-4 rounded-lg bg-slate-900/60 border border-white/5 font-mono">
                <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-2 flex justify-between">
                  <span>Retention Prob</span>
                  <span className={selectedProfile.is_at_risk ? "text-red-400 font-bold" : "text-blue-400 font-bold"}>
                    {selectedProfile.retention_prob ? `${(selectedProfile.retention_prob * 100).toFixed(1)}%` : "N/A"}
                  </span>
                </div>
                <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-white/10">
                  <div 
                    className={`h-full ${selectedProfile.is_at_risk ? "bg-red-500" : "bg-blue-500"}`}
                    style={{ width: selectedProfile.retention_prob ? `${selectedProfile.retention_prob * 100}%` : "0%" }}
                  />
                </div>
                <div className="text-[9px] text-slate-500 mt-2 text-right">MODEL CALCULATED</div>
              </div>

              {/* Sentiment Vector */}
              <div className="p-4 rounded-lg bg-slate-900/60 border border-white/5 font-mono">
                <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-2 flex justify-between">
                  <span>Sentiment Index</span>
                  <span className="text-slate-200 font-bold">{selectedProfile.sentiment_score ?? "N/A"}</span>
                </div>
                <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-white/10">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                    style={{ width: `${(selectedProfile.sentiment_score ?? 0.5) * 100}%` }}
                  />
                </div>
                <div className="text-[9px] text-slate-500 mt-2 text-right">METRIC: SENTIMENT</div>
              </div>

              {/* Risk Factor */}
              <div className="p-4 rounded-lg bg-slate-900/60 border border-white/5 font-mono flex flex-col justify-between">
                <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">
                  Status Code
                </div>
                <div className={`text-sm font-bold tracking-wider ${selectedProfile.is_at_risk ? "text-red-400" : "text-blue-400"}`}>
                  {selectedProfile.is_at_risk ? "HIGH RISK [!]" : "STABLE"}
                </div>
                <div className="text-[9px] text-slate-500 mt-2 text-right">MONITORED</div>
              </div>
            </div>

            {/* Financial Telemetry (Salary Details) */}
            <div className="p-4 rounded-lg bg-gradient-to-r from-cyan-950/20 to-slate-900/60 border border-cyan-500/20 mb-6 font-mono">
              <div className="text-[10px] text-cyan-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                <DollarSign size={12} /> COMPENSATION TELEMETRY
              </div>
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                <div className="text-2xl font-bold tracking-tight text-white flex items-baseline gap-1">
                  ${selectedProfile.salary ? selectedProfile.salary.toLocaleString() : "115,000"} 
                  <span className="text-xs text-slate-500 font-normal">/ yr base salary</span>
                </div>
                {/* Market Ratio indicator based on salary */}
                <div className="px-2 py-0.5 rounded text-[10px] bg-cyan-400/10 border border-cyan-400/20 text-cyan-300 font-bold">
                  MARKET INDEX: {( (selectedProfile.salary || 115000) / 108000 ).toFixed(2)}x Avg
                </div>
              </div>
            </div>

            {/* Cognitive Matrix (Skills) */}
            <div className="mb-6 font-mono">
              <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-3">
                Cognitive Skill Vector Matrix
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(selectedProfile.skills || []).map((skill, idx) => (
                  <div key={`${skill.name}-${idx}`} className="p-2.5 rounded-lg bg-slate-900/40 border border-white/5 flex flex-col justify-between">
                    <div className="text-xs text-slate-300 flex justify-between mb-1">
                      <span>{skill.name}</span>
                      <span className="text-cyan-400 font-bold">Level {skill.level}/5</span>
                    </div>
                    {/* Level Bar meter */}
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((lvl) => (
                        <div 
                          key={lvl} 
                          className={`h-1.5 flex-1 rounded-sm ${
                            lvl <= skill.level 
                              ? "bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.5)]" 
                              : "bg-slate-800"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                {(!selectedProfile.skills || selectedProfile.skills.length === 0) && (
                  <div className="col-span-2 text-xs text-slate-500 italic">No skills catalogued.</div>
                )}
              </div>
            </div>

            {/* Experience timeline */}
            <div className="mb-8 font-mono">
              <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-4">
                Chronological Experience Record
              </div>
              <div className="relative border-l border-white/10 pl-6 ml-3 space-y-6">
                {(selectedProfile.experiences || []).map((experience, idx) => (
                  <div key={`${experience.company}-${experience.position}-${idx}`} className="relative">
                    {/* Glowing timeline node */}
                    <div className="absolute -left-[32px] top-1.5 w-4 h-4 rounded-full border border-cyan-400 bg-slate-950 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                        {experience.position}
                      </div>
                      <div className="text-[11px] text-cyan-400/90 mt-0.5 font-bold">
                        {experience.company} <span className="text-slate-500">//</span> {experience.duration_years ?? "N/A"} years tenure
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed mt-2 p-2 rounded bg-slate-900/30 border border-white/5">
                        {experience.description || "No duties specification recorded."}
                      </p>
                    </div>
                  </div>
                ))}
                {(!selectedProfile.experiences || selectedProfile.experiences.length === 0) && (
                  <div className="text-xs text-slate-500 italic">No historical records in archive.</div>
                )}
              </div>
            </div>

            {/* Footer Action */}
            <div className="flex justify-between items-center pt-4 border-t border-white/10 font-mono text-[10px] text-slate-500">
              <span>AURELINX SECURITY SYSTEM // PROTOCOL_V3</span>
              <button
                onClick={() => setSelectedProfile(null)}
                className="h-9 px-5 rounded bg-cyan-500/10 border border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/20 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(6,182,212,0.1)]"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
      {selectedProfileLoading && !selectedProfile && (
        <div className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md premium-card p-6 md:p-8 border border-white/15">
            <div className="text-sm text-slate-300">Loading profile...</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectoryView;
