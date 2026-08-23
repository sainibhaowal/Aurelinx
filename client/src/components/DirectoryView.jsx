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

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  Users,
  Download,
  AlertTriangle,
  FileText,
  FileSpreadsheet,
  ChevronDown,
  RefreshCw,
  Globe,
  Cpu,
  DollarSign,
} from "lucide-react";
import TalentCard from "./TalentCard";
import PremiumSelect from "./PremiumSelect";
import { UserManualButton } from "./UserManual";
import {
  candidatesAPI,
  employeesAPI,
  intelligenceAPI,
} from "../services/apiClient";

const DirectoryView = ({ onExport, cacheScope = "workspace" }) => {
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
  const [candidateDepartmentTotal, setCandidateDepartmentTotal] =
    useState(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState("all");
  const [employeeOffset, setEmployeeOffset] = useState(0);
  const [candidateOffset, setCandidateOffset] = useState(0);
  const [hasMoreEmployees, setHasMoreEmployees] = useState(false);
  const [hasMoreCandidates, setHasMoreCandidates] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [cacheUpdatedAt, setCacheUpdatedAt] = useState(null);
  const [isStale, setIsStale] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [sentimentBand, setSentimentBand] = useState("all");
  const [employeeDepartments, setEmployeeDepartments] = useState([]);
  const [candidateDepartments, setCandidateDepartments] = useState([]);
  const [onaSummary, setOnaSummary] = useState(null);
  const [onaLoading, setOnaLoading] = useState(true);
  const [onaError, setOnaError] = useState("");
  const loadMoreSentinelRef = useRef(null);
  const searchInitialized = useRef(false);
  const sentimentBounds = useMemo(
    () =>
      sentimentBand === "low"
        ? [null, 0.45]
        : sentimentBand === "mid"
          ? [0.45, 0.75]
          : sentimentBand === "high"
            ? [0.75, null]
            : [null, null],
    [sentimentBand],
  );

  useEffect(() => {
    let alive = true;
    setOnaLoading(true);
    setOnaError("");
    intelligenceAPI
      .ona(45)
      .then((data) => {
        if (!alive) return;
        const nodes = Array.isArray(data?.nodes) ? data.nodes : [];
        const links = Array.isArray(data?.links) ? data.links : [];
        setOnaSummary({
          nodes,
          links,
          leaders: [...nodes]
            .sort(
              (a, b) =>
                Number(b.influence_pagerank || 0) -
                Number(a.influence_pagerank || 0),
            )
            .slice(0, 3),
        });
      })
      .catch((error) => {
        if (!alive) return;
        console.error("Directory ONA summary failed", error);
        setOnaError(
          "ONA summary is unavailable. Intel Center remains available for the full graph.",
        );
      })
      .finally(() => {
        if (alive) setOnaLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [cacheScope, refreshNonce]);

  useEffect(() => {
    let alive = true;
    const safeScope = String(cacheScope || "workspace").replace(
      /[^a-zA-Z0-9._-]/g,
      "_",
    );
    const DIRECTORY_CACHE_KEY = `aurelinx_directory_cache_v6_${safeScope}`;
    let cachedAt = 0;
    try {
      const cached = JSON.parse(
        localStorage.getItem(DIRECTORY_CACHE_KEY) || "null",
      );
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
        setHasMoreEmployees(
          cached.employees.length < Number(cached.workforceTotal || 0),
        );
        setHasMoreCandidates(
          cached.candidates.length < Number(cached.candidateTotal || 0),
        );
        setLoading(false);
        cachedAt = cached.updatedAt || 0;
        setCacheUpdatedAt(cachedAt || null);
        setIsStale(Boolean(cachedAt && Date.now() - cachedAt >= 10 * 60_000));
        if (Array.isArray(cached.employeeDepartments))
          setEmployeeDepartments(cached.employeeDepartments);
        if (Array.isArray(cached.candidateDepartments))
          setCandidateDepartments(cached.candidateDepartments);
      }
    } catch {
      // Ignore an invalid cache and load from the API.
    }
    // A fresh cache is immediately usable and avoids reloading on every tab
    // visit. Refresh only after the short-lived cache window expires.
    if (refreshNonce === 0 && cachedAt && Date.now() - cachedAt < 10 * 60_000) {
      Promise.allSettled([
        employeesAPI.departments(),
        candidatesAPI.departments(),
      ]).then(([employeeDepartmentsRes, candidateDepartmentsRes]) => {
        if (!alive) return;
        const employeeOptions =
          employeeDepartmentsRes.status === "fulfilled"
            ? employeeDepartmentsRes.value || []
            : [];
        const candidateOptions =
          candidateDepartmentsRes.status === "fulfilled"
            ? candidateDepartmentsRes.value || []
            : [];
        setEmployeeDepartments(employeeOptions);
        setCandidateDepartments(candidateOptions);
        try {
          const existing = JSON.parse(
            localStorage.getItem(DIRECTORY_CACHE_KEY) || "{}",
          );
          localStorage.setItem(
            DIRECTORY_CACHE_KEY,
            JSON.stringify({
              ...existing,
              employeeDepartments: employeeOptions,
              candidateDepartments: candidateOptions,
            }),
          );
        } catch {
          /* cache is an optimization only */
        }
      });
      return () => {
        alive = false;
      };
    }
    setLoading(true);
    setErrorMessage("");
    Promise.allSettled([
      employeesAPI.list(0, DIRECTORY_PAGE_SIZE),
      candidatesAPI.list(0, DIRECTORY_PAGE_SIZE),
      employeesAPI.count(),
      candidatesAPI.count(),
      employeesAPI.count(null, true),
      employeesAPI.departments(),
      candidatesAPI.departments(),
    ])
      .then(
        ([
          employeesRes,
          candidatesRes,
          employeesCountRes,
          candidatesCountRes,
          atRiskCountRes,
          employeeDepartmentsRes,
          candidateDepartmentsRes,
        ]) => {
          if (!alive) return;
          if (employeesRes.status === "fulfilled") {
            setEmployees(employeesRes.value || []);
          } else {
            console.error(employeesRes.reason);
            setErrorMessage(
              (previous) => previous || "Employee records could not be loaded.",
            );
          }
          if (candidatesRes.status === "fulfilled") {
            setCandidates(candidatesRes.value || []);
          } else {
            console.error(candidatesRes.reason);
            setErrorMessage(
              (previous) =>
                previous || "Candidate records could not be loaded.",
            );
          }
          if (employeesCountRes.status === "fulfilled") {
            setWorkforceTotal(
              employeesCountRes.status === "fulfilled"
                ? (employeesCountRes.value?.count ?? null)
                : null,
            );
          } else {
            console.error(employeesCountRes.reason);
            setErrorMessage(
              (previous) => previous || "Employee totals could not be loaded.",
            );
          }
          setCandidateTotal(
            candidatesCountRes.status === "fulfilled"
              ? (candidatesCountRes.value?.count ?? null)
              : null,
          );
          if (candidatesCountRes.status === "rejected")
            setErrorMessage(
              (previous) => previous || "Candidate totals could not be loaded.",
            );
          setAtRiskTotal(
            atRiskCountRes.status === "fulfilled"
              ? (atRiskCountRes.value?.count ?? null)
              : null,
          );
          if (atRiskCountRes.status === "rejected")
            setErrorMessage(
              (previous) => previous || "Risk totals could not be loaded.",
            );
          setEmployeeDepartmentTotal(
            employeeDepartmentsRes.status === "fulfilled"
              ? (employeeDepartmentsRes.value?.length ?? null)
              : null,
          );
          setCandidateDepartmentTotal(
            candidateDepartmentsRes.status === "fulfilled"
              ? (candidateDepartmentsRes.value?.length ?? null)
              : null,
          );
          if (employeeDepartmentsRes.status === "fulfilled")
            setEmployeeDepartments(employeeDepartmentsRes.value || []);
          if (candidateDepartmentsRes.status === "fulfilled")
            setCandidateDepartments(candidateDepartmentsRes.value || []);
          if (
            employeeDepartmentsRes.status === "rejected" ||
            candidateDepartmentsRes.status === "rejected"
          )
            setErrorMessage(
              (previous) =>
                previous || "Department totals could not be loaded.",
            );
          setEmployeeOffset(
            employeesRes.status === "fulfilled"
              ? (employeesRes.value || []).length
              : employees.length,
          );
          setCandidateOffset(
            candidatesRes.status === "fulfilled"
              ? (candidatesRes.value || []).length
              : candidates.length,
          );
          setHasMoreEmployees(
            employeesRes.status === "fulfilled" &&
              employeesCountRes.status === "fulfilled" &&
              (employeesRes.value || []).length <
                Number(employeesCountRes.value?.count || 0),
          );
          setHasMoreCandidates(
            candidatesRes.status === "fulfilled" &&
              candidatesCountRes.status === "fulfilled" &&
              (candidatesRes.value || []).length <
                Number(candidatesCountRes.value?.count || 0),
          );
          try {
            localStorage.setItem(
              DIRECTORY_CACHE_KEY,
              JSON.stringify({
                employees:
                  employeesRes.status === "fulfilled"
                    ? employeesRes.value || []
                    : employees,
                candidates:
                  candidatesRes.status === "fulfilled"
                    ? candidatesRes.value || []
                    : candidates,
                workforceTotal:
                  employeesCountRes.status === "fulfilled"
                    ? (employeesCountRes.value?.count ?? null)
                    : workforceTotal,
                candidateTotal:
                  candidatesCountRes.status === "fulfilled"
                    ? (candidatesCountRes.value?.count ?? null)
                    : candidateTotal,
                atRiskTotal:
                  atRiskCountRes.status === "fulfilled"
                    ? (atRiskCountRes.value?.count ?? null)
                    : atRiskTotal,
                employeeDepartmentTotal:
                  employeeDepartmentsRes.status === "fulfilled"
                    ? (employeeDepartmentsRes.value?.length ?? null)
                    : employeeDepartmentTotal,
                candidateDepartmentTotal:
                  candidateDepartmentsRes.status === "fulfilled"
                    ? (candidateDepartmentsRes.value?.length ?? null)
                    : candidateDepartmentTotal,
                employeeDepartments:
                  employeeDepartmentsRes.status === "fulfilled"
                    ? employeeDepartmentsRes.value || []
                    : employeeDepartments,
                candidateDepartments:
                  candidateDepartmentsRes.status === "fulfilled"
                    ? candidateDepartmentsRes.value || []
                    : candidateDepartments,
                updatedAt: Date.now(),
              }),
            );
            setCacheUpdatedAt(Date.now());
            setIsStale(false);
          } catch {
            // Storage limits should never block the directory.
          }
          setLoading(false);
        },
      )
      .catch((err) => {
        if (!alive) return;
        console.error(err);
        setErrorMessage(
          "Directory data could not be loaded. Check your connection and try again.",
        );
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [cacheScope, refreshNonce]);

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
      setErrorMessage("");
      try {
        const [sentimentMin, sentimentMax] = sentimentBounds;
        const employeeRiskOnly = riskFilter === "at_risk";
        const employeeDepartment = departmentFilter || null;
        const [
          employeeRows,
          candidateRows,
          employeeCount,
          candidateCount,
          atRiskCount,
        ] = await Promise.all([
          employeesAPI.list(
            0,
            DIRECTORY_PAGE_SIZE,
            employeeDepartment,
            employeeRiskOnly,
            query || null,
            sentimentMin,
            sentimentMax,
          ),
          candidatesAPI.list(
            0,
            DIRECTORY_PAGE_SIZE,
            departmentFilter || null,
            query || null,
            sentimentMin,
            sentimentMax,
          ),
          employeesAPI.count(
            query || null,
            employeeRiskOnly,
            employeeDepartment,
            sentimentMin,
            sentimentMax,
          ),
          candidatesAPI.count(
            query || null,
            departmentFilter || null,
            sentimentMin,
            sentimentMax,
          ),
          employeesAPI.count(
            query || null,
            true,
            employeeDepartment,
            sentimentMin,
            sentimentMax,
          ),
        ]);
        setEmployees(employeeRows || []);
        setCandidates(candidateRows || []);
        setWorkforceTotal(employeeCount?.count ?? 0);
        setCandidateTotal(candidateCount?.count ?? 0);
        setAtRiskTotal(atRiskCount?.count ?? 0);
        setEmployeeOffset((employeeRows || []).length);
        setCandidateOffset((candidateRows || []).length);
        setHasMoreEmployees(
          (employeeRows || []).length < Number(employeeCount?.count || 0),
        );
        setHasMoreCandidates(
          (candidateRows || []).length < Number(candidateCount?.count || 0),
        );
        setIsStale(false);
      } catch (error) {
        console.error("Directory search failed", error);
        setErrorMessage(
          "Directory search failed. Try again or clear the search.",
        );
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [filter, departmentFilter, riskFilter, sentimentBand, sentimentBounds]);

  const loadMore = async () => {
    if (loadingMore || (!hasMoreEmployees && !hasMoreCandidates)) return;
    setLoadingMore(true);
    try {
      const requests = [];
      const query = filter.trim() || null;
      const [sentimentMin, sentimentMax] = sentimentBounds;
      if (
        (viewMode === "all" || viewMode === "employees") &&
        hasMoreEmployees
      ) {
        requests.push(
          employeesAPI
            .list(
              employeeOffset,
              DIRECTORY_PAGE_SIZE,
              departmentFilter || null,
              riskFilter === "at_risk",
              query,
              sentimentMin,
              sentimentMax,
            )
            .then((rows) => ({ type: "employees", rows })),
        );
      }
      if (
        (viewMode === "all" || viewMode === "candidates") &&
        hasMoreCandidates
      ) {
        requests.push(
          candidatesAPI
            .list(
              candidateOffset,
              DIRECTORY_PAGE_SIZE,
              departmentFilter || null,
              query,
              sentimentMin,
              sentimentMax,
            )
            .then((rows) => ({ type: "candidates", rows })),
        );
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
      setErrorMessage(
        "More directory records could not be loaded. Please try again.",
      );
    } finally {
      setLoadingMore(false);
    }
  };

  // Fetch the next lightweight metadata page as the user approaches the end
  // of the directory. Full profile payloads are still requested only on click.
  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel || loadingMore || (!hasMoreEmployees && !hasMoreCandidates))
      return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "700px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    loadingMore,
    hasMoreEmployees,
    hasMoreCandidates,
    employeeOffset,
    candidateOffset,
    viewMode,
    filter,
    departmentFilter,
    riskFilter,
    sentimentBand,
    sentimentBounds,
  ]);

  const isCandidateRecord = (person) =>
    Boolean(person?.match_score !== undefined || person?.application_date);

  const openProfileDetails = async (person) => {
    if (!person?.id) return;

    setProfileError("");
    setSelectedProfileLoading(true);
    try {
      const record = isCandidateRecord(person)
        ? await candidatesAPI.get(person.id)
        : await employeesAPI.get(person.id);
      setSelectedProfile(record);
    } catch (err) {
      console.error(err);
      setProfileError("This profile could not be loaded. Please try again.");
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
  const matchesFilter = (person) => {
    const query = filter.trim().toLowerCase();
    const textMatches =
      !query ||
      [person.full_name, person.role, person.department, person.email].some(
        (value) => normalize(value).includes(query),
      );
    const departmentMatches =
      !departmentFilter || person.department === departmentFilter;
    const riskMatches = riskFilter !== "at_risk" || Boolean(person.is_at_risk);
    const score = Number(person.sentiment_score);
    const sentimentMatches =
      sentimentBand === "all" ||
      (sentimentBand === "low"
        ? score < 0.45
        : sentimentBand === "mid"
          ? score >= 0.45 && score < 0.75
          : score >= 0.75);
    return (
      textMatches &&
      departmentMatches &&
      riskMatches &&
      (Number.isNaN(score) ? sentimentBand === "all" : sentimentMatches)
    );
  };

  const visibleEmployees = useMemo(
    () => employees.filter(matchesFilter),
    [employees, filter],
  );
  const visibleCandidates = useMemo(
    () => candidates.filter(matchesFilter),
    [candidates, filter],
  );
  const showEmployees = viewMode === "employees" || viewMode === "all";
  const showCandidates = viewMode === "candidates" || viewMode === "all";
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
  const selectedProfileIsCandidate = isCandidateRecord(selectedProfile);
  const exportScope = (format) =>
    onExport?.({
      format,
      query: filter.trim() || null,
      viewMode,
      department: departmentFilter || null,
      riskOnly: riskFilter === "at_risk",
      sentimentMin: sentimentBounds[0],
      sentimentMax: sentimentBounds[1],
    });

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
              onClick={() => setRefreshNonce((value) => value + 1)}
              disabled={loading}
              className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 disabled:opacity-50 transition-all text-white/70 cursor-pointer inline-flex items-center gap-2"
              title="Refresh directory data"
              aria-label="Refresh directory data"
            >
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            </button>
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
              <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-white/10 bg-[#0a1a12] shadow-2xl overflow-hidden z-50">
                <button
                  onClick={() => {
                    setExportMenuOpen(false);
                    exportScope("pdf");
                  }}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-white/5 flex items-center gap-2"
                >
                  <FileText size={14} /> PDF
                </button>
                <button
                  onClick={() => {
                    setExportMenuOpen(false);
                    exportScope("excel");
                  }}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-white/5 flex items-center gap-2"
                >
                  <FileSpreadsheet size={14} /> Excel
                </button>
                <button
                  onClick={() => {
                    setExportMenuOpen(false);
                    exportScope("markdown");
                  }}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-white/5 flex items-center gap-2"
                >
                  <FileText size={14} /> Markdown
                </button>
              </div>
            )}
          </div>
          <div className="max-w-full flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary/10 rounded-xl text-primary text-[10px] sm:text-xs font-bold uppercase tracking-widest whitespace-normal break-words">
            <Users size={16} /> Total records:{" "}
            {(workforceTotal ?? 0) + (candidateTotal ?? 0)}
          </div>
        </div>
      </header>

      {(isStale || errorMessage) && (
        <div className="mb-5 space-y-2" role="status" aria-live="polite">
          {isStale && (
            <div className="rounded-xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-xs text-amber-100">
              Showing cached directory metadata from{" "}
              {cacheUpdatedAt
                ? new Date(cacheUpdatedAt).toLocaleString()
                : "an earlier session"}
              . Refresh to verify the latest records.
            </div>
          )}
          {errorMessage && (
            <div className="rounded-xl border border-rose-300/25 bg-rose-400/10 px-4 py-3 text-xs text-rose-100 flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <AlertTriangle size={15} /> {errorMessage}
              </span>
              <button
                onClick={() => setRefreshNonce((value) => value + 1)}
                className="shrink-0 rounded-lg border border-rose-200/30 px-3 py-1.5 font-semibold hover:bg-rose-200/10"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      )}

      <div className="sticky top-0 z-40 -mx-2 px-2 pt-2 pb-1 bg-[#050b17]/90 backdrop-blur-xl">
        <div className="premium-card p-4 flex flex-col md:flex-row gap-3 mb-4 shadow-2xl shadow-black/20">
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
            onClick={() => exportScope("pdf")}
            className="px-5 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center gap-2 text-white/70 hover:bg-white/10 transition-all font-semibold cursor-pointer text-sm"
          >
            <Download size={18} /> Quick PDF
          </button>
        </div>

        <div
          className="mb-4 rounded-2xl border border-white/10 bg-slate-950/75 p-4 shadow-2xl shadow-black/20"
          aria-label="Directory filters"
        >
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-[190px] flex-1 text-[10px] uppercase tracking-[0.16em] text-slate-400">
              Department
              <PremiumSelect
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="mt-2 h-10 w-full"
              >
                <option value="">All departments</option>
                {[...new Set([...employeeDepartments, ...candidateDepartments])]
                  .sort()
                  .map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
              </PremiumSelect>
            </label>
            <label className="min-w-[160px] flex-1 text-[10px] uppercase tracking-[0.16em] text-slate-400">
              Risk status
              <PremiumSelect
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="mt-2 h-10 w-full"
              >
                <option value="all">All workforce status</option>
                <option value="at_risk">At-risk employees only</option>
              </PremiumSelect>
            </label>
            <label className="min-w-[170px] flex-1 text-[10px] uppercase tracking-[0.16em] text-slate-400">
              Sentiment range
              <PremiumSelect
                value={sentimentBand}
                onChange={(e) => setSentimentBand(e.target.value)}
                className="mt-2 h-10 w-full"
              >
                <option value="all">All sentiment scores</option>
                <option value="low">Low (&lt; 0.45)</option>
                <option value="mid">Moderate (0.45–0.75)</option>
                <option value="high">High (≥ 0.75)</option>
              </PremiumSelect>
            </label>
            {(departmentFilter ||
              riskFilter !== "all" ||
              sentimentBand !== "all" ||
              filter) && (
              <button
                onClick={() => {
                  setFilter("");
                  setDepartmentFilter("");
                  setRiskFilter("all");
                  setSentimentBand("all");
                }}
                className="h-10 rounded-xl border border-white/10 px-4 text-xs font-semibold text-slate-300 hover:bg-white/10"
              >
                Clear filters
              </button>
            )}
          </div>
          <p className="mt-3 text-[10px] text-slate-500">
            Filters run on the complete database. Only matching metadata is
            paged into this view; full dossiers load when opened.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 mb-10">
        <div className="premium-card p-4">
          <div className="text-xs text-slate-300 uppercase tracking-[0.14em] mb-2">
            Records in Scope
          </div>
          <div className="text-2xl font-extrabold">
            {(showEmployees ? (workforceTotal ?? 0) : 0) +
              (showCandidates ? (candidateTotal ?? 0) : 0)}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-slate-400">
            <span>
              Employees:{" "}
              <strong className="text-slate-200">
                {workforceTotal ?? "—"}
              </strong>
            </span>
            <span>
              Candidates:{" "}
              <strong className="text-slate-200">
                {candidateTotal ?? "—"}
              </strong>
            </span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Authoritative totals; profile details load only when opened.
          </div>
        </div>
        <div className="premium-card p-4">
          <div className="text-xs text-slate-300 uppercase tracking-[0.14em] mb-2">
            At-Risk Matches
          </div>
          <div className="text-2xl font-extrabold text-rose-300">
            {showEmployees ? (
              <>
                {(visibleEmployees || []).filter((e) => e.is_at_risk).length}{" "}
                <span className="text-sm font-semibold text-slate-500">
                  / {atRiskTotal ?? "—"}
                </span>
              </>
            ) : (
              <span className="text-slate-500">N/A</span>
            )}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            {showEmployees
              ? "Loaded matching rows / total at-risk employees in scope"
              : "Candidate records are not included in workforce risk totals"}
          </div>
        </div>
        <div className="premium-card p-4">
          <div className="text-xs text-slate-300 uppercase tracking-[0.14em] mb-2">
            Departments Across Loaded Records
          </div>
          <div className="text-2xl font-extrabold">{departmentCount}</div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-slate-400">
            <span>
              Employees:{" "}
              <strong className="text-slate-200">
                {employeeDepartmentTotal ?? employeeDepartmentCount}
              </strong>
            </span>
            <span>
              Candidates:{" "}
              <strong className="text-slate-200">
                {candidateDepartmentTotal ?? candidateDepartmentCount}
              </strong>
            </span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Authoritative department totals across each database; shared
            departments are counted once in the union.
          </div>
        </div>
      </div>

      <section
        className="mb-10 rounded-2xl border border-indigo-300/15 bg-indigo-950/15 p-5"
        aria-label="Directory organizational network summary"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-200">
              Organizational network summary
            </h2>
            <p className="mt-1 text-[10px] text-slate-500">
              Computed from the protected ONA service for employee collaboration
              context. The full interactive graph remains in Intel Center.
            </p>
          </div>
          <span className="rounded-full border border-indigo-300/20 bg-indigo-300/10 px-2.5 py-1 text-[10px] text-indigo-200">
            {onaLoading
              ? "Analyzing…"
              : `${onaSummary?.nodes?.length || 0} people · ${onaSummary?.links?.length || 0} links`}
          </span>
        </div>
        {onaError ? (
          <p className="mt-3 text-xs text-amber-200">{onaError}</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            {(onaSummary?.leaders || []).map((leader) => (
              <div
                key={leader.id}
                className="rounded-xl border border-white/10 bg-slate-950/40 p-3"
              >
                <div className="text-sm font-semibold text-slate-200">
                  {leader.name}
                </div>
                <div className="mt-1 text-[10px] text-slate-500">
                  {leader.role || "Role not reported"} ·{" "}
                  {leader.department || "Department not reported"}
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-indigo-200">
                  <span>
                    Influence{" "}
                    {(Number(leader.influence_pagerank || 0) * 100).toFixed(0)}%
                  </span>
                  <span>
                    Bridge{" "}
                    {(Number(leader.bridge_betweenness || 0) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
            {!onaLoading && !onaSummary?.leaders?.length && (
              <div className="text-xs text-slate-500">
                No network relationships are available in the current employee
                scope.
              </div>
            )}
          </div>
        )}
      </section>

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
                  {visibleEmployees.length} loaded / {workforceTotal ?? "—"}{" "}
                  total
                </span>
              </div>
              <div>
                {employees.length === 0 && (
                  <div className="premium-card p-8 text-slate-300 flex items-center gap-3 col-span-full">
                    <AlertTriangle size={18} /> No employee records imported
                    yet. Candidate records are loaded separately below.
                  </div>
                )}
                {visibleEmployees.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-5 gap-4">
                    {visibleEmployees.map((emp) => (
                      <div
                        key={emp.id}
                        className="[content-visibility:auto] [contain-intrinsic-size:220px]"
                      >
                        <TalentCard
                          talent={emp}
                          onOpenProfile={() => openProfileDetails(emp)}
                        />
                      </div>
                    ))}
                  </div>
                )}
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
                  {visibleCandidates.length} loaded / {candidateTotal ?? "—"}{" "}
                  total
                </span>
              </div>
              <div>
                {candidates.length === 0 && (
                  <div className="premium-card p-8 text-slate-300 flex items-center gap-3 col-span-full">
                    <AlertTriangle size={18} /> No candidate records imported
                    yet.
                  </div>
                )}
                {visibleCandidates.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-5 gap-4">
                    {visibleCandidates.map((cand) => (
                      <div
                        key={cand.id}
                        className="[content-visibility:auto] [contain-intrinsic-size:220px]"
                      >
                        <TalentCard
                          talent={cand}
                          onOpenProfile={() => openProfileDetails(cand)}
                        />
                      </div>
                    ))}
                  </div>
                )}
                {candidates.length > 0 && !visibleCandidates.length && (
                  <div className="premium-card p-8 text-slate-300 flex items-center gap-3 md:col-span-3">
                    <AlertTriangle size={18} /> No candidate records matched
                    your search.
                  </div>
                )}
              </div>
            </section>
          )}

          <div
            ref={loadMoreSentinelRef}
            className="flex min-h-12 items-center justify-center pt-2 text-[10px] text-slate-500"
            aria-live="polite"
          >
            {loadingMore
              ? "Loading lightweight metadata…"
              : (hasMoreEmployees && showEmployees) ||
                  (hasMoreCandidates && showCandidates)
                ? "Scroll to load more metadata"
                : "All matching metadata loaded"}
            {!loadingMore &&
              ((hasMoreEmployees && showEmployees) ||
                (hasMoreCandidates && showCandidates)) && (
                <button
                  type="button"
                  onClick={loadMore}
                  className="ml-3 rounded-lg border border-cyan-300/20 px-3 py-1.5 text-cyan-200 hover:bg-cyan-300/10"
                >
                  Load next page
                </button>
              )}
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
                <Cpu
                  size={12}
                  className={
                    selectedProfile.is_at_risk
                      ? "text-red-400"
                      : "text-blue-400"
                  }
                />
                {selectedProfileIsCandidate
                  ? "CANDIDATE REPORT // CONFIDENTIAL"
                  : "PERSONNEL REPORT // CONFIDENTIAL"}
              </span>
              <span
                className={
                  selectedProfileIsCandidate
                    ? "text-cyan-300 font-bold"
                    : selectedProfile.is_at_risk
                      ? "text-red-400 font-bold"
                      : "text-blue-400 font-bold"
                }
              >
                {selectedProfileIsCandidate
                  ? "CANDIDATE CONTEXT"
                  : selectedProfile.is_at_risk
                    ? "RISK LEVEL: AT RISK"
                    : "RISK LEVEL: MINIMAL"}
              </span>
            </div>

            {/* Personnel Basic info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Initials Avatar Badge */}
              <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-slate-900/60 border border-white/5 relative overflow-hidden">
                <div
                  className={`w-20 h-20 rounded-full border flex items-center justify-center bg-slate-950 font-bold text-2xl tracking-wider ${
                    selectedProfile.is_at_risk
                      ? "border-red-500/40 text-red-400"
                      : "border-blue-500/40 text-blue-400"
                  }`}
                >
                  {selectedProfile.full_name
                    ? selectedProfile.full_name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()
                    : "EE"}
                </div>
                <div className="text-[9px] font-mono mt-3 tracking-widest text-slate-400 uppercase">
                  {selectedProfileIsCandidate
                    ? "Candidate Pool"
                    : "Active Directory"}
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
                    <Globe size={12} className="text-slate-500" />{" "}
                    {selectedProfile.email}
                  </p>
                </div>

                {/* Micro Metadata */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-white/5 font-mono text-[10px] text-slate-500">
                  <div>
                    RECORD ID:{" "}
                    <span className="text-slate-300">
                      {selectedProfile.id
                        ? selectedProfile.id.slice(0, 8)
                        : "N/A"}
                    </span>
                  </div>
                  <div>
                    {selectedProfileIsCandidate
                      ? "APPLICATION DATE"
                      : "JOIN DATE"}
                    :{" "}
                    <span className="text-slate-300">
                      {(
                        selectedProfileIsCandidate
                          ? selectedProfile.application_date
                          : selectedProfile.join_date
                      )
                        ? new Date(
                            selectedProfileIsCandidate
                              ? selectedProfile.application_date
                              : selectedProfile.join_date,
                          ).toLocaleDateString()
                        : "N/A"}
                    </span>
                  </div>
                  <div>
                    CREATED:{" "}
                    <span className="text-slate-300">
                      {selectedProfile.created_at
                        ? new Date(
                            selectedProfile.created_at,
                          ).toLocaleDateString()
                        : "N/A"}
                    </span>
                  </div>
                  <div>
                    UPDATED:{" "}
                    <span className="text-slate-300">
                      {selectedProfile.updated_at
                        ? new Date(
                            selectedProfile.updated_at,
                          ).toLocaleDateString()
                        : "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Core Diagnostics & Salary Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Retention probability */}
              <div className="p-4 rounded-lg bg-slate-900/60 border border-white/5 font-mono">
                <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-2 flex justify-between">
                  <span>
                    {selectedProfileIsCandidate
                      ? "Match Score"
                      : "Retention Prob"}
                  </span>
                  <span
                    className={
                      selectedProfile.is_at_risk
                        ? "text-red-400 font-bold"
                        : "text-blue-400 font-bold"
                    }
                  >
                    {(selectedProfileIsCandidate
                      ? selectedProfile.match_score
                      : selectedProfile.retention_prob) != null
                      ? `${((selectedProfileIsCandidate ? selectedProfile.match_score : selectedProfile.retention_prob) * 100).toFixed(1)}%`
                      : "N/A"}
                  </span>
                </div>
                <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-white/10">
                  <div
                    className={`h-full ${selectedProfile.is_at_risk ? "bg-red-500" : "bg-blue-500"}`}
                    style={{
                      width:
                        (selectedProfileIsCandidate
                          ? selectedProfile.match_score
                          : selectedProfile.retention_prob) != null
                          ? `${(selectedProfileIsCandidate ? selectedProfile.match_score : selectedProfile.retention_prob) * 100}%`
                          : "0%",
                    }}
                  />
                </div>
                <div className="text-[9px] text-slate-500 mt-2 text-right">
                  {selectedProfileIsCandidate
                    ? "MATCH SIGNAL"
                    : "MODEL CALCULATED"}
                </div>
              </div>

              {/* Sentiment Vector */}
              <div className="p-4 rounded-lg bg-slate-900/60 border border-white/5 font-mono">
                <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-2 flex justify-between">
                  <span>Sentiment Index</span>
                  <span className="text-slate-200 font-bold">
                    {selectedProfile.sentiment_score ?? "N/A"}
                  </span>
                </div>
                <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                    style={{
                      width: `${(selectedProfile.sentiment_score ?? 0.5) * 100}%`,
                    }}
                  />
                </div>
                <div className="text-[9px] text-slate-500 mt-2 text-right">
                  METRIC: SENTIMENT
                </div>
              </div>

              {/* Risk Factor */}
              <div className="p-4 rounded-lg bg-slate-900/60 border border-white/5 font-mono flex flex-col justify-between">
                <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">
                  Status Code
                </div>
                <div
                  className={`text-sm font-bold tracking-wider ${selectedProfile.is_at_risk ? "text-red-400" : "text-blue-400"}`}
                >
                  {selectedProfileIsCandidate
                    ? "NOT A RISK SCORE"
                    : selectedProfile.is_at_risk
                      ? "HIGH RISK [!]"
                      : "STABLE"}
                </div>
                <div className="text-[9px] text-slate-500 mt-2 text-right">
                  MONITORED
                </div>
              </div>
            </div>

            {/* Financial Telemetry (Salary Details) */}
            <div className="p-4 rounded-lg bg-gradient-to-r from-cyan-950/20 to-slate-900/60 border border-cyan-500/20 mb-6 font-mono">
              <div className="text-[10px] text-cyan-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                <DollarSign size={12} /> COMPENSATION TELEMETRY
              </div>
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                <div className="text-2xl font-bold tracking-tight text-white flex items-baseline gap-1">
                  $
                  {selectedProfile.salary != null
                    ? selectedProfile.salary.toLocaleString()
                    : "115,000"}
                  <span className="text-xs text-slate-500 font-normal">
                    / yr base salary
                  </span>
                </div>
                {/* Market Ratio indicator based on salary */}
                <div className="px-2 py-0.5 rounded text-[10px] bg-cyan-400/10 border border-cyan-400/20 text-cyan-300 font-bold">
                  MARKET INDEX:{" "}
                  {(
                    (selectedProfile.salary != null
                      ? selectedProfile.salary
                      : 115000) / 108000
                  ).toFixed(2)}
                  x Avg
                  {selectedProfile.salary == null && (
                    <span className="ml-1 text-[9px] text-amber-200">DEMO</span>
                  )}
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
                  <div
                    key={`${skill.name}-${idx}`}
                    className="p-2.5 rounded-lg bg-slate-900/40 border border-white/5 flex flex-col justify-between"
                  >
                    <div className="text-xs text-slate-300 flex justify-between mb-1">
                      <span>{skill.name}</span>
                      <span className="text-cyan-400 font-bold">
                        Level {skill.level}/5
                      </span>
                    </div>
                    {/* Level Bar meter */}
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((lvl) => (
                        <div
                          key={lvl}
                          className={`h-1.5 flex-1 rounded-sm ${
                            lvl <= skill.level
                              ? "bg-cyan-400 shadow-[0_0_4px_rgba(52,211,153,0.5)]"
                              : "bg-slate-800"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                {(!selectedProfile.skills ||
                  selectedProfile.skills.length === 0) && (
                  <div className="col-span-2 text-xs text-slate-500 italic">
                    No skills catalogued.
                  </div>
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
                  <div
                    key={`${experience.company}-${experience.position}-${idx}`}
                    className="relative"
                  >
                    {/* Glowing timeline node */}
                    <div className="absolute -left-[32px] top-1.5 w-4 h-4 rounded-full border border-cyan-400 bg-slate-950 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                        {experience.position}
                      </div>
                      <div className="text-[11px] text-cyan-400/90 mt-0.5 font-bold">
                        {experience.company}{" "}
                        <span className="text-slate-500">//</span>{" "}
                        {experience.duration_years ?? "N/A"} years tenure
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed mt-2 p-2 rounded bg-slate-900/30 border border-white/5">
                        {experience.description ||
                          "No duties specification recorded."}
                      </p>
                    </div>
                  </div>
                ))}
                {(!selectedProfile.experiences ||
                  selectedProfile.experiences.length === 0) && (
                  <div className="text-xs text-slate-500 italic">
                    No historical records in archive.
                  </div>
                )}
              </div>
            </div>

            <div className="mb-8 rounded-xl border border-white/10 bg-slate-950/35 p-4 space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Record quality & provenance
                </span>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${selectedProfile.validation_status === "valid" ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-200"}`}
                >
                  {selectedProfile.validation_status || "unknown"}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-400">
                <span>
                  Source:{" "}
                  <strong className="text-slate-200">
                    {selectedProfile.source_type || "not reported"}
                  </strong>
                </span>
                <span>
                  Version:{" "}
                  <strong className="text-slate-200">
                    {selectedProfile.source_version || "not reported"}
                  </strong>
                </span>
              </div>
              {(selectedProfile.missing_fields || []).length > 0 && (
                <div className="rounded-lg border border-amber-300/20 bg-amber-300/5 p-3 text-amber-100">
                  Missing fields: {selectedProfile.missing_fields.join(", ")}
                </div>
              )}
              {(selectedProfile.duplicate_warnings || []).length > 0 && (
                <div className="rounded-lg border border-rose-300/20 bg-rose-300/5 p-3 text-rose-100">
                  Duplicate warnings:{" "}
                  {selectedProfile.duplicate_warnings.join(", ")}
                </div>
              )}
              <div>
                <div className="mb-1 text-[10px] uppercase tracking-wider text-slate-500">
                  Available audit events for this signed-in user
                </div>
                {(selectedProfile.audit_history || []).length ? (
                  <div className="max-h-32 space-y-1 overflow-y-auto">
                    {selectedProfile.audit_history.map((event, index) => (
                      <div
                        key={`${event.created_at}-${index}`}
                        className="flex justify-between gap-3 border-b border-white/5 py-1 text-slate-300"
                      >
                        <span>{event.action}</span>
                        <time className="text-slate-500">
                          {new Date(event.created_at).toLocaleString()}
                        </time>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-500">
                    No audit events are available for this user and record.
                  </span>
                )}
              </div>
            </div>

            {/* Footer Action */}
            <div className="flex justify-between items-center pt-4 border-t border-white/10 font-mono text-[10px] text-slate-500">
              <span>AURELINX SECURITY SYSTEM // PROTOCOL_V3</span>
              <button
                onClick={() => setSelectedProfile(null)}
                className="h-9 px-5 rounded bg-cyan-500/10 border border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/20 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(45,212,191,0.1)]"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
      {(selectedProfileLoading || profileError) && !selectedProfile && (
        <div className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md premium-card p-6 md:p-8 border border-white/15">
            {selectedProfileLoading ? (
              <div className="text-sm text-slate-300">Loading profile...</div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-rose-200 flex items-center gap-2">
                  <AlertTriangle size={16} /> {profileError}
                </div>
                <button
                  onClick={() => setProfileError("")}
                  className="rounded-lg border border-white/15 px-3 py-2 text-xs text-slate-200 hover:bg-white/10"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectoryView;
