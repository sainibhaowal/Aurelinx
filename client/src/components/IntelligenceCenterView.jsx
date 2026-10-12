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
import { motion, AnimatePresence } from "framer-motion";
import {
  Cpu,
  Brain,
  TrendingUp,
  GitBranch,
  Users,
  Zap,
  Play,
  Briefcase,
  Search,
  Trash2,
  RefreshCw,
  Maximize2,
  Minimize2,
  Sparkles,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Share2,
  Activity,
} from "lucide-react";
import { UserManualButton } from "./UserManual";
import PremiumSelect from "./PremiumSelect";
import OnaNetworkMap2D from "./ui/OnaNetworkMap2D";
import { API_BASE_URL } from "../services/apiBase";
import {
  buildCovariates,
  computeSurvival,
  riskTier,
  tierColor,
  tierBg,
} from "../utils/survivalModel";
import { usePersistentState } from "../services/workspacePersistence";
import AIExplanationPanel from "./AIExplanationPanel";

const humanizeCompensationUnit = (value) =>
  String(value || "recorded amount")
    .replace(/ per annual$/i, "/year")
    .replace(/ per monthly$/i, "/month")
    .replace(/ per weekly$/i, "/week")
    .replace(/ per hourly$/i, "/hour");

const formatOnaDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
};

const MobileSplitPane = ({
  activePane,
  setActivePane,
  leftTitle,
  rightTitle,
  leftIcon,
  rightIcon,
  leftContent,
  rightContent,
  leftWidthClass = "lg:w-[340px] xl:w-[360px]",
  leftStyle = null,
  leftHandle = null,
}) => {
  const handleLeftClick = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      if (activePane === "right") setActivePane("left");
    }
  };

  const handleRightClick = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      if (activePane === "left") setActivePane("right");
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full h-full">
      {/* Mobile Top Segmented Switcher Control */}
      <div className="flex lg:hidden items-center justify-between gap-2 p-1 rounded-xl border border-white/10 bg-slate-950/80 mb-2 shrink-0 select-none">
        <button
          type="button"
          onClick={() => setActivePane("left")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
            activePane === "left"
              ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {leftIcon}
          <span className="truncate">{leftTitle}</span>
          {activePane === "left" && (
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setActivePane("right")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
            activePane === "right"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {rightIcon}
          <span className="truncate">{rightTitle}</span>
          {activePane === "right" && (
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
          )}
        </button>
      </div>

      {/* Side-by-Side Flex Container */}
      <div className="flex-1 flex flex-row items-stretch gap-2 lg:gap-6 min-h-0 min-w-0 h-full w-full relative">
        {/* LEFT PANE */}
        <div
          onClick={handleLeftClick}
          style={leftStyle}
          className={`relative group flex flex-col min-h-0 h-full min-w-0 ${leftWidthClass} ${
            activePane === "left"
              ? "max-lg:flex-1 max-lg:w-[calc(100%-48px)] sm:max-lg:w-[calc(100%-54px)] max-lg:transition-all max-lg:duration-300"
              : "max-lg:w-11 sm:max-lg:w-12 max-lg:shrink-0 max-lg:overflow-hidden max-lg:cursor-pointer max-lg:select-none max-lg:opacity-85 max-lg:hover:opacity-100 max-lg:transition-all max-lg:duration-300"
          }`}
        >
          <div
            className={`h-full w-full flex flex-col min-h-0 ${activePane === "left" ? "flex" : "hidden lg:flex"}`}
          >
            {leftContent}
          </div>
          {leftHandle}

          {activePane !== "left" && (
            <div className="lg:hidden h-full min-h-[200px] rounded-2xl border border-white/10 bg-slate-950/80 p-2 flex flex-col items-center justify-between hover:border-indigo-400/40 transition-all shadow-lg group">
              <div className="flex flex-col items-center gap-2 pt-2 text-indigo-400 group-hover:scale-110 transition-transform">
                {leftIcon}
                <ChevronRight
                  size={14}
                  className="text-indigo-300 animate-pulse"
                />
              </div>
              <div
                className="uppercase tracking-widest text-[10px] font-bold text-slate-300 text-center py-4 select-none whitespace-nowrap"
                style={{
                  writingMode: "vertical-rl",
                  transform: "rotate(180deg)",
                }}
              >
                {leftTitle}
              </div>
              <div className="pb-2 text-[9px] font-bold text-indigo-300 uppercase tracking-wider">
                Expand
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANE */}
        <div
          onClick={handleRightClick}
          className={`flex flex-col min-h-0 h-full min-w-0 lg:flex-1 ${
            activePane === "right"
              ? "max-lg:flex-1 max-lg:w-[calc(100%-48px)] sm:max-lg:w-[calc(100%-54px)] max-lg:transition-all max-lg:duration-300"
              : "max-lg:w-11 sm:max-lg:w-12 max-lg:shrink-0 max-lg:overflow-hidden max-lg:cursor-pointer max-lg:select-none max-lg:opacity-85 max-lg:hover:opacity-100 max-lg:transition-all max-lg:duration-300"
          }`}
        >
          <div
            className={`h-full w-full flex flex-col min-h-0 ${activePane === "right" ? "flex" : "hidden lg:flex"}`}
          >
            {rightContent}
          </div>

          {activePane !== "right" && (
            <div className="lg:hidden h-full min-h-[200px] rounded-2xl border border-white/10 bg-slate-950/80 p-2 flex flex-col items-center justify-between hover:border-cyan-400/40 transition-all shadow-lg group">
              <div className="flex flex-col items-center gap-2 pt-2 text-cyan-400 group-hover:scale-110 transition-transform">
                {rightIcon}
                <ChevronLeft
                  size={14}
                  className="text-cyan-300 animate-pulse"
                />
              </div>
              <div
                className="uppercase tracking-widest text-[10px] font-bold text-slate-300 text-center py-4 select-none whitespace-nowrap"
                style={{
                  writingMode: "vertical-rl",
                  transform: "rotate(180deg)",
                }}
              >
                {rightTitle}
              </div>
              <div className="pb-2 text-[9px] font-bold text-cyan-300 uppercase tracking-wider">
                Expand
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Curated 2D positions for skill nodes in Dijkstra SVG graph
const SKILL_GRAPH_COORDS = {
  // Frontend
  React: { x: 120, y: 80, category: "frontend" },
  "Next.js": { x: 120, y: 180, category: "frontend" },
  TypeScript: { x: 220, y: 80, category: "frontend" },
  JavaScript: { x: 220, y: 180, category: "frontend" },
  "Vue.js": { x: 320, y: 80, category: "frontend" },
  Angular: { x: 320, y: 180, category: "frontend" },
  Frontend: { x: 220, y: 280, category: "frontend" },
  "UI/UX": { x: 120, y: 280, category: "frontend" },

  // Backend & Databases
  "Node.js": { x: 420, y: 80, category: "backend" },
  Python: { x: 520, y: 80, category: "backend" },
  Django: { x: 580, y: 150, category: "backend" },
  FastAPI: { x: 460, y: 150, category: "backend" },
  Go: { x: 420, y: 250, category: "backend" },
  Java: { x: 620, y: 80, category: "backend" },
  "Spring Boot": { x: 680, y: 150, category: "backend" },
  Backend: { x: 520, y: 250, category: "backend" },
  SQL: { x: 520, y: 350, category: "backend" },
  PostgreSQL: { x: 620, y: 350, category: "backend" },
  Database: { x: 420, y: 350, category: "backend" },

  // AI & ML
  "AI/ML": { x: 740, y: 80, category: "ai" },
  "Machine Learning": { x: 800, y: 140, category: "ai" },
  "Deep Learning": { x: 740, y: 200, category: "ai" },
  PyTorch: { x: 800, y: 260, category: "ai" },
  TensorFlow: { x: 680, y: 260, category: "ai" },
  "Data Science": { x: 860, y: 200, category: "ai" },
  NLP: { x: 860, y: 80, category: "ai" },
  "Computer Vision": { x: 920, y: 140, category: "ai" },

  // DevOps & Cloud
  DevOps: { x: 120, y: 380, category: "infra" },
  Docker: { x: 120, y: 480, category: "infra" },
  Kubernetes: { x: 220, y: 380, category: "infra" },
  AWS: { x: 320, y: 380, category: "infra" },
  "Cloud Architecture": { x: 320, y: 480, category: "infra" },
  "System Design": { x: 220, y: 480, category: "infra" },

  // Management
  Leadership: { x: 740, y: 380, category: "management" },
  "Product Management": { x: 840, y: 380, category: "management" },
  Agile: { x: 790, y: 480, category: "management" },
  Scrum: { x: 890, y: 480, category: "management" },

  // Sales & customer-facing skills
  Sales: { x: 420, y: 405, category: "sales" },
  "Business Development": { x: 530, y: 405, category: "sales" },
  "Account Management": { x: 670, y: 405, category: "sales" },
  CRM: { x: 420, y: 465, category: "sales" },
  Negotiation: { x: 530, y: 465, category: "sales" },
  "Customer Success": { x: 670, y: 465, category: "sales" },
};

const SKILL_GRAPH_LINKS = [
  { source: "React", target: "JavaScript", weight: 0.05 },
  { source: "React", target: "Next.js", weight: 0.1 },
  { source: "React", target: "TypeScript", weight: 0.15 },
  { source: "React", target: "Frontend", weight: 0.2 },
  { source: "Next.js", target: "React", weight: 0.05 },
  { source: "Next.js", target: "Frontend", weight: 0.15 },
  { source: "Next.js", target: "TypeScript", weight: 0.1 },
  { source: "TypeScript", target: "JavaScript", weight: 0.05 },
  { source: "JavaScript", target: "Frontend", weight: 0.3 },
  { source: "JavaScript", target: "Node.js", weight: 0.25 },
  { source: "Vue.js", target: "JavaScript", weight: 0.1 },
  { source: "Vue.js", target: "Frontend", weight: 0.25 },
  { source: "Angular", target: "TypeScript", weight: 0.1 },
  { source: "Angular", target: "Frontend", weight: 0.25 },
  { source: "Frontend", target: "UI/UX", weight: 0.4 },
  { source: "Node.js", target: "JavaScript", weight: 0.1 },
  { source: "Node.js", target: "Backend", weight: 0.2 },
  { source: "Python", target: "Backend", weight: 0.15 },
  { source: "Python", target: "Data Science", weight: 0.2 },
  { source: "Python", target: "AI/ML", weight: 0.25 },
  { source: "Django", target: "Python", weight: 0.05 },
  { source: "Django", target: "Backend", weight: 0.1 },
  { source: "FastAPI", target: "Python", weight: 0.05 },
  { source: "FastAPI", target: "Backend", weight: 0.1 },
  { source: "Go", target: "Backend", weight: 0.2 },
  { source: "Go", target: "System Design", weight: 0.25 },
  { source: "Java", target: "Backend", weight: 0.2 },
  { source: "Java", target: "Spring Boot", weight: 0.1 },
  { source: "Spring Boot", target: "Java", weight: 0.05 },
  { source: "Spring Boot", target: "Backend", weight: 0.1 },
  { source: "Backend", target: "System Design", weight: 0.35 },
  { source: "Backend", target: "SQL", weight: 0.2 },
  { source: "SQL", target: "PostgreSQL", weight: 0.1 },
  { source: "SQL", target: "Database", weight: 0.1 },
  { source: "PostgreSQL", target: "SQL", weight: 0.05 },
  { source: "PostgreSQL", target: "Database", weight: 0.1 },
  { source: "AI/ML", target: "Deep Learning", weight: 0.2 },
  { source: "AI/ML", target: "Machine Learning", weight: 0.1 },
  { source: "Machine Learning", target: "AI/ML", weight: 0.1 },
  { source: "Machine Learning", target: "Python", weight: 0.2 },
  { source: "Machine Learning", target: "Data Science", weight: 0.15 },
  { source: "Deep Learning", target: "Machine Learning", weight: 0.1 },
  { source: "Deep Learning", target: "PyTorch", weight: 0.15 },
  { source: "Deep Learning", target: "TensorFlow", weight: 0.15 },
  { source: "PyTorch", target: "Deep Learning", weight: 0.05 },
  { source: "PyTorch", target: "Python", weight: 0.15 },
  { source: "PyTorch", target: "TensorFlow", weight: 0.2 },
  { source: "TensorFlow", target: "Deep Learning", weight: 0.05 },
  { source: "TensorFlow", target: "Python", weight: 0.15 },
  { source: "TensorFlow", target: "PyTorch", weight: 0.2 },
  { source: "Data Science", target: "Python", weight: 0.1 },
  { source: "Data Science", target: "SQL", weight: 0.25 },
  { source: "NLP", target: "Deep Learning", weight: 0.15 },
  { source: "NLP", target: "AI/ML", weight: 0.2 },
  { source: "Computer Vision", target: "Deep Learning", weight: 0.15 },
  { source: "Computer Vision", target: "AI/ML", weight: 0.2 },
  { source: "DevOps", target: "Docker", weight: 0.1 },
  { source: "DevOps", target: "Kubernetes", weight: 0.15 },
  { source: "DevOps", target: "AWS", weight: 0.2 },
  { source: "Docker", target: "DevOps", weight: 0.1 },
  { source: "Docker", target: "Kubernetes", weight: 0.1 },
  { source: "Kubernetes", target: "Docker", weight: 0.05 },
  { source: "Kubernetes", target: "DevOps", weight: 0.1 },
  { source: "Kubernetes", target: "AWS", weight: 0.15 },
  { source: "AWS", target: "DevOps", weight: 0.2 },
  { source: "AWS", target: "Cloud Architecture", weight: 0.15 },
  { source: "Cloud Architecture", target: "System Design", weight: 0.25 },
  { source: "Leadership", target: "Product Management", weight: 0.3 },
  { source: "Leadership", target: "Scrum", weight: 0.35 },
  { source: "Product Management", target: "Leadership", weight: 0.2 },
  { source: "Product Management", target: "Agile", weight: 0.2 },
  { source: "Agile", target: "Scrum", weight: 0.1 },
  { source: "Scrum", target: "Agile", weight: 0.05 },
  { source: "Sales", target: "Business Development", weight: 0.15 },
  { source: "Sales", target: "Account Management", weight: 0.15 },
  { source: "Sales", target: "Negotiation", weight: 0.2 },
  { source: "Sales", target: "CRM", weight: 0.1 },
  { source: "Sales", target: "Customer Success", weight: 0.2 },
  { source: "Business Development", target: "Lead Generation", weight: 0.15 },
  { source: "Business Development", target: "Partnerships", weight: 0.15 },
  { source: "Account Management", target: "Customer Success", weight: 0.15 },
  { source: "Negotiation", target: "Communication", weight: 0.15 },
  { source: "CRM", target: "Salesforce", weight: 0.1 },
  { source: "CRM", target: "HubSpot", weight: 0.1 },
  { source: "Customer Success", target: "Communication", weight: 0.15 },
];
const SKILL_GRAPH_UNIQUE_LINKS = Array.from(
  new Map(
    SKILL_GRAPH_LINKS.map((link) => [
      JSON.stringify([link.source, link.target].sort()),
      link,
    ]),
  ).values(),
);

// Share identical in-flight reads so React Strict Mode's development effect
// replay does not send each initial intelligence request twice.
const intelligenceReadsInFlight = new Map();

// Custom local apiClient hook since we want robust, fail-safe calls
const apiCall = async (url, method = "GET", body = null) => {
  const headers = {
    "Content-Type": "application/json",
  };
  const token = localStorage.getItem("auth_token") || "";
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const config = { method, headers };
  if (body) config.body = JSON.stringify(body);

  const API_BASE = API_BASE_URL;
  const requestUrl = `${API_BASE}/api/v1/intelligence${url}`;
  const canShareRead = method.toUpperCase() === "GET";
  const requestKey = canShareRead
    ? `${requestUrl}:${headers.Authorization || "anonymous"}`
    : null;

  if (requestKey && intelligenceReadsInFlight.has(requestKey)) {
    return intelligenceReadsInFlight.get(requestKey);
  }

  const request = (async () => {
    const response = await fetch(requestUrl, config);
    if (!response.ok) {
      const responseText = (await response.text()).trim();
      let message = responseText;
      try {
        const payload = JSON.parse(responseText);
        message = payload?.detail || payload?.message || responseText;
        if (typeof message !== "string") message = JSON.stringify(message);
      } catch {
        // Keep plain-text server errors readable below.
      }
      if (message.length > 600) message = `${message.slice(0, 600)}…`;
      throw new Error(message || `API request failed (${response.status})`);
    }
    return response.json();
  })();

  if (requestKey) intelligenceReadsInFlight.set(requestKey, request);
  try {
    return await request;
  } finally {
    if (requestKey && intelligenceReadsInFlight.get(requestKey) === request) {
      intelligenceReadsInFlight.delete(requestKey);
    }
  }
};

const apiCallWithProgress = async (url, body, onProgress) => {
  const headers = { "Content-Type": "application/json" };
  const token = localStorage.getItem("auth_token") || "";
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/api/v1/intelligence${url}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "API Call Failed");
  }
  if (!response.body) throw new Error("Progress stream is unavailable.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let results = null;
  const handleFrame = (frame) => {
    const data = frame
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("\n");
    if (!data) return;
    const event = JSON.parse(data);
    if (event.type === "error") throw new Error(event.message);
    onProgress(event);
    if (event.type === "complete") results = event.results;
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      const frames = buffer.split("\n\n");
      buffer = frames.pop() || "";
      frames.forEach(handleFrame);
      if (done) break;
    }
    if (buffer.trim()) handleFrame(buffer);
  } finally {
    reader.releaseLock();
  }
  if (!results)
    throw new Error("The matching stream ended before results arrived.");
  return results;
};

const createLocalRunIdentity = (prefix) => {
  const generatedAt = new Date().toISOString();
  const generatedPart = generatedAt
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  const nonce =
    globalThis.crypto?.randomUUID?.().replaceAll("-", "").slice(0, 8) ||
    Math.random().toString(16).slice(2, 10).padEnd(8, "0");
  return {
    scenarioId: `${prefix}-${generatedPart}-${nonce}`,
    generatedAt,
  };
};

const IntelligenceCenterView = ({ active = true }) => {
  const [activeSubTab, setActiveSubTab] = usePersistentState(
    "active-subtab",
    "skill-match",
  );
  const [graphExpanded, setGraphExpanded] = usePersistentState(
    "graph-expanded",
    false,
  );
  const [mobileActivePane, setMobileActivePane] = useState("left");
  const [resultRevisions, setResultRevisions] = usePersistentState(
    "result-revisions",
    { skill: 0, team: 0, attrition: 0, ona: 0, career: 0 },
  );
  const markResultUpdated = (result) =>
    setResultRevisions((current) => ({
      ...current,
      [result]: current[result] + 1,
    }));

  // 1. Skill Match State
  const [matchSkillsInput, setMatchSkillsInput] = usePersistentState(
    "match-skills",
    [
      { name: "React", level: 4 },
      { name: "FastAPI", level: 3 },
    ],
  );
  const [newSkillName, setNewSkillName] = usePersistentState(
    "new-skill-name",
    "",
  );
  const [newSkillLevel] = usePersistentState("new-skill-level", 3);
  // Skill-match browser: same database-backed picker as team assembly.
  const [matchSkillQuery, setMatchSkillQuery] = useState("");
  const [matchSkillOptions, setMatchSkillOptions] = useState([]);
  const [matchPickerLevels, setMatchPickerLevels] = useState({});
  const [matchCustomLevel, setMatchCustomLevel] = useState(3);
  const [matchInputError, setMatchInputError] = useState("");
  const fetchMatchSkillOptions = async (query = "") => {
    try {
      const data = await apiCall(
        `/team-optimize/skill-suggestions?q=${encodeURIComponent(query)}&limit=200`,
      );
      setMatchSkillOptions(
        Array.isArray(data?.suggestions) ? data.suggestions : [],
      );
    } catch {
      // Options are optional; custom entry still works without them.
    }
  };
  const matchPickerLevelFor = (name) =>
    Number(matchPickerLevels[String(name || "").trim()] || 3);
  const matchDemandKey = (name, level) =>
    `${String(name || "")
      .trim()
      .toLocaleLowerCase()}::${Number(level)}`;
  const matchSkillDemandKeys = matchSkillsInput.map((skill) =>
    matchDemandKey(skill?.name, skill?.level),
  );
  const [skillMatchScope, setSkillMatchScope] = usePersistentState(
    "skill-match-scope",
    "all",
  );
  const [matchResults, setMatchResults] = usePersistentState(
    "match-results",
    [],
  );
  const [skillMatchMetadata, setSkillMatchMetadata] = usePersistentState(
    "skill-match-metadata",
    null,
  );
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [skillMatchStatus, setSkillMatchStatus] = useState(() =>
    matchResults.length > 0 ? "complete" : "idle",
  );
  const [skillMatchProgress, setSkillMatchProgress] = useState({
    phase: "idle",
    message: "",
    completed: 0,
    total: 0,
    matched: 0,
    returned: 0,
  });
  const [activeMatchEmployeeId, setActiveMatchEmployeeId] = usePersistentState(
    "active-match-employee",
    null,
  );
  // Skill-match run identity (mirrors the team assembly Generated/Scenario ID).
  const [skillMatchRun, setSkillMatchRun] = usePersistentState(
    "skill-match-run",
    null,
  );

  // 2. Team Optimize State
  const [teamBudget, setTeamBudget] = usePersistentState("team-budget", 300000);
  const [teamSize, setTeamSize] = usePersistentState("team-size", 3);
  const [teamSkillsInput, setTeamSkillsInput] = usePersistentState(
    "team-skills",
    [
      { name: "React", level: 4 },
      { name: "Python", level: 3 },
      { name: "AWS", level: 3 },
    ],
  );
  const [teamInputsDirty, setTeamInputsDirty] = usePersistentState(
    "team-inputs-dirty",
    false,
  );
  const teamInputEditRef = useRef(teamInputsDirty);
  const markTeamInputsDirty = () => {
    teamInputEditRef.current = true;
    setTeamInputsDirty(true);
  };
  useEffect(() => {
    teamInputEditRef.current = teamInputsDirty;
  }, [teamInputsDirty]);
  const [optimizedTeam, setOptimizedTeam] = usePersistentState(
    "optimized-team",
    null,
  );
  const optimizedTeamRef = useRef(optimizedTeam);
  useEffect(() => {
    optimizedTeamRef.current = optimizedTeam;
  }, [optimizedTeam]);
  const [optimizingLoading, setOptimizingLoading] = useState(false);
  const [teamOptimizeError, setTeamOptimizeError] = useState("");
  const savedTeamInputs = optimizedTeam?.run_inputs;
  const normalizeTeamTargets = (targets) =>
    (Array.isArray(targets) ? targets : [])
      .map((target) => ({
        name: String(target?.name || "")
          .trim()
          .toLocaleLowerCase(),
        level: Number(target?.level),
      }))
      .sort(
        (left, right) =>
          left.name.localeCompare(right.name) || left.level - right.level,
      );
  const teamInputsChanged = Boolean(
    savedTeamInputs &&
    (Number(savedTeamInputs.budget_cap) !== Number(teamBudget) ||
      Number(savedTeamInputs.max_team_size) !== Number(teamSize) ||
      JSON.stringify(normalizeTeamTargets(savedTeamInputs.target_skills)) !==
        JSON.stringify(normalizeTeamTargets(teamSkillsInput))),
  );
  const teamExactEvidenceAvailable =
    optimizedTeam?.model_version === "team-milp-v4";
  // Team solver result state
  const [annealingStatus, setAnnealingStatus] = useState(() =>
    optimizedTeam ? "complete" : "idle",
  ); // idle, running, complete
  const teamSearchGenerationRef = useRef(0);
  const teamOptimizationRunningRef = useRef(false);
  // Feasibility + skill suggestion state (real tenant data, no fabricated ranges)
  const [teamFeasibility, setTeamFeasibility] = useState(null);
  const [teamFeasibilityError, setTeamFeasibilityError] = useState("");
  const [teamSkillSuggestions, setTeamSkillSuggestions] = useState([]);
  const [teamSkillQuery, setTeamSkillQuery] = useState("");
  const fetchTeamFeasibility = async () => {
    try {
      const data = await apiCall("/team-optimize/feasibility");
      setTeamFeasibility(data);
      setTeamFeasibilityError("");
    } catch (err) {
      setTeamFeasibilityError(
        err?.message || "Unable to load budget feasibility.",
      );
    }
  };
  const fetchTeamSkillSuggestions = async (query = "") => {
    try {
      const data = await apiCall(
        `/team-optimize/skill-suggestions?q=${encodeURIComponent(query)}&limit=200`,
      );
      setTeamSkillSuggestions(
        Array.isArray(data?.suggestions) ? data.suggestions : [],
      );
    } catch {
      // Suggestions are optional; the form still works without them.
    }
  };
  // Picker level per browsed skill (shared Add-level for custom entries).
  const [teamPickerLevels, setTeamPickerLevels] = useState({});
  const [teamCustomLevel, setTeamCustomLevel] = useState(3);
  // Accordion sections for the Team Constraints column (persisted).
  const [teamSections, setTeamSections] = usePersistentState(
    "team-constraint-sections",
    { budget: true, size: true, browser: true, demands: true },
  );
  const toggleTeamSection = (key) =>
    setTeamSections((current) => ({ ...current, [key]: !current[key] }));
  // Adjustable left-column width for the team builder (desktop, persisted).
  const [teamLeftWidth, setTeamLeftWidth] = usePersistentState(
    "team-left-width",
    360,
  );
  const teamLeftWidthPx = Math.min(
    560,
    Math.max(300, Number(teamLeftWidth) || 360),
  );
  const teamResizeRef = useRef(null);
  const startTeamResize = (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault();
    teamResizeRef.current = { startX: event.clientX, startW: teamLeftWidthPx };
    const onMove = (moveEvent) => {
      const drag = teamResizeRef.current;
      if (!drag) return;
      setTeamLeftWidth(
        Math.min(
          560,
          Math.max(300, drag.startW + (moveEvent.clientX - drag.startX)),
        ),
      );
    };
    const onUp = () => {
      teamResizeRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };
  const pickerLevelFor = (name) =>
    Number(teamPickerLevels[String(name || "").trim()] || 3);
  // Demand identity is (skill, level): Python L2 + Python L4 can coexist,
  // but the exact same skill+level pair may only appear once.
  const teamDemandKey = (name, level) =>
    `${String(name || "")
      .trim()
      .toLocaleLowerCase()}::${Number(level)}`;
  // Live duplicate/empty detection for the skill demand list (case-insensitive).
  const teamSkillNameKeys = teamSkillsInput.map((skill) =>
    String(skill?.name || "")
      .trim()
      .toLocaleLowerCase(),
  );
  const teamSkillDemandKeys = teamSkillsInput.map((skill) =>
    teamDemandKey(skill?.name, skill?.level),
  );
  const teamEmptySkillCount = teamSkillNameKeys.filter((name) => !name).length;
  const teamDuplicateDemands = (() => {
    const seen = new Set();
    const dupes = [];
    teamSkillsInput.forEach((skill) => {
      const key = teamDemandKey(skill?.name, skill?.level);
      if (key.startsWith("::")) return;
      if (seen.has(key)) {
        const label = `${String(skill?.name || "").trim()} L${Number(skill?.level)}`;
        if (!dupes.includes(label)) dupes.push(label);
      } else {
        seen.add(key);
      }
    });
    return dupes;
  })();
  const teamDuplicateSkillNames = teamDuplicateDemands;
  const addTeamSkill = (rawName, rawLevel = 3) => {
    const value = String(rawName || "").trim();
    const level = Number(rawLevel);
    if (!value) {
      setTeamOptimizeError("Skill names cannot be empty.");
      return false;
    }
    if (!Number.isInteger(level) || level < 1 || level > 5) {
      setTeamOptimizeError("Skill level must be a whole number from 1 to 5.");
      return false;
    }
    if (
      teamSkillsInput.some(
        (skill) =>
          teamDemandKey(skill?.name, skill?.level) ===
          teamDemandKey(value, level),
      )
    ) {
      setTeamOptimizeError(
        `"${value}" at L${level} is already in your demands. The same skill can be added at different levels (e.g. Python L2 and L4), but the same skill+level pair may only appear once.`,
      );
      return false;
    }
    markTeamInputsDirty();
    setTeamSkillsInput([...teamSkillsInput, { name: value, level }]);
    setTeamOptimizeError("");
    return true;
  };
  const removeDuplicateTeamSkills = () => {
    const seen = new Set();
    const deduped = [];
    teamSkillsInput.forEach((skill) => {
      const key = teamDemandKey(skill?.name, skill?.level);
      if (key.startsWith("::") || seen.has(key)) return;
      seen.add(key);
      deduped.push(skill);
    });
    markTeamInputsDirty();
    setTeamSkillsInput(deduped);
    setTeamOptimizeError("");
  };

  // Collapsible accordion section for the Team Constraints column.
  const renderTeamSection = (key, title, badge, alert, children) => {
    const isOpen = teamSections[key] !== false;
    return (
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
        <button
          type="button"
          onClick={() => toggleTeamSection(key)}
          aria-expanded={isOpen}
          className="flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2.5 text-left transition hover:bg-white/[0.04]"
        >
          <span className="flex min-w-0 items-center gap-2">
            <ChevronDown
              size={13}
              className={`shrink-0 text-slate-400 transition-transform ${isOpen ? "" : "-rotate-90"}`}
            />
            <span className="truncate text-[10px] font-bold uppercase tracking-widest text-slate-300">
              {title}
            </span>
            {alert && (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
            )}
          </span>
          {badge && (
            <span className="shrink-0 rounded-md border border-white/10 bg-slate-950/70 px-1.5 py-0.5 font-mono text-[9px] text-slate-300">
              {badge}
            </span>
          )}
        </button>
        {isOpen && (
          <div className="border-t border-white/5 px-3 py-3">{children}</div>
        )}
      </div>
    );
  };

  // 3. Attrition State
  const [attritionData, setAttritionData] = usePersistentState(
    "attrition-result",
    [],
  );
  const [populationStats, setPopulationStats] = usePersistentState(
    "attrition-population-stats",
    null,
  );
  const [attritionModel, setAttritionModel] = usePersistentState(
    "attrition-model-metadata",
    null,
  );
  const [survivalCurve, setSurvivalCurve] = usePersistentState(
    "attrition-survival-curve",
    [],
  );
  const [selectedAttritionEmp, setSelectedAttritionEmp] = usePersistentState(
    "selected-attrition-employee",
    null,
  );
  const [attritionLoading, setAttritionLoading] = useState(false);
  const [attritionError, setAttritionError] = useState("");
  // Attrition run identity (mirrors team assembly Generated/Scenario ID).
  const [attritionRun, setAttritionRun] = usePersistentState(
    "attrition-run",
    null,
  );
  const [attritionSearch, setAttritionSearch] = usePersistentState(
    "attrition-search",
    "",
  );
  const [attritionSort, setAttritionSort] = usePersistentState(
    "attrition-sort",
    "tenure",
  ); // tenure | name | department | survival (observed records only)
  const [attritionSortDesc, setAttritionSortDesc] = usePersistentState(
    "attrition-sort-desc",
    true,
  );

  // Legacy fixed-formula scenario controls; not a trained survival model.
  const [moraleSlider, setMoraleSlider] = usePersistentState(
    "attrition-morale-slider",
    0.8,
  );
  const [salarySlider, setSalarySlider] = usePersistentState(
    "attrition-salary-slider",
    0.0,
  ); // 0% to 50% increase
  const [workloadSlider, setWorkloadSlider] = usePersistentState(
    "attrition-workload-slider",
    3,
  ); // skills count
  const [hoveredSurvMonth, setHoveredSurvMonth] = useState(null);
  const [hoveredHazMonth, setHoveredHazMonth] = useState(null);
  // Cursor-following tooltip position for the cohort survival chart.
  const [survHoverPos, setSurvHoverPos] = useState(null);
  // Fullscreen toggle for the cohort survival chart only.
  const [survGraphExpanded, setSurvGraphExpanded] = useState(false);

  // Legacy scenario calculations. These are never exposed as forecasts unless
  // a validated, outcome-trained model is supplied by the server. They run
  // only for selections carrying model levers; descriptive roster records
  // (no levers) always yield null instead of crashing.
  const attritionBaseline = useMemo(() => {
    if (!selectedAttritionEmp?.levers || !populationStats) return null;
    return computeSurvival(
      buildCovariates(selectedAttritionEmp.levers),
      populationStats.means,
    );
  }, [selectedAttritionEmp, populationStats]);

  const attritionSim = useMemo(() => {
    if (!selectedAttritionEmp?.levers || !populationStats) return null;
    const covs = buildCovariates(selectedAttritionEmp.levers, {
      morale: moraleSlider,
      salaryIncrease: salarySlider,
      skillsCount: workloadSlider,
    });
    return computeSurvival(covs, populationStats.means);
  }, [
    selectedAttritionEmp,
    moraleSlider,
    salarySlider,
    workloadSlider,
    populationStats,
  ]);

  // Legacy scenario covariates. Forecasts remain hidden unless a validated
  // outcome-trained model is explicitly available from the server.
  const attritionCovs = useMemo(() => {
    if (!selectedAttritionEmp?.levers) return null;
    return buildCovariates(selectedAttritionEmp.levers, {
      morale: moraleSlider,
      salaryIncrease: salarySlider,
      skillsCount: workloadSlider,
    });
  }, [selectedAttritionEmp, moraleSlider, salarySlider, workloadSlider]);

  const riskTierSim = attritionSim ? riskTier(attritionSim.attr12) : "Low";

  // Sandbox lever deltas vs the employee's recorded baseline
  const leverDeltas = useMemo(() => {
    if (!attritionBaseline || !attritionSim) return null;
    return {
      morale: moraleSlider - (selectedAttritionEmp?.levers?.morale ?? 0.5),
      salaryIncrease: salarySlider,
      skills:
        workloadSlider - (selectedAttritionEmp?.levers?.skills_count ?? 0),
      attrDelta: (attritionBaseline.attr12 - attritionSim.attr12) * 100,
      hrDelta: attritionSim.hazardRatio - attritionBaseline.hazardRatio,
    };
  }, [
    attritionBaseline,
    attritionSim,
    moraleSlider,
    salarySlider,
    workloadSlider,
    selectedAttritionEmp,
  ]);

  // Registry view: observed descriptive records, never forecasts.
  const visibleAttrition = useMemo(() => {
    const q = attritionSearch.trim().toLowerCase();
    let list = attritionData;
    if (q) {
      list = attritionData.filter(
        (e) =>
          (e.full_name || "").toLowerCase().includes(q) ||
          (e.role || "").toLowerCase().includes(q) ||
          (e.department || "").toLowerCase().includes(q),
      );
    }
    // Legacy formula sort keys fall back to observed tenure.
    const sortKey = ["name", "tenure", "department", "survival"].includes(
      attritionSort,
    )
      ? attritionSort
      : "tenure";
    const sorted = [...list];
    const dir = attritionSortDesc ? -1 : 1;
    sorted.sort((a, b) => {
      switch (sortKey) {
        case "name":
          return dir * (a.full_name || "").localeCompare(b.full_name || "");
        case "department":
          return (
            dir * (a.department || "").localeCompare(b.department || "") ||
            dir * ((a.tenure_months || 0) - (b.tenure_months || 0))
          );
        case "survival":
          return (
            dir *
            ((a.cohort_survival_at_tenure ?? 0) -
              (b.cohort_survival_at_tenure ?? 0))
          );
        case "tenure":
        default:
          return dir * ((a.tenure_months || 0) - (b.tenure_months || 0));
      }
    });
    return sorted;
  }, [attritionData, attritionSearch, attritionSort, attritionSortDesc]); // 4. ONA State
  const [onaData, setOnaData] = usePersistentState("ona-result", {
    nodes: [],
    links: [],
    metrics: {},
  });
  const [onaLoading, setOnaLoading] = useState(false);
  const [onaError, setOnaError] = useState("");
  const [onaWindowDays, setOnaWindowDays] = useState(90);
  const [onaFocusSelected, setOnaFocusSelected] = useState(false);
  const onaRequestRef = useRef(0);
  const [selectedOnaNode, setSelectedOnaNode] = usePersistentState(
    "selected-ona-node",
    null,
  );
  const [onaDeptFilter, setOnaDeptFilter] = usePersistentState(
    "ona-department-filter",
    "all",
  );
  const [onaSearchQuery, setOnaSearchQuery] = usePersistentState(
    "ona-search",
    "",
  );
  const [intelligenceReadiness, setIntelligenceReadiness] = usePersistentState(
    "intelligence-readiness",
    null,
  );
  const availableCompensationUnits = Object.keys(
    intelligenceReadiness?.team_assembly?.compensation_units || {},
  );
  const teamBudgetUnitLabel =
    availableCompensationUnits.length === 1
      ? humanizeCompensationUnit(availableCompensationUnits[0])
      : availableCompensationUnits.length > 1
        ? "mixed units; normalize uploaded records"
        : "recorded compensation amount";

  const topInfluencers = useMemo(() => {
    if (!onaData?.nodes?.length) return [];
    return [...onaData.nodes]
      .filter((node) => (node.degree || 0) > 0)
      .sort((a, b) => (b.influence_pagerank || 0) - (a.influence_pagerank || 0))
      .slice(0, 4);
  }, [onaData]);

  const topBridgeBrokers = useMemo(() => {
    if (!onaData?.nodes?.length) return [];
    return [...onaData.nodes]
      .filter((node) => (node.degree || 0) > 0)
      .sort((a, b) => (b.bridge_betweenness || 0) - (a.bridge_betweenness || 0))
      .slice(0, 4);
  }, [onaData]);

  // Selected Node's direct 1st-degree neighbors
  const selectedNodeNeighbors = useMemo(() => {
    if (!selectedOnaNode || !onaData?.links?.length) return [];
    const neighbors = [];
    onaData.links.forEach((l) => {
      if (l.source === selectedOnaNode.id) {
        const targetNode = onaData.nodes.find((n) => n.id === l.target);
        if (targetNode)
          neighbors.push({
            node: targetNode,
            weight: l.record_count ?? l.weight,
            channel: l.channel,
            isCross: l.is_cross_dept,
            eventTypes: l.event_types || [],
            firstOccurredAt: l.first_occurred_at,
            lastOccurredAt: l.last_occurred_at,
          });
      } else if (l.target === selectedOnaNode.id) {
        const sourceNode = onaData.nodes.find((n) => n.id === l.source);
        if (sourceNode)
          neighbors.push({
            node: sourceNode,
            weight: l.record_count ?? l.weight,
            channel: l.channel,
            isCross: l.is_cross_dept,
            eventTypes: l.event_types || [],
            firstOccurredAt: l.first_occurred_at,
            lastOccurredAt: l.last_occurred_at,
          });
      }
    });
    return neighbors.sort((a, b) => b.weight - a.weight);
  }, [selectedOnaNode, onaData]);

  const availableDepts = useMemo(() => {
    if (!onaData?.nodes?.length) return [];
    return Array.from(
      new Set(onaData.nodes.map((n) => n.department || "General")),
    );
  }, [onaData]);

  const onaEmployeesWithoutEvents =
    onaData?.metrics?.employees_without_qualifying_events;
  const onaCrossDeptLinks =
    onaData?.metrics?.cross_dept_links ??
    (onaData?.links || []).filter((link) => link.is_cross_dept).length;
  const onaDateRange = [
    onaData?.metrics?.earliest_represented_record_at,
    onaData?.metrics?.latest_represented_record_at,
  ]
    .filter(Boolean)
    .map(formatOnaDate);
  const onaEventTypeEntries = Object.entries(
    onaData?.metrics?.event_type_breakdown || {},
  ).sort((left, right) => right[1] - left[1]);
  const maxOnaEventTypeCount = Math.max(
    1,
    ...onaEventTypeEntries.map(([, count]) => Number(count) || 0),
  );

  // 5. Career Path State
  const [careerEmployees, setCareerEmployees] = usePersistentState(
    "career-employees",
    [],
  );
  const [careerEmployeeScopeTruncated, setCareerEmployeeScopeTruncated] =
    useState(false);
  const [selectedCareerEmpId, setSelectedCareerEmpId] = usePersistentState(
    "selected-career-employee",
    "",
  );
  const [careerPathData, setCareerPathData] = usePersistentState(
    "career-path-result",
    null,
  );
  const [careerLoading, setCareerLoading] = useState(false);
  const [careerError, setCareerError] = useState("");
  const careerRequestRef = useRef(0);

  // Load basic initial data
  useEffect(() => {
    if (!active) return undefined;
    fetchAttrition();
    fetchOna();
    fetchCareerEmployees();
    fetchTeamFeasibility();
    fetchTeamSkillSuggestions("");
    fetchMatchSkillOptions("");
    apiCall("/data-readiness")
      .then(setIntelligenceReadiness)
      .catch((err) =>
        console.warn(
          "Unable to load Intelligence data readiness:",
          err?.message,
        ),
      );
    return undefined;
  }, [active]);

  // Refresh feasibility + suggestions whenever the team builder tab is opened.
  useEffect(() => {
    if (!active || activeSubTab !== "team-builder") return undefined;
    fetchTeamFeasibility();
    fetchTeamSkillSuggestions(teamSkillQuery);
    return undefined;
  }, [active, activeSubTab]);

  // Refresh skill options whenever the semantic search tab is opened.
  useEffect(() => {
    if (!active || activeSubTab !== "skill-match") return undefined;
    fetchMatchSkillOptions(matchSkillQuery);
    return undefined;
  }, [active, activeSubTab]);

  // Solver runs are persisted server-side as well as in the browser. Restore
  // the latest tenant result when returning to this view so its chart survives
  // navigation, tab switches, and browser reloads.
  useEffect(() => {
    if (
      !active ||
      activeSubTab !== "team-builder" ||
      teamOptimizationRunningRef.current
    ) {
      return undefined;
    }

    const requestGeneration = teamSearchGenerationRef.current;
    let cancelled = false;
    apiCall("/team-optimize/latest")
      .then((response) => {
        if (
          cancelled ||
          requestGeneration !== teamSearchGenerationRef.current
        ) {
          return;
        }
        const savedResult = response?.result;
        if (
          !savedResult ||
          !Array.isArray(savedResult.optimized_team) ||
          !savedResult.metrics
        ) {
          return;
        }
        const restoredResult = {
          ...savedResult,
          run_inputs: savedResult.run_inputs || response?.inputs || null,
        };
        if (teamInputEditRef.current) {
          if (!optimizedTeamRef.current) {
            setOptimizedTeam(restoredResult);
            setAnnealingStatus("complete");
          }
          return;
        }

        const savedInputs = restoredResult.run_inputs;
        if (
          savedInputs &&
          Array.isArray(savedInputs.target_skills) &&
          !teamInputEditRef.current
        ) {
          setTeamSkillsInput(savedInputs.target_skills);
          if (Number.isFinite(Number(savedInputs.budget_cap))) {
            setTeamBudget(Number(savedInputs.budget_cap));
          }
          if (Number.isFinite(Number(savedInputs.max_team_size))) {
            setTeamSize(Number(savedInputs.max_team_size));
          }
        }

        setOptimizedTeam(restoredResult);
        setAnnealingStatus("complete");
        setTeamOptimizeError("");
      })
      .catch((error) => {
        if (
          !cancelled &&
          requestGeneration === teamSearchGenerationRef.current
        ) {
          setTeamOptimizeError(
            error?.message || "Unable to restore the saved team result.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [active, activeSubTab]);

  // Sync sliders to the selected employee's recorded baseline values
  useEffect(() => {
    if (selectedAttritionEmp?.levers) {
      setMoraleSlider(selectedAttritionEmp.levers.morale ?? 0.5);
      setWorkloadSlider(selectedAttritionEmp.levers.skills_count ?? 0);
      setSalarySlider(0.0);
      setHoveredSurvMonth(null);
    }
  }, [selectedAttritionEmp]);

  async function fetchAttrition() {
    try {
      setAttritionLoading(true);
      setAttritionError("");
      const data = await apiCall("/attrition-hazard");
      setSurvivalCurve(
        Array.isArray(data.survival_curve) ? data.survival_curve : [],
      );
      const model = data.model || {
        status: "insufficient_outcome_data",
        message:
          "No validated survival-model status was returned; individual forecasts are unavailable.",
      };
      // Never render employee risk values from an unvalidated/legacy API
      // response. A model must explicitly report holdout evaluation and
      // acceptable calibration before the UI presents forecasts. The roster
      // below is observed descriptive records only (tenure, status, cohort
      // context) — never a forecast.
      const forecastsValidated =
        model.status === "validated" &&
        model.validation?.holdout_evaluated === true &&
        model.validation?.calibration_passed === true;
      const employees = Array.isArray(data.employees) ? data.employees : [];
      const selectedEmployeeId =
        selectedAttritionEmp?.employee_id || selectedAttritionEmp?.id;
      const nextSelectedEmployee =
        employees.find(
          (employee) =>
            (employee.employee_id || employee.id) === selectedEmployeeId,
        ) ||
        employees[0] ||
        null;
      setAttritionData(employees);
      setPopulationStats(data.population || null);
      setAttritionModel(
        forecastsValidated
          ? model
          : model.status === "insufficient_outcome_data" ||
              model.status === "cohort_descriptive"
            ? model
            : {
                ...model,
                status: "insufficient_outcome_data",
                message:
                  "The survival model has not passed required validation. Individual forecasts are unavailable.",
              },
      );
      markResultUpdated("attrition");
      setSelectedAttritionEmp(nextSelectedEmployee);
      const loadedAt = new Date().toISOString();
      let runHash = 0;
      const runSeed = `${loadedAt}:${model.status}:${data.survival_curve?.length || 0}`;
      for (let i = 0; i < runSeed.length; i += 1) {
        runHash = (runHash * 31 + runSeed.charCodeAt(i)) >>> 0;
      }
      setAttritionRun({
        scenarioId: `AT-${loadedAt.slice(0, 10).replaceAll("-", "")}-${runHash.toString(16).padStart(8, "0").slice(0, 8)}`,
        generatedAt: loadedAt,
        modelStatus: model.status,
        curvePoints: data.survival_curve?.length || 0,
      });
    } catch (err) {
      setAttritionError(
        err?.message || "Unable to load attrition model status.",
      );
    } finally {
      setAttritionLoading(false);
    }
  }

  async function fetchOna(windowDays = onaWindowDays) {
    const requestId = ++onaRequestRef.current;
    try {
      setOnaLoading(true);
      setOnaError("");
      const data = await apiCall(
        `/ona?limit=500&window_days=${encodeURIComponent(windowDays)}`,
      );
      if (requestId !== onaRequestRef.current) return;
      setOnaData({
        ...data,
        runIdentity: createLocalRunIdentity("ONA"),
      });
      markResultUpdated("ona");
      if (data.nodes && data.nodes.length > 0) {
        const selectedNodeId = selectedOnaNode?.id;
        setSelectedOnaNode(
          data.nodes.find((node) => node.id === selectedNodeId) ||
            data.nodes.find((node) => (node.degree || 0) > 0) ||
            data.nodes[0],
        );
      } else {
        setSelectedOnaNode(null);
        setOnaFocusSelected(false);
      }
      setOnaLoading(false);
    } catch (err) {
      if (requestId !== onaRequestRef.current) return;
      setOnaError(err?.message || "Unable to load the collaboration network.");
      setOnaLoading(false);
    }
  }

  async function fetchCareerEmployees() {
    try {
      setCareerError("");
      const data = await apiCall("/career-path-employees?limit=10000");
      const employees = Array.isArray(data?.employees) ? data.employees : [];
      setCareerEmployees(employees);
      setCareerEmployeeScopeTruncated(Boolean(data?.employee_scope_truncated));
      if (employees.length > 0) {
        setSelectedCareerEmpId(employees[0].id);
        loadCareerPath(employees[0].id);
      }
    } catch (err) {
      setCareerError(err?.message || "Unable to load employee profiles.");
    }
  }

  async function loadCareerPath(empId) {
    const requestId = ++careerRequestRef.current;
    if (!empId) {
      setCareerPathData(null);
      setCareerError("");
      setCareerLoading(false);
      return;
    }
    try {
      setCareerLoading(true);
      setCareerError("");
      setCareerPathData(null);
      const data = await apiCall(`/career-path/${empId}`);
      if (requestId !== careerRequestRef.current) return;
      setCareerPathData({
        ...data,
        runIdentity: createLocalRunIdentity("CP"),
      });
      markResultUpdated("career");
    } catch (err) {
      if (requestId === careerRequestRef.current) {
        setCareerError(
          err?.message || "Unable to calculate career transition history.",
        );
      }
    } finally {
      if (requestId === careerRequestRef.current) setCareerLoading(false);
    }
  }

  // 1. Skill Match Actions
  // Demand identity is (skill, level): same skill may repeat at different
  // levels, but the exact same skill+level pair is never stored twice.
  const addSkillMatchReq = (rawName, rawLevel) => {
    const value = String(rawName !== undefined ? rawName : newSkillName).trim();
    const level = Number(rawLevel !== undefined ? rawLevel : newSkillLevel);
    if (!value) {
      setMatchInputError("Skill names cannot be empty.");
      return false;
    }
    if (!Number.isInteger(level) || level < 1 || level > 5) {
      setMatchInputError("Skill level must be a whole number from 1 to 5.");
      return false;
    }
    if (
      matchSkillsInput.some(
        (skill) =>
          matchDemandKey(skill?.name, skill?.level) ===
          matchDemandKey(value, level),
      )
    ) {
      setMatchInputError(
        `"${value}" at L${level} is already in your requirements. The same skill can be added at different levels, but the same skill+level pair may only appear once.`,
      );
      return false;
    }
    setMatchSkillsInput([...matchSkillsInput, { name: value, level }]);
    setNewSkillName("");
    setMatchInputError("");
    return true;
  };

  const removeSkillMatchReq = (idx) => {
    setMatchSkillsInput(matchSkillsInput.filter((_, i) => i !== idx));
  };

  const triggerSkillMatch = async () => {
    if (matchSkillsInput.length === 0) return;
    try {
      setMatchingLoading(true);
      setSkillMatchStatus("running");
      setSkillMatchProgress({
        phase: "connecting",
        message: "Connecting to the matching service…",
        completed: 0,
        total: 0,
        matched: 0,
        returned: 0,
      });
      setMatchResults([]);
      setSkillMatchMetadata(null);
      setActiveMatchEmployeeId(null);
      setMobileActivePane("right");
      let profilesEvaluated = null;
      const results = await apiCallWithProgress(
        "/skill-match/stream",
        { target_skills: matchSkillsInput, scope: skillMatchScope, limit: 100 },
        (event) => {
          if (event.type === "progress" || event.type === "complete") {
            setSkillMatchProgress({
              phase: event.phase || event.type,
              message:
                event.message ||
                (event.type === "complete" ? "Results are ready." : ""),
              completed: event.completed || 0,
              total: event.total || 0,
              matched: event.matched_profile_count || 0,
              returned: event.returned || 0,
            });
          }
          if (event.type === "complete") {
            setSkillMatchMetadata(event.semantic_search || null);
            profilesEvaluated = event.profiles_evaluated ?? event.total ?? null;
          }
        },
      );
      setMatchResults(results);
      markResultUpdated("skill");
      const completedAt = new Date().toISOString();
      const runKeySeed = `${completedAt}:${JSON.stringify(matchSkillsInput)}:${skillMatchScope}:${results.length}`;
      let runHash = 0;
      for (let i = 0; i < runKeySeed.length; i += 1) {
        runHash = (runHash * 31 + runKeySeed.charCodeAt(i)) >>> 0;
      }
      setSkillMatchRun({
        scenarioId: `SM-${completedAt.slice(0, 10).replaceAll("-", "")}-${runHash.toString(16).padStart(8, "0").slice(0, 8)}`,
        generatedAt: completedAt,
        targetSkills: matchSkillsInput,
        scope: skillMatchScope,
        resultCount: results.length,
        profilesEvaluated,
      });
      if (results.length > 0) {
        setActiveMatchEmployeeId(
          results[0].profile_key ||
            results[0].profile_id ||
            results[0].employee_id,
        );
      }
      setSkillMatchStatus("complete");
      setMatchingLoading(false);
    } catch (err) {
      console.error(err);
      setSkillMatchStatus("error");
      setSkillMatchProgress((progress) => ({
        ...progress,
        phase: "error",
        message: err.message || "Skill matching failed. Please try again.",
      }));
      setMatchingLoading(false);
    }
  };

  // 2. Team Optimize Actions
  const triggerTeamOptimize = async () => {
    if (
      !Number.isFinite(Number(teamBudget)) ||
      Number(teamBudget) <= 0 ||
      Number(teamBudget) > 1_000_000_000
    ) {
      setTeamOptimizeError(
        "Enter a budget greater than 0 and no more than 1,000,000,000 in the uploaded compensation unit.",
      );
      return;
    }
    if (
      !Number.isInteger(Number(teamSize)) ||
      Number(teamSize) < 2 ||
      Number(teamSize) > 10
    ) {
      setTeamOptimizeError("Team size must be a whole number from 2 to 10.");
      return;
    }
    // Name the exact offenders so the user can fix them in one pass.
    if (teamSkillsInput.length === 0) {
      setTeamOptimizeError(
        "Add at least one skill demand before optimizing (e.g. Python, AWS).",
      );
      return;
    }
    if (teamEmptySkillCount > 0) {
      setTeamOptimizeError(
        `${teamEmptySkillCount} skill demand${teamEmptySkillCount > 1 ? "s are" : " is"} empty. Remove or rename the blank row${teamEmptySkillCount > 1 ? "s" : ""} below, then re-optimize.`,
      );
      return;
    }
    if (teamDuplicateSkillNames.length > 0) {
      const shown = teamDuplicateSkillNames.slice(0, 3).join('", "');
      setTeamOptimizeError(
        `Duplicate skill+level demand${teamDuplicateSkillNames.length > 1 ? "s" : ""}: "${shown}" appear${teamDuplicateSkillNames.length > 1 ? "" : "s"} more than once. The same skill may repeat at different levels (Python L2 + L4), but the same skill+level pair may only appear once. Use "Remove duplicates" below, then re-optimize.`,
      );
      return;
    }
    try {
      teamSearchGenerationRef.current += 1;
      teamOptimizationRunningRef.current = true;
      setTeamOptimizeError("");
      setOptimizingLoading(true);
      setAnnealingStatus("running");
      setMobileActivePane("right");

      const results = await apiCall("/team-optimize", "POST", {
        target_skills: teamSkillsInput,
        budget_cap: teamBudget,
        max_team_size: teamSize,
      });

      setOptimizedTeam(results);
      markResultUpdated("team");
      teamInputEditRef.current = false;
      setTeamInputsDirty(false);
      teamOptimizationRunningRef.current = false;
      setAnnealingStatus("complete");
      setOptimizingLoading(false);
    } catch (err) {
      console.error(err);
      let message =
        err.message ||
        "Team optimization failed. Please review the inputs and try again.";
      try {
        const parsed = JSON.parse(message);
        message = typeof parsed.detail === "string" ? parsed.detail : message;
      } catch {
        // Keep the original network or parsing error.
      }
      setTeamOptimizeError(message);
      teamOptimizationRunningRef.current = false;
      setOptimizingLoading(false);
      setAnnealingStatus(optimizedTeam ? "complete" : "idle");
    }
  };

  // Helper function to extract skill matching paths
  const getHighlightPathNodes = () => {
    const activeMatch = matchResults.find(
      (r) =>
        (r.profile_key || r.profile_id || r.employee_id) ===
        activeMatchEmployeeId,
    );
    if (!activeMatch) return new Set();

    const nodesOnPath = new Set();
    activeMatch.match_details.detailed_matches.forEach((detail) => {
      (detail.graph_path || []).forEach((node) => nodesOnPath.add(node));
    });
    return nodesOnPath;
  };

  const getHighlightPathEdges = () => {
    const activeMatch = matchResults.find(
      (r) =>
        (r.profile_key || r.profile_id || r.employee_id) ===
        activeMatchEmployeeId,
    );
    const edgesOnPath = new Set();
    activeMatch?.match_details?.detailed_matches?.forEach((detail) => {
      const path = detail.graph_path || [];
      for (let index = 0; index < path.length - 1; index += 1) {
        edgesOnPath.add([path[index], path[index + 1]].sort().join("::"));
      }
    });
    return edgesOnPath;
  };

  const highlightNodes = getHighlightPathNodes();
  const highlightEdges = getHighlightPathEdges();

  // Single permanent Explain dock at the bottom edge: one layout on every
  // tab and every screen size. Each tab supplies its own props; the dock
  // itself never reshapes.
  // Explanation payloads stay small so small local models answer inside the
  // server's first-text deadline: downsampled curve + capped rosters. Full
  // data stays on screen; only the model-bound copy is trimmed.
  const downsampleCurve = (curve, max = 48) => {
    if (!Array.isArray(curve) || curve.length <= max) return curve;
    const step = (curve.length - 1) / (max - 1);
    const out = [];
    for (let i = 0; i < max; i += 1) out.push(curve[Math.round(i * step)]);
    return out;
  };
  const explainDock = (() => {
    switch (activeSubTab) {
      case "team-builder":
        return {
          subtab: "team-builder",
          resultKey:
            optimizedTeam?.scenario_id ||
            `${optimizedTeam?.generated_at || "saved"}:${JSON.stringify(optimizedTeam?.run_inputs || {})}`,
          context: {
            runIdentity: optimizedTeam
              ? {
                  scenarioId: optimizedTeam.scenario_id,
                  generatedAt: optimizedTeam.generated_at,
                }
              : null,
            runInputs: optimizedTeam?.run_inputs || null,
            optimizedTeam: optimizedTeam,
            uploadedDataReadiness: intelligenceReadiness?.team_assembly,
            stale: teamInputsChanged,
            currentForm: {
              budget_cap: teamBudget,
              max_team_size: teamSize,
              target_skills: teamSkillsInput,
            },
          },
          buttonText:
            teamInputsChanged && optimizedTeam && !optimizingLoading
              ? "Explain Saved Run with AI"
              : "Explain with AI",
          disabled: !optimizedTeam || optimizingLoading,
        };
      case "attrition":
        return {
          subtab: "attrition",
          // Selection is part of the key so the report always covers the
          // person currently chosen, never a stale default.
          resultKey: `${
            attritionRun?.scenarioId ||
            `attrition:${attritionModel?.status || "none"}:${survivalCurve.length}`
          }:${selectedAttritionEmp?.employee_id || "none"}`,
          context: {
            model: attritionModel,
            survivalCurve: downsampleCurve(survivalCurve),
            survivalCurvePointCount: survivalCurve.length,
            uploadedDataReadiness: intelligenceReadiness?.attrition,
            runIdentity: attritionRun
              ? {
                  scenarioId: attritionRun.scenarioId,
                  generatedAt: attritionRun.generatedAt,
                  modelStatus: attritionRun.modelStatus,
                }
              : null,
            rosterSize: attritionData.length,
            selectedEmployee: selectedAttritionEmp,
            population: populationStats,
          },
          buttonText: "Explain with AI",
          disabled: !attritionModel || attritionLoading,
        };
      case "ona":
        return {
          subtab: "ona",
          resultKey: `ona:${onaData?.runIdentity?.scenarioId || "unidentified"}:${selectedOnaNode?.id || "none"}`,
          context: {
            graphMetrics: onaData?.metrics || {},
            runIdentity: onaData?.runIdentity || null,
            windowDays: onaData?.metrics?.window_days || onaWindowDays,
            uploadedDataReadiness: intelligenceReadiness?.ona,
            nodeCount: onaData?.nodes?.length || 0,
            linkCount: onaData?.links?.length || 0,
            topInfluencers,
            topBridgeBrokers,
            selectedNode: selectedOnaNode,
            selectedNodeNeighbors,
          },
          buttonText: "Explain with AI",
          disabled: onaLoading || resultRevisions.ona === 0,
        };
      case "career-path":
        return {
          subtab: "career-path",
          resultKey: `career:${careerPathData?.runIdentity?.scenarioId || selectedCareerEmpId || "none"}`,
          context: {
            selectedEmployeeId: selectedCareerEmpId,
            careerPathData: careerPathData,
            runIdentity: careerPathData?.runIdentity || null,
            uploadedDataReadiness: intelligenceReadiness?.career_markov,
          },
          buttonText: "Explain with AI",
          disabled: !careerPathData || careerLoading,
        };
      case "skill-match":
      default: {
        const allMatches = Array.isArray(matchResults) ? matchResults : [];
        const activeKey = activeMatchEmployeeId || "none";
        const activeRank =
          allMatches.findIndex(
            (r) =>
              (r.profile_key || r.profile_id || r.employee_id) ===
              activeMatchEmployeeId,
          ) + 1;
        const cappedMatches = allMatches.slice(0, 40);
        if (
          activeMatchEmployeeId &&
          !cappedMatches.some(
            (r) =>
              (r.profile_key || r.profile_id || r.employee_id) ===
              activeMatchEmployeeId,
          )
        ) {
          const selected = allMatches.find(
            (r) =>
              (r.profile_key || r.profile_id || r.employee_id) ===
              activeMatchEmployeeId,
          );
          if (selected) cappedMatches.push(selected);
        }
        return {
          subtab: "skill-match",
          // Selection is part of the key: switching people invalidates the
          // old report so Explain always covers the person you chose.
          resultKey: `${
            skillMatchRun?.scenarioId ||
            `${matchResults.length}:${JSON.stringify(matchSkillsInput)}:${skillMatchScope}`
          }:${activeKey}`,
          context: {
            targetSkills: matchSkillsInput,
            matchResults: cappedMatches,
            matchResultCount: allMatches.length,
            activeMatchRank: activeRank > 0 ? activeRank : null,
            skillMatchMetadata,
            activeMatchEmployeeId: activeMatchEmployeeId,
            uploadedDataReadiness: intelligenceReadiness?.semantic_skill_graph,
            runIdentity: skillMatchRun
              ? {
                  scenarioId: skillMatchRun.scenarioId,
                  generatedAt: skillMatchRun.generatedAt,
                  scope: skillMatchRun.scope,
                  resultCount: skillMatchRun.resultCount,
                  profilesEvaluated: skillMatchRun.profilesEvaluated,
                }
              : null,
          },
          buttonText: "Explain with AI",
          disabled: skillMatchStatus !== "complete",
        };
      }
    }
  })();

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full space-y-3 md:space-y-4 max-w-full min-w-0">
      {/* Top Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-1 border-b border-white/5 pb-3 shrink-0">
        <div className="flex-1 flex items-start justify-between">
          <div className="text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/5 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-1.5">
              <Cpu size={10} className="animate-spin-slow" /> Math-Engine &
              Optimization
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight mb-1 text-white">
              Intelligence Center
            </h1>
            <p className="text-slate-400 text-[11px] sm:text-xs leading-relaxed max-w-3xl">
              Workforce analysis from uploaded tenant data: semantic skill
              matching, constrained team optimization, observed survival,
              collaboration networks, and dated role transitions.
            </p>
          </div>
          <UserManualButton
            defaultTab="intelligence"
            className="ml-3 shrink-0"
          />
        </div>
      </header>

      {/* Main Tabs Navigation */}
      <div className="flex overflow-x-auto custom-scrollbar no-scrollbar sm:flex-wrap gap-1.5 sm:gap-2 border-b border-white/5 pb-2.5 mb-1 shrink-0 max-w-full">
        {[
          {
            id: "skill-match",
            label: "Semantic Skills Graph",
            icon: <Brain size={14} />,
          },
          {
            id: "team-builder",
            label: "Optimal Team Assembly",
            icon: <Zap size={14} />,
          },
          {
            id: "attrition",
            label: "Survival Attrition",
            icon: <TrendingUp size={14} />,
          },
          {
            id: "ona",
            label: "Network Analysis (ONA)",
            icon: <Users size={14} />,
          },
          {
            id: "career-path",
            label: "Markov Career Path",
            icon: <GitBranch size={14} />,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex shrink-0 items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer select-none whitespace-nowrap ${activeSubTab === tab.id ? "border-primary/40 bg-primary/10 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" : "border-white/5 bg-white/2 text-slate-400 hover:text-slate-200 hover:border-white/10"}`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {intelligenceReadiness && (
        <div className="mb-2 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-white/5 bg-slate-950/40 px-3 py-2 text-[9px] font-mono text-slate-400">
          <span className="font-bold uppercase tracking-wider text-slate-300">
            Uploaded data
          </span>
          <span>{intelligenceReadiness.records?.employees ?? 0} employees</span>
          <span>
            {intelligenceReadiness.records?.candidates ?? 0} candidates
          </span>
          <span>
            {intelligenceReadiness.career_markov?.dated_employee_role_records ??
              0}{" "}
            dated career roles
          </span>
          <span>
            {intelligenceReadiness.ona?.dated_collaboration_events ?? 0}{" "}
            collaboration events
          </span>
          <span>
            {intelligenceReadiness.attrition?.usable_duration_outcomes ?? 0}{" "}
            survival observations
          </span>
          <span>
            Skill index:{" "}
            {intelligenceReadiness.semantic_skill_graph
              ?.names_indexed_for_exact_matching ?? 0}{" "}
            uploaded names searchable ·{" "}
            {intelligenceReadiness.semantic_skill_graph
              ?.names_mapped_to_graph_or_approved_alias ?? 0}{" "}
            curated transfer nodes
          </span>
          <span>
            Vector search:{" "}
            {skillMatchMetadata?.embedding_status === "ready"
              ? "enabled · exploratory"
              : intelligenceReadiness.semantic_skill_graph
                    ?.vector_search_status === "enabled_unvalidated"
                ? "enabled · unvalidated"
                : skillMatchMetadata?.embedding_status === "unavailable"
                  ? "temporarily unavailable · exact/graph fallback"
                  : "not configured · exact/graph search"}
          </span>
        </div>
      )}

      {/* TABS CONTAINER */}
      <div className="relative flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {/* TAB 1: SKILL GRAPH DIJKSTRA MATCH */}
          {activeSubTab === "skill-match" && (
            <motion.div
              key="skill-match"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="min-h-0 min-w-0 flex-1 h-full w-full flex flex-col"
            >
              <MobileSplitPane
                activePane={mobileActivePane}
                setActivePane={setMobileActivePane}
                leftTitle="Target Definition"
                rightTitle="Matching Matrix & Graph"
                leftIcon={<Briefcase size={14} />}
                rightIcon={<Brain size={14} />}
                leftWidthClass="lg:w-[340px] xl:w-[360px]"
                leftContent={
                  <div className="flex min-h-0 min-w-0 flex-col h-full">
                    <div className="premium-card flex min-h-0 flex-col h-full max-h-full overflow-hidden border border-white/10 bg-slate-950/35 backdrop-blur-xl shadow-[0_18px_55px_rgba(2,8,23,.22)]">
                      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
                        <div>
                          <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-300">
                            <Briefcase size={13} /> Target definition
                          </div>
                          <h3 className="text-sm font-semibold tracking-tight text-white">
                            Define target requirements
                          </h3>
                          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                            Add the skills and minimum levels to search across
                            uploaded employee and candidate profiles.
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full border border-indigo-300/20 bg-indigo-300/10 px-2 py-1 text-[9px] font-semibold text-indigo-200">
                          {matchSkillsInput.length} requirement
                          {matchSkillsInput.length === 1 ? "" : "s"}
                        </span>
                      </div>

                      <div className="px-5 pt-3 shrink-0">
                        <label
                          htmlFor="skill-match-scope"
                          className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400"
                        >
                          Search profiles
                        </label>
                        <PremiumSelect
                          id="skill-match-scope"
                          value={skillMatchScope}
                          onChange={(event) =>
                            setSkillMatchScope(event.target.value)
                          }
                          className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none focus:border-cyan-400/50"
                        >
                          <option value="all">Employees and candidates</option>
                          <option value="employees">Employees only</option>
                          <option value="candidates">Candidates only</option>
                        </PremiumSelect>
                        <p className="mt-1 text-[9px] leading-relaxed text-slate-500">
                          Uploaded skill names are searched directly. Transfer
                          scores use exact or approved aliases and short paths
                          in the curated graph; scores are ranking evidence, not
                          probability or job-fit certification.
                        </p>
                      </div>

                      {/* Scrollable middle: whole target form scrolls on desktop; page scrolls on mobile */}
                      <div className="min-h-0 min-w-0 space-y-3 overflow-y-auto overscroll-contain custom-scrollbar px-5 py-4 flex-1">
                        {/* Skill browser: auto-fetched from your database, per-row L1–L5 + Add */}
                        <div className="space-y-3.5 md:space-y-3 pb-2">
                          <div>
                            <label
                              htmlFor="match-skill-search"
                              className="text-[10px] md:text-[11px] uppercase font-bold tracking-widest text-slate-400 mb-1 block"
                            >
                              Browse Skills In Your Data
                            </label>
                            <div className="flex gap-2">
                              <input
                                id="match-skill-search"
                                type="text"
                                placeholder="Search all skills in your data…"
                                aria-label="Search skills in your data"
                                value={matchSkillQuery}
                                onChange={(e) => {
                                  setMatchSkillQuery(e.target.value);
                                  fetchMatchSkillOptions(e.target.value);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    if (
                                      addSkillMatchReq(
                                        e.target.value,
                                        matchCustomLevel,
                                      )
                                    ) {
                                      setMatchSkillQuery("");
                                      e.target.value = "";
                                    }
                                  }
                                }}
                                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2.5 md:py-2 text-xs md:text-sm text-white placeholder-slate-600 outline-none transition focus:border-indigo-400/70 focus:ring-2 focus:ring-indigo-400/10 min-h-[44px]"
                              />
                              <PremiumSelect
                                value={matchCustomLevel}
                                onChange={(e) =>
                                  setMatchCustomLevel(Number(e.target.value))
                                }
                                aria-label="Level for custom skill"
                                className="h-11 md:h-9 shrink-0 rounded-xl border border-white/10 bg-slate-950 px-2 text-xs text-white focus:outline-none"
                              >
                                {[1, 2, 3, 4, 5].map((v) => (
                                  <option key={v} value={v}>
                                    L{v}
                                  </option>
                                ))}
                              </PremiumSelect>
                              <button
                                type="button"
                                onClick={() => {
                                  if (
                                    addSkillMatchReq(
                                      matchSkillQuery,
                                      matchCustomLevel,
                                    )
                                  ) {
                                    setMatchSkillQuery("");
                                  }
                                }}
                                className="h-11 md:h-9 shrink-0 rounded-xl border border-white/10 bg-white/[0.06] px-3 text-xs text-slate-200 transition hover:border-indigo-300/40 hover:bg-indigo-300/10"
                              >
                                Add
                              </button>
                            </div>
                            <p className="mt-1 text-[10px] text-slate-500">
                              {matchSkillOptions.length} skills loaded from your
                              database · same skill can repeat at different
                              levels, never the same skill+level twice.
                            </p>
                          </div>
                          <div
                            role="listbox"
                            aria-label="Available skills from your data"
                            className="max-h-56 space-y-1.5 overflow-y-auto overscroll-contain rounded-xl border border-white/10 bg-slate-950/60 p-2 custom-scrollbar"
                          >
                            {matchSkillOptions.length === 0 && (
                              <p className="px-2 py-4 text-center text-[11px] text-slate-500">
                                No skills match. Try another search, or type a
                                custom name above and press Add.
                              </p>
                            )}
                            {matchSkillOptions.map((suggestion) => {
                              const pickedLevel = matchPickerLevelFor(
                                suggestion.name,
                              );
                              const alreadyAdded =
                                matchSkillDemandKeys.includes(
                                  matchDemandKey(suggestion.name, pickedLevel),
                                );
                              return (
                                <div
                                  key={suggestion.name}
                                  role="option"
                                  aria-selected={alreadyAdded}
                                  className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2 py-1.5"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-[11px] font-bold text-white">
                                      {suggestion.name}
                                    </div>
                                    <div className="text-[9px] text-slate-500">
                                      {suggestion.employee_count} people · avg L
                                      {Number(
                                        suggestion.avg_level || 0,
                                      ).toFixed(1)}
                                    </div>
                                  </div>
                                  <PremiumSelect
                                    value={pickedLevel}
                                    onChange={(e) =>
                                      setMatchPickerLevels((current) => ({
                                        ...current,
                                        [String(suggestion.name || "").trim()]:
                                          Number(e.target.value),
                                      }))
                                    }
                                    aria-label={`Level for ${suggestion.name}`}
                                    className="shrink-0 rounded-lg border border-white/10 bg-slate-950 px-1 py-1 text-[10px] text-white focus:outline-none"
                                  >
                                    {[1, 2, 3, 4, 5].map((v) => (
                                      <option key={v} value={v}>
                                        L{v}
                                      </option>
                                    ))}
                                  </PremiumSelect>
                                  <button
                                    type="button"
                                    disabled={alreadyAdded}
                                    onClick={() => {
                                      addSkillMatchReq(
                                        suggestion.name,
                                        pickedLevel,
                                      );
                                    }}
                                    className={`h-7 shrink-0 rounded-lg border px-2 text-[10px] font-semibold transition ${
                                      alreadyAdded
                                        ? "cursor-not-allowed border-white/5 bg-white/[0.02] text-slate-600"
                                        : "border-indigo-300/30 bg-indigo-300/10 text-indigo-200 hover:bg-indigo-300/20"
                                    }`}
                                    title={
                                      alreadyAdded
                                        ? `${suggestion.name} L${pickedLevel} is already in your requirements`
                                        : `Add ${suggestion.name} at L${pickedLevel}`
                                    }
                                  >
                                    {alreadyAdded ? "✓" : "Add"}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                          {matchInputError && (
                            <p
                              role="alert"
                              className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-2.5 py-1.5 text-[10px] leading-relaxed text-rose-200"
                            >
                              {matchInputError}
                            </p>
                          )}
                        </div>

                        {/* Requirement list (scrolls with the form; capped on mobile so it never traps scroll) */}
                        <div className="max-h-64 space-y-2 overflow-y-auto overscroll-contain py-2 custom-scrollbar lg:max-h-none lg:flex-1 lg:min-h-[120px]">
                          {matchSkillsInput.map((skill, idx) => (
                            <div
                              key={idx}
                              className="group flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2.5 md:py-2 transition hover:border-indigo-300/30 hover:bg-indigo-300/[0.06] min-h-[44px]"
                            >
                              <div className="text-xs">
                                <span className="font-bold text-white">
                                  {skill.name}
                                </span>
                                <span className="ml-2 rounded-full bg-indigo-300/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-200">
                                  L{skill.level}
                                </span>
                              </div>
                              <button
                                onClick={() => removeSkillMatchReq(idx)}
                                aria-label={`Remove ${skill.name}`}
                                className="rounded-md p-2 md:p-1.5 text-slate-500 transition hover:bg-rose-400/10 hover:text-rose-300 min-w-[40px] min-h-[40px] flex items-center justify-center"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                          {matchSkillsInput.length === 0 && (
                            <div className="text-xs text-slate-500 text-center py-6 border border-dashed border-white/5 rounded-xl">
                              No skills requirements added yet.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Fixed Footer */}
                      <div className="shrink-0 border-t border-white/10 p-5 space-y-3 bg-slate-950/40">
                        <button
                          onClick={() => {
                            setMobileActivePane("right");
                            triggerSkillMatch();
                          }}
                          disabled={
                            matchingLoading || matchSkillsInput.length === 0
                          }
                          className="inline-flex h-11 md:h-12 lg:h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-cyan-300/50 bg-cyan-300/[0.07] text-xs md:text-sm font-semibold uppercase tracking-[0.12em] text-cyan-200 transition hover:bg-cyan-300/[0.14] disabled:cursor-not-allowed disabled:opacity-40 min-h-[48px]"
                        >
                          <Search size={14} />{" "}
                          {matchingLoading
                            ? "Graph Traversing..."
                            : "Solve Adjacencies"}
                        </button>

                        {(skillMatchStatus === "running" ||
                          skillMatchStatus === "complete" ||
                          skillMatchStatus === "error") && (
                          <div
                            className="pt-2 border-t border-white/10"
                            aria-live="polite"
                          >
                            <div className="mb-2 flex items-start justify-between gap-3">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                Live solver status
                              </span>
                              <span
                                className={`max-w-[65%] text-right text-[10px] font-medium leading-relaxed ${skillMatchStatus === "error" ? "text-rose-300" : skillMatchStatus === "complete" ? "text-emerald-300" : "text-cyan-300"}`}
                              >
                                {skillMatchProgress.message}
                              </span>
                            </div>
                            {(() => {
                              const isScoring =
                                skillMatchProgress.phase === "matching" &&
                                skillMatchProgress.total > 0;
                              const isComplete =
                                skillMatchStatus === "complete";
                              const hasProfileCounts =
                                skillMatchProgress.total > 0;
                              const isError = skillMatchStatus === "error";
                              const isDeterminate =
                                isScoring ||
                                isComplete ||
                                (isError && hasProfileCounts);
                              const progressValue = isComplete
                                ? 100
                                : hasProfileCounts
                                  ? Math.min(
                                      100,
                                      (skillMatchProgress.completed /
                                        skillMatchProgress.total) *
                                        100,
                                    )
                                  : 0;

                              return (
                                <>
                                  <div
                                    className="mb-2 h-1.5 overflow-hidden rounded-full bg-white/10"
                                    role="progressbar"
                                    aria-label="Skill matching progress"
                                    aria-valuemin={
                                      isDeterminate ? 0 : undefined
                                    }
                                    aria-valuemax={
                                      isDeterminate ? 100 : undefined
                                    }
                                    aria-valuenow={
                                      isDeterminate
                                        ? Math.round(progressValue)
                                        : undefined
                                    }
                                    aria-valuetext={
                                      isDeterminate
                                        ? `${Math.round(progressValue)} percent`
                                        : skillMatchProgress.message
                                    }
                                  >
                                    <div
                                      className={`h-full rounded-full ${isError ? "bg-rose-400" : isComplete ? "bg-emerald-400" : "bg-cyan-300"} ${isDeterminate ? "transition-[width] duration-200 ease-out" : skillMatchStatus === "running" ? "skill-match-indeterminate" : ""}`}
                                      style={{
                                        width: isDeterminate
                                          ? `${progressValue}%`
                                          : skillMatchStatus === "running"
                                            ? "34%"
                                            : "0%",
                                      }}
                                    />
                                  </div>
                                  <div className="flex items-center justify-between gap-2 text-[9px] text-slate-500">
                                    <span>
                                      {isScoring
                                        ? `Scored ${skillMatchProgress.completed.toLocaleString()} of ${skillMatchProgress.total.toLocaleString()} profiles`
                                        : isComplete
                                          ? `Scored ${skillMatchProgress.total.toLocaleString()} profiles · showing ${matchResults.length} of ${skillMatchProgress.matched.toLocaleString()} matches`
                                          : skillMatchStatus === "error"
                                            ? hasProfileCounts
                                              ? `Stopped after scoring ${skillMatchProgress.completed.toLocaleString()} of ${skillMatchProgress.total.toLocaleString()} profiles`
                                              : "Matching stopped before profile scoring began"
                                            : "Waiting for server progress"}
                                    </span>
                                    {isDeterminate && (
                                      <span className="shrink-0 font-mono text-slate-300">
                                        {Math.round(progressValue)}%
                                      </span>
                                    )}
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                }
                rightContent={
                  <div className="premium-card p-4 md:p-6 border border-white/5 bg-slate-950/20 min-h-0 h-full max-h-full flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4 shrink-0">
                      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
                        Semantic Matching Matrix & Path Analysis
                      </h3>
                      <span className="text-[10px] text-slate-500">
                        Exact catalog + curated graph paths
                      </span>
                    </div>

                    {skillMatchRun && matchResults.length > 0 && (
                      <div
                        role="status"
                        aria-live="polite"
                        className="mb-4 shrink-0 rounded-lg border border-white/10 bg-slate-950/35 px-3 py-2 text-[10px] leading-relaxed text-slate-300"
                      >
                        <strong>Generated:</strong>{" "}
                        <span className="font-mono">
                          {new Date(skillMatchRun.generatedAt).toLocaleString()}
                        </span>{" "}
                        · <strong>Scenario ID:</strong>{" "}
                        <span className="font-mono text-cyan-300">
                          {skillMatchRun.scenarioId}
                        </span>{" "}
                        ·{" "}
                        <span className="font-mono">
                          {skillMatchRun.resultCount} profile
                          {skillMatchRun.resultCount === 1 ? "" : "s"}
                        </span>{" "}
                        · scope{" "}
                        <span className="font-mono">{skillMatchRun.scope}</span>
                      </div>
                    )}
                    {matchResults.length > 0 && (
                      <div className="mb-4 shrink-0 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.04] px-3 py-2.5">
                        <div className="text-[9px] font-bold uppercase tracking-widest text-cyan-300">
                          Analysis report — what was searched
                        </div>
                        <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] leading-relaxed text-slate-300 sm:grid-cols-4">
                          <div>
                            <span className="text-slate-500">Targets: </span>
                            <span className="font-semibold text-white">
                              {matchSkillsInput
                                .map((t) => `${t.name} L${t.level}`)
                                .join(" · ") || "—"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Scope: </span>
                            <span className="font-mono">
                              {skillMatchScope}
                            </span>{" "}
                            ·{" "}
                            <span className="font-mono">
                              {Number(
                                skillMatchProgress.total || 0,
                              ).toLocaleString()}{" "}
                              evaluated
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Matched: </span>
                            <span className="font-mono">
                              {Number(
                                skillMatchProgress.matched || 0,
                              ).toLocaleString()}
                            </span>{" "}
                            · <span className="text-slate-500">returned: </span>
                            <span className="font-mono">
                              {matchResults.length}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Vector: </span>
                            <span className="font-mono">
                              {skillMatchMetadata?.embedding_status ||
                                "not_configured"}
                            </span>
                            {intelligenceReadiness?.semantic_skill_graph && (
                              <>
                                {" "}
                                ·{" "}
                                <span className="font-mono">
                                  {
                                    intelligenceReadiness.semantic_skill_graph
                                      .unique_uploaded_skill_names
                                  }{" "}
                                  skills indexed
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500">
                          What this report is for: prove, from your uploaded
                          records, who matches the targets and why — scores are
                          ranking evidence, not job-fit certification.
                        </p>
                      </div>
                    )}
                    {matchResults.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] xl:grid-cols-[250px_1fr] gap-4 md:gap-6 min-h-0 min-w-0 flex-1 h-full max-lg:overflow-y-auto max-lg:overscroll-contain">
                        {/* Ranked tenant employee and candidate profiles */}
                        <div className="space-y-2.5 border-r border-white/5 pr-3 md:pr-4 overflow-y-auto custom-scrollbar max-lg:pb-4">
                          <div className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2">
                            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-300">
                              Ranked profiles — why they are here
                            </div>
                            <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                              Ranked by skill-evidence score from your records.
                              Each row shows who the person is (role,
                              department) and why they surfaced (exact vs
                              transfer evidence). Select a row for its
                              per-target proof.
                            </p>
                          </div>
                          {matchResults.map((result) => {
                            const rowDetails =
                              result.match_details?.detailed_matches || [];
                            const exactHits = rowDetails.filter(
                              (d) => d.status === "Perfect",
                            ).length;
                            return (
                              <button
                                key={
                                  result.profile_key ||
                                  result.profile_id ||
                                  result.employee_id
                                }
                                onClick={() => {
                                  setActiveMatchEmployeeId(
                                    result.profile_key ||
                                      result.profile_id ||
                                      result.employee_id,
                                  );
                                }}
                                className={`w-full text-left p-3 md:p-4 rounded-xl border transition-all relative overflow-hidden select-none cursor-pointer min-h-[52px] ${(result.profile_key || result.profile_id || result.employee_id) === activeMatchEmployeeId ? "border-primary bg-primary/5" : "border-white/5 bg-white/2 hover:border-white/10 hover:bg-white/[0.04]"}`}
                              >
                                <div className="font-bold text-white text-xs md:text-sm">
                                  {result.full_name}
                                </div>
                                <span className="mt-1 inline-block rounded border border-cyan-300/15 bg-cyan-300/5 px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-cyan-200">
                                  {result.entity_type || "employee"}
                                </span>
                                <div className="text-[9px] md:text-[11px] text-slate-400 mt-1 uppercase tracking-wider">
                                  {result.role}
                                  {result.department
                                    ? ` · ${result.department}`
                                    : ""}
                                </div>
                                <div className="mt-1 text-[9px] leading-relaxed text-slate-500">
                                  Why here: {exactHits}/{rowDetails.length}{" "}
                                  targets exact
                                  {exactHits < rowDetails.length
                                    ? " · rest via transfer or gap"
                                    : " · all exact"}
                                </div>
                                <div className="flex items-center justify-between mt-2 md:mt-3 border-t border-white/5 pt-2">
                                  <span className="text-[9px] md:text-[10px] uppercase font-semibold text-slate-500">
                                    Skill evidence score
                                  </span>
                                  <span className="text-xs md:text-sm font-black text-primary">
                                    {(
                                      result.match_details
                                        .overall_compatibility * 100
                                    ).toFixed(0)}
                                    %
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* Right Dijkstra Path Details */}
                        <div className="space-y-5 md:space-y-6 overflow-y-auto custom-scrollbar flex-1 min-h-0 pr-1 max-lg:pb-4">
                          {(() => {
                            const activeMatch = matchResults.find(
                              (r) =>
                                (r.profile_key ||
                                  r.profile_id ||
                                  r.employee_id) === activeMatchEmployeeId,
                            );
                            if (!activeMatch) return null;
                            const activeDetails =
                              activeMatch.match_details?.detailed_matches || [];
                            const hasRouteEvidence = activeDetails.every(
                              (detail) => Array.isArray(detail.graph_path),
                            );

                            return (
                              <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6">
                                {/* Detailed path list */}
                                <div className="space-y-4">
                                  <div className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5">
                                    <div className="text-[9px] font-bold uppercase tracking-widest text-slate-300">
                                      Target match breakdown — all returned
                                      profiles
                                    </div>
                                    <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                                      Why: shows at a glance which requirements
                                      are solid (exact) and which depend on
                                      transfer evidence or have no cover.
                                    </p>
                                    <div className="mt-2 space-y-1">
                                      {matchSkillsInput.map((target, tIdx) => {
                                        const key = String(
                                          target?.name || "",
                                        ).toLocaleLowerCase();
                                        let exact = 0;
                                        let bridge = 0;
                                        let missing = 0;
                                        matchResults.forEach((r) => {
                                          const row = (
                                            r.match_details?.detailed_matches ||
                                            []
                                          ).find(
                                            (d) =>
                                              String(
                                                d.target_skill || "",
                                              ).toLocaleLowerCase() === key,
                                          );
                                          if (!row || !row.matched_by_skill)
                                            missing += 1;
                                          else if (row.status === "Perfect")
                                            exact += 1;
                                          else bridge += 1;
                                        });
                                        return (
                                          <div
                                            key={`${target.name}-${tIdx}`}
                                            className="flex items-center justify-between gap-2 text-[10px]"
                                          >
                                            <span className="font-semibold text-slate-200">
                                              {target.name}{" "}
                                              <span className="font-mono text-slate-500">
                                                L{target.level}
                                              </span>
                                            </span>
                                            <span className="shrink-0 font-mono text-slate-400">
                                              <span className="text-teal-300">
                                                {exact} exact
                                              </span>{" "}
                                              ·{" "}
                                              <span className="text-amber-300">
                                                {bridge} transfer
                                              </span>{" "}
                                              ·{" "}
                                              <span className="text-rose-300">
                                                {missing} missing
                                              </span>
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1">
                                      Target Match Breakdown for:
                                    </div>
                                    <h4 className="text-lg font-extrabold text-white">
                                      {activeMatch.full_name}
                                    </h4>
                                    <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                                      How to read: each card is one requirement
                                      measured against this person&apos;s
                                      record. One recorded skill satisfies at
                                      most one requirement. Status colors and
                                      the evidence line state the proof; the
                                      score is heuristic ranking evidence.
                                    </p>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                                    {activeMatch.match_details.detailed_matches.map(
                                      (detail, idx) => (
                                        <div
                                          key={idx}
                                          className="rounded-xl border border-white/5 bg-slate-950 p-3 md:p-4"
                                        >
                                          <div className="flex flex-wrap items-start justify-between gap-2 mb-2 md:mb-3 border-b border-white/5 pb-2">
                                            <div className="min-w-0 flex-1 break-words text-xs md:text-sm font-bold text-white">
                                              Target Skill:{" "}
                                              {detail.target_skill} (L
                                              {detail.target_level})
                                              {detail.canonical_target_skill &&
                                                detail.canonical_target_skill.toLowerCase() !==
                                                  detail.target_skill.toLowerCase() && (
                                                  <span className="block pt-1 text-[10px] font-medium text-cyan-300">
                                                    Interpreted as{" "}
                                                    {
                                                      detail.canonical_target_skill
                                                    }
                                                  </span>
                                                )}
                                            </div>
                                            <span
                                              className={`shrink-0 max-w-full whitespace-normal text-center text-[8px] md:text-[9px] font-black uppercase tracking-widest px-2 py-0.5 md:px-2.5 md:py-1 rounded border ${
                                                detail.status === "Perfect"
                                                  ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5"
                                                  : detail.status ===
                                                      "Potential Semantic Match"
                                                    ? "text-amber-200 border-amber-300/30 bg-amber-300/10"
                                                    : detail.status ===
                                                        "Highly Transferable"
                                                      ? "text-cyan-400 border-cyan-500/20 bg-cyan-500/5"
                                                      : detail.status ===
                                                          "Trainable Gap"
                                                        ? "text-amber-400 border-amber-500/20 bg-amber-500/5"
                                                        : "text-rose-400 border-rose-500/20 bg-rose-500/5"
                                              }`}
                                            >
                                              {detail.status}
                                            </span>
                                          </div>

                                          {/* Path rendering */}
                                          <div className="flex items-center flex-wrap gap-1.5 md:gap-2 text-xs md:text-sm">
                                            {detail.graph_path?.length ? (
                                              detail.graph_path.map(
                                                (skill, pathIndex) => (
                                                  <React.Fragment
                                                    key={`${skill}-${pathIndex}`}
                                                  >
                                                    {pathIndex > 0 && (
                                                      <span
                                                        className="text-indigo-300"
                                                        aria-label="curated graph edge"
                                                      >
                                                        →
                                                      </span>
                                                    )}
                                                    <span className="rounded border border-indigo-500/25 bg-indigo-950/70 px-2 py-1 text-indigo-100">
                                                      {skill}
                                                    </span>
                                                  </React.Fragment>
                                                ),
                                              )
                                            ) : detail.evidence_type ===
                                              "embedding_semantic_candidate" ? (
                                              <>
                                                <span className="rounded border border-amber-300/20 bg-amber-300/5 px-2 py-1 text-slate-200">
                                                  {detail.matched_by_skill}
                                                </span>
                                                <span className="text-[9px] text-amber-200">
                                                  vector candidate ·{" "}
                                                  {Math.round(
                                                    (detail.semantic_similarity ||
                                                      0) * 100,
                                                  )}
                                                  % similarity · no graph edge
                                                </span>
                                              </>
                                            ) : detail.matched_by_skill ? (
                                              <span className="rounded border border-white/10 bg-white/5 px-2 py-1 text-slate-200">
                                                {detail.matched_by_skill}
                                              </span>
                                            ) : (
                                              <span className="min-w-0 break-words text-rose-300 text-[10px] md:text-[11px] leading-relaxed">
                                                {detail.unmatched_reason ||
                                                  "No recorded employee skill connects to this target."}
                                              </span>
                                            )}
                                          </div>
                                          <div className="mt-2 break-words text-[9px] leading-relaxed text-slate-500">
                                            Evidence:{" "}
                                            {detail.evidence_type || "none"}
                                            {detail.evidence_type ===
                                              "embedding_semantic_candidate" &&
                                              " · exploratory vector similarity; human review required"}
                                          </div>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                </div>

                                {/* visual DAG map */}
                                <div
                                  className={`${graphExpanded ? "fixed inset-3 z-[90] flex flex-col rounded-2xl border border-cyan-300/25 bg-[#020617]/[0.98] p-4 shadow-[0_24px_90px_rgba(0,0,0,.65)] backdrop-blur-2xl md:inset-8 md:p-6" : "relative rounded-xl border border-white/5 bg-slate-950 p-4 flex flex-col justify-between flex-1 h-full min-h-[300px]"}`}
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <div>
                                    <div className="mb-2 flex items-start justify-between gap-3">
                                      <div>
                                        <div className="text-[9px] uppercase tracking-widest text-slate-300 font-bold">
                                          Search evidence graph
                                        </div>
                                        <div className="mt-1 text-[10px] text-slate-500 leading-relaxed">
                                          Highlighted nodes and cyan edges come
                                          from the selected search result’s
                                          actual shortest paths. Exact catalog
                                          matches have no transfer edge; vector
                                          candidates are not ontology paths.
                                          Routes using skills outside this
                                          diagram remain visible in the path
                                          details.
                                        </div>
                                        <div className="mt-2 rounded-lg border border-white/5 bg-white/[0.02] px-2 py-1.5 text-[9px] leading-relaxed text-slate-400">
                                          <span className="font-bold uppercase tracking-widest text-slate-300">
                                            How to read —{" "}
                                          </span>
                                          What it is: the curated skill ontology
                                          drawn around this person&apos;s
                                          evidence. What it does: proves each
                                          transfer with its exact route. How: a
                                          lone highlighted node = exact catalog
                                          match (no edge needed); node → node
                                          cyan path = the transfer route
                                          actually used; dim nodes/edges =
                                          unrelated context.
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        aria-label={
                                          graphExpanded
                                            ? "Collapse graph"
                                            : "Expand graph"
                                        }
                                        title={
                                          graphExpanded
                                            ? "Collapse graph"
                                            : "Expand graph"
                                        }
                                        onClick={() =>
                                          setGraphExpanded((open) => !open)
                                        }
                                        className="shrink-0 rounded-lg border border-white/10 bg-white/[0.05] p-2 text-slate-300 transition hover:border-cyan-300/40 hover:bg-cyan-300/10 hover:text-cyan-200"
                                      >
                                        {graphExpanded ? (
                                          <Minimize2 size={14} />
                                        ) : (
                                          <Maximize2 size={14} />
                                        )}
                                      </button>
                                    </div>
                                  </div>

                                  <div
                                    className={`${graphExpanded ? "min-h-0 flex-1" : "h-[380px] min-h-[380px]"} relative border border-white/5 rounded-lg overflow-hidden bg-slate-950/80`}
                                  >
                                    {!hasRouteEvidence && (
                                      <div className="absolute inset-x-3 top-3 z-10 rounded-lg border border-amber-300/20 bg-slate-950/95 px-3 py-2 text-[10px] leading-relaxed text-amber-100 shadow-lg">
                                        This saved result predates route
                                        evidence. Run the search again to show
                                        its exact graph paths.
                                      </div>
                                    )}
                                    <svg
                                      className="absolute inset-0 h-full w-full pointer-events-none"
                                      viewBox="80 50 900 470"
                                      preserveAspectRatio="xMidYMid meet"
                                    >
                                      {/* Links */}
                                      {SKILL_GRAPH_UNIQUE_LINKS.map(
                                        (link, idx) => {
                                          const src =
                                            SKILL_GRAPH_COORDS[link.source];
                                          const tgt =
                                            SKILL_GRAPH_COORDS[link.target];
                                          if (!src || !tgt) return null;

                                          const edgeKey = [
                                            link.source,
                                            link.target,
                                          ]
                                            .sort()
                                            .join("::");
                                          const isActivePath =
                                            highlightEdges.has(edgeKey);

                                          return (
                                            <g key={idx}>
                                              <line
                                                x1={src.x}
                                                y1={src.y}
                                                x2={tgt.x}
                                                y2={tgt.y}
                                                stroke={
                                                  isActivePath
                                                    ? "#2dd4bf"
                                                    : "#ffffff"
                                                }
                                                strokeOpacity={
                                                  isActivePath ? 0.9 : 0.05
                                                }
                                                strokeWidth={
                                                  isActivePath ? 3.5 : 1
                                                }
                                              />
                                            </g>
                                          );
                                        },
                                      )}

                                      {/* Nodes */}
                                      {Object.entries(SKILL_GRAPH_COORDS).map(
                                        ([name, node]) => {
                                          const isHighlighted =
                                            highlightNodes.has(name);

                                          return (
                                            <g key={name}>
                                              <circle
                                                cx={node.x}
                                                cy={node.y}
                                                r={isHighlighted ? 10 : 5}
                                                fill={
                                                  isHighlighted
                                                    ? "#10b981"
                                                    : "#1e293b"
                                                }
                                                stroke={
                                                  isHighlighted
                                                    ? "#ffffff"
                                                    : "#475569"
                                                }
                                                strokeWidth={
                                                  isHighlighted ? 2.5 : 1
                                                }
                                                style={{
                                                  transition: "all 0.5s",
                                                }}
                                              />
                                              <text
                                                x={node.x}
                                                y={
                                                  node.y -
                                                  (isHighlighted ? 14 : 10)
                                                }
                                                fill={
                                                  isHighlighted
                                                    ? "#ffffff"
                                                    : "#475569"
                                                }
                                                fontSize={
                                                  isHighlighted ? "12" : "10"
                                                }
                                                fontWeight={
                                                  isHighlighted
                                                    ? "black"
                                                    : "normal"
                                                }
                                                textAnchor="middle"
                                                paintOrder="stroke"
                                                stroke="#020617"
                                                strokeWidth="4"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                              >
                                                {name}
                                              </text>
                                            </g>
                                          );
                                        },
                                      )}
                                    </svg>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    ) : skillMatchStatus === "complete" ? (
                      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar rounded-2xl border border-amber-300/15 bg-amber-300/[0.03] p-6">
                        <div className="m-auto max-w-xl text-center">
                          <div className="text-sm font-bold text-amber-200">
                            No profiles matched the supplied evidence
                          </div>
                          <p className="mt-2 max-w-xl text-xs leading-relaxed text-slate-400">
                            The search evaluated{" "}
                            {skillMatchProgress.total.toLocaleString()}{" "}
                            {skillMatchScope === "all"
                              ? "employee and candidate"
                              : skillMatchScope}{" "}
                            profiles and returned no exact, approved-alias, or
                            sufficiently close curated graph matches. Try a
                            skill name from the uploaded catalog, or review the
                            requested proficiency levels.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar rounded-2xl border border-dashed border-white/10 bg-white/[0.01] p-6">
                        <div className="m-auto flex max-w-md flex-col items-center py-6 text-center">
                          <div className="h-12 w-12 rounded-2xl border border-indigo-400/20 bg-indigo-500/10 flex items-center justify-center text-indigo-300 mb-4 shadow-[0_0_20px_rgba(163,230,53,0.15)]">
                            <Brain size={24} />
                          </div>
                          <h4 className="text-sm font-extrabold text-white tracking-wide uppercase mb-2">
                            Graph Solver Standing By
                          </h4>
                          <p className="text-xs text-slate-400 leading-relaxed max-w-md">
                            Enter target skill requirements on the left panel
                            and click{" "}
                            <span className="font-semibold text-cyan-300">
                              Solve Adjacencies
                            </span>{" "}
                            to calculate graph shortest-path Dijkstra matching
                            across the selected employee and candidate profiles.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                }
              />
            </motion.div>
          )}

          {/* TAB 2: OPTIMAL TEAM ASSEMBLY (EXACT MILP) */}
          {activeSubTab === "team-builder" && (
            <motion.div
              key="team-builder"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="min-h-0 min-w-0 flex-1 h-full w-full flex flex-col"
            >
              <MobileSplitPane
                activePane={mobileActivePane}
                setActivePane={setMobileActivePane}
                leftTitle="Team Constraints"
                rightTitle="Optimization Results"
                leftIcon={<Zap size={14} />}
                rightIcon={<Sparkles size={14} />}
                leftWidthClass="lg:shrink-0 lg:w-[var(--team-left-w)]"
                leftStyle={{ "--team-left-w": `${teamLeftWidthPx}px` }}
                leftHandle={
                  <div
                    role="separator"
                    aria-orientation="vertical"
                    aria-label="Drag to resize the constraints column"
                    title="Drag to resize"
                    onPointerDown={startTeamResize}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-8 bottom-8 -right-1.5 z-20 hidden w-3 cursor-ew-resize items-center justify-center rounded-full border border-white/10 bg-slate-900/90 opacity-0 transition group-hover:opacity-100 hover:opacity-100 lg:flex"
                    style={{ touchAction: "none" }}
                  >
                    <span className="flex flex-col gap-0.5">
                      <i className="h-3 w-px bg-slate-500" />
                      <i className="h-3 w-px bg-slate-500" />
                    </span>
                  </div>
                }
                leftContent={
                  <div className="flex min-h-0 min-w-0 flex-col h-full">
                    <div className="premium-card flex min-h-0 flex-col h-full max-h-full overflow-hidden border border-white/10 bg-slate-950/35 backdrop-blur-xl shadow-[0_18px_55px_rgba(2,8,23,.22)]">
                      <div className="shrink-0 border-b border-white/10 px-5 py-4">
                        <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-300">
                          <Zap size={13} /> Team constraints
                        </div>
                        <h3 className="text-sm font-semibold tracking-tight text-white">
                          Combinatorial constraints
                        </h3>
                        <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                          Set the operating limits used by the optimization
                          solver.
                        </p>
                      </div>

                      {/* Scrollable middle: whole constraint form scrolls on desktop; page scrolls on mobile */}
                      <div className="min-h-0 min-w-0 space-y-3 overflow-y-auto overscroll-contain custom-scrollbar px-5 py-4 flex-1">
                        {renderTeamSection(
                          "budget",
                          "Budget Cap",
                          `${Number(teamBudget || 0).toLocaleString()} ${teamBudgetUnitLabel}`,
                          false,
                          <>
                            <div>
                              <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1 block">
                                Budget Cap ({teamBudgetUnitLabel})
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min="1"
                                  max="1000000000"
                                  step="1000"
                                  aria-label={`Budget cap in ${teamBudgetUnitLabel}`}
                                  value={teamBudget}
                                  onChange={(e) => {
                                    markTeamInputsDirty();
                                    setTeamBudget(Number(e.target.value));
                                  }}
                                  className="w-full rounded-xl border border-white/10 bg-slate-950/80 py-2 pl-3 pr-3 text-xs text-white outline-none transition focus:border-indigo-400/70 focus:ring-2 focus:ring-indigo-400/10"
                                />
                              </div>
                            </div>
                          </>,
                        )}
                        {renderTeamSection(
                          "size",
                          "Team Size",
                          `${Number(teamSize || 0)} people`,
                          false,
                          <>
                            <div>
                              <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1 block">
                                Team Size (2–10 employees)
                              </label>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  aria-label="Decrease team size"
                                  onClick={() => {
                                    markTeamInputsDirty();
                                    setTeamSize(
                                      Math.max(2, Number(teamSize || 2) - 1),
                                    );
                                  }}
                                  className="h-9 w-9 shrink-0 rounded-xl border border-white/10 bg-white/[0.06] text-sm text-slate-200 transition hover:border-indigo-300/40 hover:bg-indigo-300/10"
                                >
                                  −
                                </button>
                                <input
                                  type="number"
                                  min="2"
                                  max="10"
                                  step="1"
                                  aria-label="Team size"
                                  value={teamSize}
                                  onChange={(e) => {
                                    markTeamInputsDirty();
                                    setTeamSize(Number(e.target.value));
                                  }}
                                  className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-center text-xs text-white outline-none transition focus:border-indigo-400/70 focus:ring-2 focus:ring-indigo-400/10"
                                />
                                <button
                                  type="button"
                                  aria-label="Increase team size"
                                  onClick={() => {
                                    markTeamInputsDirty();
                                    setTeamSize(
                                      Math.min(10, Number(teamSize || 2) + 1),
                                    );
                                  }}
                                  className="h-9 w-9 shrink-0 rounded-xl border border-white/10 bg-white/[0.06] text-sm text-slate-200 transition hover:border-indigo-300/40 hover:bg-indigo-300/10"
                                >
                                  +
                                </button>
                              </div>
                              <p className="mt-1 text-[10px] text-slate-500">
                                Exact MILP team size. Larger teams cost more;
                                the solver proves the optimum for the size you
                                set.
                              </p>
                            </div>
                          </>,
                        )}
                        {renderTeamSection(
                          "feasibility",
                          "Feasibility",
                          (() => {
                            const minForSize = Number(
                              (teamFeasibility?.minimum_cost_by_team_size ||
                                {})[String(Number(teamSize))] || 0,
                            );
                            if (!teamFeasibility || !minForSize) return "—";
                            const gap = Number(teamBudget || 0) - minForSize;
                            return gap >= 0
                              ? `ok · +${gap.toLocaleString()}`
                              : `short ${Math.abs(gap).toLocaleString()}`;
                          })(),
                          (() => {
                            const minForSize = Number(
                              (teamFeasibility?.minimum_cost_by_team_size ||
                                {})[String(Number(teamSize))] || 0,
                            );
                            return Boolean(
                              teamFeasibility &&
                              minForSize &&
                              Number(teamBudget || 0) < minForSize,
                            );
                          })(),
                          <>
                            {teamFeasibility && (
                              <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/[0.05] px-3 py-2.5 text-[10px] leading-relaxed text-slate-300">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-semibold uppercase tracking-widest text-cyan-300 text-[9px]">
                                    Budget feasibility · live from your data
                                  </span>
                                  <button
                                    type="button"
                                    onClick={fetchTeamFeasibility}
                                    className="text-cyan-300/80 hover:text-cyan-200"
                                  >
                                    Refresh
                                  </button>
                                </div>
                                {(() => {
                                  const minMap =
                                    teamFeasibility.minimum_cost_by_team_size ||
                                    {};
                                  const minForSize = Number(
                                    minMap[String(Number(teamSize))] || 0,
                                  );
                                  const cap = Number(teamBudget || 0);
                                  const unit = humanizeCompensationUnit(
                                    teamFeasibility.compensation_unit,
                                  );
                                  if (!minForSize) {
                                    return (
                                      <p className="mt-1 text-slate-400">
                                        {Number(
                                          teamFeasibility.eligible_employee_count ||
                                            0,
                                        )}{" "}
                                        eligible employees
                                        {teamFeasibility.compensation_unit
                                          ? ` · ${unit}`
                                          : ""}
                                        . Not enough eligible records for{" "}
                                        {Number(teamSize)} people.
                                      </p>
                                    );
                                  }
                                  const shortfall = minForSize - cap;
                                  return (
                                    <>
                                      <p className="mt-1">
                                        Minimum for {Number(teamSize)} people:{" "}
                                        <strong className="font-mono text-white">
                                          {minForSize.toLocaleString()} {unit}
                                        </strong>{" "}
                                        · your cap:{" "}
                                        <span className="font-mono">
                                          {(Number.isFinite(cap)
                                            ? cap
                                            : 0
                                          ).toLocaleString()}
                                        </span>
                                      </p>
                                      {shortfall > 0 ? (
                                        <p className="mt-1 text-amber-200">
                                          Shortfall {shortfall.toLocaleString()}{" "}
                                          {unit}. Raise the cap or reduce team
                                          size — otherwise the solver correctly
                                          returns infeasible.
                                        </p>
                                      ) : (
                                        <p className="mt-1 text-emerald-300">
                                          Feasible:{" "}
                                          {(cap - minForSize).toLocaleString()}{" "}
                                          {unit} of headroom above the cheapest
                                          roster.
                                        </p>
                                      )}
                                      <div className="mt-2 flex flex-wrap gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            markTeamInputsDirty();
                                            setTeamBudget(
                                              Math.ceil(minForSize),
                                            );
                                          }}
                                          className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-2 py-1 text-[10px] font-semibold text-cyan-200 hover:bg-cyan-300/20"
                                        >
                                          Set cap to minimum
                                        </button>
                                        {optimizedTeam?.metrics?.total_cost ? (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              markTeamInputsDirty();
                                              setTeamBudget(
                                                Math.ceil(
                                                  Number(
                                                    optimizedTeam.metrics
                                                      .total_cost,
                                                  ),
                                                ),
                                              );
                                            }}
                                            className="rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1 text-[10px] text-slate-300 hover:bg-white/10"
                                          >
                                            Reuse last cost (
                                            {Number(
                                              optimizedTeam.metrics.total_cost,
                                            ).toLocaleString()}
                                            )
                                          </button>
                                        ) : null}
                                      </div>
                                      <p className="mt-1.5 text-[9px] text-slate-500">
                                        {Number(
                                          teamFeasibility.eligible_employee_count ||
                                            0,
                                        )}{" "}
                                        eligible ·{" "}
                                        {Number(
                                          teamFeasibility.excluded_departed_employee_count ||
                                            0,
                                        )}{" "}
                                        departed excluded ·{" "}
                                        {Number(
                                          teamFeasibility.excluded_missing_compensation_count ||
                                            0,
                                        )}{" "}
                                        missing salary excluded
                                        {teamFeasibility.compensation_mixed
                                          ? " · mixed units: normalize before optimizing"
                                          : ""}
                                      </p>
                                    </>
                                  );
                                })()}
                                {teamFeasibilityError && (
                                  <p className="mt-1 text-rose-300">
                                    {teamFeasibilityError}
                                  </p>
                                )}
                              </div>
                            )}
                          </>,
                        )}
                        {renderTeamSection(
                          "browser",
                          "Skill Browser",
                          `${teamSkillSuggestions.length} skills`,
                          false,
                          <>
                            {/* Skill browser: auto-fetched from your database, searchable, per-row L1–L5 */}
                            <div>
                              <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1.5 block">
                                Skill Matrix Demands ({teamSkillsInput.length}{" "}
                                requirement
                                {teamSkillsInput.length === 1 ? "" : "s"})
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  id="team-skill-name"
                                  placeholder="Search all skills in your data…"
                                  aria-label="Search skills in your data"
                                  value={teamSkillQuery}
                                  onChange={(e) => {
                                    setTeamSkillQuery(e.target.value);
                                    fetchTeamSkillSuggestions(e.target.value);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      if (
                                        addTeamSkill(
                                          e.target.value,
                                          teamCustomLevel,
                                        )
                                      ) {
                                        setTeamSkillQuery("");
                                        e.target.value = "";
                                      }
                                    }
                                  }}
                                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none transition focus:border-indigo-400/70 focus:ring-2 focus:ring-indigo-400/10"
                                />
                                <PremiumSelect
                                  value={teamCustomLevel}
                                  onChange={(e) =>
                                    setTeamCustomLevel(Number(e.target.value))
                                  }
                                  aria-label="Level for custom skill"
                                  className="h-9 shrink-0 rounded-xl border border-white/10 bg-slate-950 px-2 text-xs text-white focus:outline-none"
                                >
                                  {[1, 2, 3, 4, 5].map((v) => (
                                    <option key={v} value={v}>
                                      L{v}
                                    </option>
                                  ))}
                                </PremiumSelect>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const inputEl =
                                      document.getElementById(
                                        "team-skill-name",
                                      );
                                    if (inputEl && inputEl.value.trim()) {
                                      if (
                                        addTeamSkill(
                                          inputEl.value,
                                          teamCustomLevel,
                                        )
                                      ) {
                                        inputEl.value = "";
                                        setTeamSkillQuery("");
                                      }
                                    }
                                  }}
                                  className="h-9 shrink-0 rounded-xl border border-white/10 bg-white/[0.06] px-3 text-xs text-slate-200 transition hover:border-indigo-300/40 hover:bg-indigo-300/10"
                                >
                                  Add
                                </button>
                              </div>
                              <p className="mt-1 text-[10px] text-slate-500">
                                {teamSkillSuggestions.length} skills loaded from
                                your database · same skill can repeat at
                                different levels (Python L2 + L4), but the same
                                skill+level pair is never added twice.
                              </p>
                              <div
                                role="listbox"
                                aria-label="Available skills from your data"
                                className="mt-1.5 max-h-56 space-y-1.5 overflow-y-auto overscroll-contain rounded-xl border border-white/10 bg-slate-950/60 p-2 custom-scrollbar"
                              >
                                {teamSkillSuggestions.length === 0 && (
                                  <p className="px-2 py-4 text-center text-[11px] text-slate-500">
                                    No skills match. Try another search, or type
                                    a custom name above and press Add.
                                  </p>
                                )}
                                {teamSkillSuggestions.map((suggestion) => {
                                  const pickedLevel = pickerLevelFor(
                                    suggestion.name,
                                  );
                                  const alreadyAdded =
                                    teamSkillDemandKeys.includes(
                                      teamDemandKey(
                                        suggestion.name,
                                        pickedLevel,
                                      ),
                                    );
                                  return (
                                    <div
                                      key={suggestion.name}
                                      role="option"
                                      aria-selected={alreadyAdded}
                                      className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2 py-1.5"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <div className="truncate text-[11px] font-bold text-white">
                                          {suggestion.name}
                                        </div>
                                        <div className="text-[9px] text-slate-500">
                                          {suggestion.employee_count} people ·
                                          avg L
                                          {Number(
                                            suggestion.avg_level || 0,
                                          ).toFixed(1)}
                                        </div>
                                      </div>
                                      <PremiumSelect
                                        value={pickedLevel}
                                        onChange={(e) =>
                                          setTeamPickerLevels((current) => ({
                                            ...current,
                                            [String(
                                              suggestion.name || "",
                                            ).trim()]: Number(e.target.value),
                                          }))
                                        }
                                        aria-label={`Level for ${suggestion.name}`}
                                        className="shrink-0 rounded-lg border border-white/10 bg-slate-950 px-1 py-1 text-[10px] text-white focus:outline-none"
                                      >
                                        {[1, 2, 3, 4, 5].map((v) => (
                                          <option key={v} value={v}>
                                            L{v}
                                          </option>
                                        ))}
                                      </PremiumSelect>
                                      <button
                                        type="button"
                                        disabled={alreadyAdded}
                                        onClick={() => {
                                          addTeamSkill(
                                            suggestion.name,
                                            pickedLevel,
                                          );
                                        }}
                                        className={`h-7 shrink-0 rounded-lg border px-2 text-[10px] font-semibold transition ${
                                          alreadyAdded
                                            ? "cursor-not-allowed border-white/5 bg-white/[0.02] text-slate-600"
                                            : "border-indigo-300/30 bg-indigo-300/10 text-indigo-200 hover:bg-indigo-300/20"
                                        }`}
                                        title={
                                          alreadyAdded
                                            ? `${suggestion.name} L${pickedLevel} is already in your demands`
                                            : `Add ${suggestion.name} at L${pickedLevel}`
                                        }
                                      >
                                        {alreadyAdded ? "✓" : "Add"}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                              {(teamDuplicateSkillNames.length > 0 ||
                                teamEmptySkillCount > 0) && (
                                <div className="mt-1.5 rounded-lg border border-amber-400/30 bg-amber-400/[0.06] px-2.5 py-1.5 text-[10px] leading-relaxed text-amber-200">
                                  {teamDuplicateSkillNames.length > 0 && (
                                    <p>
                                      Duplicates:{" "}
                                      {teamDuplicateSkillNames.join(", ")}.
                                    </p>
                                  )}
                                  {teamEmptySkillCount > 0 && (
                                    <p>
                                      {teamEmptySkillCount} blank row
                                      {teamEmptySkillCount > 1 ? "s" : ""}.
                                    </p>
                                  )}
                                  <div className="mt-1 flex flex-wrap gap-1.5">
                                    <button
                                      type="button"
                                      onClick={removeDuplicateTeamSkills}
                                      className="rounded-md border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 font-semibold text-amber-100 hover:bg-amber-300/20"
                                    >
                                      Remove duplicates
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        markTeamInputsDirty();
                                        setTeamSkillsInput([]);
                                      }}
                                      className="rounded-md border border-white/10 bg-white/[0.05] px-2 py-0.5 text-slate-300 hover:bg-white/10"
                                    >
                                      Clear all
                                    </button>
                                  </div>
                                </div>
                              )}
                              <p className="mt-1 text-[10px] text-slate-500">
                                Tip: the same skill can be demanded at several
                                levels (Python L2 + L4); each level counts as
                                its own requirement in the coverage score.
                              </p>
                            </div>
                          </>,
                        )}
                        {renderTeamSection(
                          "demands",
                          "Added Demands",
                          `${teamSkillsInput.length} requirement${teamSkillsInput.length === 1 ? "" : "s"}`,
                          teamDuplicateSkillNames.length > 0 ||
                            teamEmptySkillCount > 0,
                          <>
                            {/* Skill demands list (scrolls with the form; capped on mobile so it never traps scroll) */}
                            <div className="max-h-64 space-y-2 overflow-y-auto overscroll-contain py-2 custom-scrollbar lg:max-h-none lg:flex-1 lg:min-h-[120px]">
                              {teamSkillsInput.map((skill, idx) => {
                                const isEmpty = !String(
                                  skill?.name || "",
                                ).trim();
                                const demandKey = teamDemandKey(
                                  skill?.name,
                                  skill?.level,
                                );
                                const isDuplicate =
                                  !isEmpty &&
                                  teamSkillDemandKeys.indexOf(demandKey) !==
                                    idx;
                                return (
                                  <div
                                    key={idx}
                                    className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs ${
                                      isDuplicate || isEmpty
                                        ? "border-amber-400/50 bg-amber-400/[0.06]"
                                        : "border-white/10 bg-white/[0.045]"
                                    }`}
                                  >
                                    <span className="text-white font-bold">
                                      {skill.name || (
                                        <em className="text-amber-300">
                                          (blank — rename or remove)
                                        </em>
                                      )}
                                      {(isDuplicate || isEmpty) && (
                                        <span className="ml-1.5 rounded bg-amber-400/20 px-1 text-[9px] font-semibold uppercase tracking-wide text-amber-200">
                                          {isEmpty ? "empty" : "duplicate"}
                                        </span>
                                      )}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <PremiumSelect
                                        value={skill.level}
                                        onChange={(e) => {
                                          const nextLevel = Number(
                                            e.target.value,
                                          );
                                          const clash = teamSkillsInput.some(
                                            (other, otherIdx) =>
                                              otherIdx !== idx &&
                                              teamDemandKey(
                                                other?.name,
                                                other?.level,
                                              ) ===
                                                teamDemandKey(
                                                  skill?.name,
                                                  nextLevel,
                                                ),
                                          );
                                          if (clash) {
                                            setTeamOptimizeError(
                                              `"${String(skill?.name || "").trim()}" at L${nextLevel} is already demanded below. Pick another level or remove the other row first.`,
                                            );
                                            return;
                                          }
                                          markTeamInputsDirty();
                                          const next = [...teamSkillsInput];
                                          next[idx].level = nextLevel;
                                          setTeamSkillsInput(next);
                                        }}
                                        className="bg-slate-950 border border-white/5 rounded px-1.5 py-0.5 text-[10px] text-white focus:outline-none"
                                      >
                                        {[1, 2, 3, 4, 5].map((v) => (
                                          <option key={v} value={v}>
                                            L{v}
                                          </option>
                                        ))}
                                      </PremiumSelect>
                                      <button
                                        onClick={() => {
                                          markTeamInputsDirty();
                                          setTeamSkillsInput(
                                            teamSkillsInput.filter(
                                              (_, i) => i !== idx,
                                            ),
                                          );
                                        }}
                                        className="text-rose-400 text-xs"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                              {teamSkillsInput.length === 0 && (
                                <div className="text-xs text-slate-500 text-center py-6 border border-dashed border-white/5 rounded-xl">
                                  No skill demands added yet.
                                </div>
                              )}
                            </div>
                          </>,
                        )}
                      </div>

                      {/* Fixed Footer */}
                      <div className="shrink-0 border-t border-white/10 p-5 bg-slate-950/40">
                        <button
                          onClick={() => {
                            setMobileActivePane("right");
                            triggerTeamOptimize();
                          }}
                          disabled={
                            optimizingLoading || teamSkillsInput.length === 0
                          }
                          className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-indigo-600 text-xs font-semibold uppercase tracking-[0.12em] text-white shadow-[0_10px_28px_rgba(79,70,229,.22)] transition hover:from-primary/90 hover:to-indigo-500/90 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Play size={14} />{" "}
                          {optimizingLoading
                            ? "Proving the optimal team..."
                            : optimizedTeam
                              ? "Re-optimize Team"
                              : "Optimize Team"}
                        </button>
                      </div>
                    </div>
                  </div>
                }
                rightContent={
                  <div className="premium-card p-4 md:p-6 border border-white/5 bg-slate-950/20 min-h-0 h-full max-h-full flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4 shrink-0">
                      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
                        Optimization Assembly Results
                      </h3>
                      <span className="text-[10px] text-slate-500">
                        Exact MILP search · no time cutoff
                      </span>
                    </div>

                    {optimizedTeam && (
                      <div
                        role="status"
                        aria-live="polite"
                        className={`mb-4 shrink-0 rounded-lg border px-3 py-2 text-[10px] leading-relaxed ${
                          !savedTeamInputs
                            ? "border-amber-400/40 bg-amber-400/10 text-amber-100"
                            : teamInputsChanged
                              ? "border-amber-400/40 bg-amber-400/10 text-amber-100"
                              : "border-white/10 bg-slate-950/35 text-slate-300"
                        }`}
                      >
                        {(() => {
                          const runInputs = optimizedTeam.run_inputs || {};
                          const runBudget = Number(
                            runInputs.budget_cap ?? optimizedTeam.budget_cap,
                          );
                          const runTeamSize = Number(
                            runInputs.max_team_size ??
                              optimizedTeam.optimized_team?.length ??
                              0,
                          );
                          const runSkillCount = Array.isArray(
                            runInputs.target_skills,
                          )
                            ? runInputs.target_skills.length
                            : (optimizedTeam.metrics?.skills_coverage?.length ??
                              0);
                          const formatBudget = (value) =>
                            Number.isFinite(value)
                              ? `${value.toLocaleString()} ${teamBudgetUnitLabel}`
                              : "not recorded";

                          return !savedTeamInputs ? (
                            <>
                              <strong>Run inputs are unavailable.</strong> This
                              saved result may not match the current form.
                              Re-optimize the team to create a result with a
                              verified input snapshot.
                            </>
                          ) : teamInputsChanged ? (
                            <>
                              <strong>
                                Showing a previous proven run (kept visible
                                below).
                              </strong>{" "}
                              It used a cap of {formatBudget(runBudget)}, a team
                              size of {runTeamSize} employees, and{" "}
                              {runSkillCount} skill requirements. Your current
                              inputs are a cap of{" "}
                              {formatBudget(Number(teamBudget))}, a team size of{" "}
                              {teamSize}, and {teamSkillsInput.length}{" "}
                              requirements. The charts below are that previous
                              result for comparison; select{" "}
                              <strong>Re-optimize Team</strong> to run the
                              search against the current inputs.
                            </>
                          ) : (
                            <>
                              <strong>Result uses the current inputs:</strong>{" "}
                              cap {formatBudget(runBudget)}, team size{" "}
                              {runTeamSize} employees, {runSkillCount} skill
                              requirements.
                            </>
                          );
                        })()}
                      </div>
                    )}

                    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar space-y-4">
                      {annealingStatus === "complete" &&
                        optimizedTeam &&
                        (teamInputsChanged ||
                          !savedTeamInputs ||
                          !teamExactEvidenceAvailable) && (
                          <div className="rounded-xl border border-amber-400/30 bg-amber-400/[0.06] p-5">
                            <p className="text-xs font-semibold text-amber-200">
                              {teamInputsChanged
                                ? "Results are out of date — previous charts kept below"
                                : !savedTeamInputs
                                  ? "This saved result has no input snapshot"
                                  : "The scoring model has changed"}
                            </p>
                            <p className="mt-2 max-w-xl text-xs leading-5 text-slate-400">
                              {teamInputsChanged
                                ? "The current budget, team size, or skill requirements differ from this run. The previous proven charts stay visible below for comparison and are labelled with their original inputs."
                                : !savedTeamInputs
                                  ? "The original budget and skill requirements could not be verified, so this result cannot be compared with the current form."
                                  : "This run used older skill-matching rules. Its result is hidden until you re-optimize using the current direct-skill objective."}
                            </p>
                            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-3 text-xs sm:grid-cols-3">
                              <div>
                                <div className="text-[10px] text-slate-500">
                                  Previous roster cost
                                </div>
                                <div className="mt-1 font-mono text-slate-200">
                                  {Number(
                                    optimizedTeam.metrics?.total_cost || 0,
                                  ).toLocaleString()}{" "}
                                  {humanizeCompensationUnit(
                                    optimizedTeam.compensation_unit,
                                  )}
                                </div>
                              </div>
                              <div>
                                <div className="text-[10px] text-slate-500">
                                  Previous cap
                                </div>
                                <div className="mt-1 font-mono text-slate-200">
                                  {Number(
                                    optimizedTeam.budget_cap || 0,
                                  ).toLocaleString()}{" "}
                                  {humanizeCompensationUnit(
                                    optimizedTeam.compensation_unit,
                                  )}
                                </div>
                              </div>
                              <div>
                                <div className="text-[10px] text-slate-500">
                                  Previous run
                                </div>
                                <div className="mt-1 text-slate-200">
                                  {optimizedTeam.optimized_team?.length || 0}{" "}
                                  people ·{" "}
                                  {optimizedTeam.metrics?.skills_coverage
                                    ?.length || 0}{" "}
                                  requirements
                                </div>
                              </div>
                            </div>
                            <p className="mt-3 text-[10px] text-slate-500">
                              Select{" "}
                              <strong className="font-medium text-slate-300">
                                Re-optimize team
                              </strong>{" "}
                              to calculate against the inputs currently shown.
                            </p>
                          </div>
                        )}

                      {annealingStatus === "complete" &&
                        optimizedTeam &&
                        savedTeamInputs &&
                        teamExactEvidenceAvailable && (
                          <div className="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-[10px] leading-relaxed text-slate-300">
                            {optimizedTeam.optimality_proven
                              ? "Best feasible team proven for direct recorded skill coverage, then lowest cost among tied teams."
                              : "The solver did not prove optimality; no team is presented as optimal."}{" "}
                            Budget is a maximum; the solver does not try to
                            spend the remainder. Compensation is shown as
                            recorded employee values in{" "}
                            {optimizedTeam.compensation_unit ||
                              "the stored compensation unit"}
                            ;{" "}
                            {optimizedTeam.compensation_provenance ||
                              "source provenance is unknown"}{" "}
                            This result does not validate market accuracy or job
                            proficiency.{" "}
                            {optimizedTeam.source_scope
                              ?.excluded_missing_compensation_count > 0 &&
                              String(
                                optimizedTeam.source_scope
                                  .excluded_missing_compensation_count,
                              ) +
                                " employees without positive recorded compensation were excluded."}
                          </div>
                        )}
                      {teamOptimizeError && (
                        <div
                          role="alert"
                          className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2.5 text-xs leading-relaxed text-rose-200"
                        >
                          <p>{teamOptimizeError}</p>
                          {teamFeasibility?.minimum_cost_by_team_size?.[
                            String(Number(teamSize))
                          ] && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const minForSize = Number(
                                    teamFeasibility.minimum_cost_by_team_size[
                                      String(Number(teamSize))
                                    ] || 0,
                                  );
                                  if (minForSize > 0) {
                                    markTeamInputsDirty();
                                    setTeamBudget(Math.ceil(minForSize));
                                    setTeamOptimizeError("");
                                  }
                                }}
                                className="rounded-lg border border-rose-300/30 bg-rose-300/10 px-2 py-1 text-[10px] font-semibold text-rose-100 hover:bg-rose-300/20"
                              >
                                Set cap to minimum (
                                {Number(
                                  teamFeasibility.minimum_cost_by_team_size[
                                    String(Number(teamSize))
                                  ] || 0,
                                ).toLocaleString()}
                                )
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  markTeamInputsDirty();
                                  setTeamSize(
                                    Math.max(2, Number(teamSize || 2) - 1),
                                  );
                                  setTeamOptimizeError("");
                                }}
                                className="rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1 text-[10px] text-slate-200 hover:bg-white/10"
                              >
                                Reduce team size to{" "}
                                {Math.max(2, Number(teamSize || 2) - 1)}
                              </button>
                            </div>
                          )}
                          <p className="mt-1.5 text-[10px] text-rose-200/70">
                            This is real feasibility from recorded compensation
                            — not an estimate. The previous proven result (if
                            any) stays visible below.
                          </p>
                        </div>
                      )}

                      {/* SERVER SEARCH STATUS */}
                      {annealingStatus === "running" && (
                        <div className="py-12 flex flex-col items-center justify-center space-y-6">
                          <div className="text-center">
                            <div className="text-xs font-mono text-primary uppercase tracking-[0.2em] mb-2 animate-pulse">
                              Solving exact MILP for {Number(teamSize)} people ·
                              cap {Number(teamBudget || 0).toLocaleString()}{" "}
                              {teamBudgetUnitLabel}
                            </div>
                            <div className="text-sm font-semibold text-white">
                              Proving maximum direct skill coverage, then lowest
                              cost. No fake progress — the result appears only
                              when optimality is proven.
                            </div>
                          </div>

                          <div className="w-64 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full w-1/3 rounded-full bg-indigo-400 animate-pulse" />
                          </div>
                        </div>
                      )}

                      {annealingStatus === "complete" &&
                        optimizedTeam &&
                        savedTeamInputs &&
                        teamExactEvidenceAvailable && (
                          <div>
                            {(() => {
                              const metrics = optimizedTeam.metrics || {};
                              const coverage = metrics.skills_coverage || [];
                              const compensationUnit =
                                optimizedTeam.compensation_unit ||
                                "recorded amount";
                              const compensationUnitLabel =
                                humanizeCompensationUnit(compensationUnit);
                              const formatAmount = (value) =>
                                Number(value || 0).toLocaleString(undefined, {
                                  maximumFractionDigits: 0,
                                });
                              const totalCost = Number(metrics.total_cost || 0);
                              const budgetCap = Number(
                                optimizedTeam.budget_cap || 0,
                              );
                              const budgetPercent =
                                budgetCap > 0
                                  ? Math.min(100, (totalCost / budgetCap) * 100)
                                  : 0;
                              const scorePercent = (value) =>
                                Math.max(0, Math.min(100, Number(value || 0)));

                              return (
                                <section
                                  className="space-y-3"
                                  aria-label="Team optimization result charts"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3 text-[10px] leading-relaxed text-slate-400">
                                    <span>
                                      {optimizedTeam.optimality_proven
                                        ? "Optimality proven for direct skill coverage, then cost."
                                        : "Optimality was not proven."}{" "}
                                      Skill records do not verify proficiency.
                                    </span>
                                    <span className="shrink-0 font-mono text-slate-500">
                                      {optimizedTeam.solver || "Solver"} ·{" "}
                                      {Number(
                                        optimizedTeam.total_search_nodes || 0,
                                      ).toLocaleString()}{" "}
                                      search nodes
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.5fr)_minmax(240px,1fr)] gap-4">
                                    <div className="rounded-xl border border-white/10 bg-slate-950/80 p-4">
                                      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-3">
                                        <div>
                                          <h4 className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300">
                                            Related-skill estimates
                                          </h4>
                                          <p className="mt-1 text-[9px] text-slate-500">
                                            Reference only · not used to select
                                            the team
                                          </p>
                                        </div>
                                        <div className="text-right">
                                          <div className="text-lg font-semibold text-slate-200">
                                            {Number(
                                              metrics.ontology_adjusted_coverage_percentage ??
                                                metrics.coverage_percentage ??
                                                0,
                                            ).toFixed(1)}
                                            %
                                          </div>
                                          <div className="text-[9px] text-slate-500">
                                            graph-adjusted estimate
                                          </div>
                                        </div>
                                      </div>

                                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-slate-400">
                                        <span className="inline-flex items-center gap-1.5">
                                          <i className="h-2 w-2 rounded-sm bg-teal-400" />
                                          Exact skill evidence
                                        </span>
                                        <span className="inline-flex items-center gap-1.5">
                                          <i className="h-2 w-2 rounded-sm bg-amber-400" />
                                          Related-skill estimate
                                        </span>
                                        <span className="inline-flex items-center gap-1.5">
                                          <i className="h-2 w-2 rounded-sm bg-slate-700" />
                                          No matching evidence
                                        </span>
                                      </div>

                                      <div className="mt-2 space-y-1">
                                        {coverage.map((detail, index) => {
                                          const hasCoverageValue =
                                            detail.coverage_percentage !=
                                              null &&
                                            Number.isFinite(
                                              Number(
                                                detail.coverage_percentage,
                                              ),
                                            );
                                          const value = hasCoverageValue
                                            ? scorePercent(
                                                detail.coverage_percentage,
                                              )
                                            : null;
                                          const hasMatchBasis = [
                                            "exact_skill_name",
                                            "ontology_bridge",
                                            "no_evidence",
                                          ].includes(detail.match_basis);
                                          const isExact =
                                            detail.match_basis ===
                                            "exact_skill_name";
                                          const hasEvidence =
                                            hasMatchBasis &&
                                            detail.match_basis !==
                                              "no_evidence" &&
                                            Boolean(
                                              detail.contributed_by_skill,
                                            );
                                          const barColor = !hasMatchBasis
                                            ? "bg-slate-600"
                                            : isExact
                                              ? "bg-teal-400"
                                              : hasEvidence
                                                ? "bg-amber-400"
                                                : "bg-slate-700";
                                          const exactTxt =
                                            !teamExactEvidenceAvailable ||
                                            detail.exact_match_coverage_percentage ==
                                              null
                                              ? "—"
                                              : `${Number(detail.exact_match_coverage_percentage).toFixed(0)}%`;
                                          return (
                                            <div
                                              key={`${detail.skill}-${index}`}
                                              className="border-b border-white/5 py-2 last:border-0"
                                            >
                                              <div className="flex items-center gap-2.5">
                                                <span className="w-28 min-w-0 shrink-0 truncate text-[10px] font-medium text-slate-200">
                                                  {detail.skill}{" "}
                                                  <span className="font-mono text-slate-500">
                                                    L{detail.target_level}
                                                  </span>
                                                </span>
                                                <div
                                                  className="h-1.5 w-full max-w-[180px] flex-1 overflow-hidden rounded-full bg-slate-800"
                                                  role="img"
                                                  aria-label={
                                                    value === null
                                                      ? `${detail.skill}: per-skill coverage unavailable for this saved result`
                                                      : `${detail.skill}: ${value.toFixed(1)} percent graph-adjusted estimate`
                                                  }
                                                >
                                                  <div
                                                    className={`h-full rounded-full ${barColor}`}
                                                    style={{
                                                      width: `${value ?? 0}%`,
                                                    }}
                                                  />
                                                </div>
                                                <span className="w-11 shrink-0 text-right font-mono text-[10px] text-slate-300">
                                                  {value === null
                                                    ? "—"
                                                    : `${value.toFixed(0)}%`}
                                                </span>
                                                <span
                                                  title="Exact skill evidence (the optimizer's selection objective)"
                                                  className="w-14 shrink-0 rounded border border-teal-400/25 bg-teal-400/10 px-1 py-px text-right font-mono text-[9px] text-teal-300"
                                                >
                                                  E&nbsp;{exactTxt}
                                                </span>
                                              </div>
                                              <div className="mt-1 flex flex-wrap justify-between gap-x-3 text-[9px] text-slate-500">
                                                <span className="min-w-0 truncate">
                                                  {hasEvidence
                                                    ? `${isExact ? "Exact evidence" : "Ontology path"}: ${isExact ? detail.contributed_by_skill : (detail.ontology_path || []).join(" → ") || detail.contributed_by_skill}`
                                                    : hasMatchBasis
                                                      ? "No recorded matching skill"
                                                      : "Match basis unavailable for this saved result"}
                                                </span>
                                                <span className="shrink-0 font-mono">
                                                  {value === null
                                                    ? "Re-run for saved coverage detail"
                                                    : `${detail.achieved_effective_level ?? 0}/${detail.target_level} lvl`}
                                                </span>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>

                                      <div className="mt-4 rounded-md border border-white/5 bg-white/[0.02] px-3 py-2 text-[9px] leading-relaxed text-slate-500">
                                        Average graph-adjusted estimate:{" "}
                                        <strong className="text-slate-300">
                                          {metrics.ontology_adjusted_coverage_percentage ==
                                          null
                                            ? "unavailable for this saved result"
                                            : `${Number(metrics.ontology_adjusted_coverage_percentage).toFixed(1)}%`}
                                        </strong>
                                        . A related skill does not count toward
                                        selection and is not proof of
                                        proficiency. The exact evidence score
                                        below is the optimizer's primary
                                        objective.
                                      </div>
                                    </div>

                                    <div className="space-y-4">
                                      <div className="rounded-xl border border-white/10 bg-slate-950/80 p-4">
                                        <div className="flex items-start justify-between gap-3">
                                          <div>
                                            <h4 className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300">
                                              Budget
                                            </h4>
                                            <p className="mt-1 text-[9px] text-slate-500">
                                              Maximum allowed cost; unused
                                              budget is expected
                                            </p>
                                          </div>
                                          <span
                                            className={`rounded-md border px-2 py-1 text-[9px] font-semibold ${metrics.is_under_budget ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : "border-rose-400/20 bg-rose-400/10 text-rose-300"}`}
                                          >
                                            {metrics.is_under_budget
                                              ? "Within cap"
                                              : "Over cap"}
                                          </span>
                                        </div>
                                        <div className="mt-5 flex items-end justify-between gap-3">
                                          <div className="font-mono text-lg font-bold text-white">
                                            {formatAmount(totalCost)}{" "}
                                            <span className="text-[10px] font-normal text-slate-400">
                                              {compensationUnitLabel}
                                            </span>
                                          </div>
                                          <div className="text-right text-[9px] text-slate-500">
                                            Cap
                                            <br />
                                            <span className="font-mono text-slate-300">
                                              {formatAmount(budgetCap)}{" "}
                                              {compensationUnitLabel}
                                            </span>
                                          </div>
                                        </div>
                                        <div
                                          className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-800"
                                          role="img"
                                          aria-label={`Team cost uses ${Number(metrics.budget_usage_percentage || 0).toFixed(1)} percent of budget cap`}
                                        >
                                          <div
                                            className={`h-full rounded-full ${metrics.is_under_budget ? "bg-teal-400" : "bg-rose-400"}`}
                                            style={{
                                              width: `${budgetPercent}%`,
                                            }}
                                          />
                                        </div>
                                        <div className="mt-2 flex justify-between text-[9px] text-slate-500">
                                          <span>
                                            {Number(
                                              metrics.budget_usage_percentage ||
                                                0,
                                            ).toFixed(1)}
                                            % used
                                          </span>
                                          <span>
                                            {formatAmount(
                                              Math.max(
                                                0,
                                                budgetCap - totalCost,
                                              ),
                                            )}{" "}
                                            remaining
                                          </span>
                                        </div>
                                      </div>

                                      <div className="rounded-xl border border-white/10 bg-slate-950/80 p-4">
                                        <h4 className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300">
                                          Search proof
                                        </h4>
                                        <dl className="mt-3 space-y-2 text-[10px]">
                                          <div className="flex justify-between gap-3">
                                            <dt className="text-slate-500">
                                              Status
                                            </dt>
                                            <dd className="text-emerald-300">
                                              {optimizedTeam.search_status ||
                                                "Unknown"}
                                            </dd>
                                          </div>
                                          <div className="flex justify-between gap-3">
                                            <dt className="text-slate-500">
                                              Optimality
                                            </dt>
                                            <dd className="text-slate-200">
                                              {optimizedTeam.optimality_proven
                                                ? "Proven for this model"
                                                : "Not proven"}
                                            </dd>
                                          </div>
                                          <div className="flex justify-between gap-3">
                                            <dt className="text-slate-500">
                                              Relative gap
                                            </dt>
                                            <dd className="font-mono text-slate-200">
                                              {optimizedTeam.solver_relative_gap ??
                                                "Unavailable"}
                                            </dd>
                                          </div>
                                          <div className="flex justify-between gap-3">
                                            <dt className="text-slate-500">
                                              Eligible employees
                                            </dt>
                                            <dd className="font-mono text-slate-200">
                                              {Number(
                                                optimizedTeam.source_scope
                                                  ?.eligible_employee_count ||
                                                  0,
                                              ).toLocaleString()}
                                            </dd>
                                          </div>
                                        </dl>
                                        <p className="mt-3 border-t border-white/5 pt-2 text-[9px] leading-relaxed text-slate-500">
                                          Optimality applies only to the
                                          eligible records and the configured
                                          coverage/cost objective. It does not
                                          establish real-world job fit.
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </section>
                              );
                            })()}

                            {/* Assembled Team Roster & Skill Coverage Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                              {/* Assembled Team Roster */}
                              <div className="rounded-xl border border-white/5 bg-slate-950 p-4 flex flex-col justify-between">
                                <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
                                  <div className="text-[9px] uppercase font-bold tracking-widest text-slate-500">
                                    Assembled Team Roster (
                                    {
                                      (optimizedTeam.optimized_team || [])
                                        .length
                                    }{" "}
                                    members)
                                  </div>
                                  <div className="text-[10px] font-mono text-cyan-300 font-bold">
                                    Total:{" "}
                                    {Number(
                                      optimizedTeam.metrics?.total_cost || 0,
                                    ).toLocaleString()}{" "}
                                    {humanizeCompensationUnit(
                                      optimizedTeam.compensation_unit,
                                    )}
                                  </div>
                                </div>
                                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                  {(optimizedTeam.optimized_team || []).map(
                                    (emp, idx) => (
                                      <div
                                        key={emp.id || idx}
                                        className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] p-2.5 hover:border-indigo-400/30 transition-colors"
                                      >
                                        <div className="min-w-0 flex-1 mr-2">
                                          <div className="text-xs font-bold text-white truncate">
                                            {emp.full_name}
                                          </div>
                                          <div className="text-[10px] text-slate-400 truncate">
                                            {emp.role} · {emp.department}
                                          </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <div className="text-xs font-mono font-bold text-emerald-400">
                                            {Number(
                                              emp.estimated_cost || 0,
                                            ).toLocaleString()}{" "}
                                            {humanizeCompensationUnit(
                                              optimizedTeam.compensation_unit,
                                            )}
                                          </div>
                                          <div className="text-[8px] uppercase tracking-wider text-slate-500">
                                            {emp.salary_source ===
                                            "employee_record"
                                              ? "Employee record"
                                              : "Estimate"}
                                          </div>
                                        </div>
                                      </div>
                                    ),
                                  )}
                                </div>
                              </div>

                              {/* Skill Coverage details */}
                              <div className="rounded-xl border border-white/5 bg-slate-950 p-4 flex flex-col justify-between">
                                <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
                                  <div className="text-[9px] uppercase font-bold tracking-widest text-slate-500">
                                    Direct skill coverage · selection objective
                                  </div>
                                  <div className="text-xl font-semibold text-slate-100">
                                    {!teamExactEvidenceAvailable ||
                                    optimizedTeam.metrics
                                      .optimization_coverage_percentage == null
                                      ? "—"
                                      : `${optimizedTeam.metrics.optimization_coverage_percentage}%`}
                                  </div>
                                </div>
                                <p className="-mt-1 mb-2 text-[9px] text-slate-500">
                                  The solver maximizes this score, then
                                  minimizes cost among tied teams.
                                </p>
                                <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                                  {(
                                    optimizedTeam.metrics.skills_coverage || []
                                  ).map((detail, idx) => (
                                    <div
                                      key={idx}
                                      className="flex justify-between items-center text-[10px] border-b border-white/5 py-1.5"
                                    >
                                      <span className="text-slate-300 font-medium">
                                        {detail.skill}{" "}
                                        <span className="text-[9px] text-slate-500 font-mono">
                                          (L{detail.target_level})
                                        </span>
                                      </span>
                                      <span className="text-slate-200">
                                        Exact match:{" "}
                                        <strong className="text-cyan-400 font-semibold">
                                          {!teamExactEvidenceAvailable
                                            ? "Re-optimize to refresh"
                                            : detail.exact_match_skill ||
                                              "None recorded"}
                                        </strong>
                                        <span className="ml-2 text-slate-500">
                                          {!teamExactEvidenceAvailable ||
                                          detail.exact_match_coverage_percentage ==
                                            null
                                            ? "—"
                                            : Number(
                                                detail.exact_match_coverage_percentage,
                                              ).toFixed(1)}
                                          %
                                        </span>
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                      {annealingStatus === "idle" && (
                        <div className="py-12 px-6 border border-dashed border-white/10 rounded-2xl bg-white/[0.01] text-center max-w-md mx-auto my-4 text-xs text-slate-400 leading-relaxed">
                          Configure target skills, budget constraint, and click{" "}
                          <span className="font-semibold text-cyan-300">
                            Optimize Team
                          </span>{" "}
                          to search this tenant's recorded employee data.
                        </div>
                      )}
                    </div>
                  </div>
                }
              />
            </motion.div>
          )}

          {/* TAB 3: ATTRITION SURVIVAL PREDICTOR */}
          {activeSubTab === "attrition" && (
            <motion.div
              key="attrition"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="min-h-0 min-w-0 flex-1 h-full w-full flex flex-col"
            >
              <MobileSplitPane
                activePane={mobileActivePane}
                setActivePane={setMobileActivePane}
                leftTitle="Cohort Data"
                rightTitle="Survival Curve & Details"
                leftIcon={<Users size={14} />}
                rightIcon={<TrendingUp size={14} />}
                leftWidthClass="lg:w-[320px] xl:w-[340px]"
                leftContent={
                  <div className="premium-card p-4 md:p-5 border border-white/5 bg-slate-950/40 backdrop-blur-md flex flex-col min-h-0 h-full max-h-full overflow-hidden">
                    <div className="flex items-center justify-between shrink-0 border-b border-white/5 pb-2 mb-3">
                      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
                        Attrition Model Readiness
                      </h3>
                      <span className="text-[9px] font-mono text-slate-500">
                        {attritionData.length > 0
                          ? `${attritionData.length} observed records`
                          : attritionModel?.status === "cohort_descriptive"
                            ? `${attritionModel.eligible_observation_count} observed durations`
                            : "Outcome history required"}
                      </span>
                    </div>

                    {/* Search + sort the observed descriptive roster. */}
                    {(attritionData.length > 0 ||
                      attritionModel?.status === "cohort_descriptive") && (
                      <div className="shrink-0 space-y-2 mb-3">
                        <div className="relative">
                          <Search
                            size={12}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                          />
                          <input
                            type="text"
                            value={attritionSearch}
                            onChange={(e) => setAttritionSearch(e.target.value)}
                            placeholder="Search name, role, department..."
                            className="w-full rounded-lg border border-white/10 bg-slate-950/70 pl-7 pr-2 py-1.5 text-[10px] text-white placeholder:text-slate-600 outline-none focus:border-indigo-400/50"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          {[
                            { key: "tenure", label: "Tenure" },
                            { key: "name", label: "Name" },
                            { key: "department", label: "Dept" },
                            { key: "survival", label: "Cohort S" },
                          ].map((opt) => (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => {
                                if (attritionSort === opt.key) {
                                  setAttritionSortDesc(!attritionSortDesc);
                                } else {
                                  setAttritionSort(opt.key);
                                  setAttritionSortDesc(true);
                                }
                              }}
                              className={`flex-1 rounded-lg border px-1.5 py-1 text-[8px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                attritionSort === opt.key
                                  ? "border-indigo-400/50 bg-indigo-500/10 text-indigo-300"
                                  : "border-white/10 bg-white/[0.03] text-slate-500 hover:text-slate-300"
                              }`}
                            >
                              {opt.label}
                              {attritionSort === opt.key &&
                                (attritionSortDesc ? " ↓" : " ↑")}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar pr-1 max-h-96 lg:max-h-none">
                      {attritionLoading ? (
                        <div className="text-xs text-slate-500 text-center py-8">
                          Loading attrition model readiness...
                        </div>
                      ) : visibleAttrition.length === 0 ? (
                        <div className="text-xs text-slate-400 text-center py-8 space-y-2">
                          {attritionError ? (
                            <>
                              <p>{attritionError}</p>
                              <button
                                type="button"
                                onClick={fetchAttrition}
                                className="rounded-md border border-white/10 px-3 py-1 text-slate-200 hover:border-indigo-400/50"
                              >
                                Retry
                              </button>
                            </>
                          ) : attritionModel?.status ===
                            "cohort_descriptive" ? (
                            <>
                              <p className="font-semibold text-cyan-200">
                                Cohort evidence available
                              </p>
                              <p>
                                {attritionModel.observed_departure_count}{" "}
                                recorded departures and{" "}
                                {attritionModel.right_censored_count}{" "}
                                right-censored employees. These describe the
                                uploaded cohort; they do not rank individual
                                employees.
                              </p>
                            </>
                          ) : attritionModel?.status ===
                            "insufficient_outcome_data" ? (
                            <>
                              <p className="font-semibold text-amber-200">
                                Forecasts are unavailable
                              </p>
                              <p>
                                This tenant has{" "}
                                {attritionModel.tenant_profile_count} employee
                                profiles. Add employment start dates, departure
                                dates with departure_event=true, and censor
                                dates with departure_event=false to calculate a
                                cohort survival curve.
                              </p>
                            </>
                          ) : (
                            <p>No profiles match this search.</p>
                          )}
                        </div>
                      ) : (
                        visibleAttrition.map((emp) => {
                          const isSel =
                            emp.employee_id ===
                            selectedAttritionEmp?.employee_id;
                          const departed =
                            emp.employment_status === "departed" ||
                            emp.departure_observed === true;
                          return (
                            <button
                              key={emp.employee_id}
                              onClick={() => {
                                setSelectedAttritionEmp(emp);
                                setMobileActivePane("right");
                              }}
                              className={`w-full text-left p-3 rounded-xl border transition-all select-none cursor-pointer ${isSel ? "border-indigo-400 bg-indigo-500/5" : "border-white/5 bg-white/2 hover:border-white/10"}`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="font-bold text-white text-xs truncate">
                                    {emp.full_name}
                                  </div>
                                  <div className="text-[9px] text-slate-400 uppercase mt-0.5 truncate">
                                    {emp.role} · {emp.department}
                                  </div>
                                  <div className="text-[9px] text-slate-500 mt-1 font-mono">
                                    {Number(emp.tenure_months || 0).toFixed(1)}{" "}
                                    mo tenure · {emp.skills_count ?? 0} skills
                                  </div>
                                </div>
                                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                                  <span
                                    className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border ${
                                      departed
                                        ? "text-slate-300 border-white/15 bg-white/5"
                                        : "text-emerald-300 border-emerald-400/20 bg-emerald-400/10"
                                    }`}
                                  >
                                    {departed ? "Departed" : "Active"}
                                  </span>
                                  <div
                                    className="text-xs font-black text-cyan-300 font-mono"
                                    title="Share of the observed cohort still employed at this tenure (Kaplan–Meier, descriptive)"
                                  >
                                    {(
                                      Number(
                                        emp.cohort_survival_at_tenure ?? 1,
                                      ) * 100
                                    ).toFixed(0)}
                                    %
                                  </div>
                                  <div className="text-[8px] text-slate-500 uppercase">
                                    Cohort S(t)
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                }
                rightContent={
                  <div className="premium-card p-4 md:p-6 border border-white/5 bg-slate-950/20 min-h-0 h-full max-h-full flex flex-col overflow-hidden">
                    {attritionRun && attritionModel && (
                      <div
                        role="status"
                        aria-live="polite"
                        className="mb-4 shrink-0 rounded-lg border border-white/10 bg-slate-950/35 px-3 py-2 text-[10px] leading-relaxed text-slate-300"
                      >
                        <strong>Generated:</strong>{" "}
                        <span className="font-mono">
                          {new Date(attritionRun.generatedAt).toLocaleString()}
                        </span>{" "}
                        · <strong>Scenario ID:</strong>{" "}
                        <span className="font-mono text-cyan-300">
                          {attritionRun.scenarioId}
                        </span>{" "}
                        ·{" "}
                        <span className="font-mono">
                          {attritionRun.modelStatus}
                        </span>{" "}
                        ·{" "}
                        <span className="font-mono">
                          {attritionRun.curvePoints} curve points
                        </span>
                      </div>
                    )}
                    {/* Legacy formula detail renders only for validated selections
                        carrying model levers. Descriptive roster selections fall
                        through to the observed cohort view below. */}
                    {selectedAttritionEmp?.levers ? (
                      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar space-y-6 pr-1">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3 gap-3">
                          <div className="min-w-0">
                            <div className="text-[9px] uppercase font-bold tracking-widest text-slate-500">
                              Observed Attrition Survival Analysis
                            </div>
                            <div className="mt-1 text-[9px] uppercase tracking-wider text-amber-300 truncate">
                              {attritionModel?.status ||
                                "Model status unavailable"}
                            </div>
                            <h3 className="text-xl font-extrabold text-white mt-1 truncate">
                              {selectedAttritionEmp.full_name}
                            </h3>
                            <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                              {selectedAttritionEmp.role} ·{" "}
                              {selectedAttritionEmp.department}
                            </div>
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-1.5">
                            <span
                              className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider"
                              style={{
                                color: tierColor(
                                  selectedAttritionEmp.risk_tier,
                                ),
                                background: tierBg(
                                  selectedAttritionEmp.risk_tier,
                                ),
                                border: `1px solid ${tierColor(selectedAttritionEmp.risk_tier)}44`,
                              }}
                            >
                              {selectedAttritionEmp.risk_tier} Flight Risk
                            </span>
                            <span className="text-[10px] text-indigo-400 bg-indigo-500/5 border border-indigo-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider font-bold">
                              Tenure: {selectedAttritionEmp.tenure_months} Mo.
                            </span>
                          </div>
                        </div>

                        {/* Key survival statistics */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2">
                          {[
                            {
                              label: "Risk Percentile",
                              value: `P${selectedAttritionEmp.risk_percentile}`,
                              sub: `of ${populationStats?.count ?? 0} profiles`,
                              color: tierColor(selectedAttritionEmp.risk_tier),
                              bar: selectedAttritionEmp.risk_percentile / 100,
                              barColor: tierColor(
                                selectedAttritionEmp.risk_tier,
                              ),
                            },
                            {
                              label: "Hazard Ratio",
                              value: `x${attritionSim?.hazardRatio.toFixed(2) ?? selectedAttritionEmp.hazard_ratio}`,
                              sub: "vs population avg 1.00",
                              color: "#fb7185",
                              bar: Math.min(
                                1,
                                (attritionSim?.hazardRatio ??
                                  selectedAttritionEmp.hazard_ratio) / 6,
                              ),
                              barColor: "#f43f5e",
                            },
                            {
                              label: "12-Mo Attrition",
                              value: `${((attritionSim?.attr12 ?? selectedAttritionEmp.attr_12) * 100).toFixed(1)}%`,
                              sub: "P(T quit ≤ 12 mo)",
                              color: "#fbbf24",
                              bar:
                                attritionSim?.attr12 ??
                                selectedAttritionEmp.attr_12,
                              barColor: "#fbbf24",
                            },
                            {
                              label: "Median Residual Tenure",
                              value:
                                attritionSim?.medianResidualTenure != null
                                  ? `${attritionSim.medianResidualTenure.toFixed(1)} mo`
                                  : "> 12 mo",
                              sub: "S(t) crosses 50%",
                              color: "#34d399",
                              bar:
                                attritionSim?.medianResidualTenure != null
                                  ? 1 - attritionSim.medianResidualTenure / 18
                                  : 0.08,
                              barColor: "#34d399",
                            },
                            {
                              label: "Current Monthly Hazard",
                              value: `${((attritionSim?.currentHazard ?? selectedAttritionEmp.monthly_attrition_hazard) * 100).toFixed(2)}%`,
                              sub: "h(t) this month",
                              color: "#2dd4bf",
                              bar: Math.min(
                                1,
                                (attritionSim?.currentHazard ??
                                  selectedAttritionEmp.monthly_attrition_hazard) /
                                  0.05,
                              ),
                              barColor: "#2dd4bf",
                            },
                          ].map((card) => (
                            <div
                              key={card.label}
                              className="rounded-xl border border-white/5 bg-slate-950/70 p-3"
                            >
                              <div className="text-[8px] uppercase tracking-widest text-slate-500 font-bold">
                                {card.label}
                              </div>
                              <div
                                className="text-lg font-black font-mono mt-0.5"
                                style={{ color: card.color }}
                              >
                                {card.value}
                              </div>
                              <div className="text-[8px] text-slate-500 mt-1">
                                {card.sub}
                              </div>
                              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden mt-1.5">
                                <div
                                  className="h-full rounded-full transition-all duration-300"
                                  style={{
                                    width: `${Math.max(2, Math.min(100, card.bar * 100))}%`,
                                    background: card.barColor,
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
                          {/* Left: Survival Curve SVG Chart */}
                          <div className="space-y-4">
                            <div className="rounded-xl border border-white/5 bg-slate-950 p-4">
                              <div className="flex justify-between items-center mb-2 gap-2 flex-wrap">
                                <div className="text-[9px] uppercase font-bold tracking-widest text-slate-500">
                                  12-Month Survival Scenario · Unvalidated
                                  Formula
                                </div>
                                <span className="text-xs font-bold text-indigo-400">
                                  End Projection Survival:{" "}
                                  {attritionSim
                                    ? (
                                        attritionSim.forecast[11]
                                          .survival_probability * 100
                                      ).toFixed(1)
                                    : "—"}
                                  %
                                </span>
                              </div>

                              {/* Chart legend */}
                              <div className="flex flex-wrap items-center gap-3 mb-2 text-[8px] uppercase tracking-wider text-slate-400">
                                <span className="flex items-center gap-1.5">
                                  <span
                                    className="w-4 h-[3px] rounded-full"
                                    style={{ background: "#818cf8" }}
                                  />
                                  Employee S(t)
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <span
                                    className="w-4 h-[3px] rounded-full"
                                    style={{
                                      background: "rgba(129,140,248,0.25)",
                                    }}
                                  />
                                  Unvalidated illustrative range
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <span className="w-4 h-[3px] rounded-full border-t border-dashed border-slate-400" />
                                  Population Median
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <span
                                    className="w-4 h-[3px] rounded-full"
                                    style={{ background: "rgba(51,65,85,0.8)" }}
                                  />
                                  Population P10–P90
                                </span>
                              </div>

                              {/* High-Precision Interactive SVG Survival Probability Chart */}
                              <div className="relative h-64 w-full rounded-xl border border-white/10 bg-slate-950/80 p-3 shadow-inner flex flex-col justify-between overflow-hidden">
                                {/* Left Y-Axis Percentage Labels */}
                                <div className="absolute left-2 top-3 bottom-8 flex flex-col justify-between text-[9px] font-mono text-slate-400 z-10 pointer-events-none">
                                  {[
                                    100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0,
                                  ].map((v) => (
                                    <span
                                      key={v}
                                      className="bg-slate-900/80 px-1 rounded border border-white/5"
                                    >
                                      {v}%
                                    </span>
                                  ))}
                                </div>

                                {/* Graphic Canvas Area */}
                                <div className="relative flex-1 w-full pl-20 pr-4 pt-2 pb-2">
                                  <svg
                                    className="h-full w-full overflow-visible"
                                    viewBox="0 0 100 100"
                                    preserveAspectRatio="none"
                                  >
                                    <defs>
                                      <linearGradient
                                        id="survGradHigh"
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="1"
                                      >
                                        <stop
                                          offset="0%"
                                          stopColor="#818cf8"
                                          stopOpacity="0.45"
                                        />
                                        <stop
                                          offset="100%"
                                          stopColor="#818cf8"
                                          stopOpacity="0.0"
                                        />
                                      </linearGradient>
                                    </defs>

                                    {/* Y-Axis Grid lines every 10% */}
                                    {[
                                      0, 10, 20, 30, 40, 50, 60, 70, 80, 90,
                                      100,
                                    ].map((v) => (
                                      <line
                                        key={v}
                                        x1="0"
                                        y1={v}
                                        x2="100"
                                        y2={v}
                                        stroke={
                                          v === 50
                                            ? "rgba(244,63,94,0.35)"
                                            : "rgba(255,255,255,0.07)"
                                        }
                                        strokeDasharray={
                                          v === 50 ? "4 4" : "3 3"
                                        }
                                        vectorEffect="non-scaling-stroke"
                                      />
                                    ))}

                                    {attritionSim && (
                                      <>
                                        {/* Population P10–P90 band */}
                                        {populationStats && (
                                          <path
                                            fill="rgba(51,65,85,0.55)"
                                            stroke="none"
                                            d={
                                              `M 0,${100 - populationStats.p90[0] * 100} ` +
                                              populationStats.p90
                                                .map(
                                                  (v, i) =>
                                                    `L ${(i / 11) * 100},${100 - v * 100}`,
                                                )
                                                .join(" ") +
                                              " " +
                                              populationStats.p10
                                                .slice()
                                                .reverse()
                                                .map((v, i) => {
                                                  const idx = 11 - i;
                                                  return `L ${(idx / 11) * 100},${100 - v * 100}`;
                                                })
                                                .join(" ") +
                                              " Z"
                                            }
                                          />
                                        )}

                                        {/* Population median reference (dashed) */}
                                        {populationStats && (
                                          <polyline
                                            fill="none"
                                            stroke="rgba(148,163,184,0.7)"
                                            strokeWidth="1.2"
                                            strokeDasharray="5 4"
                                            strokeLinecap="round"
                                            vectorEffect="non-scaling-stroke"
                                            points={populationStats.p50
                                              .map(
                                                (v, i) =>
                                                  `${(i / 11) * 100},${100 - v * 100}`,
                                              )
                                              .join(" ")}
                                          />
                                        )}

                                        {/* Legacy formula range, not a confidence interval. */}
                                        <path
                                          fill="rgba(129,140,248,0.18)"
                                          stroke="none"
                                          d={
                                            `M 0,${100 - attritionSim.forecast[0].ci_high * 100} ` +
                                            attritionSim.forecast
                                              .map(
                                                (f, i) =>
                                                  `L ${(i / 11) * 100},${100 - f.ci_high * 100}`,
                                              )
                                              .join(" ") +
                                            " " +
                                            attritionSim.forecast
                                              .slice()
                                              .reverse()
                                              .map((f, i) => {
                                                const idx = 11 - i;
                                                return `L ${(idx / 11) * 100},${100 - f.ci_low * 100}`;
                                              })
                                              .join(" ") +
                                            " Z"
                                          }
                                        />

                                        {/* Survival area under the curve */}
                                        <path
                                          fill="url(#survGradHigh)"
                                          stroke="none"
                                          d={
                                            `M 0,${100 - (attritionSim.forecast[0]?.survival_probability * 100 || 100)} ` +
                                            attritionSim.forecast
                                              .map((f, i) => {
                                                const x = (i / 11) * 100;
                                                const y =
                                                  100 -
                                                  f.survival_probability * 100;
                                                return `L ${x},${y}`;
                                              })
                                              .join(" ") +
                                            ` L 100,100 L 0,100 Z`
                                          }
                                        />

                                        {/* Employee survival curve */}
                                        <polyline
                                          fill="none"
                                          stroke="#818cf8"
                                          strokeWidth="2.5"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          style={{
                                            filter:
                                              "drop-shadow(0 0 5px rgba(129,140,248,0.5))",
                                          }}
                                          vectorEffect="non-scaling-stroke"
                                          points={attritionSim.forecast
                                            .map((f, i) => {
                                              const x = (i / 11) * 100;
                                              const y =
                                                100 -
                                                f.survival_probability * 100;
                                              return `${x},${y}`;
                                            })
                                            .join(" ")}
                                        />

                                        {/* Median residual tenure marker (S(t) = 50%) */}
                                        {(() => {
                                          let cross = null;
                                          for (
                                            let i = 0;
                                            i < attritionSim.forecast.length;
                                            i++
                                          ) {
                                            const f = attritionSim.forecast[i];
                                            if (f.survival_probability <= 0.5) {
                                              const prevS =
                                                i === 0
                                                  ? 1
                                                  : attritionSim.forecast[i - 1]
                                                      .survival_probability;
                                              if (prevS > 0.5) {
                                                const frac =
                                                  (prevS - 0.5) /
                                                  (prevS -
                                                    f.survival_probability);
                                                cross = {
                                                  x: ((i + frac) / 11) * 100,
                                                  month: i + 1,
                                                };
                                              }
                                              break;
                                            }
                                          }
                                          return cross ? (
                                            <>
                                              <line
                                                x1={cross.x}
                                                y1="0"
                                                x2={cross.x}
                                                y2="100"
                                                stroke="rgba(52,211,153,0.6)"
                                                strokeWidth="1.5"
                                                strokeDasharray="3 3"
                                                vectorEffect="non-scaling-stroke"
                                              />
                                              <circle
                                                cx={cross.x}
                                                cy="50"
                                                r="1.6"
                                                fill="#34d399"
                                                style={{
                                                  filter:
                                                    "drop-shadow(0 0 4px #34d399)",
                                                }}
                                              />
                                              <circle
                                                cx={cross.x}
                                                cy="50"
                                                r="3.5"
                                                fill="none"
                                                stroke="#34d399"
                                                strokeOpacity="0.4"
                                              />
                                            </>
                                          ) : null;
                                        })()}

                                        {/* Laser Crosshair Line on hover */}
                                        {hoveredSurvMonth !== null && (
                                          <line
                                            x1={(hoveredSurvMonth / 11) * 100}
                                            y1="0"
                                            x2={(hoveredSurvMonth / 11) * 100}
                                            y2="100"
                                            stroke="#2dd4bf"
                                            strokeWidth="1.5"
                                            strokeDasharray="3 3"
                                            vectorEffect="non-scaling-stroke"
                                          />
                                        )}
                                      </>
                                    )}
                                  </svg>

                                  {/* Interactive SVG Node triggers */}
                                  <div className="absolute inset-0 pl-20 pr-4 pt-2 pb-2 flex justify-between items-center pointer-events-auto">
                                    {attritionSim &&
                                      attritionSim.forecast.map((f, i) => {
                                        const S_t = f.survival_probability;
                                        return (
                                          <div
                                            key={i}
                                            onMouseEnter={() =>
                                              setHoveredSurvMonth(i)
                                            }
                                            onMouseLeave={() =>
                                              setHoveredSurvMonth(null)
                                            }
                                            className="h-full flex-1 cursor-pointer relative group flex justify-center items-center"
                                          >
                                            <div
                                              className={`w-2 h-2 rounded-full transition-all ${hoveredSurvMonth === i ? "bg-white scale-150 shadow-[0_0_10px_#2dd4bf]" : S_t < 0.5 ? "bg-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.6)]" : "bg-indigo-400/80 group-hover:scale-125"}`}
                                            />
                                          </div>
                                        );
                                      })}
                                  </div>
                                </div>

                                {/* Bottom X-Axis Month Ticks */}
                                <div className="pl-20 pr-4 flex justify-between items-center text-[9px] font-mono text-slate-400 border-t border-white/5 pt-1">
                                  {attritionSim &&
                                    attritionSim.forecast.map((f, i) => (
                                      <span
                                        key={i}
                                        className={`px-0.5 transition-all ${hoveredSurvMonth === i ? "text-cyan-300 font-bold scale-110" : ""}`}
                                      >
                                        M{i + 1}
                                      </span>
                                    ))}
                                </div>

                                {/* Hover Data Tooltip Glass Card */}
                                {hoveredSurvMonth !== null &&
                                  attritionSim &&
                                  attritionSim.forecast[hoveredSurvMonth] && (
                                    <div className="absolute top-3 right-3 z-20 rounded-xl border border-indigo-400/30 bg-slate-950/95 p-3 shadow-2xl backdrop-blur-md text-[10px] space-y-1 w-56">
                                      <div className="font-bold text-indigo-300 flex items-center justify-between gap-3">
                                        <span>
                                          Projection Month{" "}
                                          {
                                            attritionSim.forecast[
                                              hoveredSurvMonth
                                            ].month
                                          }
                                        </span>
                                        <span
                                          className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                                            attritionSim.forecast[
                                              hoveredSurvMonth
                                            ].survival_probability > 0.75
                                              ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                                              : attritionSim.forecast[
                                                    hoveredSurvMonth
                                                  ].survival_probability > 0.5
                                                ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                                                : "bg-rose-500/10 text-rose-300 border border-rose-500/20"
                                          }`}
                                        >
                                          {attritionSim.forecast[
                                            hoveredSurvMonth
                                          ].survival_probability > 0.75
                                            ? "Low Hazard"
                                            : attritionSim.forecast[
                                                  hoveredSurvMonth
                                                ].survival_probability > 0.5
                                              ? "Elevated Risk"
                                              : "Critical Flight Danger"}
                                        </span>
                                      </div>
                                      <div className="text-slate-300 flex justify-between">
                                        <span>Survival S(t)</span>
                                        <strong className="text-white font-mono">
                                          {(
                                            attritionSim.forecast[
                                              hoveredSurvMonth
                                            ].survival_probability * 100
                                          ).toFixed(1)}
                                          %
                                        </strong>
                                      </div>
                                      <div className="text-slate-400 flex justify-between">
                                        <span>Illustrative range</span>
                                        <strong className="text-indigo-300 font-mono">
                                          {(
                                            attritionSim.forecast[
                                              hoveredSurvMonth
                                            ].ci_low * 100
                                          ).toFixed(1)}
                                          –
                                          {(
                                            attritionSim.forecast[
                                              hoveredSurvMonth
                                            ].ci_high * 100
                                          ).toFixed(1)}
                                          %
                                        </strong>
                                      </div>
                                      <div className="text-slate-300 flex justify-between">
                                        <span>Attrition Probability</span>
                                        <strong className="text-rose-300 font-mono">
                                          {(
                                            attritionSim.forecast[
                                              hoveredSurvMonth
                                            ].attrition_probability * 100
                                          ).toFixed(1)}
                                          %
                                        </strong>
                                      </div>
                                      <div className="text-slate-300 flex justify-between">
                                        <span>Monthly Hazard h(t)</span>
                                        <strong className="text-cyan-300 font-mono">
                                          {(
                                            attritionSim.forecast[
                                              hoveredSurvMonth
                                            ].hazard * 100
                                          ).toFixed(2)}
                                          %
                                        </strong>
                                      </div>
                                      <div className="text-slate-300 flex justify-between">
                                        <span>Cumulative Hazard H(t)</span>
                                        <strong className="text-amber-300 font-mono">
                                          {attritionSim.forecast[
                                            hoveredSurvMonth
                                          ].cumulative_hazard.toFixed(3)}
                                        </strong>
                                      </div>
                                      <div className="text-slate-300 flex justify-between">
                                        <span>Cumulative Tenure</span>
                                        <strong className="text-indigo-300 font-mono">
                                          {
                                            attritionSim.forecast[
                                              hoveredSurvMonth
                                            ].projected_tenure
                                          }{" "}
                                          Mo
                                        </strong>
                                      </div>
                                      <div className="text-slate-300 flex justify-between">
                                        <span>Hazard Ratio</span>
                                        <strong className="text-rose-300 font-mono">
                                          x{attritionSim.hazardRatio.toFixed(2)}
                                        </strong>
                                      </div>
                                    </div>
                                  )}
                              </div>

                              {/* Permanent Month Milestone Summary Grid (Visible without hovering!) */}
                              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
                                {attritionSim &&
                                  attritionSim.forecast
                                    .filter(
                                      (_, idx) =>
                                        idx % 2 === 1 ||
                                        idx === 0 ||
                                        idx === 11,
                                    )
                                    .map((f) => {
                                      const mIdx = f.month - 1;
                                      const S_t = f.survival_probability;
                                      return (
                                        <div
                                          key={f.month}
                                          onMouseEnter={() =>
                                            setHoveredSurvMonth(mIdx)
                                          }
                                          onMouseLeave={() =>
                                            setHoveredSurvMonth(null)
                                          }
                                          className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${hoveredSurvMonth === mIdx ? "border-cyan-400 bg-cyan-500/10 shadow-[0_0_12px_rgba(56,189,248,0.25)]" : "border-white/5 bg-slate-950/60 hover:border-white/10"}`}
                                        >
                                          <div className="text-[9px] uppercase font-bold text-slate-400">
                                            Month {f.month}
                                          </div>
                                          <div
                                            className={`text-xs font-black mt-0.5 ${S_t > 0.75 ? "text-emerald-400" : S_t > 0.5 ? "text-amber-400" : "text-rose-400"}`}
                                          >
                                            {(S_t * 100).toFixed(1)}%
                                          </div>
                                        </div>
                                      );
                                    })}
                              </div>
                            </div>

                            {/* Monthly Hazard Function Chart */}
                            <div className="rounded-xl border border-white/5 bg-slate-950 p-4">
                              <div className="flex justify-between items-center mb-3">
                                <div className="text-[9px] uppercase font-bold tracking-widest text-slate-500">
                                  Monthly Hazard Function h(t)
                                </div>
                                <span className="text-[9px] font-mono text-cyan-300">
                                  h(t) = h₀(t) · sen. · dept. · HR &nbsp;·&nbsp;
                                  peak{" "}
                                  {(attritionSim
                                    ? Math.max(
                                        ...attritionSim.forecast.map(
                                          (f) => f.hazard,
                                        ),
                                      )
                                    : 0
                                  ).toFixed(3)}
                                </span>
                              </div>

                              <div className="relative h-36 w-full rounded-xl border border-white/10 bg-slate-950/80 p-3 shadow-inner flex flex-col justify-between overflow-hidden">
                                <div className="absolute left-2 top-3 bottom-8 flex flex-col justify-between text-[8px] font-mono text-slate-500 z-10 pointer-events-none">
                                  <span>100%</span>
                                  <span>75%</span>
                                  <span>50%</span>
                                  <span>25%</span>
                                  <span>0%</span>
                                </div>

                                <div className="relative flex-1 w-full pl-20 pr-4 pt-2 pb-2">
                                  <svg
                                    className="h-full w-full overflow-visible"
                                    viewBox="0 0 100 100"
                                    preserveAspectRatio="none"
                                  >
                                    {[0, 25, 50, 75, 100].map((v) => (
                                      <line
                                        key={v}
                                        x1="0"
                                        y1={v}
                                        x2="100"
                                        y2={v}
                                        stroke="rgba(255,255,255,0.06)"
                                        strokeDasharray="3 3"
                                        vectorEffect="non-scaling-stroke"
                                      />
                                    ))}
                                    {attritionSim && (
                                      <>
                                        {(() => {
                                          const maxH =
                                            Math.max(
                                              ...attritionSim.forecast.map(
                                                (f) => f.hazard,
                                              ),
                                            ) || 0.01;
                                          const barW =
                                            100 / attritionSim.forecast.length;
                                          const pts = attritionSim.forecast.map(
                                            (f, i) => {
                                              const x = (i / 11) * 100;
                                              const y =
                                                100 - (f.hazard / maxH) * 100;
                                              return { x, y };
                                            },
                                          );
                                          return (
                                            <>
                                              {attritionSim.forecast.map(
                                                (f, i) => {
                                                  const y =
                                                    100 -
                                                    (f.hazard / maxH) * 100;
                                                  const cx = (i / 11) * 100;
                                                  return (
                                                    <rect
                                                      key={i}
                                                      x={cx - barW / 2 + 1}
                                                      y={y}
                                                      width={barW - 2}
                                                      height={100 - y}
                                                      rx="1"
                                                      fill={
                                                        hoveredHazMonth === i
                                                          ? "rgba(45,212,191,0.85)"
                                                          : f.hazard / maxH >
                                                              0.7
                                                            ? "rgba(244,63,94,0.65)"
                                                            : f.hazard / maxH >
                                                                0.4
                                                              ? "rgba(251,191,36,0.55)"
                                                              : "rgba(129,140,248,0.45)"
                                                      }
                                                    />
                                                  );
                                                },
                                              )}
                                              <polyline
                                                fill="none"
                                                stroke="#2dd4bf"
                                                strokeWidth="1.8"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                vectorEffect="non-scaling-stroke"
                                                points={pts
                                                  .map((p) => `${p.x},${p.y}`)
                                                  .join(" ")}
                                              />
                                              {hoveredHazMonth !== null && (
                                                <line
                                                  x1={
                                                    (hoveredHazMonth / 11) * 100
                                                  }
                                                  y1="0"
                                                  x2={
                                                    (hoveredHazMonth / 11) * 100
                                                  }
                                                  y2="100"
                                                  stroke="rgba(45,212,191,0.5)"
                                                  strokeDasharray="3 3"
                                                  vectorEffect="non-scaling-stroke"
                                                />
                                              )}
                                            </>
                                          );
                                        })()}
                                      </>
                                    )}
                                  </svg>

                                  {/* Hover targets */}
                                  <div className="absolute inset-0 flex justify-between items-center pointer-events-auto">
                                    {attritionSim &&
                                      attritionSim.forecast.map((f, i) => (
                                        <div
                                          key={i}
                                          onMouseEnter={() =>
                                            setHoveredHazMonth(i)
                                          }
                                          onMouseLeave={() =>
                                            setHoveredHazMonth(null)
                                          }
                                          className="h-full flex-1 cursor-pointer"
                                        />
                                      ))}
                                  </div>
                                </div>

                                <div className="pl-20 pr-4 flex justify-between items-center text-[9px] font-mono text-slate-400 border-t border-white/5 pt-1">
                                  {attritionSim &&
                                    attritionSim.forecast.map((f, i) => (
                                      <span
                                        key={i}
                                        className={`px-0.5 ${hoveredHazMonth === i ? "text-cyan-300 font-bold" : ""}`}
                                      >
                                        M{i + 1}
                                      </span>
                                    ))}
                                </div>

                                {hoveredHazMonth !== null && attritionSim && (
                                  <div className="absolute top-3 right-3 z-20 rounded-xl border border-cyan-400/30 bg-slate-950/95 p-3 shadow-2xl backdrop-blur-md text-[10px] space-y-1 w-52">
                                    <div className="font-bold text-cyan-300">
                                      Month{" "}
                                      {
                                        attritionSim.forecast[hoveredHazMonth]
                                          .month
                                      }{" "}
                                      · Tenure{" "}
                                      {
                                        attritionSim.forecast[hoveredHazMonth]
                                          .projected_tenure
                                      }{" "}
                                      Mo
                                    </div>
                                    <div className="text-slate-300 flex justify-between">
                                      <span>Monthly hazard</span>
                                      <strong className="text-white font-mono">
                                        {(
                                          attritionSim.forecast[hoveredHazMonth]
                                            .hazard * 100
                                        ).toFixed(3)}
                                        %
                                      </strong>
                                    </div>
                                    <div className="text-slate-300 flex justify-between">
                                      <span>Cumulative H(t)</span>
                                      <strong className="text-amber-300 font-mono">
                                        {attritionSim.forecast[
                                          hoveredHazMonth
                                        ].cumulative_hazard.toFixed(3)}
                                      </strong>
                                    </div>
                                    <div className="text-slate-300 flex justify-between">
                                      <span>Expected attrition</span>
                                      <strong className="text-rose-300 font-mono">
                                        {(
                                          attritionSim.forecast[hoveredHazMonth]
                                            .attrition_probability * 100
                                        ).toFixed(1)}
                                        %
                                      </strong>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Interactive Parameters Sandbox */}
                            <div className="rounded-xl border border-white/5 bg-slate-950/60 p-4">
                              <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                                  Profile Scenario Controls (not a forecast)
                                </h4>
                                <div className="flex items-center gap-2">
                                  <span className="text-[8px] font-mono text-slate-500">
                                    fixed formula recalculation
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMoraleSlider(
                                        selectedAttritionEmp.levers.morale ??
                                          0.5,
                                      );
                                      setSalarySlider(0.0);
                                      setWorkloadSlider(
                                        selectedAttritionEmp.levers
                                          .skills_count ?? 0,
                                      );
                                    }}
                                    className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-slate-400 transition hover:border-cyan-300/40 hover:text-cyan-200 cursor-pointer"
                                  >
                                    Reset to recorded
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <div className="flex justify-between text-[9px] text-slate-400 mb-1">
                                    <span>Morale Index</span>
                                    <span className="text-emerald-400">
                                      {(moraleSlider * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                  <input
                                    type="range"
                                    min="0.0"
                                    max="1.0"
                                    step="0.05"
                                    value={moraleSlider}
                                    onChange={(e) =>
                                      setMoraleSlider(Number(e.target.value))
                                    }
                                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                                  />
                                  <div className="mt-1 text-[8px] font-mono text-slate-500">
                                    recorded:{" "}
                                    {(selectedAttritionEmp.levers.morale ??
                                      0.5) * 100}
                                    %
                                    <span
                                      className={
                                        leverDeltas && leverDeltas.morale > 0.01
                                          ? " text-emerald-400"
                                          : leverDeltas &&
                                              leverDeltas.morale < -0.01
                                            ? " text-rose-400"
                                            : ""
                                      }
                                    >
                                      {leverDeltas &&
                                      Math.abs(leverDeltas.morale) >= 0.01
                                        ? `  ${leverDeltas.morale > 0 ? "+" : ""}${(leverDeltas.morale * 100).toFixed(0)}pt`
                                        : " (unchanged)"}
                                    </span>
                                  </div>
                                </div>

                                <div>
                                  <div className="flex justify-between text-[9px] text-slate-400 mb-1">
                                    <span>Salary Increase</span>
                                    <span className="text-indigo-400">
                                      +{(salarySlider * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                  <input
                                    type="range"
                                    min="0.0"
                                    max="0.5"
                                    step="0.05"
                                    value={salarySlider}
                                    onChange={(e) =>
                                      setSalarySlider(Number(e.target.value))
                                    }
                                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                                  />
                                  <div className="mt-1 text-[8px] font-mono text-slate-500">
                                    new base:{" "}
                                    {selectedAttritionEmp.levers.salary
                                      ? `$${Math.round(selectedAttritionEmp.levers.salary * (1 + salarySlider)).toLocaleString()}`
                                      : "no salary record"}
                                  </div>
                                </div>

                                <div>
                                  <div className="flex justify-between text-[9px] text-slate-400 mb-1">
                                    <span>
                                      Assigned Skill Count (not workload)
                                    </span>
                                    <span className="text-amber-400">
                                      {workloadSlider} skills
                                    </span>
                                  </div>
                                  <input
                                    type="range"
                                    min="1"
                                    max="15"
                                    step="1"
                                    value={workloadSlider}
                                    onChange={(e) =>
                                      setWorkloadSlider(Number(e.target.value))
                                    }
                                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                                  />
                                  <div className="mt-1 text-[8px] font-mono text-slate-500">
                                    recorded:{" "}
                                    {selectedAttritionEmp.levers.skills_count ??
                                      0}
                                    <span
                                      className={
                                        leverDeltas && leverDeltas.skills > 0
                                          ? " text-rose-400"
                                          : leverDeltas &&
                                              leverDeltas.skills < 0
                                            ? " text-emerald-400"
                                            : ""
                                      }
                                    >
                                      {leverDeltas && leverDeltas.skills !== 0
                                        ? `  ${leverDeltas.skills > 0 ? "+" : ""}${leverDeltas.skills}`
                                        : ""}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Live net effect chips */}
                              {leverDeltas && (
                                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-white/5 pt-3">
                                  <div className="rounded-lg border border-white/10 bg-slate-950/70 px-2.5 py-2">
                                    <div className="text-[8px] uppercase tracking-widest text-slate-500 font-bold">
                                      12-Mo Attrition
                                    </div>
                                    <div
                                      className={`text-sm font-black font-mono ${leverDeltas.attrDelta > 0.5 ? "text-rose-400" : leverDeltas.attrDelta < -0.5 ? "text-emerald-400" : "text-slate-300"}`}
                                    >
                                      {(attritionSim.attr12 * 100).toFixed(1)}%
                                      <span className="text-[9px] ml-1">
                                        {leverDeltas.attrDelta > 0.5
                                          ? `▲${leverDeltas.attrDelta.toFixed(1)}`
                                          : leverDeltas.attrDelta < -0.5
                                            ? `▼${Math.abs(leverDeltas.attrDelta).toFixed(1)}`
                                            : ""}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="rounded-lg border border-white/10 bg-slate-950/70 px-2.5 py-2">
                                    <div className="text-[8px] uppercase tracking-widest text-slate-500 font-bold">
                                      Hazard Ratio Δ
                                    </div>
                                    <div
                                      className={`text-sm font-black font-mono ${leverDeltas.hrDelta > 0.05 ? "text-rose-400" : leverDeltas.hrDelta < -0.05 ? "text-emerald-400" : "text-slate-300"}`}
                                    >
                                      x{attritionSim.hazardRatio.toFixed(2)}
                                      <span className="text-[9px] ml-1">
                                        {Math.abs(leverDeltas.hrDelta) > 0.02
                                          ? `${leverDeltas.hrDelta > 0 ? "+" : ""}${leverDeltas.hrDelta.toFixed(2)}`
                                          : ""}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="rounded-lg border border-white/10 bg-slate-950/70 px-2.5 py-2">
                                    <div className="text-[8px] uppercase tracking-widest text-slate-500 font-bold">
                                      Median Tenure
                                    </div>
                                    <div className="text-sm font-black font-mono text-indigo-300">
                                      {attritionSim.medianResidualTenure != null
                                        ? `${attritionSim.medianResidualTenure.toFixed(1)} mo`
                                        : "> 12 mo"}
                                    </div>
                                  </div>
                                  <div className="rounded-lg border border-white/10 bg-slate-950/70 px-2.5 py-2">
                                    <div className="text-[8px] uppercase tracking-widest text-slate-500 font-bold">
                                      Simulated Tier
                                    </div>
                                    <span
                                      className="inline-block mt-0.5 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider"
                                      style={{
                                        color: tierColor(riskTierSim),
                                        background: tierBg(riskTierSim),
                                        border: `1px solid ${tierColor(riskTierSim)}44`,
                                      }}
                                    >
                                      {riskTierSim}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right: fixed-formula scenario contributions */}
                          <div className="space-y-4">
                            <div className="rounded-xl border border-white/5 bg-slate-950 p-4">
                              <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1">
                                Simulated Attrition Multiplier
                              </div>
                              <div className="flex items-baseline gap-2">
                                <div className="text-4xl font-black text-rose-400 font-mono">
                                  x
                                  {attritionSim
                                    ? attritionSim.hazardRatio.toFixed(2)
                                    : "—"}
                                </div>
                                {attritionSim && (
                                  <span
                                    className="px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider"
                                    style={{
                                      color: tierColor(riskTierSim),
                                      background: tierBg(riskTierSim),
                                    }}
                                  >
                                    {riskTierSim}
                                  </span>
                                )}
                              </div>
                              <p className="text-[9px] text-slate-400 mt-2 leading-relaxed">
                                Multiplicative hazard against the
                                population-average profile (HR = 1.00). Each
                                covariate contributes an exp(β·Δx) factor; the
                                product is this ratio.
                              </p>

                              {/* Decomposition chips */}
                              {attritionSim && (
                                <div className="mt-3 space-y-1 border-t border-white/5 pt-3">
                                  <div className="flex items-center justify-between text-[9px] font-mono">
                                    <span className="text-slate-500">
                                      population average profile
                                    </span>
                                    <span className="text-slate-300 font-bold">
                                      ×1.00
                                    </span>
                                  </div>
                                  {attritionSim.waterfall.map((w) => (
                                    <div
                                      key={w.factor}
                                      className="flex items-center justify-between text-[9px] font-mono"
                                    >
                                      <span className="text-slate-500 truncate mr-2">
                                        {w.label}
                                      </span>
                                      <span
                                        className={`font-bold ${w.direction === "risky" ? "text-rose-400" : "text-emerald-400"}`}
                                      >
                                        ×{w.impact_ratio.toFixed(2)}
                                      </span>
                                    </div>
                                  ))}
                                  <div className="flex items-center justify-between text-[9px] font-mono border-t border-white/10 pt-1.5">
                                    <span className="text-slate-400 font-bold uppercase tracking-wider">
                                      Net hazard ratio
                                    </span>
                                    <span className="text-rose-300 font-black">
                                      ×{attritionSim.hazardRatio.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">
                                  Fixed Formula Contributions (not SHAP)
                                </div>
                                <span className="text-[8px] font-mono text-slate-600">
                                  live with sandbox
                                </span>
                              </div>

                              {/* Formula contribution waterfall */}
                              {attritionSim && (
                                <div className="rounded-xl border border-white/5 bg-slate-950 p-3">
                                  <div className="text-[8px] font-mono text-slate-500 text-center mb-1.5">
                                    log-hazard scale · center = population
                                    average profile
                                  </div>
                                  <div className="relative">
                                    {/* center reference line */}
                                    <div className="absolute inset-y-0 left-1/2 w-px bg-white/15 z-10" />
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 text-[7px] font-mono text-slate-500 bg-slate-950 px-1 z-10">
                                      HR 1.00
                                    </div>
                                    <div className="space-y-1.5 pt-3">
                                      {attritionSim.waterfall.map((w) => {
                                        const lo = Math.log(0.2);
                                        const hi = Math.log(6.0);
                                        const pct =
                                          ((Math.log(w.impact_ratio) - lo) /
                                            (hi - lo)) *
                                          100;
                                        const width = Math.abs(pct - 50);
                                        const risky = w.direction === "risky";
                                        return (
                                          <div
                                            key={w.factor}
                                            className="relative h-5 flex items-center"
                                          >
                                            <div
                                              className={`h-full rounded-r-md ${risky ? "bg-rose-500/70" : "bg-emerald-500/70"}`}
                                              style={{
                                                width: `${width}%`,
                                                marginLeft: risky
                                                  ? "50%"
                                                  : `${50 - width}%`,
                                              }}
                                            />
                                            <div className="absolute left-2 text-[8px] font-bold text-slate-300 truncate max-w-[45%]">
                                              {w.label}
                                            </div>
                                            <div
                                              className={`absolute right-2 text-[8px] font-black font-mono ${risky ? "text-rose-300" : "text-emerald-300"}`}
                                            >
                                              {w.impact_percentage > 0
                                                ? "+"
                                                : ""}
                                              {w.impact_percentage.toFixed(0)}%
                                            </div>
                                          </div>
                                        );
                                      })}
                                      {/* final HR marker */}
                                      <div className="relative h-5 flex items-center border-t border-white/10 pt-1 mt-1">
                                        <div
                                          className="absolute h-full w-0.5 bg-white rounded-full"
                                          style={{
                                            left: `${((Math.log(attritionSim.hazardRatio) - Math.log(0.2)) / (Math.log(6.0) - Math.log(0.2))) * 100}%`,
                                          }}
                                        />
                                        <div className="text-[8px] font-black text-white font-mono">
                                          ×{attritionSim.hazardRatio.toFixed(2)}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Covariate detail rows */}
                              {attritionSim &&
                                attritionSim.waterfall.map((w) => {
                                  const lv = selectedAttritionEmp.levers;
                                  const valText =
                                    w.factor === "morale"
                                      ? `${(moraleSlider * 100).toFixed(0)}%`
                                      : w.factor === "salary"
                                        ? `×${Math.exp(attritionCovs.salary_log_ratio).toFixed(2)} dept median`
                                        : w.factor === "risk_flag"
                                          ? attritionCovs.risk_flag
                                            ? "triggered"
                                            : "clean"
                                          : w.factor === "skills"
                                            ? `${workloadSlider} skills`
                                            : w.factor === "skill_level"
                                              ? `avg ${lv.skill_level_avg ?? 0}`
                                              : w.factor === "match"
                                                ? `${(attritionCovs.match_score * 100).toFixed(0)}% aligned`
                                                : w.factor === "experience"
                                                  ? `${attritionCovs.experience_years.toFixed(1)} yrs`
                                                  : w.factor === "companies"
                                                    ? `${attritionCovs.companies_count} employers`
                                                    : lv.department;
                                  return (
                                    <div
                                      key={w.factor}
                                      className="rounded-xl border border-white/5 bg-slate-950 p-3 flex flex-col justify-between"
                                    >
                                      <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-[10px] font-semibold text-slate-300 truncate mr-2">
                                          {w.label}
                                        </span>
                                        <span
                                          className={`text-[9px] font-bold shrink-0 ${w.direction === "risky" ? "text-rose-400" : "text-emerald-400"}`}
                                        >
                                          {w.direction === "risky" ? "+" : ""}
                                          {w.impact_percentage.toFixed(0)}% risk
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-[8px] font-mono text-slate-500">
                                          {valText}
                                        </span>
                                        <span className="text-[8px] font-mono text-slate-500">
                                          factor ×{w.impact_ratio.toFixed(2)}
                                        </span>
                                      </div>
                                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative">
                                        <div
                                          className={`h-full rounded-full ${w.direction === "risky" ? "bg-rose-500" : "bg-emerald-500"}`}
                                          style={{
                                            width: `${Math.min(100, Math.abs(w.impact_percentage))}%`,
                                            marginLeft:
                                              w.direction === "risky"
                                                ? "0"
                                                : `${Math.max(0, 50 - Math.min(50, Math.abs(w.impact_percentage) / 2))}%`,
                                          }}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : attritionModel?.status === "cohort_descriptive" ? (
                      <div className="my-2 w-full flex-1 min-h-0 rounded-xl border border-cyan-400/20 bg-slate-950/50 p-4 md:p-5 flex flex-col gap-4 overflow-y-auto overscroll-contain custom-scrollbar">
                        {selectedAttritionEmp && (
                          <div className="rounded-xl border border-indigo-400/25 bg-indigo-500/[0.06] px-4 py-3">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-[9px] font-bold uppercase tracking-widest text-indigo-300">
                                  Selected record — observed facts, not a
                                  forecast
                                </div>
                                <div className="mt-1 truncate text-base font-extrabold text-white">
                                  {selectedAttritionEmp.full_name}
                                </div>
                                <div className="mt-0.5 truncate text-[10px] text-slate-400">
                                  {selectedAttritionEmp.role} ·{" "}
                                  {selectedAttritionEmp.department} ·{" "}
                                  {Number(
                                    selectedAttritionEmp.tenure_months || 0,
                                  ).toFixed(1)}{" "}
                                  months tenure ·{" "}
                                  {selectedAttritionEmp.skills_count ?? 0}{" "}
                                  recorded skills ·{" "}
                                  {selectedAttritionEmp.employment_status ||
                                    "active"}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setSelectedAttritionEmp(null)}
                                className="shrink-0 rounded-lg border border-white/10 px-2 py-1 text-[10px] text-slate-300 hover:border-indigo-400/50 hover:text-white"
                              >
                                Clear selection
                              </button>
                            </div>
                            <div className="mt-2 grid grid-cols-1 gap-2 text-[10px] leading-relaxed sm:grid-cols-3">
                              <div className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2">
                                <div className="text-[9px] uppercase tracking-wider text-slate-500">
                                  Cohort still employed at this tenure
                                </div>
                                <div className="mt-1 font-mono text-lg font-bold text-cyan-300">
                                  {(
                                    Number(
                                      selectedAttritionEmp.cohort_survival_at_tenure ??
                                        1,
                                    ) * 100
                                  ).toFixed(1)}
                                  %
                                </div>
                              </div>
                              <div className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2">
                                <div className="text-[9px] uppercase tracking-wider text-slate-500">
                                  Tenure vs cohort median
                                </div>
                                <div className="mt-1 font-mono text-lg font-bold text-white">
                                  {Number(
                                    selectedAttritionEmp.tenure_months || 0,
                                  ).toFixed(1)}{" "}
                                  <span className="text-[10px] font-normal text-slate-500">
                                    / median{" "}
                                    {Number(
                                      populationStats?.median_tenure_months ||
                                        0,
                                    ).toFixed(1)}{" "}
                                    mo
                                  </span>
                                </div>
                              </div>
                              <div className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2">
                                <div className="text-[9px] uppercase tracking-wider text-slate-500">
                                  Tenure marked on curve
                                </div>
                                <div className="mt-1 text-[11px] text-slate-300">
                                  Amber marker below shows this tenure on the
                                  observed curve.
                                </div>
                              </div>
                            </div>
                            <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                              Context only: these numbers place one observed
                              record against the cohort curve. They do not
                              predict this person&apos;s departure.
                            </p>
                          </div>
                        )}
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-bold text-cyan-200">
                              Observed workforce survival
                            </div>
                            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-300">
                              Kaplan–Meier estimate calculated from uploaded
                              employee employment dates. This describes the
                              observed cohort; it is not an individual risk
                              forecast.
                            </p>
                          </div>
                          <span className="rounded-md border border-cyan-300/20 bg-cyan-300/5 px-2 py-1 text-[9px] font-mono uppercase text-cyan-200">
                            {attritionModel.estimator ||
                              "Kaplan–Meier cohort estimate"}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                          {[
                            [
                              "Included records",
                              attritionModel.eligible_observation_count,
                            ],
                            [
                              "Recorded departures",
                              attritionModel.observed_departure_count,
                            ],
                            [
                              "Active / censored",
                              attritionModel.right_censored_count,
                            ],
                            [
                              "Excluded records",
                              attritionModel.excluded_record_count ??
                                attritionModel.excluded_missing_start_count +
                                  attritionModel.excluded_missing_outcome_or_censor_count +
                                  attritionModel.excluded_invalid_date_order_count,
                            ],
                          ].map(([label, value]) => (
                            <div
                              key={label}
                              className="rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2"
                            >
                              <div className="text-[9px] uppercase tracking-wider text-slate-500">
                                {label}
                              </div>
                              <div className="mt-1 text-lg font-bold tabular-nums text-white">
                                {Number(value || 0).toLocaleString()}
                              </div>
                            </div>
                          ))}
                        </div>

                        {survivalCurve.length > 0 ? (
                          (() => {
                            const maxMonth = Math.max(
                              1,
                              survivalCurve[survivalCurve.length - 1]
                                .tenure_month,
                            );
                            // Fixed viewBox + margin convention: uniform scale,
                            // so axis text stays crisp at any screen size.
                            // Wide 32:15 frame fills the card without dead space.
                            const CW = 640;
                            const CH = 300;
                            const ML = 52;
                            const MR = 14;
                            const MT = 14;
                            const MB = 44;
                            const PW = CW - ML - MR;
                            const PH = CH - MT - MB;
                            const xFor = (month) =>
                              ML + (Math.max(0, month) / maxMonth) * PW;
                            const yFor = (probability) =>
                              MT +
                              (1 - Math.min(1, Math.max(0, probability))) * PH;
                            const tickSteps = [
                              1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000,
                            ];
                            const tickStep =
                              tickSteps.find((s) => maxMonth / s <= 6) || 1000;
                            const xTicks = [];
                            for (
                              let t = 0;
                              t <= maxMonth + 1e-9;
                              t += tickStep
                            ) {
                              xTicks.push(Math.min(t, maxMonth));
                            }
                            if (xTicks[xTicks.length - 1] < maxMonth) {
                              xTicks.push(maxMonth);
                            }
                            // Kaplan–Meier step function from (0, 100%).
                            let stepPath = `M ${ML} ${MT}`;
                            survivalCurve.forEach((point) => {
                              stepPath += ` H ${xFor(point.tenure_month)} V ${yFor(point.survival_probability)}`;
                            });
                            stepPath += ` H ${ML + PW}`;
                            const bandTop = survivalCurve
                              .map(
                                (p) =>
                                  `${xFor(p.tenure_month)},${yFor(p.ci_95_high)}`,
                              )
                              .join(" ");
                            const bandBottom = [...survivalCurve]
                              .reverse()
                              .map(
                                (p) =>
                                  `${xFor(p.tenure_month)},${yFor(p.ci_95_low)}`,
                              )
                              .join(" ");
                            const empTenure =
                              selectedAttritionEmp?.tenure_months != null
                                ? Math.min(
                                    Number(
                                      selectedAttritionEmp.tenure_months,
                                    ) || 0,
                                    maxMonth,
                                  )
                                : null;
                            const hoveredPoint =
                              hoveredSurvMonth != null
                                ? survivalCurve[hoveredSurvMonth]
                                : null;
                            const pickSurvPoint = (clientX, clientY, el) => {
                              const rect = el.getBoundingClientRect();
                              const px = clientX - rect.left;
                              const py = clientY - rect.top;
                              const month =
                                (((px / rect.width) * CW - ML) / PW) * maxMonth;
                              let best = 0;
                              survivalCurve.forEach((p, i) => {
                                if (
                                  Math.abs(p.tenure_month - month) <
                                  Math.abs(
                                    survivalCurve[best].tenure_month - month,
                                  )
                                ) {
                                  best = i;
                                }
                              });
                              setHoveredSurvMonth(best);
                              setSurvHoverPos({ x: px, y: py, w: rect.width });
                            };
                            return (
                              <>
                                {survGraphExpanded && (
                                  <div
                                    aria-hidden="true"
                                    onClick={() => setSurvGraphExpanded(false)}
                                    className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm"
                                  />
                                )}
                                <div
                                  className={`rounded-lg border border-white/10 bg-slate-950 p-3 ${
                                    survGraphExpanded
                                      ? "fixed inset-2 z-[90] flex flex-col overflow-y-auto overscroll-contain md:inset-4"
                                      : "relative"
                                  }`}
                                >
                                  <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] text-slate-400">
                                    <span className="flex items-center gap-1.5">
                                      <i className="h-0.5 w-4 bg-cyan-400" />
                                      Estimated survival
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                      <i className="h-2 w-4 rounded-sm bg-cyan-400/20" />
                                      95% confidence band
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                      <i className="h-2 w-2 rounded-full border-2 border-cyan-300 bg-slate-950" />
                                      Departure event time
                                    </span>
                                    {empTenure != null && (
                                      <span className="flex items-center gap-1.5">
                                        <i className="h-2 w-2 rounded-full bg-amber-400" />
                                        Selected tenure
                                      </span>
                                    )}
                                    <span className="ml-auto flex items-center gap-2">
                                      <span className="hidden sm:inline">
                                        Hover any point for full details
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setSurvGraphExpanded((v) => !v)
                                        }
                                        title={
                                          survGraphExpanded
                                            ? "Back to normal size"
                                            : "Expand graph to full screen"
                                        }
                                        aria-label={
                                          survGraphExpanded
                                            ? "Restore graph to normal size"
                                            : "Expand graph to full screen"
                                        }
                                        className="rounded-lg border border-white/10 bg-white/[0.04] p-1.5 text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-200 cursor-pointer"
                                      >
                                        {survGraphExpanded ? (
                                          <Minimize2 size={13} />
                                        ) : (
                                          <Maximize2 size={13} />
                                        )}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const table = document.getElementById(
                                            "survival-estimate-table",
                                          );
                                          // Scroll only the panel's own
                                          // scroller — never the whole page.
                                          const scroller =
                                            table?.closest(".overflow-y-auto");
                                          if (table && scroller) {
                                            const top =
                                              table.getBoundingClientRect()
                                                .top -
                                              scroller.getBoundingClientRect()
                                                .top +
                                              scroller.scrollTop -
                                              8;
                                            scroller.scrollTo({
                                              top,
                                              behavior: "smooth",
                                            });
                                          }
                                        }}
                                        title="Jump to the estimate table below the graph"
                                        className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-slate-300 transition hover:bg-white/10 hover:text-white cursor-pointer"
                                      >
                                        Table ↓
                                      </button>
                                    </span>
                                  </div>
                                  <div
                                    className="relative aspect-[32/15] w-full cursor-crosshair"
                                    onMouseMove={(e) => {
                                      pickSurvPoint(
                                        e.clientX,
                                        e.clientY,
                                        e.currentTarget,
                                      );
                                    }}
                                    onClick={(e) => {
                                      pickSurvPoint(
                                        e.clientX,
                                        e.clientY,
                                        e.currentTarget,
                                      );
                                    }}
                                    onMouseLeave={() => {
                                      setHoveredSurvMonth(null);
                                      setSurvHoverPos(null);
                                    }}
                                  >
                                    <svg
                                      viewBox={`0 0 ${CW} ${CH}`}
                                      className="h-full w-full"
                                      role="img"
                                      aria-label="Kaplan-Meier observed workforce survival curve with 95 percent confidence band. Hover any point for details."
                                    >
                                      {[
                                        0, 10, 20, 30, 40, 50, 60, 70, 80, 90,
                                        100,
                                      ].map((v) => (
                                        <line
                                          key={v}
                                          x1={ML}
                                          x2={ML + PW}
                                          y1={yFor(v / 100)}
                                          y2={yFor(v / 100)}
                                          stroke={
                                            v % 20 === 0
                                              ? "rgba(255,255,255,.16)"
                                              : "rgba(255,255,255,.06)"
                                          }
                                          strokeWidth="1"
                                        />
                                      ))}
                                      {[0, 20, 40, 60, 80, 100].map((v) => (
                                        <text
                                          key={v}
                                          x={ML - 8}
                                          y={yFor(v / 100) + 4}
                                          textAnchor="end"
                                          fill="#94a3b8"
                                          fontSize="12"
                                          fontFamily="ui-monospace, monospace"
                                        >
                                          {v}%
                                        </text>
                                      ))}
                                      <text
                                        x={14}
                                        y={MT + PH / 2}
                                        textAnchor="middle"
                                        fill="#64748b"
                                        fontSize="12"
                                        transform={`rotate(-90 14 ${MT + PH / 2})`}
                                      >
                                        Survival probability
                                      </text>
                                      {xTicks.map((t) => (
                                        <g key={t}>
                                          <line
                                            x1={xFor(t)}
                                            x2={xFor(t)}
                                            y1={MT + PH}
                                            y2={MT + PH + 5}
                                            stroke="rgba(255,255,255,.25)"
                                            strokeWidth="1"
                                          />
                                          <text
                                            x={xFor(t)}
                                            y={MT + PH + 19}
                                            textAnchor="middle"
                                            fill="#94a3b8"
                                            fontSize="12"
                                            fontFamily="ui-monospace, monospace"
                                          >
                                            {Number(t.toFixed(1))}
                                          </text>
                                        </g>
                                      ))}
                                      <text
                                        x={ML + PW / 2}
                                        y={CH - 6}
                                        textAnchor="middle"
                                        fill="#64748b"
                                        fontSize="12"
                                      >
                                        Observed tenure (months)
                                      </text>
                                      <polygon
                                        points={`${bandTop} ${bandBottom}`}
                                        fill="rgba(34,211,238,.10)"
                                      />
                                      <path
                                        fill="none"
                                        stroke="#22d3ee"
                                        strokeWidth="2.5"
                                        strokeLinejoin="round"
                                        d={stepPath}
                                      />
                                      {empTenure != null && (
                                        <g pointerEvents="none">
                                          <line
                                            x1={xFor(empTenure)}
                                            x2={xFor(empTenure)}
                                            y1={MT}
                                            y2={MT + PH}
                                            stroke="rgba(251,191,36,.6)"
                                            strokeWidth="1.5"
                                            strokeDasharray="5 4"
                                          />
                                          <circle
                                            cx={xFor(empTenure)}
                                            cy={yFor(
                                              Number(
                                                selectedAttritionEmp.cohort_survival_at_tenure ??
                                                  1,
                                              ),
                                            )}
                                            r="5"
                                            fill="#fbbf24"
                                            stroke="#020617"
                                            strokeWidth="1.5"
                                          />
                                        </g>
                                      )}
                                      <g pointerEvents="none">
                                        {survivalCurve.map((point, index) => (
                                          <g
                                            key={`${point.tenure_month}-${index}`}
                                          >
                                            {point.departures > 0 ? (
                                              <circle
                                                cx={xFor(point.tenure_month)}
                                                cy={yFor(
                                                  point.survival_probability,
                                                )}
                                                r={
                                                  hoveredSurvMonth === index
                                                    ? 6.5
                                                    : 4.5
                                                }
                                                fill={
                                                  hoveredSurvMonth === index
                                                    ? "#22d3ee"
                                                    : "#0b1220"
                                                }
                                                stroke="#22d3ee"
                                                strokeWidth="2"
                                              />
                                            ) : (
                                              <circle
                                                cx={xFor(point.tenure_month)}
                                                cy={yFor(
                                                  point.survival_probability,
                                                )}
                                                r="2.2"
                                                fill="#475569"
                                              />
                                            )}
                                          </g>
                                        ))}
                                      </g>
                                      {hoveredPoint && (
                                        <line
                                          x1={xFor(hoveredPoint.tenure_month)}
                                          x2={xFor(hoveredPoint.tenure_month)}
                                          y1={MT}
                                          y2={MT + PH}
                                          stroke="rgba(255,255,255,.35)"
                                          strokeWidth="1"
                                          strokeDasharray="3 3"
                                          pointerEvents="none"
                                        />
                                      )}
                                    </svg>
                                    {hoveredPoint && survHoverPos && (
                                      <div
                                        aria-hidden="true"
                                        className="pointer-events-none absolute z-20 w-52 rounded-xl border border-cyan-300/25 bg-slate-950/95 p-3 shadow-2xl backdrop-blur-md"
                                        style={(() => {
                                          const frac =
                                            survHoverPos.x /
                                            Math.max(survHoverPos.w || 1, 1);
                                          return {
                                            top: Math.max(
                                              survHoverPos.y - 8,
                                              4,
                                            ),
                                            transform: "translateY(-100%)",
                                            ...(frac <= 0.62
                                              ? { left: survHoverPos.x + 14 }
                                              : {
                                                  right:
                                                    (survHoverPos.w || 0) -
                                                    survHoverPos.x +
                                                    14,
                                                }),
                                          };
                                        })()}
                                      >
                                        <div className="text-[9px] font-bold uppercase tracking-widest text-cyan-300">
                                          {Number(
                                            hoveredPoint.tenure_month,
                                          ).toFixed(1)}{" "}
                                          months tenure
                                        </div>
                                        <dl className="mt-1.5 space-y-1 text-[10px] tabular-nums">
                                          <div className="flex justify-between gap-2">
                                            <dt className="text-slate-500">
                                              Survival
                                            </dt>
                                            <dd className="font-bold text-white">
                                              {(
                                                hoveredPoint.survival_probability *
                                                100
                                              ).toFixed(1)}
                                              %
                                            </dd>
                                          </div>
                                          <div className="flex justify-between gap-2">
                                            <dt className="text-slate-500">
                                              95% CI
                                            </dt>
                                            <dd className="font-mono text-slate-300">
                                              {(
                                                hoveredPoint.ci_95_low * 100
                                              ).toFixed(1)}
                                              –
                                              {(
                                                hoveredPoint.ci_95_high * 100
                                              ).toFixed(1)}
                                              %
                                            </dd>
                                          </div>
                                          <div className="flex justify-between gap-2">
                                            <dt className="text-slate-500">
                                              At risk
                                            </dt>
                                            <dd className="font-mono text-slate-300">
                                              {hoveredPoint.at_risk}
                                            </dd>
                                          </div>
                                          <div className="flex justify-between gap-2">
                                            <dt className="text-slate-500">
                                              Departures
                                            </dt>
                                            <dd className="font-mono text-slate-300">
                                              {hoveredPoint.departures}
                                            </dd>
                                          </div>
                                          <div className="flex justify-between gap-2">
                                            <dt className="text-slate-500">
                                              Censored
                                            </dt>
                                            <dd className="font-mono text-slate-300">
                                              {hoveredPoint.censored}
                                            </dd>
                                          </div>
                                        </dl>
                                        <p className="mt-1.5 border-t border-white/5 pt-1.5 text-[9px] leading-relaxed text-slate-500">
                                          Observed cohort evidence — not a
                                          forecast.
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div
                                  id="survival-estimate-table"
                                  className="min-h-0 scroll-mt-2 overflow-hidden rounded-lg border border-white/10"
                                >
                                  <div className="border-b border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                                    Survival estimate by observed event time (
                                    {survivalCurve.length} rows)
                                  </div>
                                  <div className="max-h-64 overflow-auto custom-scrollbar">
                                    <table className="w-full text-left text-[10px] tabular-nums">
                                      <thead className="sticky top-0 bg-slate-900 text-[9px] uppercase tracking-wider text-slate-500">
                                        <tr>
                                          <th className="px-3 py-2">
                                            Tenure (mo)
                                          </th>
                                          <th className="px-3 py-2">
                                            Survival
                                          </th>
                                          <th className="px-3 py-2">95% CI</th>
                                          <th className="px-3 py-2">At risk</th>
                                          <th className="px-3 py-2">
                                            Departures
                                          </th>
                                          <th className="px-3 py-2">
                                            Censored
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-white/5 text-slate-300">
                                        {survivalCurve.map((point, index) => (
                                          <tr
                                            key={`${point.tenure_month}-${index}`}
                                          >
                                            <td className="px-3 py-2">
                                              {Number(
                                                point.tenure_month,
                                              ).toFixed(1)}
                                            </td>
                                            <td className="px-3 py-2 text-cyan-200">
                                              {(
                                                point.survival_probability * 100
                                              ).toFixed(1)}
                                              %
                                            </td>
                                            <td className="px-3 py-2">
                                              {(point.ci_95_low * 100).toFixed(
                                                1,
                                              )}
                                              –
                                              {(point.ci_95_high * 100).toFixed(
                                                1,
                                              )}
                                              %
                                            </td>
                                            <td className="px-3 py-2">
                                              {point.at_risk}
                                            </td>
                                            <td className="px-3 py-2">
                                              {point.departures}
                                            </td>
                                            <td className="px-3 py-2">
                                              {point.censored}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </>
                            );
                          })()
                        ) : (
                          <div className="rounded-lg border border-amber-400/20 bg-amber-400/[0.04] p-4 text-xs text-amber-100">
                            The API reports a cohort model but returned no
                            survival time points. Check the uploaded employment
                            outcome dates.
                          </div>
                        )}
                        <div className="text-[10px] leading-4 text-slate-500">
                          Source: {attritionModel.date_based_observation_count}{" "}
                          date-based records;{" "}
                          {attritionModel.duration_based_observation_count}{" "}
                          duration-based records.{" "}
                          {attritionModel.excluded_invalid_date_order_count}{" "}
                          records were excluded because the recorded end/censor
                          date did not follow the start date. Intervals are
                          descriptive uncertainty bounds, not a validation
                          score.
                        </div>
                      </div>
                    ) : (
                      <div className="mx-auto my-auto max-w-xl rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-6 text-center">
                        <div className="text-sm font-bold text-amber-200">
                          {attritionError
                            ? "Attrition data could not be loaded"
                            : "Validated survival forecasts are not available"}
                        </div>
                        <p className="mt-2 text-xs leading-5 text-slate-300">
                          {attritionError ||
                            attritionModel?.message ||
                            "Observed employment durations and departure outcomes are required before this system can estimate attrition risk."}
                        </p>
                        {attritionError && (
                          <button
                            type="button"
                            onClick={fetchAttrition}
                            className="mt-4 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white hover:border-indigo-400/50"
                          >
                            Retry
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                }
              />
            </motion.div>
          )}

          {/* TAB 4: ORGANIZATIONAL NETWORK ANALYSIS (ONA) */}
          {activeSubTab === "ona" && (
            <motion.div
              key="ona"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="min-h-0 min-w-0 flex-1 h-full w-full flex flex-col"
            >
              <div className="mb-3 grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
                {[
                  ["Participants shown", onaData?.nodes?.length || 0],
                  ["Observed ties", onaData?.links?.length || 0],
                  [
                    "Events represented",
                    onaData?.metrics?.represented_record_count || 0,
                  ],
                  [
                    "Cross-department",
                    `${onaCrossDeptLinks} · ${onaData?.links?.length ? Math.round((onaCrossDeptLinks / onaData.links.length) * 100) : 0}%`,
                  ],
                  [
                    "Employees without events",
                    onaEmployeesWithoutEvents ?? "—",
                  ],
                  [
                    "Evidence dates",
                    onaDateRange.length
                      ? `${onaDateRange[0]} – ${onaDateRange[onaDateRange.length - 1]}`
                      : "No dated events",
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="min-w-0 rounded-xl border border-white/10 bg-slate-950/55 px-3 py-2.5"
                  >
                    <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">
                      {label}
                    </div>
                    <div
                      className="mt-1 truncate text-base font-semibold text-white"
                      title={String(value)}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>
              <MobileSplitPane
                activePane={mobileActivePane}
                setActivePane={setMobileActivePane}
                leftTitle="2D Collaboration Map"
                rightTitle="Network Intelligence"
                leftIcon={<Share2 size={14} />}
                rightIcon={<Activity size={14} />}
                leftWidthClass="lg:w-[60%] xl:w-[63%]"
                leftContent={
                  <div className="premium-card p-4 md:p-5 border border-white/5 bg-slate-950/30 backdrop-blur-xl flex flex-col justify-between relative h-full max-h-full min-h-0 overflow-y-auto overscroll-contain custom-scrollbar">
                    <div className="flex-1 flex flex-col min-h-0">
                      {/* Top Canvas Bar with Filter & Search Controls */}
                      <div className="flex flex-wrap items-center justify-between border-b border-white/5 pb-3 mb-3 gap-2 shrink-0">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">
                              Observed Collaboration Network
                            </h3>
                            <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-[8.5px] font-mono font-bold text-cyan-300">
                              {onaData?.nodes?.length || 0} People ·{" "}
                              {onaData?.links?.length || 0} Ties
                            </span>
                          </div>
                          <p className="mt-0.5 text-[9.5px] text-slate-400">
                            Employee event network ·{" "}
                            {onaData?.metrics?.window_days || onaWindowDays}-day
                            window · candidates excluded
                          </p>
                          <p className="mt-0.5 text-[8.5px] text-slate-500">
                            {onaData?.metrics?.employee_scope_truncated
                              ? `${onaData.metrics.participant_count_before_display_limit} event participants found; showing the ${onaData.metrics.employee_limit || 500} most active. ${onaData.metrics.records_excluded_by_display_limit || 0} event records to people outside this map are excluded. Centrality is relative to this sample.`
                              : onaDateRange.length
                                ? `${onaData?.metrics?.represented_record_count || 0} represented records · Evidence dates: ${onaDateRange[0]} – ${onaDateRange[onaDateRange.length - 1]}`
                                : "No qualifying collaboration events in this window"}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <div className="relative">
                            <Search
                              size={11}
                              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                            />
                            <input
                              aria-label="Search network participants"
                              type="text"
                              value={onaSearchQuery}
                              onChange={(e) =>
                                setOnaSearchQuery(e.target.value)
                              }
                              placeholder="Search people, roles, teams…"
                              className="rounded-lg border border-white/10 bg-slate-950/80 pl-7 pr-2 py-1 text-[9.5px] text-white placeholder:text-slate-600 outline-none focus:border-cyan-400/50 w-36 sm:w-44"
                            />
                          </div>

                          {/* Department Filter */}
                          <select
                            aria-label="Filter by department"
                            value={onaDeptFilter}
                            onChange={(e) => setOnaDeptFilter(e.target.value)}
                            className="rounded-lg border border-white/10 bg-slate-950/80 px-2 py-1 text-[9.5px] font-bold text-slate-300 outline-none focus:border-cyan-400/50 cursor-pointer"
                          >
                            <option value="all">All Departments</option>
                            {availableDepts.map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </select>
                          <select
                            aria-label="Collaboration event date window"
                            value={onaWindowDays}
                            onChange={(event) => {
                              const days = Number(event.target.value);
                              setOnaWindowDays(days);
                              fetchOna(days);
                            }}
                            className="rounded-lg border border-white/10 bg-slate-950/80 px-2 py-1 text-[9.5px] font-bold text-slate-300 outline-none focus:border-cyan-400/50 cursor-pointer"
                          >
                            {[30, 90, 180, 365].map((days) => (
                              <option key={days} value={days}>
                                Last {days} days
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={!selectedOnaNode}
                            onClick={() => {
                              const enteringFocus = !onaFocusSelected;
                              if (enteringFocus) {
                                setOnaDeptFilter("all");
                                setOnaSearchQuery("");
                              }
                              setOnaFocusSelected(enteringFocus);
                            }}
                            className="rounded-lg border border-cyan-300/20 bg-cyan-300/5 px-2 py-1 text-[9.5px] font-semibold text-cyan-100 hover:bg-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {onaFocusSelected
                              ? "Show full network"
                              : "Focus connections"}
                          </button>
                        </div>
                      </div>

                      {/* 2D observed collaboration map */}
                      <div className="relative flex-1 min-h-[280px] lg:min-h-0 w-full touch-none border border-white/10 bg-[#020408] backdrop-blur-2xl rounded-2xl overflow-hidden flex items-center justify-center select-none shadow-inner">
                        {(() => {
                          const q = onaSearchQuery.trim().toLowerCase();
                          const visibleCount = (onaData?.nodes || []).filter(
                            (n) =>
                              (onaDeptFilter === "all" ||
                                n.department === onaDeptFilter) &&
                              (!q ||
                                (n.name || "").toLowerCase().includes(q) ||
                                (n.role || "").toLowerCase().includes(q)),
                          ).length;
                          if (
                            (onaData?.nodes?.length || 0) > 0 &&
                            visibleCount === 0
                          ) {
                            return (
                              <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-[#020408]/95 p-6 text-center">
                                <div className="text-xs font-bold text-amber-200">
                                  Filters hide all {onaData.nodes.length} nodes
                                </div>
                                <p className="max-w-xs text-[11px] leading-relaxed text-slate-400">
                                  The department filter or search matches
                                  nobody, so hover and click find nothing. Clear
                                  them to restore the graph.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOnaDeptFilter("all");
                                    setOnaSearchQuery("");
                                    setOnaFocusSelected(false);
                                  }}
                                  className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-1.5 text-[11px] font-semibold text-cyan-200 transition hover:bg-cyan-300/20 cursor-pointer"
                                >
                                  Clear filters
                                </button>
                              </div>
                            );
                          }
                          return null;
                        })()}
                        {onaLoading ? (
                          <div className="text-slate-400 text-xs flex items-center gap-2">
                            <RefreshCw
                              size={14}
                              className="animate-spin text-cyan-400"
                            />
                            Calculating centrality from uploaded collaboration
                            events...
                          </div>
                        ) : onaError ? (
                          <div className="flex max-w-xl flex-col items-center gap-3 px-6 text-center text-xs text-rose-300 break-words">
                            <span>{onaError}</span>
                            <button
                              type="button"
                              onClick={() => fetchOna(onaWindowDays)}
                              className="rounded-lg border border-rose-300/25 px-3 py-1.5 font-semibold text-rose-100 hover:bg-rose-300/10"
                            >
                              Retry
                            </button>
                          </div>
                        ) : !onaData?.nodes?.length ? (
                          <div className="text-slate-400 text-xs flex flex-col items-center gap-2 px-6 text-center">
                            <Users size={16} className="text-cyan-400/60" />
                            No qualifying uploaded collaboration events were
                            found for this tenant and time window. Employee
                            profiles alone are not treated as evidence of
                            collaboration.
                          </div>
                        ) : (
                          <OnaNetworkMap2D
                            nodes={onaData.nodes}
                            links={onaData.links}
                            deptFilter={onaDeptFilter}
                            searchQuery={onaSearchQuery}
                            selectedId={selectedOnaNode?.id ?? null}
                            focusId={
                              onaFocusSelected
                                ? (selectedOnaNode?.id ?? null)
                                : null
                            }
                            onSelect={(node) => {
                              setSelectedOnaNode(node);
                              setMobileActivePane("right");
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                }
                rightContent={
                  <div className="premium-card p-4 md:p-5 border border-white/5 bg-slate-950/40 backdrop-blur-xl flex flex-col justify-between h-full max-h-full min-h-0 w-full overflow-y-auto overscroll-contain custom-scrollbar space-y-4">
                    {selectedOnaNode ? (
                      <>
                        {/* Employee Node Header */}
                        <div className="border-b border-white/5 pb-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500">
                              Observed Network Profile
                            </span>
                            <span
                              className="px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider"
                              style={{
                                color:
                                  selectedOnaNode.department_color || "#38bdf8",
                                background: `${selectedOnaNode.department_color || "#38bdf8"}18`,
                                border: `1px solid ${selectedOnaNode.department_color || "#38bdf8"}44`,
                              }}
                            >
                              {selectedOnaNode.department}
                            </span>
                          </div>
                          <h3 className="text-lg font-extrabold text-white mt-1">
                            {selectedOnaNode.name}
                          </h3>
                          <div className="text-[9.5px] text-slate-400 uppercase mt-0.5 tracking-wider">
                            {selectedOnaNode.role} ·{" "}
                            {selectedOnaNode.degree || 0} Observed Ties
                          </div>
                        </div>

                        {/* 4-Vector Centrality Metrics */}
                        <div className="grid grid-cols-2 gap-2.5">
                          {/* PageRank Centrality */}
                          <div className="rounded-xl border border-white/5 bg-slate-950/80 p-3">
                            <div className="text-[8.5px] uppercase tracking-widest text-slate-500 font-bold">
                              PageRank (Relative to Sample)
                            </div>
                            <div className="text-2xl font-black font-mono text-amber-300 mt-0.5">
                              {(
                                (selectedOnaNode.influence_pagerank || 0) * 100
                              ).toFixed(0)}
                              %
                            </div>
                            <div className="w-full h-1 rounded-full bg-white/5 mt-2 overflow-hidden">
                              <div
                                className="h-full bg-amber-400 rounded-full"
                                style={{
                                  width: `${(selectedOnaNode.influence_pagerank || 0) * 100}%`,
                                }}
                              />
                            </div>
                          </div>

                          {/* Betweenness Centrality */}
                          <div className="rounded-xl border border-white/5 bg-slate-950/80 p-3">
                            <div className="text-[8.5px] uppercase tracking-widest text-slate-500 font-bold">
                              Betweenness (Relative to Sample)
                            </div>
                            <div className="text-2xl font-black font-mono text-cyan-300 mt-0.5">
                              {(
                                (selectedOnaNode.bridge_betweenness || 0) * 100
                              ).toFixed(0)}
                              %
                            </div>
                            <div className="w-full h-1 rounded-full bg-white/5 mt-2 overflow-hidden">
                              <div
                                className="h-full bg-cyan-400 rounded-full"
                                style={{
                                  width: `${(selectedOnaNode.bridge_betweenness || 0) * 100}%`,
                                }}
                              />
                            </div>
                          </div>

                          {/* Closeness Centrality */}
                          <div className="rounded-xl border border-white/5 bg-slate-950/80 p-3">
                            <div className="text-[8.5px] uppercase tracking-widest text-slate-500 font-bold">
                              Closeness (Relative to Sample)
                            </div>
                            <div className="text-2xl font-black font-mono text-indigo-300 mt-0.5">
                              {(
                                (selectedOnaNode.closeness_centrality || 0) *
                                100
                              ).toFixed(0)}
                              %
                            </div>
                            <div className="w-full h-1 rounded-full bg-white/5 mt-2 overflow-hidden">
                              <div
                                className="h-full bg-indigo-400 rounded-full"
                                style={{
                                  width: `${(selectedOnaNode.closeness_centrality || 0) * 100}%`,
                                }}
                              />
                            </div>
                          </div>

                          {/* Krackhardt E-I Silo Index */}
                          <div className="rounded-xl border border-white/5 bg-slate-950/80 p-3">
                            <div className="text-[8.5px] uppercase tracking-widest text-slate-500 font-bold">
                              E-I Silo Index
                            </div>
                            <div
                              className={`text-2xl font-black font-mono mt-0.5 ${
                                selectedOnaNode.ei_silo_index == null
                                  ? "text-slate-500"
                                  : selectedOnaNode.ei_silo_index > 0
                                    ? "text-emerald-300"
                                    : "text-rose-400"
                              }`}
                            >
                              {selectedOnaNode.ei_silo_index == null
                                ? "—"
                                : selectedOnaNode.ei_silo_index > 0
                                  ? `+${selectedOnaNode.ei_silo_index.toFixed(2)}`
                                  : selectedOnaNode.ei_silo_index.toFixed(2)}
                            </div>
                            <div className="text-[8px] text-slate-500 mt-1 uppercase truncate">
                              {selectedOnaNode.ei_silo_index == null
                                ? "No observed ties"
                                : "Observed tie department mix"}
                            </div>
                          </div>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3.5 space-y-3">
                          <div>
                            <div className="text-[9px] font-bold uppercase tracking-widest text-white">
                              Network evidence summary
                            </div>
                            <div className="mt-1 text-[9px] leading-relaxed text-slate-400">
                              {onaData?.metrics?.component_count || 0} connected
                              components · largest contains{" "}
                              {onaData?.metrics?.largest_component_size || 0}{" "}
                              people · average{" "}
                              {Number(
                                onaData?.metrics?.average_degree || 0,
                              ).toFixed(1)}{" "}
                              ties per person · density{" "}
                              {(
                                Number(onaData?.metrics?.graph_density || 0) *
                                100
                              ).toFixed(2)}
                              %.
                            </div>
                          </div>
                          <div>
                            <div className="mb-1.5 text-[8px] font-bold uppercase tracking-widest text-slate-500">
                              Recorded event types · current window
                            </div>
                            {onaEventTypeEntries.length ? (
                              <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                                {onaEventTypeEntries.map(([type, count]) => (
                                  <div
                                    key={type}
                                    className="grid grid-cols-[minmax(0,1fr)_2fr_auto] items-center gap-2 text-[9px]"
                                  >
                                    <span
                                      className="truncate text-slate-300"
                                      title={type}
                                    >
                                      {type}
                                    </span>
                                    <span className="h-1.5 overflow-hidden rounded-full bg-white/10">
                                      <span
                                        className="block h-full rounded-full bg-cyan-400"
                                        style={{
                                          width: `${(Number(count) / maxOnaEventTypeCount) * 100}%`,
                                        }}
                                      />
                                    </span>
                                    <span className="font-mono text-slate-400">
                                      {count}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-[9px] text-slate-500">
                                No event type evidence for this window.
                              </div>
                            )}
                          </div>
                          <p className="border-t border-white/5 pt-2 text-[8px] leading-relaxed text-slate-500">
                            These measures describe imported, observed
                            collaboration records in the selected window. They
                            are not performance, potential, or employee-value
                            ratings. No visible tie means no qualifying in-scope
                            record was available for this map.
                          </p>
                        </div>

                        {/* Direct observed collaborators for the selected person */}
                        <div className="rounded-xl border border-white/5 bg-slate-950/70 p-3.5 space-y-2">
                          <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                            <span className="text-[9px] uppercase tracking-widest font-bold text-cyan-300">
                              Recorded Collaborators (
                              {selectedNodeNeighbors.length})
                            </span>
                            <span className="text-[8px] text-slate-500 font-mono">
                              Imported Events
                            </span>
                          </div>
                          {selectedNodeNeighbors.length === 0 ? (
                            <div className="text-[10px] text-slate-500 py-2 text-center">
                              No qualifying in-scope recorded ties.
                            </div>
                          ) : (
                            <div className="space-y-1.5 max-h-[45vh] overflow-y-auto custom-scrollbar pr-1">
                              {selectedNodeNeighbors.map(
                                ({
                                  node,
                                  weight,
                                  channel,
                                  isCross,
                                  eventTypes,
                                  firstOccurredAt,
                                  lastOccurredAt,
                                }) => (
                                  <button
                                    key={node.id}
                                    onClick={() => setSelectedOnaNode(node)}
                                    className="w-full flex items-center justify-between p-1.5 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] text-left transition-colors cursor-pointer"
                                  >
                                    <div className="min-w-0 pr-2">
                                      <div className="text-[10px] font-bold text-white truncate">
                                        {node.name}
                                      </div>
                                      <div className="text-[8px] text-slate-400 truncate">
                                        {node.role} · {node.department}
                                      </div>
                                      <div className="mt-0.5 text-[8px] text-slate-500">
                                        {(eventTypes || []).length
                                          ? eventTypes
                                              .map(
                                                ({ type, count }) =>
                                                  `${type}: ${count}`,
                                              )
                                              .join(" · ")
                                          : channel || "Imported collaboration"}
                                      </div>
                                      <div className="mt-0.5 text-[8px] text-slate-500">
                                        {formatOnaDate(firstOccurredAt)} –{" "}
                                        {formatOnaDate(lastOccurredAt)}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {isCross && (
                                        <span className="px-1 py-0.5 rounded bg-purple-500/20 text-[7.5px] font-bold text-purple-300 uppercase">
                                          Cross-Dept
                                        </span>
                                      )}
                                      <span className="text-[9.5px] font-mono font-bold text-cyan-300">
                                        {weight}{" "}
                                        {weight === 1 ? "event" : "events"}
                                      </span>
                                    </div>
                                  </button>
                                ),
                              )}
                            </div>
                          )}
                        </div>

                        {/* Top Key Influencers & Cross-Silo Brokers */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {/* Influencers */}
                          <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3 space-y-1.5">
                            <span className="text-[8.5px] uppercase tracking-widest font-bold text-amber-300 block border-b border-white/5 pb-1">
                              Highest PageRank (Within Shown Sample)
                            </span>
                            {topInfluencers.slice(0, 3).map((node) => (
                              <button
                                key={node.id}
                                onClick={() => setSelectedOnaNode(node)}
                                className="w-full flex items-center justify-between text-left text-slate-300 hover:text-white py-0.5 cursor-pointer"
                              >
                                <span className="text-[9.5px] truncate font-medium">
                                  {node.name}
                                </span>
                                <span className="text-[9px] font-mono text-amber-300 font-bold shrink-0">
                                  {(
                                    (node.influence_pagerank || 0) * 100
                                  ).toFixed(0)}
                                  %
                                </span>
                              </button>
                            ))}
                          </div>

                          {/* Bridge Brokers */}
                          <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3 space-y-1.5">
                            <span className="text-[8.5px] uppercase tracking-widest font-bold text-cyan-300 block border-b border-white/5 pb-1">
                              Highest Betweenness (Within Shown Sample)
                            </span>
                            {topBridgeBrokers.slice(0, 3).map((node) => (
                              <button
                                key={node.id}
                                onClick={() => setSelectedOnaNode(node)}
                                className="w-full flex items-center justify-between text-left text-slate-300 hover:text-white py-0.5 cursor-pointer"
                              >
                                <span className="text-[9.5px] truncate font-medium">
                                  {node.name}
                                </span>
                                <span className="text-[9px] font-mono text-cyan-300 font-bold shrink-0">
                                  {(
                                    (node.bridge_betweenness || 0) * 100
                                  ).toFixed(0)}
                                  %
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Network Topology Summary Footer */}
                        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[9px] text-slate-500 font-mono">
                          <span>
                            Density:{" "}
                            {(onaData?.metrics?.graph_density ?? 0).toFixed(3)}{" "}
                            · Cross-Dept:{" "}
                            {(
                              (onaData?.metrics?.cross_dept_ratio ?? 0) * 100
                            ).toFixed(0)}
                            %
                          </span>
                          <span>
                            {onaData?.metrics?.represented_record_count || 0}{" "}
                            represented records
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="text-slate-400 text-xs py-16 text-center">
                        Select a collaboration node on the graph to analyze
                      </div>
                    )}
                  </div>
                }
              />
            </motion.div>
          )}

          {/* TAB 5: MARKOV CAREER PROGRESSION */}
          {activeSubTab === "career-path" && (
            <motion.div
              key="career-path"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="min-h-0 min-w-0 flex-1 h-full w-full flex flex-col"
            >
              <MobileSplitPane
                activePane={mobileActivePane}
                setActivePane={setMobileActivePane}
                leftTitle="Employee Profile"
                rightTitle="Recorded Role Changes"
                leftIcon={<Users size={14} />}
                rightIcon={<Sparkles size={14} />}
                leftWidthClass="lg:w-[300px] xl:w-[320px]"
                leftContent={
                  <div className="premium-card p-4 md:p-5 border border-white/5 bg-slate-950/40 backdrop-blur-md flex flex-col justify-between h-full max-h-full min-h-0 overflow-y-auto overscroll-contain custom-scrollbar">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300 mb-4 border-b border-white/5 pb-2">
                        Active Career Tracker
                      </h3>

                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1.5 block">
                            Select Employee Profile
                          </label>
                          <PremiumSelect
                            value={selectedCareerEmpId}
                            onChange={(e) => {
                              setSelectedCareerEmpId(e.target.value);
                              loadCareerPath(e.target.value);
                              setMobileActivePane("right");
                            }}
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                          >
                            {careerEmployees.map((e) => (
                              <option key={e.id} value={e.id}>
                                {e.full_name}
                              </option>
                            ))}
                          </PremiumSelect>
                        </div>

                        {careerEmployeeScopeTruncated && (
                          <p className="mt-2 text-[9px] text-amber-300">
                            Employee selector is capped at 10,000 tenant
                            profiles.
                          </p>
                        )}
                        {careerError && (
                          <p className="mt-2 text-[9px] text-rose-300">
                            {careerError}
                          </p>
                        )}

                        {careerPathData && (
                          <div className="rounded-xl border border-white/5 bg-slate-950 p-4">
                            <div className="text-[9px] uppercase tracking-widest text-slate-500 mb-1">
                              Current Recorded Role
                            </div>
                            <div className="text-sm font-black text-white">
                              {careerPathData.current_role}
                            </div>
                            <div className="text-[9px] text-indigo-400 uppercase mt-0.5">
                              Start state for observed transition matrix
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                }
                rightContent={
                  <div className="premium-card p-4 md:p-6 border border-white/5 bg-slate-950/20 min-h-0 h-full max-h-full overflow-y-auto overscroll-contain custom-scrollbar">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-6">
                      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
                        Observed Role Transition Evidence
                      </h3>
                      <span className="text-[10px] text-slate-500">
                        {careerPathData?.career_history_provenance ===
                        "synthetic_demo"
                          ? "Synthetic demo data · workflow sample"
                          : careerPathData?.career_history_provenance ===
                              "mixed_uploaded_and_synthetic_demo"
                            ? "Mixed uploaded and synthetic demo data"
                            : careerPathData?.model_status ===
                                "exploratory_observed_transitions"
                              ? "Observed sample · not a validated forecast"
                              : "Empirical history required"}
                      </span>
                    </div>

                    {careerLoading ? (
                      <div className="text-xs text-slate-500 text-center py-20">
                        Loading tenant role history and calculating observed
                        transitions…
                      </div>
                    ) : careerPathData ? (
                      <div className="space-y-5">
                        <div className="rounded-lg border border-indigo-400/20 bg-indigo-950/20 p-4 text-xs leading-relaxed text-slate-300">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-md border border-indigo-300/20 bg-indigo-400/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-200">
                              Cohort evidence · exploratory
                            </span>
                            <span className="text-[11px] text-slate-400">
                              Transition shares describe recorded histories for
                              this role; they are not an individual career
                              forecast.
                            </span>
                          </div>
                          <div>
                            {careerPathData.message ||
                              `Observed matrix: ${careerPathData.observed_transition_count} role changes across ${careerPathData.history_employee_count} people with dated role histories. Each step means the next recorded role change; no time-to-promotion estimate is available.`}
                          </div>
                          {careerPathData.career_history_provenance ===
                            "synthetic_demo" && (
                            <div className="mt-2 text-amber-300">
                              These role histories are simulated demo records.
                              Their transition shares demonstrate the workflow,
                              not actual workforce or industry mobility.
                            </div>
                          )}
                          {careerPathData.career_history_provenance ===
                            "mixed_uploaded_and_synthetic_demo" && (
                            <div className="mt-2 text-amber-300">
                              This matrix combines uploaded histories with{" "}
                              {careerPathData.synthetic_demo_role_record_count}{" "}
                              simulated demo role records.
                            </div>
                          )}
                          <div className="mt-2 border-t border-white/5 pt-2 text-[11px] text-slate-400">
                            Uploaded experience records:{" "}
                            {careerPathData.source_record_count} · dated roles:{" "}
                            {careerPathData.dated_role_record_count} · undated
                            roles excluded:{" "}
                            {careerPathData.undated_experience_record_count} ·
                            history:{" "}
                            {careerPathData.history_coverage_start
                              ? new Date(
                                  careerPathData.history_coverage_start,
                                ).toLocaleDateString()
                              : "—"}{" "}
                            to{" "}
                            {careerPathData.history_coverage_end
                              ? new Date(
                                  careerPathData.history_coverage_end,
                                ).toLocaleDateString()
                              : "—"}{" "}
                            · this employee’s observed changes:{" "}
                            {
                              careerPathData.current_employee_observed_transitions
                            }
                          </div>
                          {careerPathData.records_without_idempotency_key >
                            0 && (
                            <div className="mt-1 text-amber-300">
                              {careerPathData.records_without_idempotency_key}{" "}
                              source records lacked idempotency keys; exact
                              replay deduplication is not guaranteed.
                            </div>
                          )}
                        </div>

                        {careerPathData.model_status ===
                        "exploratory_observed_transitions" ? (
                          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                            {careerPathData.career_progression_markov.map(
                              (step, idx) => (
                                <section
                                  key={idx}
                                  aria-labelledby={`career-step-${step.step_number}`}
                                  className="min-w-0 rounded-xl border border-white/10 bg-slate-950/60 p-4"
                                >
                                  <div className="mb-4 min-h-12 border-b border-white/10 pb-3">
                                    <h4
                                      id={`career-step-${step.step_number}`}
                                      className="text-sm font-semibold leading-snug text-indigo-200"
                                    >
                                      {step.projected_time_horizon}
                                    </h4>
                                    <div className="mt-1 text-[11px] text-slate-400">
                                      {step.modeled_probability_mass > 0
                                        ? `${(step.modeled_probability_mass * 100).toFixed(1)}% of path mass modeled`
                                        : "No later transitions in the observed histories"}
                                      <span className="px-1.5 text-slate-600">
                                        ·
                                      </span>
                                      {"Unmodeled "}
                                      {(
                                        step.unmodeled_probability_mass * 100
                                      ).toFixed(1)}
                                      %
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 gap-3">
                                    {step.possibilities.length === 0 && (
                                      <div className="rounded-lg border border-dashed border-white/10 px-3 py-5 text-sm leading-relaxed text-slate-400">
                                        No next role can be estimated from the
                                        observed transition histories. The model
                                        stops here rather than extrapolating
                                        beyond its evidence.
                                      </div>
                                    )}
                                    {step.possibilities.map((pos, pIdx) => (
                                      <div
                                        key={pIdx}
                                        className="rounded-lg border border-white/10 bg-slate-900/70 p-3.5"
                                      >
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="min-w-0">
                                            <div className="break-words text-base font-semibold text-white">
                                              {pos.role}
                                            </div>
                                            <div className="mt-1 text-[11px] leading-relaxed text-slate-400">
                                              {step.step_number === 1
                                                ? `${pos.observed_transition_count} of ${pos.observations_from_current_role} observed exits from ${careerPathData.current_role || "this role"}`
                                                : "Share of paths represented by observed role transitions"}
                                            </div>
                                          </div>
                                          <span className="shrink-0 rounded-md border border-cyan-300/20 bg-cyan-400/10 px-2 py-1 text-sm font-bold tabular-nums text-cyan-200">
                                            {(
                                              pos.transition_probability * 100
                                            ).toFixed(1)}
                                            %
                                          </span>
                                        </div>
                                        <div
                                          className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-700/70"
                                          role="img"
                                          aria-label={`${(pos.transition_probability * 100).toFixed(1)} percent observed transition share`}
                                        >
                                          <div
                                            className="h-full rounded-full bg-cyan-300"
                                            style={{
                                              width: `${Math.max(0, Math.min(100, pos.transition_probability * 100))}%`,
                                            }}
                                          />
                                        </div>

                                        {/* Skill gaps */}
                                        {pos.skill_requirements_status ===
                                        "not_configured" ? (
                                          <div className="mt-3 border-t border-white/10 pt-2.5 text-[11px] leading-relaxed text-slate-400">
                                            No configured skill checklist for
                                            this role; gap status is
                                            unavailable.
                                          </div>
                                        ) : pos.skill_gaps.length > 0 ? (
                                          <div className="mt-3 space-y-1.5 border-t border-white/10 pt-2.5">
                                            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                                              Missing from recorded profile ·
                                              configured framework
                                            </div>
                                            {pos.skill_gaps.map((gap, gIdx) => (
                                              <div
                                                key={`${pos.role}-${gap}-${gIdx}`}
                                                className="text-xs text-slate-300 border-b border-white/5 pb-1"
                                              >
                                                {gap}
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="mt-3 border-t border-white/10 pt-2.5 text-[11px] leading-relaxed text-slate-400">
                                            No missing exact skill names in the
                                            configured framework; this framework
                                            is not tenant-validated.
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </section>
                              ),
                            )}
                          </div>
                        ) : (
                          <div className="rounded-lg border border-amber-400/20 bg-amber-950/15 p-4 text-xs text-amber-200">
                            {careerPathData.message ||
                              "No dated uploaded employee role changes are available from this employee’s current role. No probabilities are shown."}
                          </div>
                        )}
                      </div>
                    ) : careerError ? (
                      <div className="text-xs text-rose-300 text-center py-16">
                        {careerError}
                      </div>
                    ) : (
                      <div className="text-slate-400 text-sm py-16 text-center">
                        {careerEmployees.length === 0
                          ? "No employee profiles are available in this tenant."
                          : "Select an employee profile to inspect recorded role-transition history."}
                      </div>
                    )}
                  </div>
                }
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Permanent Explain dock: fixed at the bottom edge on every tab and
            every screen size. One layout — expand/collapse live here. */}
        <div className="shrink-0 min-h-0 max-h-[72%] overflow-y-auto overscroll-contain custom-scrollbar border-t border-cyan-500/15 bg-slate-950/95 backdrop-blur-md">
          <AIExplanationPanel
            key={explainDock.subtab}
            subtab={explainDock.subtab}
            resultKey={explainDock.resultKey}
            context={explainDock.context}
            buttonText={explainDock.buttonText}
            disabled={explainDock.disabled}
          />
        </div>
      </div>
    </div>
  );
};

export default IntelligenceCenterView;
