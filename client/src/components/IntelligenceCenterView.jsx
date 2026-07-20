import React, { useState, useEffect, useRef } from "react";
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
  CheckCircle,
  Plus,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { UserManualButton } from "./UserManual";

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

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5100";
  const response = await fetch(`${API_BASE}/api/v1/intelligence${url}`, config);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "API Call Failed");
  }
  return response.json();
};

const IntelligenceCenterView = () => {
  const [activeSubTab, setActiveSubTab] = useState("skill-match");

  // 1. Skill Match State
  const [matchSkillsInput, setMatchSkillsInput] = useState([
    { name: "React", level: 4 },
    { name: "FastAPI", level: 3 },
  ]);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillLevel, setNewSkillLevel] = useState(3);
  const [matchResults, setMatchResults] = useState([]);
  const [matchingLoading, setMatchingLoading] = useState(false);
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
  const [shuffledTeamNames, setShuffledTeamNames] = useState([]);

  // 3. Attrition State
  const [attritionData, setAttritionData] = useState([]);
  const [selectedAttritionEmp, setSelectedAttritionEmp] = useState(null);
  const [attritionLoading, setAttritionLoading] = useState(false);

  // Cox Simulator Parameters Sandbox
  const [moraleSlider, setMoraleSlider] = useState(0.8);
  const [salarySlider, setSalarySlider] = useState(0.0); // 0% to 50% increase
  const [workloadSlider, setWorkloadSlider] = useState(3); // density of skills
  const [simulatedSurvivalProb, setSimulatedSurvivalProb] = useState(0.95);
  const [simulatedHazardRatio, setSimulatedHazardRatio] = useState(1.0);
  const [simulatedForecast, setSimulatedForecast] = useState([]);

  // 4. ONA State
  const [onaData, setOnaData] = useState({ nodes: [], links: [] });
  const [onaLoading, setOnaLoading] = useState(false);
  const [selectedOnaNode, setSelectedOnaNode] = useState(null);

  // ONA Physics Simulation State
  const [nodesState, setNodesState] = useState([]);
  const dragNodeRef = useRef(null);
  const canvasRef = useRef(null);

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

  // Trigger Cox Hazard Sandbox Recalculations locally when sliders or selected user changes
  useEffect(() => {
    if (!selectedAttritionEmp) return;

    // Morale effect: morale index goes from 0.0 to 1.0 (base morale was original sentiment score)
    const originalMorale = selectedAttritionEmp.sentiment_score ?? 0.5;
    const moraleDelta = moraleSlider - originalMorale;
    const moraleEffect = -2.5 * moraleDelta;

    // Salary boost effect: reduces risk
    const salaryEffect = -1.8 * salarySlider;

    // Workload / Skill fatigue effect: more skills increases risk slightly
    const originalSkillsCount =
      selectedAttritionEmp.covariates_explain.find((c) =>
        c.factor.includes("Skill"),
      )?.val ?? 5;
    const workloadDelta = workloadSlider - originalSkillsCount;
    const workloadEffect = 0.25 * workloadDelta;

    // Calculate simulated hazard ratio
    const logHazardRatio = moraleEffect + salaryEffect + workloadEffect;
    const nextHazardMultiplier = Math.max(0.05, Math.exp(logHazardRatio));
    setSimulatedHazardRatio(nextHazardMultiplier);

    // Baseline survival timeline (Gaussian peaks around 12mo and 36mo)
    const tenureMonths = selectedAttritionEmp.tenure_months ?? 12;
    const nextForecast = [];
    let cumulativeHazard = 0.0;

    for (let m = 1; m <= 12; m++) {
      const projected_t = tenureMonths + m;
      const peak_1yr = Math.exp(-0.5 * Math.pow((projected_t - 12.0) / 3.0, 2));
      const peak_3yr = Math.exp(-0.5 * Math.pow((projected_t - 36.0) / 6.0, 2));
      const future_baseline = 0.04 + 0.1 * peak_1yr + 0.06 * peak_3yr;

      cumulativeHazard += future_baseline * nextHazardMultiplier;
      const survivalProb = Math.exp(-cumulativeHazard);

      nextForecast.append
        ? null
        : nextForecast.push({
            month: m,
            survival_probability: Math.max(0.01, Math.min(1.0, survivalProb)),
            attrition_probability: Math.max(
              0.0,
              Math.min(0.99, 1.0 - survivalProb),
            ),
          });
    }

    setSimulatedForecast(nextForecast);
    setSimulatedSurvivalProb(nextForecast[11]?.survival_probability ?? 0.9);
  }, [moraleSlider, salarySlider, workloadSlider, selectedAttritionEmp]);

  // Sync selected employee state
  useEffect(() => {
    if (selectedAttritionEmp) {
      setMoraleSlider(selectedAttritionEmp.sentiment_score ?? 0.5);
      const skillCov = selectedAttritionEmp.covariates_explain.find((c) =>
        c.factor.includes("Skill"),
      );
      setWorkloadSlider(skillCov ? skillCov.val : 5);
      setSalarySlider(0.0);
    }
  }, [selectedAttritionEmp]);

  async function fetchAttrition() {
    try {
      setAttritionLoading(true);
      const data = await apiCall("/attrition-hazard");
      setAttritionData(data);
      if (data.length > 0) {
        setSelectedAttritionEmp(data[0]);
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
      const data = await apiCall("/ona");
      setOnaData(data);

      // Initialize physics layout positions
      if (data.nodes && data.nodes.length > 0) {
        const initialNodes = data.nodes.map((node, idx) => {
          const angle = (idx / data.nodes.length) * 2 * Math.PI;
          return {
            ...node,
            x: 250 + 185 * Math.cos(angle) + (Math.random() - 0.5) * 20,
            y: 250 + 185 * Math.sin(angle) + (Math.random() - 0.5) * 20,
            vx: 0,
            vy: 0,
          };
        });
        setNodesState(initialNodes);
        setSelectedOnaNode(data.nodes[0]);
      }
      setOnaLoading(false);
    } catch (err) {
      console.error(err);
      setOnaLoading(false);
    }
  }

  // Physics animation tick for draggable ONA Graph
  useEffect(() => {
    if (nodesState.length === 0 || activeSubTab !== "ona") return;

    let animId;
    const tick = () => {
      setNodesState((prev) => {
        // Create lookup Map for easy reference
        const nodeMap = {};
        prev.forEach((n, i) => {
          nodeMap[n.id] = i;
        });

        // Clone nodes to update physics positions
        const nextNodes = prev.map((n) => ({
          ...n,
          vx: n.vx * 0.85,
          vy: n.vy * 0.85,
        }));

        // 1. Repulsion force between all nodes
        for (let i = 0; i < nextNodes.length; i++) {
          const n1 = nextNodes[i];
          for (let j = i + 1; j < nextNodes.length; j++) {
            const n2 = nextNodes[j];
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const distSq = dx * dx + dy * dy + 1.0;
            const dist = Math.sqrt(distSq);
            if (dist < 180) {
              const force = 10.0 / distSq;
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;

              if (n1.id !== dragNodeRef.current) {
                nextNodes[i].vx -= fx;
                nextNodes[i].vy -= fy;
              }
              if (n2.id !== dragNodeRef.current) {
                nextNodes[j].vx += fx;
                nextNodes[j].vy += fy;
              }
            }
          }
        }

        // 2. Attraction force along connections
        onaData.links.forEach((link) => {
          const idxSrc = nodeMap[link.source];
          const idxTgt = nodeMap[link.target];
          if (idxSrc === undefined || idxTgt === undefined) return;

          const nSrc = nextNodes[idxSrc];
          const nTgt = nextNodes[idxTgt];
          const dx = nTgt.x - nSrc.x;
          const dy = nTgt.y - nSrc.y;
          const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
          const desiredDist = 120;
          const force = (dist - desiredDist) * 0.015 * link.weight;

          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (nSrc.id !== dragNodeRef.current) {
            nextNodes[idxSrc].vx += fx;
            nextNodes[idxSrc].vy += fy;
          }
          if (nTgt.id !== dragNodeRef.current) {
            nextNodes[idxTgt].vx -= fx;
            nextNodes[idxTgt].vy -= fy;
          }
        });

        // 3. Center gravity force
        nextNodes.forEach((n, i) => {
          if (n.id === dragNodeRef.current) return;
          const dx = 250 - n.x;
          const dy = 250 - n.y;
          nextNodes[i].vx += dx * 0.003;
          nextNodes[i].vy += dy * 0.003;
        });

        // 4. Update coordinates with velocities
        nextNodes.forEach((n, i) => {
          if (n.id === dragNodeRef.current) return;
          let nextX = n.x + n.vx;
          let nextY = n.y + n.vy;
          // Boundary collision
          nextX = Math.max(25, Math.min(475, nextX));
          nextY = Math.max(25, Math.min(475, nextY));
          nextNodes[i].x = nextX;
          nextNodes[i].y = nextY;
        });

        return nextNodes;
      });
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [nodesState, onaData, activeSubTab]);

  const handleNodeMouseDown = (nodeId) => {
    dragNodeRef.current = nodeId;
    const rect = canvasRef.current ? canvasRef.current.getBoundingClientRect() : null;
    const updateCoords = (moveEvent) => {
      if (!rect) return;
      const clientX = moveEvent.clientX ?? moveEvent.touches?.[0]?.clientX;
      const clientY = moveEvent.clientY ?? moveEvent.touches?.[0]?.clientY;

      const x = ((clientX - rect.left) / rect.width) * 500;
      const y = ((clientY - rect.top) / rect.height) * 500;

      setNodesState((prev) =>
        prev.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                x: Math.max(20, Math.min(480, x)),
                y: Math.max(20, Math.min(480, y)),
                vx: 0,
                vy: 0,
              }
            : n,
        ),
      );
    };

    const handleMouseUp = () => {
      dragNodeRef.current = null;
      window.removeEventListener("mousemove", updateCoords);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", updateCoords);
      window.removeEventListener("touchend", handleMouseUp);
    };

    window.addEventListener("mousemove", updateCoords);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", updateCoords);
    window.addEventListener("touchend", handleMouseUp);
  };

  async function fetchCareerEmployees() {
    try {
      const API_BASE =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5100";
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
      const results = await apiCall("/skill-match", "POST", {
        target_skills: matchSkillsInput,
      });
      setMatchResults(results);
      if (results.length > 0) {
        setActiveMatchEmployeeId(results[0].employee_id);
      }
      setMatchingLoading(false);
    } catch (err) {
      console.error(err);
      setMatchingLoading(false);
    }
  };

  // 2. Team Optimize Actions (Simulated Annealing Live Simulation)
  const triggerTeamOptimize = async () => {
    if (teamSkillsInput.length === 0) return;
    try {
      setOptimizingLoading(true);
      setAnnealingStatus("running");
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

      // Live slot machine roster swap animations
      const mockNamesPool = [
        "Aurelia Vance",
        "Cyrus Sterling",
        "Silas Thorne",
        "Maeve Brooks",
        "Julian Cross",
        "Dante Blackwell",
        "Eleni Moretti",
        "Leona Mercer",
        "Gideon Cole",
        "Fiona Hayes",
      ];

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
          // Shuffle mock roster visually
          const stepData =
            history[currentSimIndex] || history[history.length - 1];
          setAnnealingStep(stepData.step);
          setAnnealingTemp(stepData.temperature);
          setAnnealingHistory(history.slice(0, currentSimIndex + 1));

          // Generate active random names to show visual state changes
          const randomSelection = Array.from({ length: teamSize }).map(
            () =>
              mockNamesPool[Math.floor(Math.random() * mockNamesPool.length)],
          );
          setShuffledTeamNames(randomSelection);
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
    <div className="min-h-full pb-10">
      {/* Top Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 border-b border-white/5 pb-6">
        <div className="flex-1 flex items-start justify-between">
          <div className="text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/5 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-2">
              <Cpu size={10} className="animate-spin-slow" /> Math-Engine &
              Optimization
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2 text-white">
              Intelligence Center
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed max-w-3xl">
              Aurelinx state-of-the-art decision workbench. Powered by graph
              theory, combinatorial solvers, survival models, and Markov
              transition matrices.
            </p>
          </div>
          <UserManualButton defaultTab="intelligence" className="ml-4 mt-8" />
        </div>
      </header>



      {/* Main Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-white/5 pb-4 mb-6">
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
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer select-none ${activeSubTab === tab.id ? "border-primary/40 bg-primary/10 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" : "border-white/5 bg-white/2 text-slate-400 hover:text-slate-200 hover:border-white/10"}`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* TABS CONTAINER */}
      <div className="relative">
        <AnimatePresence mode="wait">
          {/* TAB 1: SKILL GRAPH DIJKSTRA MATCH */}
          {activeSubTab === "skill-match" && (
            <motion.div
              key="skill-match"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 text-left"
            >
              {/* Left Settings */}
              <div className="space-y-6">
                <div className="premium-card p-5 border border-white/5 bg-slate-950/40 backdrop-blur-md">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300 mb-4 border-b border-white/5 pb-2 flex items-center gap-2">
                    <Briefcase size={14} className="text-indigo-400" /> Define
                    Target Requirements
                  </h3>

                  {/* Skill Add Input */}
                  <div className="space-y-3 mb-6">
                    <div>
                      <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1 block">
                        Skill Node
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. PyTorch, React, FastAPI"
                        value={newSkillName}
                        onChange={(e) => setNewSkillName(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1 block">
                        Min Proficiency
                      </label>
                      <select
                        value={newSkillLevel}
                        onChange={(e) =>
                          setNewSkillLevel(Number(e.target.value))
                        }
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        {[1, 2, 3, 4, 5].map((v) => (
                          <option key={v} value={v}>
                            Lvl {v}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={addSkillMatchReq}
                      className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold uppercase tracking-wider text-white transition-all inline-flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      <Plus size={14} /> Add Skill requirement
                    </button>
                  </div>

                  {/* List of current targets */}
                  <div className="space-y-2 max-h-[180px] overflow-y-auto custom-scrollbar border-t border-white/5 pt-3">
                    {matchSkillsInput.map((skill, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl px-3 py-2"
                      >
                        <div className="text-xs">
                          <span className="font-bold text-white">
                            {skill.name}
                          </span>
                          <span className="text-indigo-400 ml-2">
                            Lvl {skill.level}
                          </span>
                        </div>
                        <button
                          onClick={() => removeSkillMatchReq(idx)}
                          className="text-rose-400 hover:text-rose-300"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    {matchSkillsInput.length === 0 && (
                      <div className="text-xs text-slate-500 text-center py-4">
                        No skills requirements added yet.
                      </div>
                    )}
                  </div>

                  <button
                    onClick={triggerSkillMatch}
                    disabled={matchingLoading || matchSkillsInput.length === 0}
                    className="w-full mt-6 h-11 rounded-xl border border-primary bg-primary/10 hover:bg-primary/20 text-xs font-bold uppercase tracking-wider text-primary transition-all inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Search size={14} />{" "}
                    {matchingLoading
                      ? "Graph Traversing..."
                      : "Solve Adjacencies"}
                  </button>
                </div>
              </div>

              {/* Right Output */}
              <div className="premium-card p-6 border border-white/5 bg-slate-950/20">
                <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-6">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
                    Semantic Matching Matrix & Path Analysis
                  </h3>
                  <span className="text-[10px] text-slate-500">
                    Shortest Path Dijkstra Weighting
                  </span>
                </div>

                {matchResults.length > 0 ? (
                  <div className="grid grid-cols-1 xl:grid-cols-[250px_1fr] gap-6">
                    {/* Left list of employees */}
                    <div className="space-y-2 border-r border-white/5 pr-4">
                      {matchResults.map((result) => (
                        <button
                          key={result.employee_id}
                          onClick={() => {
                            setActiveMatchEmployeeId(result.employee_id);
                          }}
                          className={`w-full text-left p-3.5 rounded-xl border transition-all relative overflow-hidden select-none cursor-pointer ${result.employee_id === activeMatchEmployeeId ? "border-primary bg-primary/5" : "border-white/5 bg-white/2 hover:border-white/10 hover:bg-white/[0.04]"}`}
                        >
                          <div className="font-bold text-white text-xs">
                            {result.full_name}
                          </div>
                          <div className="text-[9px] text-slate-400 mt-1 uppercase tracking-wider">
                            {result.role}
                          </div>
                          <div className="flex items-center justify-between mt-3 border-t border-white/5 pt-2">
                            <span className="text-[9px] uppercase font-semibold text-slate-500">
                              Compatibility
                            </span>
                            <span className="text-xs font-black text-primary">
                              {(
                                result.match_details.overall_compatibility * 100
                              ).toFixed(0)}
                              %
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Right Dijkstra Path Details */}
                    <div className="space-y-6">
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

                              <div className="space-y-3">
                                {activeMatch.match_details.detailed_matches.map(
                                  (detail, idx) => (
                                    <div
                                      key={idx}
                                      className="rounded-xl border border-white/5 bg-slate-950 p-4"
                                    >
                                      <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                                        <div className="text-xs font-bold text-white">
                                          Target Skill: {detail.target_skill} (L
                                          {detail.target_level})
                                        </div>
                                        <span
                                          className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
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
                                      <div className="flex items-center flex-wrap gap-2 text-xs">
                                        {detail.matched_by_skill ? (
                                          <>
                                            <div className="bg-white/5 px-2 py-1 rounded border border-white/10 text-slate-200">
                                              {detail.matched_by_skill}
                                            </div>
                                            {detail.semantic_distance > 0 && (
                                              <>
                                                <div className="text-slate-500 flex flex-col items-center">
                                                  <span className="text-[8px] text-indigo-400 font-mono">
                                                    Weight:{" "}
                                                    {detail.semantic_distance}
                                                  </span>
                                                  <span className="text-indigo-400">
                                                    ➔
                                                  </span>
                                                </div>
                                                <div className="bg-indigo-950 px-2 py-1 rounded border border-indigo-500/30 text-indigo-300">
                                                  {detail.target_skill}
                                                </div>
                                              </>
                                            )}
                                          </>
                                        ) : (
                                          <span className="text-rose-400 font-mono text-[10px]">
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
                            <div className="rounded-xl border border-white/5 bg-slate-950 p-4 flex flex-col justify-between">
                              <div>
                                <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-2">
                                  Shortest Path Graph View
                                </div>
                                <div className="text-[10px] text-slate-400 leading-relaxed mb-4">
                                  Dijkstra nodes in neon green are present in
                                  candidate profile. Lines light up in cyan
                                  showing path transitions.
                                </div>
                              </div>

                              <div className="relative h-72 border border-white/5 rounded-lg overflow-hidden bg-slate-950/80">
                                <svg
                                  className="absolute inset-0 h-full w-full pointer-events-none"
                                  viewBox="0 0 1000 550"
                                >
                                  {/* Links */}
                                  {SKILL_GRAPH_LINKS.map((link, idx) => {
                                    const src = SKILL_GRAPH_COORDS[link.source];
                                    const tgt = SKILL_GRAPH_COORDS[link.target];
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
                                            isActivePath ? "#2dd4bf" : "#ffffff"
                                          }
                                          strokeOpacity={
                                            isActivePath ? 0.9 : 0.05
                                          }
                                          strokeWidth={isActivePath ? 3.5 : 1}
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
                                            r={isHighlighted ? 15 : 7}
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
                                            style={{ transition: "all 0.5s" }}
                                          />
                                          <text
                                            x={node.x}
                                            y={node.y - 12}
                                            fill={
                                              isHighlighted
                                                ? "#ffffff"
                                                : "#475569"
                                            }
                                            fontSize="13"
                                            fontWeight={
                                              isHighlighted ? "black" : "normal"
                                            }
                                            textAnchor="middle"
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
                  <div className="text-slate-400 text-sm py-20 text-center">
                    Enter target requirements and click solve to run graph
                    shortest-path matching.
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 2: OPTIMAL TEAM ASSEMBLY (SIMULATED ANNEALING) */}
          {activeSubTab === "team-builder" && (
            <motion.div
              key="team-builder"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 text-left"
            >
              {/* Left Config */}
              <div className="space-y-6">
                <div className="premium-card p-5 border border-white/5 bg-slate-950/40 backdrop-blur-md">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300 mb-4 border-b border-white/5 pb-2">
                    Combinatorial Constraints
                  </h3>

                  {/* Inputs */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1.5 block">
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
                          className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1.5 block">
                        Max Team Size
                      </label>
                      <input
                        type="number"
                        min="2"
                        max="6"
                        value={teamSize}
                        onChange={(e) => setTeamSize(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Skills Requirements */}
                    <div>
                      <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-2 block">
                        Skill Matrix Demands
                      </label>
                      <div className="flex gap-2 mb-3">
                        <input
                          type="text"
                          id="team-skill-name"
                          placeholder="e.g. AWS, Python, Docker"
                          className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
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
                          className="h-8 px-3 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-200 cursor-pointer"
                        >
                          Add
                        </button>
                      </div>
                      <div className="space-y-1.5 max-h-[140px] overflow-y-auto custom-scrollbar">
                        {teamSkillsInput.map((skill, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between bg-white/5 rounded-lg px-2.5 py-1 text-xs"
                          >
                            <span className="text-white font-bold">
                              {skill.name}
                            </span>
                            <div className="flex items-center gap-2">
                              <select
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
                              </select>
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
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={triggerTeamOptimize}
                    disabled={optimizingLoading || teamSkillsInput.length === 0}
                    className="w-full mt-6 h-11 rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-500/90 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition-all inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Play size={14} />{" "}
                    {optimizingLoading
                      ? "Simulated Annealing Run..."
                      : "Find Mathematically Perfect Team"}
                  </button>
                </div>
              </div>

              {/* Right Graph/Output */}
              <div className="premium-card p-6 border border-white/5 bg-slate-950/20 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-6">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
                      Optimization Assembly Results
                    </h3>
                    <span className="text-[10px] text-slate-500">
                      Metropolis Hastings Simulated Annealing
                    </span>
                  </div>

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
                          style={{ width: `${(annealingTemp / 10.0) * 100}%` }}
                        />
                      </div>

                      {/* visual slots random team selection */}
                      <div className="flex gap-2">
                        {shuffledTeamNames.map((name, i) => (
                          <div
                            key={i}
                            className="px-3 py-2 bg-slate-900 border border-white/10 text-slate-300 font-mono text-[10px] uppercase rounded-lg animate-pulse"
                          >
                            {name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {annealingStatus === "complete" && optimizedTeam && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left: Team Members & Budget Check */}
                      <div className="space-y-4">
                        <div className="rounded-xl border border-white/5 bg-slate-950 p-4 relative overflow-hidden">
                          <div className="absolute top-2 right-2 flex items-center justify-center h-8 w-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            <CheckCircle size={16} />
                          </div>
                          <div className="text-[9px] uppercase font-bold tracking-widest text-slate-500 mb-1">
                            Total Team Cost
                          </div>
                          <div className="text-2xl font-black text-white">
                            ${optimizedTeam.metrics.total_cost.toLocaleString()}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span
                              className={`h-2 w-2 rounded-full ${optimizedTeam.metrics.is_under_budget ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-rose-400"}`}
                            />
                            <span className="text-[10px] text-slate-400">
                              {optimizedTeam.metrics.is_under_budget
                                ? "Under CFO Budget Cap"
                                : "Exceeds budget cap"}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">
                            Assembly Roster
                          </div>
                          {optimizedTeam.optimized_team.map((emp) => (
                            <div
                              key={emp.id}
                              className="rounded-xl border border-white/5 bg-white/2 p-3 flex items-center justify-between hover:bg-white/[0.04] transition-all"
                            >
                              <div>
                                <div className="font-bold text-white text-xs">
                                  {emp.full_name}
                                </div>
                                <div className="text-[9px] text-slate-400 uppercase tracking-wider mt-0.5">
                                  {emp.role}
                                </div>
                              </div>
                              <div className="text-xs font-black text-slate-400">
                                ${emp.estimated_cost.toLocaleString()}/yr
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right: Convergence Graph and Skills Coverage */}
                      <div className="space-y-4">
                        {/* Interactive convergence stats */}
                        <div className="rounded-xl border border-white/5 bg-slate-950 p-4">
                          <div className="flex justify-between items-center mb-3">
                            <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
                              Convergence Timeline
                            </div>
                            <span className="text-[9px] font-mono text-cyan-300">
                              Annealing Steps:{" "}
                              {optimizedTeam.total_optimization_steps}
                            </span>
                          </div>

                          {/* Simulated SVG Graph showing annealing energy curve */}
                          <div className="h-28 w-full border-b border-l border-white/5 relative bg-black/20 rounded">
                            <svg
                              className="absolute inset-0 h-full w-full pointer-events-none"
                              viewBox="0 0 100 100"
                              preserveAspectRatio="none"
                            >
                              <polyline
                                fill="none"
                                stroke="#2dd4bf"
                                strokeWidth="2.5"
                                points={annealingHistory
                                  .map((h, i, arr) => {
                                    const x = (i / (arr.length - 1)) * 100;
                                    const energies = arr.map(
                                      (item) => item.energy,
                                    );
                                    const minE = Math.min(...energies);
                                    const maxE = Math.max(...energies);
                                    const range = maxE - minE || 1;
                                    const y =
                                      90 - ((h.energy - minE) / range) * 80;
                                    return `${x},${y}`;
                                  })
                                  .join(" ")}
                              />
                            </svg>
                            <div className="absolute right-2 bottom-1 text-[8px] text-slate-600 uppercase font-mono">
                              Cooling Step
                            </div>
                            <div className="absolute left-2 top-1 text-[8px] text-slate-600 uppercase font-mono">
                              Energy Metric
                            </div>
                          </div>
                        </div>

                        {/* Skill Coverage details */}
                        <div className="rounded-xl border border-white/5 bg-slate-950 p-4">
                          <div className="text-[9px] uppercase font-bold tracking-widest text-slate-500 mb-2">
                            Total Skill coverage
                          </div>
                          <div className="text-3xl font-extrabold text-indigo-400 mb-2">
                            {optimizedTeam.metrics.coverage_percentage}%
                          </div>
                          <div className="space-y-1">
                            {optimizedTeam.metrics.skills_coverage.map(
                              (detail, idx) => (
                                <div
                                  key={idx}
                                  className="flex justify-between text-[9px] border-b border-white/5 pb-1"
                                >
                                  <span className="text-slate-400">
                                    {detail.skill}
                                  </span>
                                  <span className="text-slate-200">
                                    Bridge Match:{" "}
                                    <strong className="text-cyan-400">
                                      {detail.contributed_by_skill || "None"}
                                    </strong>
                                  </span>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {annealingStatus === "idle" && (
                    <div className="text-slate-400 text-sm py-20 text-center">
                      Configure target skills, budget constraint, and click
                      Solve to run Simulated Annealing team building.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: ATTRITION SURVIVAL PREDICTOR */}
          {activeSubTab === "attrition" && (
            <motion.div
              key="attrition"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 text-left"
            >
              {/* Left Employee list */}
              <div className="premium-card p-5 border border-white/5 bg-slate-950/40 backdrop-blur-md">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300 mb-4 border-b border-white/5 pb-2">
                  Employee Registry Attrition Hazard
                </h3>

                <div className="space-y-2 max-h-[460px] overflow-y-auto custom-scrollbar">
                  {attritionLoading ? (
                    <div className="text-xs text-slate-500 text-center py-8">
                      Loading hazard computations...
                    </div>
                  ) : (
                    attritionData.map((emp) => (
                      <button
                        key={emp.employee_id}
                        onClick={() => setSelectedAttritionEmp(emp)}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all select-none cursor-pointer flex items-center justify-between ${emp.employee_id === selectedAttritionEmp?.employee_id ? "border-rose-400 bg-rose-500/5" : "border-white/5 bg-white/2 hover:border-white/10"}`}
                      >
                        <div>
                          <div className="font-bold text-white text-xs">
                            {emp.full_name}
                          </div>
                          <div className="text-[9px] text-slate-400 uppercase mt-0.5">
                            {emp.role}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-black text-rose-300">
                            x{emp.hazard_ratio}
                          </div>
                          <div className="text-[8px] text-slate-500 uppercase mt-0.5">
                            Hazard Ratio
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Right Survival Analysis Details */}
              <div className="premium-card p-6 border border-white/5 bg-slate-950/20">
                {selectedAttritionEmp ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <div>
                        <div className="text-[9px] uppercase font-bold tracking-widest text-slate-500">
                          Survival Hazard Breakdown & Simulation Sandbox
                        </div>
                        <h3 className="text-xl font-extrabold text-white mt-1">
                          {selectedAttritionEmp.full_name}
                        </h3>
                      </div>
                      <span className="text-[10px] text-indigo-400 bg-indigo-500/5 border border-indigo-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider font-bold">
                        Tenure: {selectedAttritionEmp.tenure_months} Mo.
                      </span>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
                      {/* Left: Survival Curve SVG Chart */}
                      <div className="space-y-4">
                        <div className="rounded-xl border border-white/5 bg-slate-950 p-4">
                          <div className="flex justify-between items-center mb-3">
                            <div className="text-[9px] uppercase font-bold tracking-widest text-slate-500">
                              12-Month Survival Probability Curve
                            </div>
                            <span className="text-xs font-bold text-indigo-400">
                              End Projection Survival:{" "}
                              {(simulatedSurvivalProb * 100).toFixed(1)}%
                            </span>
                          </div>

                          <div className="h-48 w-full relative border-b border-l border-white/5 bg-black/20 rounded">
                            <svg
                              className="absolute inset-0 h-full w-full pointer-events-none"
                              viewBox="0 0 100 100"
                              preserveAspectRatio="none"
                            >
                              {/* Draw survival area */}
                              <path
                                fill="rgba(99, 102, 241, 0.05)"
                                stroke="none"
                                d={
                                  `M 0,${100 - (simulatedForecast[0]?.survival_probability * 100 || 100)} ` +
                                  simulatedForecast
                                    .map((f, i) => {
                                      const x = (i / 11) * 100;
                                      const y =
                                        100 - f.survival_probability * 100;
                                      return `L ${x},${y}`;
                                    })
                                    .join(" ") +
                                  ` L 100,100 L 0,100 Z`
                                }
                              />
                              {/* Draw survival line */}
                              <polyline
                                fill="none"
                                stroke="#6366f1"
                                strokeWidth="3"
                                points={simulatedForecast
                                  .map((f, i) => {
                                    const x = (i / 11) * 100;
                                    const y =
                                      100 - f.survival_probability * 100;
                                    return `${x},${y}`;
                                  })
                                  .join(" ")}
                              />
                            </svg>
                            <div className="absolute left-2 top-2 text-[8px] text-slate-500 font-mono">
                              100% S(t)
                            </div>
                            <div className="absolute left-2 bottom-2 text-[8px] text-slate-500 font-mono">
                              0% S(t)
                            </div>
                            <div className="absolute right-2 bottom-2 text-[8px] text-slate-500 font-mono">
                              12 Months Projection
                            </div>
                          </div>
                        </div>

                        {/* Interactive Parameters Sandbox */}
                        <div className="rounded-xl border border-white/5 bg-slate-950/60 p-4">
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4 border-b border-white/5 pb-2">
                            Flight Risk Mitigation Simulator
                          </h4>

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
                            </div>

                            <div>
                              <div className="flex justify-between text-[9px] text-slate-400 mb-1">
                                <span>Workload / Skills Count</span>
                                <span className="text-amber-400">
                                  {workloadSlider} Nodes
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
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: SHAP / Feature Contributions */}
                      <div className="space-y-4">
                        <div className="rounded-xl border border-white/5 bg-slate-950 p-4">
                          <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1">
                            Simulated Attrition Multiplier
                          </div>
                          <div className="text-4xl font-black text-rose-400 font-mono">
                            x{simulatedHazardRatio.toFixed(2)}
                          </div>
                          <p className="text-[9px] text-slate-400 mt-2 leading-relaxed">
                            A hazard multiplier above 1.0 represents accelerated
                            flight risk compared to average baseline
                            probability.
                          </p>
                        </div>

                        <div className="space-y-3">
                          <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">
                            Baseline Covariates (SHAP Explainability)
                          </div>
                          {selectedAttritionEmp.covariates_explain.map(
                            (cov, idx) => (
                              <div
                                key={idx}
                                className="rounded-xl border border-white/5 bg-slate-950 p-3 flex flex-col justify-between"
                              >
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-[10px] font-semibold text-slate-300">
                                    {cov.factor}
                                  </span>
                                  <span
                                    className={`text-[9px] font-bold ${cov.impact_direction === "risky" ? "text-rose-400" : "text-emerald-400"}`}
                                  >
                                    {cov.impact_direction === "risky"
                                      ? "+"
                                      : ""}
                                    {cov.impact_percentage}% risk
                                  </span>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${cov.impact_direction === "risky" ? "bg-rose-500" : "bg-emerald-500"}`}
                                    style={{
                                      width: `${Math.min(100, Math.abs(cov.impact_percentage))}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-400 text-sm py-20 text-center">
                    Select an employee from the left panel to review attrition
                    survival analytics.
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 4: ORGANIZATIONAL NETWORK ANALYSIS (ONA) */}
          {activeSubTab === "ona" && (
            <motion.div
              key="ona"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 text-left"
            >
              {/* Left Graph Panel */}
              <div className="premium-card p-6 border border-white/5 bg-slate-950/20 flex flex-col justify-between relative overflow-hidden min-h-[460px]">
                <div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-6">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
                      Corporate Collaboration Graph (Draggable Forces)
                    </h3>
                    <span className="text-[10px] text-slate-500">
                      PageRank Influence Leaders
                    </span>
                  </div>

                  {/* Physics SVG Canvas */}
                  <div
                    ref={canvasRef}
                    className="relative h-[400px] border border-white/5 bg-slate-950/80 rounded-2xl overflow-hidden flex items-center justify-center select-none"
                  >
                    {onaLoading ? (
                      <div className="text-slate-400 text-xs flex items-center gap-2">
                        <RefreshCw size={14} className="animate-spin" />{" "}
                        Resolving Brandes centrality paths...
                      </div>
                    ) : (
                      <>
                        {/* Links */}
                        <svg className="absolute inset-0 h-full w-full pointer-events-none opacity-40">
                          {onaData.links.map((link, idx) => {
                            const srcNode = nodesState.find(
                              (n) => n.id === link.source,
                            );
                            const tgtNode = nodesState.find(
                              (n) => n.id === link.target,
                            );
                            if (!srcNode || !tgtNode) return null;

                            return (
                              <line
                                key={idx}
                                x1={`${(srcNode.x / 500) * 100}%`}
                                y1={`${(srcNode.y / 500) * 100}%`}
                                x2={`${(tgtNode.x / 500) * 100}%`}
                                y2={`${(tgtNode.y / 500) * 100}%`}
                                stroke="#4f46e5"
                                strokeWidth={link.weight * 2.5}
                              />
                            );
                          })}
                        </svg>

                        {/* Nodes */}
                        {nodesState.map((node) => {
                          const size = 15 + node.influence_pagerank * 20;
                          const isSelected = selectedOnaNode?.id === node.id;

                          return (
                            <div
                              key={node.id}
                              onMouseDown={(e) => {
                                setSelectedOnaNode(node);
                                handleNodeMouseDown(node.id, e);
                              }}
                              onTouchStart={(e) => {
                                setSelectedOnaNode(node);
                                handleNodeMouseDown(node.id, e);
                              }}
                              style={{
                                left: `${(node.x / 500) * 100}%`,
                                top: `${(node.y / 500) * 100}%`,
                                width: `${size}px`,
                                height: `${size}px`,
                                marginLeft: `-${size / 2}px`,
                                marginTop: `-${size / 2}px`,
                              }}
                              className={`absolute rounded-full border transition-shadow duration-300 flex items-center justify-center group pointer-events-auto cursor-pointer select-none ${
                                isSelected
                                  ? "bg-primary border-white shadow-[0_0_15px_rgba(45,212,191,0.8)] z-20 scale-105"
                                  : "bg-slate-900 border-indigo-500/40 hover:border-cyan-300 z-10"
                              }`}
                            >
                              <div className="absolute hidden group-hover:block bg-black/90 text-white text-[8px] uppercase tracking-wider px-2 py-1 rounded border border-white/10 whitespace-nowrap -top-8 z-30 pointer-events-none">
                                {node.name}
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Centrality Details */}
              <div className="premium-card p-5 border border-white/5 bg-slate-950/40 backdrop-blur-md space-y-6">
                {selectedOnaNode ? (
                  <>
                    <div className="border-b border-white/5 pb-3">
                      <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
                        Corporate Node Centrality
                      </div>
                      <h3 className="text-lg font-extrabold text-white mt-1">
                        {selectedOnaNode.name}
                      </h3>
                      <div className="text-[9px] text-slate-400 uppercase mt-0.5 tracking-wider">
                        {selectedOnaNode.role}
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* PageRank Card */}
                      <div className="rounded-xl border border-white/5 bg-slate-950 p-4">
                        <div className="text-[9px] uppercase tracking-[0.16em] text-slate-500 mb-1">
                          PageRank Centrality (Influence)
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="text-3xl font-extrabold text-indigo-400">
                            {(selectedOnaNode.influence_pagerank * 100).toFixed(
                              0,
                            )}
                            %
                          </div>
                          {/* Radial indicator */}
                          <svg className="w-10 h-10 transform -rotate-90">
                            <circle
                              cx="20"
                              cy="20"
                              r="16"
                              stroke="rgba(255,255,255,0.05)"
                              strokeWidth="3"
                              fill="transparent"
                            />
                            <circle
                              cx="20"
                              cy="20"
                              r="16"
                              stroke="#818cf8"
                              strokeWidth="3"
                              fill="transparent"
                              strokeDasharray={100}
                              strokeDashoffset={
                                100 - selectedOnaNode.influence_pagerank * 100
                              }
                            />
                          </svg>
                        </div>
                        <p className="text-[9px] text-slate-400 mt-2 leading-relaxed">
                          Measures overall connectivity and communication
                          propagation strength. High PageRank nodes act as
                          information multipliers.
                        </p>
                      </div>

                      {/* Betweenness Centrality Card */}
                      <div className="rounded-xl border border-white/5 bg-slate-950 p-4">
                        <div className="text-[9px] uppercase tracking-[0.16em] text-slate-500 mb-1">
                          Betweenness Centrality (Bridges)
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="text-3xl font-extrabold text-cyan-400">
                            {(selectedOnaNode.bridge_betweenness * 100).toFixed(
                              0,
                            )}
                            %
                          </div>
                          {/* Radial indicator */}
                          <svg className="w-10 h-10 transform -rotate-90">
                            <circle
                              cx="20"
                              cy="20"
                              r="16"
                              stroke="rgba(255,255,255,0.05)"
                              strokeWidth="3"
                              fill="transparent"
                            />
                            <circle
                              cx="20"
                              cy="20"
                              r="16"
                              stroke="#2dd4bf"
                              strokeWidth="3"
                              fill="transparent"
                              strokeDasharray={100}
                              strokeDashoffset={
                                100 - selectedOnaNode.bridge_betweenness * 100
                              }
                            />
                          </svg>
                        </div>
                        <p className="text-[9px] text-slate-400 mt-2 leading-relaxed">
                          Measures structural bridge strength across siloed
                          departments. High betweenness employees prevent
                          organization communication bottlenecks.
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-slate-400 text-xs py-16 text-center">
                    Select a collaboration node on the graph to analyze
                    centralities.
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 5: MARKOV CAREER PROGRESSION */}
          {activeSubTab === "career-path" && (
            <motion.div
              key="career-path"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 text-left"
            >
              {/* Left Selector */}
              <div className="premium-card p-5 border border-white/5 bg-slate-950/40 backdrop-blur-md flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300 mb-4 border-b border-white/5 pb-2">
                    Active Career Tracker
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1.5 block">
                        Select Employee Profile
                      </label>
                      <select
                        value={selectedCareerEmpId}
                        onChange={(e) => {
                          setSelectedCareerEmpId(e.target.value);
                          loadCareerPath(e.target.value);
                        }}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        {careerEmployees.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.full_name}
                          </option>
                        ))}
                      </select>
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

              {/* Right Output Transitions */}
              <div className="premium-card p-6 border border-white/5 bg-slate-950/20">
                <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-6">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
                    Markov Career Transition Horizon
                  </h3>
                  <span className="text-[10px] text-slate-500">
                    Calculated probabilities over 3-year timeline
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
                                    {(pos.transition_probability * 100).toFixed(
                                      0,
                                    )}
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
                                    ✓ Zero skill nodes missing for transition.
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default IntelligenceCenterView;
