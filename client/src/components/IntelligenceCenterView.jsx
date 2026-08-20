import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cpu,
  Brain,
  TrendingUp,
  GitBranch,
  Users,
  Zap,
  DollarSign,
  Play,
  Briefcase,
  Search,
  Plus,
  Trash2,
  RefreshCw,
  Maximize2,
  Minimize2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Share2,
  Activity,
} from "lucide-react";
import { UserManualButton } from "./UserManual";
import PremiumSelect from "./PremiumSelect";
import OnaGraph3DCanvas from "./ui/OnaGraph3DCanvas";
import { API_BASE_URL } from "../services/apiBase";
import {
  buildCovariates,
  computeSurvival,
  riskTier,
  tierColor,
  tierBg,
} from "../utils/survivalModel";
import AIExplanationPanel from "./AIExplanationPanel";

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
      <div className="flex-1 flex flex-row items-stretch gap-2 lg:gap-6 min-h-0 lg:h-full w-full relative">
        {/* LEFT PANE */}
        <div
          onClick={handleLeftClick}
          className={`flex flex-col min-h-0 ${leftWidthClass} ${
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

          {activePane !== "left" && (
            <div className="lg:hidden h-full min-h-[380px] rounded-2xl border border-white/10 bg-slate-950/80 p-2 flex flex-col items-center justify-between hover:border-indigo-400/40 transition-all shadow-lg group">
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
          className={`flex flex-col min-h-0 lg:flex-1 ${
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
            <div className="lg:hidden h-full min-h-[380px] rounded-2xl border border-white/10 bg-slate-950/80 p-2 flex flex-col items-center justify-between hover:border-cyan-400/40 transition-all shadow-lg group">
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
];

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
  const response = await fetch(`${API_BASE}/api/v1/intelligence${url}`, config);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "API Call Failed");
  }
  return response.json();
};

const IntelligenceCenterView = () => {
  const [activeSubTab, setActiveSubTab] = useState("skill-match");
  const [graphExpanded, setGraphExpanded] = useState(false);
  const [mobileActivePane, setMobileActivePane] = useState("left");

  // 1. Skill Match State
  const [matchSkillsInput, setMatchSkillsInput] = useState([
    { name: "React", level: 4 },
    { name: "FastAPI", level: 3 },
  ]);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillLevel, setNewSkillLevel] = useState(3);
  const [matchResults, setMatchResults] = useState([]);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [skillMatchStatus, setSkillMatchStatus] = useState("idle");
  const [activeMatchEmployeeId, setActiveMatchEmployeeId] = useState(null);

  // 2. Team Optimize State
  const [teamBudget, setTeamBudget] = useState(300000);
  const [teamSize, setTeamSize] = useState(3);
  const [teamSkillsInput, setTeamSkillsInput] = useState([
    { name: "React", level: 4 },
    { name: "Python", level: 3 },
    { name: "AWS", level: 3 },
  ]);
  const [optimizedTeam, setOptimizedTeam] = useState(null);
  const [optimizingLoading, setOptimizingLoading] = useState(false);

  // Simulated Annealing Visualizer State
  const [, setAnnealingStep] = useState(0);
  const [annealingTemp, setAnnealingTemp] = useState(10.0);
  const [annealingHistory, setAnnealingHistory] = useState([]);
  const [annealingStatus, setAnnealingStatus] = useState("idle"); // idle, running, complete

  // 3. Attrition State
  const [attritionData, setAttritionData] = useState([]);
  const [populationStats, setPopulationStats] = useState(null);
  const [selectedAttritionEmp, setSelectedAttritionEmp] = useState(null);
  const [attritionLoading, setAttritionLoading] = useState(false);
  const [attritionSearch, setAttritionSearch] = useState("");
  const [attritionSort, setAttritionSort] = useState("hazard"); // hazard | name | tenure | percentile
  const [attritionSortDesc, setAttritionSortDesc] = useState(true);

  // Cox Simulator Parameters Sandbox
  const [moraleSlider, setMoraleSlider] = useState(0.8);
  const [salarySlider, setSalarySlider] = useState(0.0); // 0% to 50% increase
  const [workloadSlider, setWorkloadSlider] = useState(3); // skills count
  const [hoveredSurvMonth, setHoveredSurvMonth] = useState(null);
  const [hoveredHazMonth, setHoveredHazMonth] = useState(null);
  const [hoveredAnnealIndex, setHoveredAnnealIndex] = useState(null);

  // Live Cox recomputation — pure function of (employee, levers), so the
  // graph is guaranteed to change when the employee or any slider moves.
  const attritionBaseline = useMemo(() => {
    if (!selectedAttritionEmp || !populationStats) return null;
    return computeSurvival(
      buildCovariates(selectedAttritionEmp.levers),
      populationStats.means,
    );
  }, [selectedAttritionEmp, populationStats]);

  const attritionSim = useMemo(() => {
    if (!selectedAttritionEmp || !populationStats) return null;
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

  // Sandbox covariate vector (for value display in SHAP rows)
  const attritionCovs = useMemo(() => {
    if (!selectedAttritionEmp) return null;
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

  // Registry view: search + sort (never mutates server data)
  const visibleAttrition = useMemo(() => {
    const q = attritionSearch.trim().toLowerCase();
    let list = attritionData;
    if (q) {
      list = attritionData.filter(
        (e) =>
          e.full_name.toLowerCase().includes(q) ||
          (e.role || "").toLowerCase().includes(q) ||
          (e.department || "").toLowerCase().includes(q),
      );
    }
    const sorted = [...list];
    const dir = attritionSortDesc ? -1 : 1;
    sorted.sort((a, b) => {
      switch (attritionSort) {
        case "name":
          return dir * a.full_name.localeCompare(b.full_name);
        case "tenure":
          return dir * (a.tenure_months - b.tenure_months);
        case "percentile":
          return dir * (a.risk_percentile - b.risk_percentile);
        case "hazard":
        default:
          return dir * (a.hazard_ratio - b.hazard_ratio);
      }
    });
    return sorted;
  }, [attritionData, attritionSearch, attritionSort, attritionSortDesc]); // 4. ONA State
  const [onaData, setOnaData] = useState({ nodes: [], links: [], metrics: {} });
  const [onaLoading, setOnaLoading] = useState(false);
  const [selectedOnaNode, setSelectedOnaNode] = useState(null);
  const [onaColorMode, setOnaColorMode] = useState("department"); // "department" | "pagerank" | "betweenness" | "silo"
  const [onaDeptFilter, setOnaDeptFilter] = useState("all");
  const [onaSearchQuery, setOnaSearchQuery] = useState("");
  const [onaCamera, setOnaCamera] = useState({
    yaw: 0.1,
    pitch: -0.32,
    scale: 1.0,
    panX: 0,
    panY: 0,
  });

  const topInfluencers = useMemo(() => {
    if (!onaData?.nodes?.length) return [];
    return [...onaData.nodes]
      .sort((a, b) => (b.influence_pagerank || 0) - (a.influence_pagerank || 0))
      .slice(0, 4);
  }, [onaData]);

  const topBridgeBrokers = useMemo(() => {
    if (!onaData?.nodes?.length) return [];
    return [...onaData.nodes]
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
            weight: l.weight,
            channel: l.channel,
            isCross: l.is_cross_dept,
          });
      } else if (l.target === selectedOnaNode.id) {
        const sourceNode = onaData.nodes.find((n) => n.id === l.source);
        if (sourceNode)
          neighbors.push({
            node: sourceNode,
            weight: l.weight,
            channel: l.channel,
            isCross: l.is_cross_dept,
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

  // 5. Career Path State
  const [careerEmployees, setCareerEmployees] = useState([]);
  const [selectedCareerEmpId, setSelectedCareerEmpId] = useState("");
  const [careerPathData, setCareerPathData] = useState(null);
  const [careerLoading, setCareerLoading] = useState(false);

  // Load basic initial data
  useEffect(() => {
    fetchAttrition();
    fetchOna();
    fetchCareerEmployees();
  }, []);

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
      const data = await apiCall("/attrition-hazard");
      const employees = data.employees || [];
      setAttritionData(employees);
      setPopulationStats(data.population || null);
      if (employees.length > 0) {
        setSelectedAttritionEmp(employees[0]);
      }
      setAttritionLoading(false);
    } catch (err) {
      console.error(err);
      setAttritionLoading(false);
    }
  }

  async function fetchOna() {
    try {
      setOnaLoading(true);
      const data = await apiCall("/ona?limit=120");
      setOnaData(data);
      if (data.nodes && data.nodes.length > 0) {
        setSelectedOnaNode(data.nodes[0]);
      }
      setOnaLoading(false);
    } catch (err) {
      console.error(err);
      setOnaLoading(false);
    }
  }

  const getNodeColor = (node) => {
    if (onaColorMode === "pagerank") {
      const pr = node.influence_pagerank || 0;
      if (pr > 0.75) return "#fbbf24";
      if (pr > 0.45) return "#f59e0b";
      if (pr > 0.25) return "#818cf8";
      return "#6366f1";
    }
    if (onaColorMode === "betweenness") {
      const bc = node.bridge_betweenness || 0;
      if (bc > 0.6) return "#2dd4bf";
      if (bc > 0.3) return "#06b6d4";
      if (bc > 0.15) return "#0284c7";
      return "#475569";
    }
    if (onaColorMode === "silo") {
      const ei = node.ei_silo_index || 0;
      if (ei > 0.3) return "#10b981"; // Strong cross-dept boundary spanner
      if (ei >= -0.2) return "#38bdf8"; // Balanced
      return "#f43f5e"; // Siloed in own dept
    }
    return node.department_color || "#10b981";
  };

  async function fetchCareerEmployees() {
    try {
      const API_BASE = API_BASE_URL;
      const token = localStorage.getItem("auth_token") || "";
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch(`${API_BASE}/api/v1/employees`, {
        headers,
      });
      if (response.ok) {
        const data = await response.json();
        setCareerEmployees(data);
        if (data.length > 0) {
          setSelectedCareerEmpId(data[0].id);
          loadCareerPath(data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function loadCareerPath(empId) {
    if (!empId) return;
    try {
      setCareerLoading(true);
      const data = await apiCall(`/career-path/${empId}`);
      setCareerPathData(data);
      setCareerLoading(false);
    } catch (err) {
      console.error(err);
      setCareerLoading(false);
    }
  }

  // 1. Skill Match Actions
  const addSkillMatchReq = () => {
    if (!newSkillName.trim()) return;
    setMatchSkillsInput([
      ...matchSkillsInput,
      { name: newSkillName.trim(), level: Number(newSkillLevel) },
    ]);
    setNewSkillName("");
  };

  const removeSkillMatchReq = (idx) => {
    setMatchSkillsInput(matchSkillsInput.filter((_, i) => i !== idx));
  };

  const triggerSkillMatch = async () => {
    if (matchSkillsInput.length === 0) return;
    try {
      setMatchingLoading(true);
      setSkillMatchStatus("running");
      setMobileActivePane("right");
      const results = await apiCall("/skill-match", "POST", {
        target_skills: matchSkillsInput,
      });
      setMatchResults(results);
      if (results.length > 0) {
        setActiveMatchEmployeeId(results[0].employee_id);
      }
      setSkillMatchStatus("complete");
      setMatchingLoading(false);
    } catch (err) {
      console.error(err);
      setSkillMatchStatus("error");
      setMatchingLoading(false);
    }
  };

  // 2. Team Optimize Actions (Simulated Annealing Live Simulation)
  const triggerTeamOptimize = async () => {
    if (teamSkillsInput.length === 0) return;
    try {
      setOptimizingLoading(true);
      setAnnealingStatus("running");
      setMobileActivePane("right");
      setAnnealingStep(0);
      setAnnealingTemp(10.0);
      setAnnealingHistory([]);

      const results = await apiCall("/team-optimize", "POST", {
        target_skills: teamSkillsInput,
        budget_cap: teamBudget,
        max_team_size: teamSize,
      });

      const history = results.optimization_history || [];
      const stepsCount = history.length;
      const simulationSteps = Math.min(25, stepsCount);

      let currentSimIndex = 0;
      const intervalId = setInterval(() => {
        if (currentSimIndex >= simulationSteps) {
          clearInterval(intervalId);
          setOptimizedTeam(results);
          setAnnealingStep(stepsCount);
          setAnnealingTemp(history[stepsCount - 1]?.temperature || 0.1);
          setAnnealingHistory(history);
          setAnnealingStatus("complete");
          setOptimizingLoading(false);
        } else {
          const stepData =
            history[currentSimIndex] || history[history.length - 1];
          setAnnealingStep(stepData.step);
          setAnnealingTemp(stepData.temperature);
          setAnnealingHistory(history.slice(0, currentSimIndex + 1));

          currentSimIndex++;
        }
      }, 90);
    } catch (err) {
      console.error(err);
      setOptimizingLoading(false);
      setAnnealingStatus("idle");
    }
  };

  // Helper function to extract skill matching paths
  const getHighlightPathNodes = () => {
    const activeMatch = matchResults.find(
      (r) => r.employee_id === activeMatchEmployeeId,
    );
    if (!activeMatch) return new Set();

    const nodesOnPath = new Set();
    activeMatch.match_details.detailed_matches.forEach((det) => {
      if (det.matched_by_skill) nodesOnPath.add(det.matched_by_skill);
      if (det.target_skill) nodesOnPath.add(det.target_skill);
    });
    return nodesOnPath;
  };

  const highlightNodes = getHighlightPathNodes();

  return (
    <div className="flex-1 flex flex-col min-h-0 lg:h-full space-y-3 md:space-y-4 max-w-full">
      {/* Top Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-1 border-b border-white/5 pb-3">
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
              Aurelinx state-of-the-art decision workbench. Powered by graph
              theory, combinatorial solvers, survival models, and Markov
              transition matrices.
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

      {/* TABS CONTAINER */}
      <div className="relative flex-1 flex flex-col min-h-0 lg:overflow-hidden">
        <AnimatePresence mode="wait">
          {/* TAB 1: SKILL GRAPH DIJKSTRA MATCH */}
          {activeSubTab === "skill-match" && (
            <motion.div
              key="skill-match"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="min-h-0 lg:flex-1 lg:h-full w-full flex flex-col"
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
                  <div className="space-y-4 flex flex-col h-auto lg:h-full min-h-0">
                    <div className="premium-card overflow-hidden border border-white/10 bg-slate-950/35 backdrop-blur-xl shadow-[0_18px_55px_rgba(2,8,23,.22)] h-auto lg:h-full flex flex-col justify-between">
                      <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
                        <div>
                          <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-300">
                            <Briefcase size={13} /> Target definition
                          </div>
                          <h3 className="text-sm font-semibold tracking-tight text-white">
                            Define target requirements
                          </h3>
                          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                            Add the skills and minimum levels the graph solver
                            must evaluate.
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full border border-indigo-300/20 bg-indigo-300/10 px-2 py-1 text-[9px] font-semibold text-indigo-200">
                          {matchSkillsInput.length} requirement
                          {matchSkillsInput.length === 1 ? "" : "s"}
                        </span>
                      </div>

                      {/* Top Form Inputs (Fixed) */}
                      <div className="space-y-3.5 md:space-y-3 px-5 pt-4 pb-2 shrink-0">
                        <div>
                          <label className="text-[10px] md:text-[11px] uppercase font-bold tracking-widest text-slate-400 mb-1 block">
                            Skill Node
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. PyTorch, React, FastAPI"
                            value={newSkillName}
                            onChange={(e) => setNewSkillName(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2.5 md:py-2 text-xs md:text-sm text-white placeholder-slate-600 outline-none transition focus:border-indigo-400/70 focus:ring-2 focus:ring-indigo-400/10 min-h-[44px]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] md:text-[11px] uppercase font-bold tracking-widest text-slate-400 mb-1 block">
                            Min Proficiency
                          </label>
                          <PremiumSelect
                            value={newSkillLevel}
                            onChange={(e) =>
                              setNewSkillLevel(Number(e.target.value))
                            }
                            className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2.5 md:py-2 text-xs md:text-sm text-white outline-none transition focus:border-indigo-400/70 focus:ring-2 focus:ring-indigo-400/10 min-h-[44px]"
                          >
                            {[1, 2, 3, 4, 5].map((v) => (
                              <option key={v} value={v}>
                                Lvl {v}
                              </option>
                            ))}
                          </PremiumSelect>
                        </div>
                        <button
                          onClick={addSkillMatchReq}
                          className="inline-flex h-10 md:h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-indigo-300/20 bg-indigo-500/90 text-xs md:text-sm font-semibold uppercase tracking-[0.12em] text-white shadow-[0_8px_24px_rgba(163,230,53,.18)] transition hover:bg-indigo-400 min-h-[44px]"
                        >
                          <Plus size={14} /> Add Skill requirement
                        </button>
                      </div>

                      {/* Internal Scrollable Skill List Box */}
                      <div className="flex-1 overflow-y-auto min-h-[120px] custom-scrollbar px-5 py-2 space-y-2">
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

                      {/* Fixed Footer */}
                      <div className="border-t border-white/10 p-5 space-y-3 bg-slate-950/40 shrink-0">
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
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                Solver request status
                              </span>
                              <span
                                className={`text-[10px] font-medium ${skillMatchStatus === "error" ? "text-rose-300" : skillMatchStatus === "complete" ? "text-emerald-300" : "text-cyan-300"}`}
                              >
                                {skillMatchStatus === "error"
                                  ? "Request failed"
                                  : skillMatchStatus === "complete"
                                    ? `${matchResults.length} matches returned`
                                    : "Processing on server"}
                              </span>
                            </div>
                            <div className="mb-3 h-1 overflow-hidden rounded-full bg-white/10">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${skillMatchStatus === "error" ? "w-full bg-rose-400" : skillMatchStatus === "complete" ? "w-full bg-emerald-400" : "w-2/3 animate-pulse bg-cyan-300"}`}
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-[9px]">
                              {[
                                "Requirements validated",
                                "Adjacency solver",
                                "Matches rendered",
                              ].map((label, index) => {
                                const reached =
                                  skillMatchStatus === "complete" ||
                                  (skillMatchStatus === "running" &&
                                    index < 2) ||
                                  (skillMatchStatus === "error" && index < 2);
                                return (
                                  <div
                                    key={label}
                                    className={`flex items-center gap-1.5 ${reached ? "text-slate-200" : "text-slate-600"}`}
                                  >
                                    <span
                                      className={`h-1.5 w-1.5 rounded-full ${reached ? (skillMatchStatus === "error" && index === 1 ? "bg-rose-300" : "bg-cyan-300") : "bg-white/15"}`}
                                    />
                                    {label}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                }
                rightContent={
                  <div className="premium-card p-4 md:p-6 border border-white/5 bg-slate-950/20 h-auto lg:h-full flex flex-col overflow-visible lg:overflow-hidden">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4 shrink-0">
                      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
                        Semantic Matching Matrix & Path Analysis
                      </h3>
                      <span className="text-[10px] text-slate-500">
                        Shortest Path Dijkstra Weighting
                      </span>
                    </div>

                    {matchResults.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] xl:grid-cols-[250px_1fr] gap-4 md:gap-6 min-h-0 lg:flex-1 lg:h-full">
                        {/* Left list of employees */}
                        <div className="space-y-2.5 border-r border-white/5 pr-3 md:pr-4 overflow-y-auto custom-scrollbar max-lg:pb-4">
                          {matchResults.map((result) => (
                            <button
                              key={result.employee_id}
                              onClick={() => {
                                setActiveMatchEmployeeId(result.employee_id);
                              }}
                              className={`w-full text-left p-3 md:p-4 rounded-xl border transition-all relative overflow-hidden select-none cursor-pointer min-h-[52px] ${result.employee_id === activeMatchEmployeeId ? "border-primary bg-primary/5" : "border-white/5 bg-white/2 hover:border-white/10 hover:bg-white/[0.04]"}`}
                            >
                              <div className="font-bold text-white text-xs md:text-sm">
                                {result.full_name}
                              </div>
                              <div className="text-[9px] md:text-[11px] text-slate-400 mt-1 uppercase tracking-wider">
                                {result.role}
                              </div>
                              <div className="flex items-center justify-between mt-2 md:mt-3 border-t border-white/5 pt-2">
                                <span className="text-[9px] md:text-[10px] uppercase font-semibold text-slate-500">
                                  Compatibility
                                </span>
                                <span className="text-xs md:text-sm font-black text-primary">
                                  {(
                                    result.match_details.overall_compatibility *
                                    100
                                  ).toFixed(0)}
                                  %
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>

                        {/* Right Dijkstra Path Details */}
                        <div className="space-y-5 md:space-y-6 overflow-y-auto custom-scrollbar flex-1 min-h-0 pr-1 max-lg:pb-4">
                          {(() => {
                            const activeMatch = matchResults.find(
                              (r) => r.employee_id === activeMatchEmployeeId,
                            );
                            if (!activeMatch) return null;

                            return (
                              <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6">
                                {/* Detailed path list */}
                                <div className="space-y-4">
                                  <div>
                                    <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1">
                                      Target Match Breakdown for:
                                    </div>
                                    <h4 className="text-lg font-extrabold text-white">
                                      {activeMatch.full_name}
                                    </h4>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                                    {activeMatch.match_details.detailed_matches.map(
                                      (detail, idx) => (
                                        <div
                                          key={idx}
                                          className="rounded-xl border border-white/5 bg-slate-950 p-3 md:p-4"
                                        >
                                          <div className="flex items-center justify-between mb-2 md:mb-3 border-b border-white/5 pb-2">
                                            <div className="text-xs md:text-sm font-bold text-white">
                                              Target Skill:{" "}
                                              {detail.target_skill} (L
                                              {detail.target_level})
                                            </div>
                                            <span
                                              className={`text-[8px] md:text-[9px] font-black uppercase tracking-widest px-2 py-0.5 md:px-2.5 md:py-1 rounded border ${
                                                detail.status === "Perfect"
                                                  ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5"
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
                                            {detail.matched_by_skill ? (
                                              <>
                                                <div className="bg-white/5 px-2 md:px-3 py-1 md:py-1.5 rounded border border-white/10 text-slate-200">
                                                  {detail.matched_by_skill}
                                                </div>
                                                {detail.semantic_distance >
                                                  0 && (
                                                  <>
                                                    <div className="text-slate-500 flex flex-col items-center">
                                                      <span className="text-[8px] md:text-[9px] text-indigo-400 font-mono">
                                                        Weight:{" "}
                                                        {
                                                          detail.semantic_distance
                                                        }
                                                      </span>
                                                      <span className="text-indigo-400">
                                                        ➔
                                                      </span>
                                                    </div>
                                                    <div className="bg-indigo-950 px-2 md:px-3 py-1 md:py-1.5 rounded border border-indigo-500/30 text-indigo-300">
                                                      {detail.target_skill}
                                                    </div>
                                                  </>
                                                )}
                                              </>
                                            ) : (
                                              <span className="text-rose-400 font-mono text-[10px] md:text-[11px]">
                                                No transition path discovered.
                                                Distance: Infinite.
                                              </span>
                                            )}
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
                                          Shortest path graph view
                                        </div>
                                        <div className="mt-1 text-[10px] text-slate-500 leading-relaxed">
                                          Green nodes are present in the
                                          candidate profile. Cyan paths show the
                                          evaluated transitions.
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
                                    <svg
                                      className="absolute inset-0 h-full w-full pointer-events-none"
                                      viewBox="80 70 840 400"
                                      preserveAspectRatio="xMidYMid meet"
                                    >
                                      {/* Links */}
                                      {SKILL_GRAPH_LINKS.map((link, idx) => {
                                        const src =
                                          SKILL_GRAPH_COORDS[link.source];
                                        const tgt =
                                          SKILL_GRAPH_COORDS[link.target];
                                        if (!src || !tgt) return null;

                                        const isActivePath =
                                          highlightNodes.has(link.source) &&
                                          highlightNodes.has(link.target);

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
                                            {isActivePath && (
                                              <circle r="4" fill="#2dd4bf">
                                                <animateMotion
                                                  path={`M ${src.x} ${src.y} L ${tgt.x} ${tgt.y}`}
                                                  dur="2s"
                                                  repeatCount="indefinite"
                                                />
                                              </circle>
                                            )}
                                          </g>
                                        );
                                      })}

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
                    ) : (
                      <div className="flex-1 min-h-[420px] flex flex-col items-center justify-center py-10 px-6 border border-dashed border-white/10 rounded-2xl bg-white/[0.01] text-center max-w-md mx-auto my-auto">
                        <div className="h-12 w-12 rounded-2xl border border-indigo-400/20 bg-indigo-500/10 flex items-center justify-center text-indigo-300 mb-4 shadow-[0_0_20px_rgba(163,230,53,0.15)]">
                          <Brain size={24} />
                        </div>
                        <h4 className="text-sm font-extrabold text-white tracking-wide uppercase mb-2">
                          Graph Solver Standing By
                        </h4>
                        <p className="text-xs text-slate-400 leading-relaxed max-w-md">
                          Enter target skill requirements on the left panel and
                          click{" "}
                          <span className="font-semibold text-cyan-300">
                            Solve Adjacencies
                          </span>{" "}
                          to calculate graph shortest-path Dijkstra matching
                          across the workforce.
                        </p>
                      </div>
                    )}
                  </div>
                }
              />
              <AIExplanationPanel
                subtab="skill-match"
                context={{
                  targetSkills: matchSkillsInput,
                  matchResults: matchResults,
                  activeMatchEmployeeId: activeMatchEmployeeId,
                }}
                buttonText="Explain with AI"
                autoRefresh={true}
                disabled={matchResults.length === 0}
              />
            </motion.div>
          )}

          {/* TAB 2: OPTIMAL TEAM ASSEMBLY (SIMULATED ANNEALING) */}
          {activeSubTab === "team-builder" && (
            <motion.div
              key="team-builder"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="min-h-0 lg:flex-1 lg:h-full w-full flex flex-col"
            >
              <MobileSplitPane
                activePane={mobileActivePane}
                setActivePane={setMobileActivePane}
                leftTitle="Team Constraints"
                rightTitle="Optimization Results"
                leftIcon={<Zap size={14} />}
                rightIcon={<Sparkles size={14} />}
                leftWidthClass="lg:w-[340px] xl:w-[360px]"
                leftContent={
                  <div className="space-y-4 flex flex-col h-auto lg:h-full min-h-0">
                    <div className="premium-card overflow-hidden border border-white/10 bg-slate-950/35 backdrop-blur-xl shadow-[0_18px_55px_rgba(2,8,23,.22)] h-auto lg:h-full flex flex-col justify-between">
                      <div className="border-b border-white/10 px-5 py-4">
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

                      {/* Top Form Inputs (Fixed) */}
                      <div className="space-y-3 px-5 pt-4 pb-2 shrink-0">
                        <div>
                          <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1 block">
                            Budget Cap (CFO Limit)
                          </label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                            <input
                              type="number"
                              value={teamBudget}
                              onChange={(e) =>
                                setTeamBudget(Number(e.target.value))
                              }
                              className="w-full rounded-xl border border-white/10 bg-slate-950/80 py-2 pl-9 pr-3 text-xs text-white outline-none transition focus:border-indigo-400/70 focus:ring-2 focus:ring-indigo-400/10"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1 block">
                            Max Team Size
                          </label>
                          <input
                            type="number"
                            min="2"
                            max="6"
                            value={teamSize}
                            onChange={(e) =>
                              setTeamSize(Number(e.target.value))
                            }
                            className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none transition focus:border-indigo-400/70 focus:ring-2 focus:ring-indigo-400/10"
                          />
                        </div>

                        {/* Skills Add Bar (Fixed) */}
                        <div>
                          <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1.5 block">
                            Skill Matrix Demands
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              id="team-skill-name"
                              placeholder="e.g. AWS, Python, Docker"
                              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none transition focus:border-indigo-400/70 focus:ring-2 focus:ring-indigo-400/10"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const inputEl =
                                  document.getElementById("team-skill-name");
                                if (inputEl && inputEl.value.trim()) {
                                  setTeamSkillsInput([
                                    ...teamSkillsInput,
                                    { name: inputEl.value.trim(), level: 3 },
                                  ]);
                                  inputEl.value = "";
                                }
                              }}
                              className="h-9 shrink-0 rounded-xl border border-white/10 bg-white/[0.06] px-3 text-xs text-slate-200 transition hover:border-indigo-300/40 hover:bg-indigo-300/10"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Internal Scrollable Skill List Box */}
                      <div className="flex-1 overflow-y-auto min-h-[120px] custom-scrollbar px-5 py-2 space-y-2">
                        {teamSkillsInput.map((skill, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2 text-xs"
                          >
                            <span className="text-white font-bold">
                              {skill.name}
                            </span>
                            <div className="flex items-center gap-2">
                              <PremiumSelect
                                value={skill.level}
                                onChange={(e) => {
                                  const next = [...teamSkillsInput];
                                  next[idx].level = Number(e.target.value);
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
                                onClick={() =>
                                  setTeamSkillsInput(
                                    teamSkillsInput.filter((_, i) => i !== idx),
                                  )
                                }
                                className="text-rose-400 text-xs"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))}
                        {teamSkillsInput.length === 0 && (
                          <div className="text-xs text-slate-500 text-center py-6 border border-dashed border-white/5 rounded-xl">
                            No skill demands added yet.
                          </div>
                        )}
                      </div>

                      {/* Fixed Footer */}
                      <div className="border-t border-white/10 p-5 bg-slate-950/40 shrink-0">
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
                            ? "Simulated Annealing Run..."
                            : "Find Mathematically Perfect Team"}
                        </button>
                      </div>
                    </div>
                  </div>
                }
                rightContent={
                  <div className="premium-card p-4 md:p-6 border border-white/5 bg-slate-950/20 h-auto lg:h-full flex flex-col overflow-visible lg:overflow-hidden">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4 shrink-0">
                      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
                        Optimization Assembly Results
                      </h3>
                      <span className="text-[10px] text-slate-500">
                        Metropolis Hastings Simulated Annealing
                      </span>
                    </div>

                    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar space-y-4">
                      {/* ANNEALING STATUS ACTIVE PANEL */}
                      {annealingStatus === "running" && (
                        <div className="py-12 flex flex-col items-center justify-center space-y-6">
                          <div className="text-center">
                            <div className="text-xs font-mono text-primary uppercase tracking-[0.2em] mb-2 animate-pulse">
                              Running Simulated Annealing Model
                            </div>
                            <div className="text-3xl font-black text-white font-mono">
                              Temp: {annealingTemp.toFixed(2)}K
                            </div>
                          </div>

                          {/* Temperature cooling gauge */}
                          <div className="w-64 h-4 bg-white/5 rounded-full overflow-hidden border border-white/10 relative p-0.5">
                            <div
                              className="h-full rounded-full transition-all duration-75 bg-gradient-to-r from-rose-500 via-amber-500 to-indigo-500"
                              style={{
                                width: `${(annealingTemp / 10.0) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {annealingStatus === "complete" && optimizedTeam && (
                        <div>
                          {(() => {
                            const history =
                              annealingHistory.length > 0
                                ? annealingHistory
                                : [];

                            if (history.length === 0) {
                              return (
                                <div className="h-44 rounded-xl border border-white/10 bg-slate-950/80 flex items-center justify-center px-4 text-center text-[10px] text-slate-500">
                                  No optimization data yet — configure target
                                  skills and run the solver.
                                </div>
                              );
                            }

                            const n = history.length;
                            const steps = history.map(
                              (h) => Number(h.step) || 0,
                            );
                            const energies = history.map(
                              (h) => Number(h.energy) || 0,
                            );
                            const bestSoFar = history.map((h) => {
                              const rawBest = h.best_energy;
                              return rawBest === null || rawBest === undefined
                                ? Number(h.energy) || 0
                                : Number(rawBest) || 0;
                            });
                            const coverages = history.map(
                              (h) => Number(h.coverage) || 0,
                            );
                            const temps = history.map(
                              (h) => Number(h.temperature) || 0,
                            );
                            const costs = history.map(
                              (h) => Number(h.cost) || 0,
                            );

                            const metrics = optimizedTeam.metrics || {};
                            const lastCost = costs[costs.length - 1] || 0;
                            const usagePct =
                              Number(metrics.budget_usage_percentage) || 0;
                            const budgetCap =
                              Number(optimizedTeam.budget_cap) ||
                              (usagePct > 0
                                ? Math.round(lastCost / (usagePct / 100))
                                : Math.max(...costs) || 1);

                            const minE = Math.min(...energies, ...bestSoFar);
                            const maxE = Math.max(...energies, ...bestSoFar);
                            const ePad = (maxE - minE) * 0.12 || 1;

                            const niceTicks = (lo, hi, count = 5) => {
                              if (!isFinite(lo) || !isFinite(hi) || hi <= lo)
                                return [lo, hi];
                              const stepRaw = (hi - lo) / count;
                              const mag = Math.pow(
                                10,
                                Math.floor(Math.log10(stepRaw)),
                              );
                              const ratio = stepRaw / mag;
                              const step =
                                (ratio < 1.5
                                  ? 1
                                  : ratio < 3
                                    ? 2
                                    : ratio < 7
                                      ? 5
                                      : 10) * mag;
                              const ticks = [];
                              for (
                                let v = Math.ceil(lo / step) * step;
                                v <= hi + step * 1e-6;
                                v += step
                              ) {
                                ticks.push(Number(v.toFixed(6)));
                              }
                              return ticks.length >= 2 ? ticks : [lo, hi];
                            };

                            const eTicks = niceTicks(
                              minE - ePad,
                              maxE + ePad,
                              5,
                            );
                            const maxCost =
                              Math.max(...costs, budgetCap) * 1.05 || 1;
                            const costTicks = niceTicks(0, maxCost, 4);
                            const covTicks = [0, 25, 50, 75, 100];
                            const tmpTicks = [10, 5, 0];

                            const xPos = (i) => (i / Math.max(n - 1, 1)) * 100;
                            const yScaler = (lo, hi) => (v) => {
                              const r = hi - lo || 1;
                              return (
                                84 - Math.max(0, Math.min(1, (v - lo) / r)) * 66
                              );
                            };
                            const yE = yScaler(
                              eTicks[0],
                              eTicks[eTicks.length - 1],
                            );
                            const yC = yScaler(0, 100);
                            const yT = yScaler(0, 10);
                            const yK = yScaler(0, Math.max(...costTicks));

                            const ePts = energies.map((e, i) => ({
                              x: xPos(i),
                              y: yE(e),
                            }));
                            const bPts = bestSoFar.map((e, i) => ({
                              x: xPos(i),
                              y: yE(e),
                            }));
                            const cPts = coverages.map((c, i) => ({
                              x: xPos(i),
                              y: yC(c),
                            }));
                            const tPts = temps.map((t, i) => ({
                              x: xPos(i),
                              y: yT(t),
                            }));

                            const globalBest = Math.max(...energies);
                            const bestIndex = energies.indexOf(globalBest);
                            const finalIsBest = bestIndex === n - 1;
                            /* coverage area is rendered as a smooth closed path in JSX */
                            const budgetY = yK(budgetCap);

                            const fmtMoney = (v) => {
                              const num = Number(v) || 0;
                              if (num >= 1e6)
                                return `$${(num / 1e6).toFixed(2)}M`;
                              if (num >= 1e3)
                                return `$${(num / 1e3).toFixed(0)}k`;
                              return `$${num.toFixed(0)}`;
                            };

                            const stepAt = (frac) =>
                              steps[Math.round((n - 1) * frac)] ?? steps[n - 1];
                            const smoothPath = (pts) => {
                              if (pts.length < 2) {
                                return pts.length
                                  ? `M ${pts[0].x},${pts[0].y}`
                                  : "";
                              }
                              let d = `M ${pts[0].x},${pts[0].y}`;
                              for (let i = 0; i < pts.length - 1; i++) {
                                const p0 = pts[i - 1] || pts[i];
                                const p1 = pts[i];
                                const p2 = pts[i + 1];
                                const p3 = pts[i + 2] || p2;
                                const c1x = p1.x + (p2.x - p0.x) / 6;
                                const c1y = p1.y + (p2.y - p0.y) / 6;
                                const c2x = p2.x - (p3.x - p1.x) / 6;
                                const c2y = p2.y - (p3.y - p1.y) / 6;
                                d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
                              }
                              return d;
                            };
                            const barW = Math.max(0.85, (100 / n) * 0.8);
                            const hovered = hoveredAnnealIndex;

                            return (
                              <>
                                {/* Legend */}
                                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] text-slate-400 mb-3">
                                  <span className="flex items-center gap-1">
                                    <span className="h-0.5 w-3 rounded bg-teal-400" />
                                    Energy E(x)
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <span className="h-0.5 w-3 rounded border-t border-dashed border-emerald-400" />
                                    Best-so-far E*
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <span className="h-0.5 w-3 rounded bg-indigo-400" />
                                    Coverage %
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <span className="h-0.5 w-3 rounded bg-amber-400" />
                                    Temperature
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <span className="h-0.5 w-3 rounded border-t border-dashed border-rose-400" />
                                    Budget cap
                                  </span>
                                </div>
                                <div className="relative mt-2">
                                  {/* ===== MAIN CHART: Energy + Best-so-far (left) + Coverage (right) ===== */}
                                  <div className="relative h-56 w-full rounded-lg border border-white/10 bg-slate-950/80 overflow-hidden">
                                    {/* Y-axis energy tick labels */}
                                    {eTicks.map((t) => (
                                      <span
                                        key={`et-${t}`}
                                        className="absolute left-1 -translate-y-1/2 z-10 pointer-events-none text-[10px] font-mono text-slate-400 bg-slate-900/75 px-1 rounded"
                                        style={{ top: `${yE(t)}%` }}
                                      >
                                        {t.toFixed(1)}
                                      </span>
                                    ))}
                                    {/* Y-axis coverage tick labels (right) */}
                                    {covTicks.map((t) => (
                                      <span
                                        key={`ct-${t}`}
                                        className="absolute right-1 -translate-y-1/2 z-10 pointer-events-none text-[10px] font-mono text-indigo-300/80 bg-slate-900/75 px-1 rounded"
                                        style={{ top: `${yC(t)}%` }}
                                      >
                                        {t}
                                      </span>
                                    ))}
                                    <div className="ml-14 mr-11 h-full relative">
                                      <svg
                                        className="h-full w-full overflow-hidden"
                                        viewBox="0 0 100 100"
                                        preserveAspectRatio="none"
                                        shapeRendering="geometricPrecision"
                                      >
                                        <defs>
                                          <linearGradient
                                            id="annealGradHigh"
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                          >
                                            <stop
                                              offset="0%"
                                              stopColor="#2dd4bf"
                                              stopOpacity="0.22"
                                            />
                                            <stop
                                              offset="100%"
                                              stopColor="#2dd4bf"
                                              stopOpacity="0.0"
                                            />
                                          </linearGradient>
                                          <linearGradient
                                            id="annealCovArea"
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                          >
                                            <stop
                                              offset="0%"
                                              stopColor="#fbbf24"
                                              stopOpacity="0.18"
                                            />
                                            <stop
                                              offset="100%"
                                              stopColor="#fbbf24"
                                              stopOpacity="0.0"
                                            />
                                          </linearGradient>
                                          <filter
                                            id="glowEmerald"
                                            x="-30%"
                                            y="-30%"
                                            width="160%"
                                            height="160%"
                                          >
                                            <feGaussianBlur
                                              stdDeviation="1.5"
                                              result="blur"
                                            />
                                            <feComposite
                                              in="SourceGraphic"
                                              in2="blur"
                                              operator="over"
                                            />
                                          </filter>
                                          <filter
                                            id="glowTeal"
                                            x="-30%"
                                            y="-30%"
                                            width="160%"
                                            height="160%"
                                          >
                                            <feGaussianBlur
                                              stdDeviation="1.5"
                                              result="blur"
                                            />
                                            <feComposite
                                              in="SourceGraphic"
                                              in2="blur"
                                              operator="over"
                                            />
                                          </filter>
                                        </defs>

                                        {/* Horizontal gridlines at every energy tick */}
                                        {eTicks.map((t) => (
                                          <line
                                            key={`gl-${t}`}
                                            x1="0"
                                            y1={yE(t)}
                                            x2="100"
                                            y2={yE(t)}
                                            stroke="rgba(255,255,255,0.07)"
                                            strokeDasharray="3 3"
                                            vectorEffect="non-scaling-stroke"
                                          />
                                        ))}

                                        {/* Explicit Y & X axis lines */}
                                        <line
                                          x1="0"
                                          y1="12"
                                          x2="0"
                                          y2="84"
                                          stroke="rgba(255,255,255,0.2)"
                                          strokeWidth="1"
                                          vectorEffect="non-scaling-stroke"
                                        />
                                        <line
                                          x1="0"
                                          y1="84"
                                          x2="100"
                                          y2="84"
                                          stroke="rgba(255,255,255,0.2)"
                                          strokeWidth="1"
                                          vectorEffect="non-scaling-stroke"
                                        />

                                        {/* Energy Area Fill Gradient */}
                                        <path
                                          d={`M 0,84 ${ePts[0].x},${ePts[0].y} ${smoothPath(ePts).slice(2)} L 100,84 Z`}
                                          fill="url(#annealGradHigh)"
                                        />

                                        {/* Coverage area (smooth closed path) + line (right axis) */}
                                        <path
                                          d={`M 0,84 ${cPts[0].x},${cPts[0].y} ${smoothPath(cPts).slice(2)} L 100,84 Z`}
                                          fill="url(#annealCovArea)"
                                        />
                                        <path
                                          d={smoothPath(cPts)}
                                          fill="none"
                                          stroke="#fbbf24"
                                          strokeWidth="4"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          opacity="0.18"
                                          vectorEffect="non-scaling-stroke"
                                        />
                                        <path
                                          d={smoothPath(cPts)}
                                          fill="none"
                                          stroke="#fbbf24"
                                          strokeWidth="1.5"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          vectorEffect="non-scaling-stroke"
                                        />

                                        {/* Best-so-far dashed line (smooth) */}
                                        <path
                                          d={smoothPath(bPts)}
                                          fill="none"
                                          stroke="#34d399"
                                          strokeWidth="4.5"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          opacity="0.14"
                                          vectorEffect="non-scaling-stroke"
                                        />
                                        <path
                                          d={smoothPath(bPts)}
                                          fill="none"
                                          stroke="#34d399"
                                          strokeWidth="1.6"
                                          strokeDasharray="4 3"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          vectorEffect="non-scaling-stroke"
                                        />

                                        {/* Energy line (smooth cubic bezier with soft ambient glow) */}
                                        <path
                                          d={smoothPath(ePts)}
                                          fill="none"
                                          stroke="#2dd4bf"
                                          strokeWidth="6"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          opacity="0.18"
                                          vectorEffect="non-scaling-stroke"
                                        />
                                        <path
                                          d={smoothPath(ePts)}
                                          fill="none"
                                          stroke="#2dd4bf"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          vectorEffect="non-scaling-stroke"
                                        />

                                        {/* Laser crosshair on hover */}
                                        {hovered !== null && (
                                          <line
                                            x1={xPos(hovered)}
                                            y1="12"
                                            x2={xPos(hovered)}
                                            y2="84"
                                            stroke="#2dd4bf"
                                            strokeWidth="1.5"
                                            strokeDasharray="3 3"
                                            vectorEffect="non-scaling-stroke"
                                          />
                                        )}
                                      </svg>

                                      {/* True 100% Round Circle Node Markers Overlay (Positioned Directly on SVG Curve Line) */}
                                      <div className="absolute inset-0 pointer-events-none">
                                        {ePts.map((p, idx) => {
                                          const isBest = idx === bestIndex;
                                          const isHov = idx === hovered;
                                          if (
                                            !isBest &&
                                            !isHov &&
                                            idx %
                                              Math.max(1, Math.floor(n / 8)) !==
                                              0
                                          )
                                            return null;

                                          return (
                                            <div
                                              key={idx}
                                              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-150 ${
                                                isBest
                                                  ? "w-3.5 h-3.5 bg-emerald-400 border-2 border-white shadow-[0_0_10px_#34d399] z-20"
                                                  : isHov
                                                    ? "w-3 h-3 bg-white border-2 border-teal-400 shadow-[0_0_8px_#2dd4bf] z-20"
                                                    : "w-2 h-2 bg-teal-400/90 border border-slate-900 shadow-[0_0_4px_#2dd4bf] z-10"
                                              }`}
                                              style={{
                                                left: `${p.x}%`,
                                                top: `${p.y}%`,
                                              }}
                                            />
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>

                                  {/* ===== SUB CHART: Team Cost vs Budget Cap + Temperature ===== */}
                                  <div className="relative mt-3 h-32 w-full rounded-lg border border-white/10 bg-slate-950/80 overflow-hidden">
                                    {/* Cost tick labels (left) */}
                                    {costTicks.map((t) => (
                                      <span
                                        key={`kt-${t}`}
                                        className="absolute left-1 -translate-y-1/2 z-10 pointer-events-none text-[10px] font-mono text-slate-400 bg-slate-900/75 px-1 rounded"
                                        style={{ top: `${yK(t)}%` }}
                                      >
                                        {fmtMoney(t)}
                                      </span>
                                    ))}
                                    {/* Temperature tick labels (right) */}
                                    {tmpTicks.map((t) => (
                                      <span
                                        key={`tt-${t}`}
                                        className="absolute right-1 -translate-y-1/2 z-10 pointer-events-none text-[10px] font-mono text-amber-300/80 bg-slate-950/75 px-1 rounded"
                                        style={{ top: `${yT(t)}%` }}
                                      >
                                        T {t}
                                      </span>
                                    ))}
                                    <div className="ml-14 mr-11 h-full relative">
                                      <svg
                                        className="h-full w-full overflow-hidden"
                                        viewBox="0 0 100 100"
                                        preserveAspectRatio="none"
                                        shapeRendering="geometricPrecision"
                                      >
                                        <defs>
                                          <linearGradient
                                            id="annealBarGrad"
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                          >
                                            <stop
                                              offset="0%"
                                              stopColor="#6ee7b7"
                                              stopOpacity="0.95"
                                            />
                                            <stop
                                              offset="100%"
                                              stopColor="#0d9488"
                                              stopOpacity="0.9"
                                            />
                                          </linearGradient>
                                          <filter
                                            id="glowAmber"
                                            x="-30%"
                                            y="-30%"
                                            width="160%"
                                            height="160%"
                                          >
                                            <feGaussianBlur
                                              in="SourceAlpha"
                                              stdDeviation="0.35"
                                              result="blur"
                                            />
                                            <feFlood
                                              floodColor="#fbbf24"
                                              floodOpacity="0.9"
                                              result="c"
                                            />
                                            <feComposite
                                              in="c"
                                              in2="blur"
                                              operator="in"
                                              result="glow"
                                            />
                                            <feMerge>
                                              <feMergeNode in="glow" />
                                              <feMergeNode in="SourceGraphic" />
                                            </feMerge>
                                          </filter>
                                        </defs>

                                        {/* Cost gridlines */}
                                        {costTicks.map((t) => (
                                          <line
                                            key={`kgl-${t}`}
                                            x1="0"
                                            y1={yK(t)}
                                            x2="100"
                                            y2={yK(t)}
                                            stroke="rgba(255,255,255,0.07)"
                                            strokeDasharray="3 3"
                                            vectorEffect="non-scaling-stroke"
                                          />
                                        ))}
                                        <line
                                          x1="0"
                                          y1="84"
                                          x2="100"
                                          y2="84"
                                          stroke="rgba(255,255,255,0.2)"
                                          strokeWidth="1"
                                          vectorEffect="non-scaling-stroke"
                                        />

                                        {/* Budget cap line */}
                                        <line
                                          x1="0"
                                          y1={budgetY}
                                          x2="100"
                                          y2={budgetY}
                                          stroke="#fb7185"
                                          strokeWidth="1.5"
                                          strokeDasharray="5 4"
                                          vectorEffect="non-scaling-stroke"
                                        />

                                        {/* Cost bars per step (rounded, gradient) */}
                                        {costs.map((c, i) => (
                                          <rect
                                            key={`bar-${i}`}
                                            x={xPos(i) - barW / 2}
                                            y={yK(c)}
                                            width={barW}
                                            height={84 - yK(c)}
                                            rx="1.6"
                                            ry="1.6"
                                            fill="url(#annealBarGrad)"
                                            opacity={hovered === i ? 1 : 0.55}
                                            stroke={
                                              hovered === i ? "#ffffff" : "none"
                                            }
                                            strokeWidth="0.6"
                                            vectorEffect="non-scaling-stroke"
                                          />
                                        ))}

                                        {/* Temperature curve (smooth cubic bezier) */}
                                        <path
                                          d={smoothPath(tPts)}
                                          fill="none"
                                          stroke="#fbbf24"
                                          strokeWidth="4.5"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          opacity="0.16"
                                          vectorEffect="non-scaling-stroke"
                                        />
                                        <path
                                          d={smoothPath(tPts)}
                                          fill="none"
                                          stroke="#fbbf24"
                                          strokeWidth="1.6"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          vectorEffect="non-scaling-stroke"
                                        />

                                        {/* Crosshair on hover */}
                                        {hovered !== null && (
                                          <line
                                            x1={xPos(hovered)}
                                            y1="18"
                                            x2={xPos(hovered)}
                                            y2="84"
                                            stroke="#2dd4bf"
                                            strokeWidth="1.5"
                                            strokeDasharray="3 3"
                                            vectorEffect="non-scaling-stroke"
                                          />
                                        )}
                                      </svg>
                                    </div>
                                  </div>
                                  {/* Hover overlay spanning both charts */}
                                  <div className="absolute inset-0 ml-14 mr-11 flex justify-between items-stretch pointer-events-auto">
                                    {history.map((h, i) => (
                                      <div
                                        key={i}
                                        onMouseEnter={() =>
                                          setHoveredAnnealIndex(i)
                                        }
                                        onMouseLeave={() =>
                                          setHoveredAnnealIndex(null)
                                        }
                                        className="flex-1 h-full cursor-pointer relative group"
                                      />
                                    ))}
                                  </div>

                                  {/* Smart Opposite-Corner Hover Tooltip Box (Zero Obscuration & Zero Extra Gap) */}
                                  {hovered !== null &&
                                    history[hovered] &&
                                    (() => {
                                      const hx = xPos(hovered);
                                      const isRightHalf = hx > 50;
                                      return (
                                        <div
                                          className={`absolute top-2 z-30 rounded-xl border border-teal-400/40 bg-slate-950/90 p-2.5 shadow-[0_10px_25px_rgba(0,0,0,0.8)] backdrop-blur-md text-[10.5px] space-y-1 pointer-events-none transition-all duration-150 ease-out min-w-[165px] ${
                                            isRightHalf ? "left-16" : "right-14"
                                          }`}
                                        >
                                          <div className="font-bold text-teal-300 flex items-center justify-between gap-1 border-b border-white/10 pb-1">
                                            <span className="flex items-center gap-1">
                                              Step #
                                              {history[hovered].step ?? hovered}
                                            </span>
                                            {hovered === bestIndex && (
                                              <span className="bg-emerald-500/20 text-emerald-300 text-[8px] px-1.5 py-0.5 rounded border border-emerald-500/30 font-semibold">
                                                Optimal Best
                                              </span>
                                            )}
                                          </div>
                                          <div className="text-slate-300 flex justify-between gap-3">
                                            <span>Temperature:</span>
                                            <strong className="text-amber-300 font-mono">
                                              {Number(
                                                history[hovered].temperature,
                                              ).toFixed(3)}
                                            </strong>
                                          </div>
                                          <div className="text-slate-300 flex justify-between gap-3">
                                            <span>Energy E(x):</span>
                                            <strong className="text-teal-300 font-mono">
                                              {Number(
                                                history[hovered].energy,
                                              ).toFixed(4)}
                                            </strong>
                                          </div>
                                          <div className="text-slate-300 flex justify-between gap-3">
                                            <span>Best-so-far E*:</span>
                                            <strong className="text-emerald-400 font-mono">
                                              {Number(
                                                history[hovered].best_energy ??
                                                  history[hovered].energy,
                                              ).toFixed(4)}
                                            </strong>
                                          </div>
                                          <div className="text-slate-300 flex justify-between gap-3">
                                            <span>Skill Coverage:</span>
                                            <strong className="text-indigo-300 font-mono">
                                              {Number(
                                                history[hovered].coverage ?? 0,
                                              ).toFixed(1)}
                                              %
                                            </strong>
                                          </div>
                                          <div className="text-slate-300 flex justify-between gap-3 border-t border-white/5 pt-1">
                                            <span>Team Cost:</span>
                                            <strong className="text-cyan-300 font-mono">
                                              {fmtMoney(
                                                history[hovered].cost ?? 0,
                                              )}
                                            </strong>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                </div>

                                {/* X-Axis Step Ticks (real step numbers) */}
                                <div className="ml-14 mr-11 mt-2 flex justify-between items-center text-[10px] font-mono text-slate-400 border-t border-white/10 pt-2">
                                  <span className="flex flex-col items-center">
                                    <span className="text-slate-300 font-bold">
                                      Step {stepAt(0)}
                                    </span>
                                    <span className="text-[9px] text-slate-500">
                                      Initial
                                    </span>
                                  </span>
                                  <span className="flex flex-col items-center">
                                    <span>Step {stepAt(0.25)}</span>
                                  </span>
                                  <span className="flex flex-col items-center">
                                    <span>Step {stepAt(0.5)}</span>
                                  </span>
                                  <span className="flex flex-col items-center">
                                    <span>Step {stepAt(0.75)}</span>
                                  </span>
                                  <span className="flex flex-col items-center">
                                    <span className="text-emerald-300 font-bold">
                                      Step {stepAt(1)}
                                    </span>
                                    <span className="text-[9px] text-emerald-400/80">
                                      {finalIsBest
                                        ? "Final · Optimal"
                                        : "Final"}
                                    </span>
                                  </span>
                                </div>
                              </>
                            );
                          })()}

                          {/* Assembled Team Roster & Skill Coverage Grid */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                            {/* Assembled Team Roster */}
                            <div className="rounded-xl border border-white/5 bg-slate-950 p-4 flex flex-col justify-between">
                              <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
                                <div className="text-[9px] uppercase font-bold tracking-widest text-slate-500">
                                  Assembled Team Roster (
                                  {(optimizedTeam.optimized_team || []).length}{" "}
                                  members)
                                </div>
                                <div className="text-[10px] font-mono text-cyan-300 font-bold">
                                  Total: $
                                  {(
                                    (optimizedTeam.metrics?.total_cost || 0) /
                                    1000
                                  ).toFixed(0)}
                                  k
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
                                          $
                                          {(
                                            (emp.estimated_cost || 0) / 1000
                                          ).toFixed(0)}
                                          k
                                        </div>
                                        <div className="text-[8px] uppercase tracking-wider text-slate-500">
                                          {emp.salary_source ===
                                          "employee_record"
                                            ? "Recorded"
                                            : "Estimated"}
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
                                  Total Skill Coverage
                                </div>
                                <div className="text-xl font-extrabold text-indigo-400">
                                  {optimizedTeam.metrics.coverage_percentage}%
                                </div>
                              </div>
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
                                      Bridge:{" "}
                                      <strong className="text-cyan-400 font-semibold">
                                        {detail.contributed_by_skill || "None"}
                                      </strong>
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
                            Find Mathematically Perfect Team
                          </span>{" "}
                          to execute Simulated Annealing optimization.
                        </div>
                      )}
                    </div>
                  </div>
                }
              />
              <AIExplanationPanel
                subtab="team-builder"
                context={{
                  targetSkills: teamSkillsInput,
                  budget: teamBudget,
                  teamSize: teamSize,
                  optimizedTeam: optimizedTeam,
                }}
                buttonText="Explain with AI"
                autoRefresh={true}
                disabled={!optimizedTeam}
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
              className="min-h-0 lg:flex-1 lg:h-full w-full flex flex-col"
            >
              <MobileSplitPane
                activePane={mobileActivePane}
                setActivePane={setMobileActivePane}
                leftTitle="Employee Hazard Registry"
                rightTitle="Survival Breakdown"
                leftIcon={<Users size={14} />}
                rightIcon={<TrendingUp size={14} />}
                leftWidthClass="lg:w-[320px] xl:w-[340px]"
                leftContent={
                  <div className="premium-card h-auto lg:h-full p-4 md:p-5 border border-white/5 bg-slate-950/40 backdrop-blur-md flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between shrink-0 border-b border-white/5 pb-2 mb-3">
                      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
                        Employee Hazard Registry
                      </h3>
                      <span className="text-[9px] font-mono text-slate-500">
                        {attritionData.length} profiles · Cox PH
                      </span>
                    </div>

                    {/* Search + sort controls */}
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
                          { key: "hazard", label: "Risk" },
                          { key: "name", label: "Name" },
                          { key: "tenure", label: "Tenure" },
                          { key: "percentile", label: "Pct" },
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

                    <div className="space-y-2 flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
                      {attritionLoading ? (
                        <div className="text-xs text-slate-500 text-center py-8">
                          Loading hazard computations...
                        </div>
                      ) : visibleAttrition.length === 0 ? (
                        <div className="text-xs text-slate-600 text-center py-8">
                          No profiles match this search.
                        </div>
                      ) : (
                        visibleAttrition.map((emp) => {
                          const isSel =
                            emp.employee_id ===
                            selectedAttritionEmp?.employee_id;
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
                                    {emp.tenure_months} mo tenure ·{" "}
                                    {emp.skills_count ?? 0} skills
                                  </div>
                                </div>
                                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                                  <span
                                    className="px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider"
                                    style={{
                                      color: tierColor(emp.risk_tier),
                                      background: tierBg(emp.risk_tier),
                                      border: `1px solid ${tierColor(emp.risk_tier)}33`,
                                    }}
                                  >
                                    {emp.risk_tier}
                                  </span>
                                  <div className="text-xs font-black text-rose-300 font-mono">
                                    x{emp.hazard_ratio}
                                  </div>
                                  <div className="text-[8px] text-slate-500 uppercase">
                                    HR · P{emp.risk_percentile}
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
                  <div className="premium-card p-4 md:p-6 border border-white/5 bg-slate-950/20 h-auto lg:h-full flex flex-col overflow-visible lg:overflow-hidden">
                    {selectedAttritionEmp ? (
                      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar space-y-6 pr-1">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3 gap-3">
                          <div className="min-w-0">
                            <div className="text-[9px] uppercase font-bold tracking-widest text-slate-500">
                              Survival Hazard Breakdown & Simulation Sandbox
                            </div>
                            <div className="mt-1 text-[9px] uppercase tracking-wider text-amber-300 truncate">
                              Cox Proportional Hazards ·{" "}
                              {selectedAttritionEmp.model_version ||
                                "cox-ph-industry-v2"}{" "}
                              · calibrated to industry tenure-attrition
                              benchmarks
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
                                  12-Month Survival Curve S(t) · Cox PH
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
                                  95% Model Band
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

                                        {/* Employee 95% CI band */}
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
                                        <span>95% CI</span>
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
                                  Flight Risk Mitigation Simulator
                                </h4>
                                <div className="flex items-center gap-2">
                                  <span className="text-[8px] font-mono text-slate-500">
                                    live Cox PH recompute
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
                                    <span>Skill Load (assigned skills)</span>
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

                          {/* Right: SHAP / Feature Contributions */}
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
                                  Baseline Covariates (SHAP Explainability)
                                </div>
                                <span className="text-[8px] font-mono text-slate-600">
                                  live with sandbox
                                </span>
                              </div>

                              {/* SHAP waterfall */}
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
                    ) : (
                      <div className="text-slate-400 text-sm py-20 text-center">
                        Select an employee from the left panel to review
                        attrition survival analytics.
                      </div>
                    )}
                  </div>
                }
              />
              <AIExplanationPanel
                subtab="attrition"
                context={{
                  selectedEmployee: selectedAttritionEmp,
                  populationStats: populationStats,
                  baseline: attritionBaseline,
                  simulation: attritionSim,
                  covariates: attritionCovs,
                  moraleSlider: moraleSlider,
                  salarySlider: salarySlider,
                  workloadSlider: workloadSlider,
                }}
                buttonText="Explain with AI"
                autoRefresh={true}
                disabled={!selectedAttritionEmp}
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
              className="min-h-0 lg:flex-1 lg:h-full w-full flex flex-col"
            >
              <MobileSplitPane
                activePane={mobileActivePane}
                setActivePane={setMobileActivePane}
                leftTitle="3D Collaboration Space"
                rightTitle="Network Intelligence"
                leftIcon={<Share2 size={14} />}
                rightIcon={<Activity size={14} />}
                leftWidthClass="lg:w-[60%] xl:w-[63%]"
                leftContent={
                  <div className="premium-card p-4 md:p-5 border border-white/5 bg-slate-950/30 backdrop-blur-xl flex flex-col justify-between relative overflow-hidden h-auto lg:h-full">
                    <div className="flex-1 flex flex-col min-h-0">
                      {/* Top Canvas Bar with Filter & Search Controls */}
                      <div className="flex flex-wrap items-center justify-between border-b border-white/5 pb-3 mb-3 gap-2 shrink-0">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">
                              3D Enterprise Network Space
                            </h3>
                            <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-[8.5px] font-mono font-bold text-cyan-300">
                              {onaData?.nodes?.length || 0} Nodes ·{" "}
                              {onaData?.links?.length || 0} Links
                            </span>
                          </div>
                          <p className="mt-0.5 text-[9.5px] text-slate-400">
                            Multi-cluster 3D orbital physics · PageRank
                            influence · Brandes betweenness bridges
                          </p>
                        </div>

                        {/* Search in 3D Canvas */}
                        <div className="flex items-center gap-1.5">
                          <div className="relative">
                            <Search
                              size={11}
                              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                            />
                            <input
                              type="text"
                              value={onaSearchQuery}
                              onChange={(e) =>
                                setOnaSearchQuery(e.target.value)
                              }
                              placeholder="Find member in 3D space..."
                              className="rounded-lg border border-white/10 bg-slate-950/80 pl-7 pr-2 py-1 text-[9.5px] text-white placeholder:text-slate-600 outline-none focus:border-cyan-400/50 w-36 sm:w-44"
                            />
                          </div>

                          {/* Department Filter */}
                          <select
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
                        </div>
                      </div>

                      {/* 3D Force Canvas Container */}
                      <div className="relative flex-1 min-h-[420px] lg:min-h-0 w-full touch-none border border-white/10 bg-[#020408] backdrop-blur-2xl rounded-2xl overflow-hidden flex items-center justify-center select-none shadow-inner">
                        {onaLoading ? (
                          <div className="text-slate-400 text-xs flex items-center gap-2">
                            <RefreshCw
                              size={14}
                              className="animate-spin text-cyan-400"
                            />
                            Resolving 3D enterprise topology & Brandes paths...
                          </div>
                        ) : !onaData?.nodes?.length ? (
                          <div className="text-slate-400 text-xs flex flex-col items-center gap-2 px-6 text-center">
                            <Users size={16} className="text-cyan-400/60" />
                            No collaboration network available yet.
                          </div>
                        ) : (
                          <OnaGraph3DCanvas
                            nodes={onaData.nodes}
                            links={onaData.links}
                            colorMode={onaColorMode}
                            deptFilter={onaDeptFilter}
                            searchQuery={onaSearchQuery}
                            selectedId={selectedOnaNode?.id ?? null}
                            onSelect={(node) => {
                              setSelectedOnaNode(node);
                              setMobileActivePane("right");
                            }}
                            onCameraChange={setOnaCamera}
                            onColorModeChange={setOnaColorMode}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                }
                rightContent={
                  <div className="premium-card p-4 md:p-5 border border-white/5 bg-slate-950/40 backdrop-blur-xl flex flex-col justify-between h-auto lg:h-full w-full overflow-y-auto custom-scrollbar space-y-4">
                    {selectedOnaNode ? (
                      <>
                        {/* Employee Node Header */}
                        <div className="border-b border-white/5 pb-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500">
                              Selected Node Centrality
                            </span>
                            <span
                              className="px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider"
                              style={{
                                color: getNodeColor(selectedOnaNode),
                                background: `${getNodeColor(selectedOnaNode)}18`,
                                border: `1px solid ${getNodeColor(selectedOnaNode)}44`,
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
                            {selectedOnaNode.degree || 0} Direct Ties
                          </div>
                        </div>

                        {/* 4-Vector Centrality Metrics */}
                        <div className="grid grid-cols-2 gap-2.5">
                          {/* PageRank Centrality */}
                          <div className="rounded-xl border border-white/5 bg-slate-950/80 p-3">
                            <div className="text-[8.5px] uppercase tracking-widest text-slate-500 font-bold">
                              PageRank (Influence)
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
                              Betweenness (Bridges)
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
                              Closeness (Diffusion)
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
                                (selectedOnaNode.ei_silo_index || 0) > 0
                                  ? "text-emerald-300"
                                  : "text-rose-400"
                              }`}
                            >
                              {(selectedOnaNode.ei_silo_index || 0) > 0
                                ? `+${selectedOnaNode.ei_silo_index}`
                                : selectedOnaNode.ei_silo_index}
                            </div>
                            <div className="text-[8px] text-slate-500 mt-1 uppercase truncate">
                              {(selectedOnaNode.ei_silo_index || 0) > 0
                                ? "Cross-Dept Spanner"
                                : "Dept Siloed"}
                            </div>
                          </div>
                        </div>

                        {/* Direct 1st-Degree Collaborators (Ego Network) */}
                        <div className="rounded-xl border border-white/5 bg-slate-950/70 p-3.5 space-y-2">
                          <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                            <span className="text-[9px] uppercase tracking-widest font-bold text-cyan-300">
                              Active Collaborators (
                              {selectedNodeNeighbors.length})
                            </span>
                            <span className="text-[8px] text-slate-500 font-mono">
                              Weight / Tie
                            </span>
                          </div>
                          {selectedNodeNeighbors.length === 0 ? (
                            <div className="text-[10px] text-slate-500 py-2 text-center">
                              No direct links detected
                            </div>
                          ) : (
                            <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                              {selectedNodeNeighbors
                                .slice(0, 6)
                                .map(({ node, weight, isCross }) => (
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
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {isCross && (
                                        <span className="px-1 py-0.5 rounded bg-purple-500/20 text-[7.5px] font-bold text-purple-300 uppercase">
                                          Cross-Dept
                                        </span>
                                      )}
                                      <span className="text-[9.5px] font-mono font-bold text-cyan-300">
                                        {(weight * 100).toFixed(0)}%
                                      </span>
                                    </div>
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>

                        {/* Top Key Influencers & Cross-Silo Brokers */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {/* Influencers */}
                          <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3 space-y-1.5">
                            <span className="text-[8.5px] uppercase tracking-widest font-bold text-amber-300 block border-b border-white/5 pb-1">
                              Top Influencers
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
                              Key Bridge Brokers
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
                            Density: {onaData?.metrics?.graph_density || "0.08"}{" "}
                            · Cross-Dept:{" "}
                            {(
                              (onaData?.metrics?.cross_dept_ratio || 0.42) * 100
                            ).toFixed(0)}
                            %
                          </span>
                          <span>Brandes + PageRank</span>
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
              <AIExplanationPanel
                subtab="ona"
                context={{
                  nodes: onaData?.nodes || [],
                  links: onaData?.links || [],
                  selectedNode: selectedOnaNode,
                  camera: onaCamera,
                  departments: availableDepts,
                  metrics: onaData?.metrics || {},
                }}
                buttonText="Explain with AI"
                autoRefresh={false}
                disabled={
                  !onaData || !onaData.nodes || onaData.nodes.length === 0
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
              className="min-h-0 lg:flex-1 lg:h-full w-full flex flex-col"
            >
              <MobileSplitPane
                activePane={mobileActivePane}
                setActivePane={setMobileActivePane}
                leftTitle="Employee Profile"
                rightTitle="Transition Horizon"
                leftIcon={<Users size={14} />}
                rightIcon={<Sparkles size={14} />}
                leftWidthClass="lg:w-[300px] xl:w-[320px]"
                leftContent={
                  <div className="premium-card p-4 md:p-5 border border-white/5 bg-slate-950/40 backdrop-blur-md flex flex-col justify-between h-auto lg:h-full">
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

                        {careerPathData && (
                          <div className="rounded-xl border border-white/5 bg-slate-950 p-4">
                            <div className="text-[9px] uppercase tracking-widest text-slate-500 mb-1">
                              Starting Node
                            </div>
                            <div className="text-sm font-black text-white">
                              {careerPathData.current_role}
                            </div>
                            <div className="text-[9px] text-indigo-400 uppercase mt-0.5">
                              Markov Chain State
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                }
                rightContent={
                  <div className="premium-card p-4 md:p-6 border border-white/5 bg-slate-950/20 h-auto lg:h-full lg:overflow-y-auto">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-6">
                      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
                        Markov Career Transition Horizon
                      </h3>
                      <span className="text-[10px] text-slate-500">
                        {careerPathData?.model_version || "markov-career-v1"} ·
                        modeled probabilities
                      </span>
                    </div>

                    {careerLoading ? (
                      <div className="text-xs text-slate-500 text-center py-20">
                        Matrix Multiplications under calculations...
                      </div>
                    ) : careerPathData ? (
                      <div className="space-y-8 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/5 z-0">
                        {careerPathData.career_progression_markov.map(
                          (step, idx) => (
                            <div key={idx} className="relative pl-10 z-10">
                              {/* Dot indicator */}
                              <div className="absolute left-2.5 top-1.5 h-3 w-3 rounded-full border border-indigo-400 bg-slate-950 z-20 flex items-center justify-center">
                                <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                              </div>

                              <div className="mb-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                                  {step.projected_time_horizon} Horizon
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {step.possibilities.map((pos, pIdx) => (
                                  <div
                                    key={pIdx}
                                    className="rounded-xl border border-white/5 bg-slate-950 p-4 flex flex-col justify-between"
                                  >
                                    <div className="flex justify-between items-start mb-3">
                                      <div>
                                        <div className="font-bold text-white text-sm">
                                          {pos.role}
                                        </div>
                                        <div className="text-[9px] text-slate-500 mt-0.5 uppercase">
                                          Target Transition State
                                        </div>
                                      </div>
                                      <span className="text-[10px] font-black text-cyan-300 bg-cyan-400/5 border border-cyan-400/10 px-2 py-0.5 rounded">
                                        {(
                                          pos.transition_probability * 100
                                        ).toFixed(0)}
                                        % Prob.
                                      </span>
                                    </div>

                                    {/* Skill gaps */}
                                    {pos.skill_gaps.length > 0 ? (
                                      <div className="space-y-1.5 border-t border-white/5 pt-2.5">
                                        <div className="text-[8px] uppercase tracking-wider text-slate-500 font-bold mb-1">
                                          Required skill transitions
                                        </div>
                                        {pos.skill_gaps.map((gap, gIdx) => (
                                          <div
                                            key={gIdx}
                                            className="flex justify-between items-center text-[9px] border-b border-white/5 pb-1"
                                          >
                                            <span className="text-slate-400">
                                              {gap.skill}
                                            </span>
                                            <span
                                              className={`font-mono text-[9px] ${gap.difficulty.includes("Easy") ? "text-emerald-400" : gap.difficulty.includes("Medium") ? "text-amber-400" : "text-rose-400"}`}
                                            >
                                              {gap.difficulty}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="border-t border-white/5 pt-2.5 text-[9px] text-emerald-400">
                                        ✓ Zero skill nodes missing for
                                        transition.
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    ) : (
                      <div className="text-slate-400 text-sm py-16 text-center">
                        Select an employee tracking profile to evaluate Markov
                        Career progression path mapping.
                      </div>
                    )}
                  </div>
                }
              />
              <AIExplanationPanel
                subtab="career-path"
                context={{
                  employees: careerEmployees,
                  selectedEmployeeId: selectedCareerEmpId,
                  careerPathData: careerPathData,
                }}
                buttonText="Explain with AI"
                autoRefresh={false}
                disabled={!careerPathData}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default IntelligenceCenterView;
