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
  Maximize2,
  Minimize2,
} from "lucide-react";
import { UserManualButton } from "./UserManual";
import PremiumSelect from "./PremiumSelect";
import { API_BASE_URL } from "../services/apiBase";

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
  const [selectedAttritionEmp, setSelectedAttritionEmp] = useState(null);
  const [attritionLoading, setAttritionLoading] = useState(false);

  // Cox Simulator Parameters Sandbox
  const [moraleSlider, setMoraleSlider] = useState(0.8);
  const [salarySlider, setSalarySlider] = useState(0.0); // 0% to 50% increase
  const [workloadSlider, setWorkloadSlider] = useState(3); // density of skills
  const [simulatedSurvivalProb, setSimulatedSurvivalProb] = useState(0.95);
  const [simulatedHazardRatio, setSimulatedHazardRatio] = useState(1.0);
  const [simulatedForecast, setSimulatedForecast] = useState([]);
  const [hoveredSurvMonth, setHoveredSurvMonth] = useState(null);
  const [hoveredAnnealIndex, setHoveredAnnealIndex] = useState(null);

  // 4. ONA State
  const [onaData, setOnaData] = useState({ nodes: [], links: [] });
  const [onaLoading, setOnaLoading] = useState(false);
  const [selectedOnaNode, setSelectedOnaNode] = useState(null);

  // ONA Physics Simulation State
  const [nodesState, setNodesState] = useState([]);
  const dragNodeRef = useRef(null);
  const canvasRef = useRef(null);
  const onaCameraRef = useRef({ yaw: 0, pitch: -0.38, scale: 1 });
  const [onaCamera, setOnaCamera] = useState({ yaw: 0, pitch: -0.38, scale: 1 });
  const onaRotateRef = useRef(null);

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
          // Distribute the real network nodes through a spherical volume rather
          // than a 2D ring. The force solver then settles this 3D seed without
          // changing the underlying ONA records or links.
          const phi = Math.acos(1 - (2 * (idx + 0.5)) / data.nodes.length);
          const theta = Math.PI * (1 + Math.sqrt(5)) * idx;
          const radius = 170;
          return {
            ...node,
            x: 250 + radius * Math.sin(phi) * Math.cos(theta) + (Math.random() - 0.5) * 12,
            y: 250 + radius * Math.sin(phi) * Math.sin(theta) + (Math.random() - 0.5) * 12,
            z: radius * Math.cos(phi) + (Math.random() - 0.5) * 12,
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
          vz: (n.vz || 0) * 0.85,
        }));

        // 1. Repulsion force between all nodes
        for (let i = 0; i < nextNodes.length; i++) {
          const n1 = nextNodes[i];
          for (let j = i + 1; j < nextNodes.length; j++) {
            const n2 = nextNodes[j];
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const dz = (n2.z || 0) - (n1.z || 0);
            const distSq = dx * dx + dy * dy + dz * dz + 1.0;
            const dist = Math.sqrt(distSq);
            if (dist < 180) {
              const force = 10.0 / distSq;
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;

              if (n1.id !== dragNodeRef.current) {
                nextNodes[i].vx -= fx;
                nextNodes[i].vy -= fy;
                nextNodes[i].vz -= (dz / dist) * force;
              }
              if (n2.id !== dragNodeRef.current) {
                nextNodes[j].vx += fx;
                nextNodes[j].vy += fy;
                nextNodes[j].vz += (dz / dist) * force;
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
          const dz = (nTgt.z || 0) - (nSrc.z || 0);
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.1;
          const desiredDist = 120;
          const force = (dist - desiredDist) * 0.015 * link.weight;

          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (nSrc.id !== dragNodeRef.current) {
            nextNodes[idxSrc].vx += fx;
            nextNodes[idxSrc].vy += fy;
            nextNodes[idxSrc].vz += (dz / dist) * force;
          }
          if (nTgt.id !== dragNodeRef.current) {
            nextNodes[idxTgt].vx -= fx;
            nextNodes[idxTgt].vy -= fy;
            nextNodes[idxTgt].vz -= (dz / dist) * force;
          }
        });

        // 3. Center gravity force
        nextNodes.forEach((n, i) => {
          if (n.id === dragNodeRef.current) return;
          const dx = 250 - n.x;
          const dy = 250 - n.y;
          const dz = -(n.z || 0);
          nextNodes[i].vx += dx * 0.003;
          nextNodes[i].vy += dy * 0.003;
          nextNodes[i].vz += dz * 0.0008;
        });

        // 4. Update coordinates with velocities
        nextNodes.forEach((n, i) => {
          if (n.id === dragNodeRef.current) return;
          let nextX = n.x + n.vx;
          let nextY = n.y + n.vy;
          let nextZ = (n.z || 0) + (n.vz || 0);
          // Boundary collision
          nextX = Math.max(25, Math.min(475, nextX));
          nextY = Math.max(25, Math.min(475, nextY));
          nextZ = Math.max(-210, Math.min(210, nextZ));
          nextNodes[i].x = nextX;
          nextNodes[i].y = nextY;
          nextNodes[i].z = nextZ;
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

  const projectOnaNode = (node) => {
    const camera = onaCamera;
    const x = node.x - 250;
    const y = node.y - 250;
    const z = node.z || 0;
    const cosYaw = Math.cos(camera.yaw);
    const sinYaw = Math.sin(camera.yaw);
    const yawX = x * cosYaw - z * sinYaw;
    const yawZ = x * sinYaw + z * cosYaw;
    const cosPitch = Math.cos(camera.pitch);
    const sinPitch = Math.sin(camera.pitch);
    const pitchY = y * cosPitch - yawZ * sinPitch;
    const depth = y * sinPitch + yawZ * cosPitch;
    const perspective = 360 / Math.max(210, 360 - depth);
    return {
      x: 250 + yawX * perspective * camera.scale,
      y: 250 + pitchY * perspective * camera.scale,
      depth,
      perspective,
    };
  };

  const handleOnaCanvasPointerDown = (event) => {
    if (event.target !== event.currentTarget) return;
    onaRotateRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleOnaCanvasPointerMove = (event) => {
    if (!onaRotateRef.current) return;
    const previous = onaRotateRef.current;
    const next = {
      ...onaCameraRef.current,
      yaw: onaCameraRef.current.yaw + (event.clientX - previous.x) * 0.008,
      pitch: Math.max(-1.1, Math.min(1.1, onaCameraRef.current.pitch + (event.clientY - previous.y) * 0.008)),
    };
    onaRotateRef.current = { x: event.clientX, y: event.clientY };
    onaCameraRef.current = next;
    setOnaCamera(next);
  };

  const handleOnaCanvasPointerUp = () => {
    onaRotateRef.current = null;
  };

  const handleOnaCanvasWheel = (event) => {
    event.preventDefault();
    const next = { ...onaCameraRef.current, scale: Math.max(0.65, Math.min(1.8, onaCameraRef.current.scale - event.deltaY * 0.001)) };
    onaCameraRef.current = next;
    setOnaCamera(next);
  };

  const resetOnaCamera = () => {
    const next = { yaw: 0, pitch: -0.38, scale: 1 };
    onaCameraRef.current = next;
    setOnaCamera(next);
  };

  async function fetchCareerEmployees() {
    try {
      const API_BASE =
        API_BASE_URL;
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
    <div className="flex-1 flex flex-col h-full min-h-0 space-y-4">
      {/* Top Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2 border-b border-white/5 pb-3">
        <div className="flex-1 flex items-start justify-between">
          <div className="text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/5 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-1.5">
              <Cpu size={10} className="animate-spin-slow" /> Math-Engine &
              Optimization
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-1 text-white">
              Intelligence Center
            </h1>
            <p className="text-slate-400 text-xs leading-relaxed max-w-3xl">
              Aurelinx state-of-the-art decision workbench. Powered by graph
              theory, combinatorial solvers, survival models, and Markov
              transition matrices.
            </p>
          </div>
          <UserManualButton defaultTab="intelligence" className="ml-4 mt-6" />
        </div>
      </header>



      {/* Main Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-white/5 pb-3 mb-2">
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
      <div className="relative flex-1 flex flex-col min-h-0">
        <AnimatePresence mode="wait">
          {/* TAB 1: SKILL GRAPH DIJKSTRA MATCH */}
          {activeSubTab === "skill-match" && (
            <motion.div
              key="skill-match"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 items-stretch lg:grid-cols-[360px_1fr] gap-6 text-left flex-1 h-full min-h-0"
            >
              {/* Left Settings */}
              <div className="space-y-6 flex flex-col h-full min-h-0">
                <div className="premium-card overflow-hidden border border-white/10 bg-slate-950/35 backdrop-blur-xl shadow-[0_18px_55px_rgba(2,8,23,.22)] h-full flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
                    <div>
                      <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-300">
                        <Briefcase size={13} /> Target definition
                      </div>
                      <h3 className="text-sm font-semibold tracking-tight text-white">
                        Define target requirements
                      </h3>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                        Add the skills and minimum levels the graph solver must evaluate.
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-indigo-300/20 bg-indigo-300/10 px-2 py-1 text-[9px] font-semibold text-indigo-200">
                      {matchSkillsInput.length} requirement{matchSkillsInput.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  {/* Top Form Inputs (Fixed) */}
                  <div className="space-y-3 px-5 pt-4 pb-2 shrink-0">
                    <div>
                      <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1 block">
                        Skill Node
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. PyTorch, React, FastAPI"
                        value={newSkillName}
                        onChange={(e) => setNewSkillName(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-xs text-white placeholder-slate-600 outline-none transition focus:border-indigo-400/70 focus:ring-2 focus:ring-indigo-400/10"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1 block">
                        Min Proficiency
                      </label>
                      <PremiumSelect
                        value={newSkillLevel}
                        onChange={(e) =>
                          setNewSkillLevel(Number(e.target.value))
                        }
                        className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none transition focus:border-indigo-400/70 focus:ring-2 focus:ring-indigo-400/10"
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
                      className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-indigo-300/20 bg-indigo-500/90 text-xs font-semibold uppercase tracking-[0.12em] text-white shadow-[0_8px_24px_rgba(99,102,241,.18)] transition hover:bg-indigo-400"
                    >
                      <Plus size={14} /> Add Skill requirement
                    </button>
                  </div>

                  {/* Internal Scrollable Skill List Box */}
                  <div className="flex-1 overflow-y-auto min-h-[120px] custom-scrollbar px-5 py-2 space-y-2">
                    {matchSkillsInput.map((skill, idx) => (
                      <div
                        key={idx}
                        className="group flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2 transition hover:border-indigo-300/30 hover:bg-indigo-300/[0.06]"
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
                          className="rounded-md p-1 text-slate-500 transition hover:bg-rose-400/10 hover:text-rose-300"
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
                      onClick={triggerSkillMatch}
                      disabled={matchingLoading || matchSkillsInput.length === 0}
                      className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-cyan-300/50 bg-cyan-300/[0.07] text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200 transition hover:bg-cyan-300/[0.14] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Search size={14} />{" "}
                      {matchingLoading
                        ? "Graph Traversing..."
                        : "Solve Adjacencies"}
                    </button>

                    {(skillMatchStatus === "running" || skillMatchStatus === "complete" || skillMatchStatus === "error") && (
                      <div className="pt-2 border-t border-white/10" aria-live="polite">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Solver request status
                        </span>
                        <span className={`text-[10px] font-medium ${skillMatchStatus === "error" ? "text-rose-300" : skillMatchStatus === "complete" ? "text-emerald-300" : "text-cyan-300"}`}>
                          {skillMatchStatus === "error" ? "Request failed" : skillMatchStatus === "complete" ? `${matchResults.length} matches returned` : "Processing on server"}
                        </span>
                      </div>
                      <div className="mb-3 h-1 overflow-hidden rounded-full bg-white/10">
                        <div className={`h-full rounded-full transition-all duration-500 ${skillMatchStatus === "error" ? "w-full bg-rose-400" : skillMatchStatus === "complete" ? "w-full bg-emerald-400" : "w-2/3 animate-pulse bg-cyan-300"}`} />
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[9px]">
                        {["Requirements validated", "Adjacency solver", "Matches rendered"].map((label, index) => {
                          const reached = skillMatchStatus === "complete" || (skillMatchStatus === "running" && index < 2) || (skillMatchStatus === "error" && index < 2);
                          return <div key={label} className={`flex items-center gap-1.5 ${reached ? "text-slate-200" : "text-slate-600"}`}><span className={`h-1.5 w-1.5 rounded-full ${reached ? (skillMatchStatus === "error" && index === 1 ? "bg-rose-300" : "bg-cyan-300") : "bg-white/15"}`} />{label}</div>;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              </div>

              {/* Right Output */}
              <div className="premium-card p-6 border border-white/5 bg-slate-950/20 h-full flex flex-col overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4 shrink-0">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
                    Semantic Matching Matrix & Path Analysis
                  </h3>
                  <span className="text-[10px] text-slate-500">
                    Shortest Path Dijkstra Weighting
                  </span>
                </div>

                {matchResults.length > 0 ? (
                  <div className="grid grid-cols-1 xl:grid-cols-[250px_1fr] gap-6 flex-1 min-h-0 overflow-hidden">
                    {/* Left list of employees */}
                    <div className="space-y-2 border-r border-white/5 pr-4 overflow-y-auto custom-scrollbar">
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
                    <div className="space-y-6 overflow-y-auto custom-scrollbar flex-1 min-h-0 pr-1">
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

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                            <div className={`${graphExpanded ? "fixed inset-3 z-[90] flex flex-col rounded-2xl border border-cyan-300/25 bg-[#020617]/[0.98] p-4 shadow-[0_24px_90px_rgba(0,0,0,.65)] backdrop-blur-2xl md:inset-8 md:p-6" : "relative rounded-xl border border-white/5 bg-slate-950 p-4 flex flex-col justify-between flex-1 h-full min-h-[300px]"}`} onClick={(event) => event.stopPropagation()}>
                              <div>
                                <div className="mb-2 flex items-start justify-between gap-3">
                                  <div>
                                    <div className="text-[9px] uppercase tracking-widest text-slate-300 font-bold">
                                      Shortest path graph view
                                    </div>
                                    <div className="mt-1 text-[10px] text-slate-500 leading-relaxed">
                                      Green nodes are present in the candidate profile. Cyan paths show the evaluated transitions.
                                    </div>
                                  </div>
                                  <button type="button" aria-label={graphExpanded ? "Collapse graph" : "Expand graph"} title={graphExpanded ? "Collapse graph" : "Expand graph"} onClick={() => setGraphExpanded((open) => !open)} className="shrink-0 rounded-lg border border-white/10 bg-white/[0.05] p-2 text-slate-300 transition hover:border-cyan-300/40 hover:bg-cyan-300/10 hover:text-cyan-200">
                                    {graphExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                                  </button>
                                </div>
                              </div>

                              <div className={`${graphExpanded ? "min-h-0 flex-1" : "h-[380px] min-h-[380px]"} relative border border-white/5 rounded-lg overflow-hidden bg-slate-950/80`}>
                                <svg
                                  className="absolute inset-0 h-full w-full pointer-events-none"
                                  viewBox="80 70 840 400"
                                  preserveAspectRatio="xMidYMid meet"
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
                                            style={{ transition: "all 0.5s" }}
                                          />
                                          <text
                                            x={node.x}
                                            y={node.y - (isHighlighted ? 14 : 10)}
                                            fill={
                                              isHighlighted
                                                ? "#ffffff"
                                                : "#475569"
                                            }
                                            fontSize={isHighlighted ? "12" : "10"}
                                            fontWeight={
                                              isHighlighted ? "black" : "normal"
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
                    <div className="h-12 w-12 rounded-2xl border border-indigo-400/20 bg-indigo-500/10 flex items-center justify-center text-indigo-300 mb-4 shadow-[0_0_20px_rgba(99,102,241,0.15)]">
                      <Brain size={24} />
                    </div>
                    <h4 className="text-sm font-extrabold text-white tracking-wide uppercase mb-2">Graph Solver Standing By</h4>
                    <p className="text-xs text-slate-400 leading-relaxed max-w-md">
                      Enter target skill requirements on the left panel and click <span className="font-semibold text-cyan-300">Solve Adjacencies</span> to calculate graph shortest-path Dijkstra matching across the workforce.
                    </p>
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
              className="grid grid-cols-1 items-stretch lg:grid-cols-[360px_1fr] gap-6 text-left flex-1 h-full min-h-0"
            >
              {/* Left Config */}
              <div className="space-y-6 flex flex-col h-full min-h-0">
                <div className="premium-card overflow-hidden border border-white/10 bg-slate-950/35 backdrop-blur-xl shadow-[0_18px_55px_rgba(2,8,23,.22)] h-full flex flex-col justify-between">
                  <div className="border-b border-white/10 px-5 py-4">
                    <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-300">
                      <Zap size={13} /> Team constraints
                    </div>
                    <h3 className="text-sm font-semibold tracking-tight text-white">
                      Combinatorial constraints
                    </h3>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                      Set the operating limits used by the optimization solver.
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
                        onChange={(e) => setTeamSize(Number(e.target.value))}
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
                      onClick={triggerTeamOptimize}
                      disabled={optimizingLoading || teamSkillsInput.length === 0}
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

              {/* Right Graph/Output */}
              <div className="premium-card p-6 border border-white/5 bg-slate-950/20 h-full flex flex-col overflow-hidden">
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
                          style={{ width: `${(annealingTemp / 10.0) * 100}%` }}
                        />
                      </div>

                      <div className="grid w-full max-w-md grid-cols-3 gap-2 text-center text-[10px] font-mono">
                        <div className="rounded-lg border border-white/10 bg-slate-900/70 px-2 py-2">
                          <div className="text-slate-500 uppercase">Solver step</div>
                          <div className="mt-1 font-bold text-white">{annealingHistory.at(-1)?.step ?? 0}</div>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-slate-900/70 px-2 py-2">
                          <div className="text-slate-500 uppercase">Coverage</div>
                          <div className="mt-1 font-bold text-cyan-300">{Number(annealingHistory.at(-1)?.coverage ?? 0).toFixed(1)}%</div>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-slate-900/70 px-2 py-2">
                          <div className="text-slate-500 uppercase">Energy</div>
                          <div className="mt-1 font-bold text-white">{Number(annealingHistory.at(-1)?.energy ?? 0).toFixed(2)}</div>
                        </div>
                      </div>
                      <p className="max-w-md text-center text-[10px] leading-relaxed text-slate-500">
                        Showing recorded solver metrics from the backend run. Employee names appear only after the final roster is returned.
                      </p>
                    </div>
                  )}

                  {annealingStatus === "complete" && optimizedTeam && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2 rounded-lg border border-cyan-400/15 bg-cyan-400/[0.03] px-3 py-2 text-[10px] text-slate-400">
                        <span className="font-bold uppercase tracking-wider text-cyan-200">Modeled result</span>
                        <span className="mx-2 text-slate-600">·</span>
                        Model {optimizedTeam.model_version || "unversioned"}
                        <span className="mx-2 text-slate-600">·</span>
                        Seed {optimizedTeam.seed ?? "—"}
                        <span className="mx-2 text-slate-600">·</span>
                        Scenario {optimizedTeam.scenario_id || "not persisted"}
                      </div>
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

                        <div className="space-y-2 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1 shrink-0">
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

                          {(() => {
                            const history =
                              annealingHistory.length > 0 ? annealingHistory : [];

                            if (history.length === 0) {
                              return (
                                <div className="h-44 rounded-xl border border-white/10 bg-slate-950/80 flex items-center justify-center px-4 text-center text-[10px] text-slate-500">
                                  No optimization data yet — configure target
                                  skills and run the solver.
                                </div>
                              );
                            }

                            const n = history.length;
                            const steps = history.map((h) => Number(h.step) || 0);
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
                            const costs = history.map((h) => Number(h.cost) || 0);

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
                                (ratio < 1.5 ? 1 : ratio < 3 ? 2 : ratio < 7 ? 5 : 10) *
                                mag;
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

                            const eTicks = niceTicks(minE - ePad, maxE + ePad, 5);
                            const maxCost =
                              Math.max(...costs, budgetCap) * 1.05 || 1;
                            const costTicks = niceTicks(0, maxCost, 4);
                            const covTicks = [0, 25, 50, 75, 100];
                            const tmpTicks = [10, 5, 0];

                            const xPos = (i) =>
                              (i / Math.max(n - 1, 1)) * 100;
                            const yScaler = (lo, hi) => (v) => {
                              const r = hi - lo || 1;
                              return (
                                84 -
                                Math.max(0, Math.min(1, (v - lo) / r)) * 66
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
                              if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
                              if (num >= 1e3) return `$${(num / 1e3).toFixed(0)}k`;
                              return `$${num.toFixed(0)}`;
                            };

                            const stepAt = (frac) =>
                              steps[Math.round((n - 1) * frac)] ??
                              steps[n - 1];
                            const smoothPath = (pts) => {
                              if (pts.length < 2) {
                                return pts.length ? `M ${pts[0].x},${pts[0].y}` : "";
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

                                <div className="relative">
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
                                              stopColor="#818cf8"
                                              stopOpacity="0.18"
                                            />
                                            <stop
                                              offset="100%"
                                              stopColor="#818cf8"
                                              stopOpacity="0.0"
                                            />
                                          </linearGradient>
                                          <filter id="glowEmerald" x="-30%" y="-30%" width="160%" height="160%">
                                            <feGaussianBlur stdDeviation="1.5" result="blur" />
                                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                          </filter>
                                          <filter id="glowTeal" x="-30%" y="-30%" width="160%" height="160%">
                                            <feGaussianBlur stdDeviation="1.5" result="blur" />
                                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
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
                                          stroke="#818cf8"
                                          strokeWidth="4"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          opacity="0.18"
                                          vectorEffect="non-scaling-stroke"
                                        />
                                        <path
                                          d={smoothPath(cPts)}
                                          fill="none"
                                          stroke="#818cf8"
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
                                          if (!isBest && !isHov && idx % Math.max(1, Math.floor(n / 8)) !== 0) return null;

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
                                              style={{ left: `${p.x}%`, top: `${p.y}%` }}
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
                                              stopColor="#67e8f9"
                                              stopOpacity="0.95"
                                            />
                                            <stop
                                              offset="100%"
                                              stopColor="#0891b2"
                                              stopOpacity="0.9"
                                            />
                                          </linearGradient>
                                          <filter id="glowAmber" x="-30%" y="-30%" width="160%" height="160%">
                                            <feGaussianBlur in="SourceAlpha" stdDeviation="0.35" result="blur" />
                                            <feFlood floodColor="#fbbf24" floodOpacity="0.9" result="c" />
                                            <feComposite in="c" in2="blur" operator="in" result="glow" />
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
                                              hovered === i
                                                ? "#ffffff"
                                                : "none"
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

                                  {/* Active Hover Tooltip Box - Follows Cursor Side-by-Side */}
                                  {hovered !== null && history[hovered] && (() => {
                                    const hx = xPos(hovered);
                                    const isRightHalf = hx > 58;
                                    return (
                                      <div
                                        className="absolute top-3 z-30 rounded-xl border border-teal-400/40 bg-slate-950/95 p-3 shadow-2xl backdrop-blur-md text-[11px] space-y-1.5 pointer-events-none transition-all duration-100 ease-out min-w-[175px]"
                                        style={
                                          isRightHalf
                                            ? { right: `${Math.max(2, 100 - hx + 3)}%` }
                                            : { left: `${Math.max(2, hx + 3)}%` }
                                        }
                                      >
                                        <div className="font-bold text-teal-300 flex items-center justify-between gap-1 border-b border-white/10 pb-1">
                                          <span className="flex items-center gap-1">
                                            Step #
                                            {history[hovered].step ??
                                              hovered}
                                          </span>
                                          {hovered === bestIndex && (
                                            <span className="bg-emerald-500/20 text-emerald-300 text-[8px] px-1.5 py-0.5 rounded border border-emerald-500/30">
                                              Optimal Best
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-slate-300 flex justify-between gap-2">
                                          <span>Temperature:</span>
                                          <strong className="text-amber-300 font-mono">
                                            {Number(
                                              history[hovered].temperature,
                                            ).toFixed(3)}
                                          </strong>
                                        </div>
                                        <div className="text-slate-300 flex justify-between gap-2">
                                          <span>Energy E(x):</span>
                                          <strong className="text-teal-300 font-mono">
                                            {Number(
                                              history[hovered].energy,
                                            ).toFixed(4)}
                                          </strong>
                                        </div>
                                        <div className="text-slate-300 flex justify-between gap-2">
                                          <span>Best-so-far E*:</span>
                                          <strong className="text-emerald-400 font-mono">
                                            {Number(
                                              history[hovered].best_energy ??
                                                history[hovered].energy,
                                            ).toFixed(4)}
                                          </strong>
                                        </div>
                                        <div className="text-slate-300 flex justify-between gap-2">
                                          <span>Skill Coverage:</span>
                                          <strong className="text-indigo-300 font-mono">
                                            {Number(
                                              history[hovered].coverage ?? 0,
                                            ).toFixed(1)}
                                            %
                                          </strong>
                                        </div>
                                        <div className="text-slate-300 flex justify-between gap-2 border-t border-white/5 pt-1">
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
                        </div>

                        {/* Skill Coverage details */}
                        <div className="rounded-xl border border-white/5 bg-slate-950 p-4 flex-1 flex flex-col justify-between">
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
                    <div className="py-12 px-6 border border-dashed border-white/10 rounded-2xl bg-white/[0.01] text-center max-w-md mx-auto my-4 text-xs text-slate-400 leading-relaxed">
                      Configure target skills, budget constraint, and click <span className="font-semibold text-cyan-300">Find Mathematically Perfect Team</span> to execute Simulated Annealing optimization.
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
              className="grid grid-cols-1 items-stretch lg:grid-cols-[360px_1fr] gap-6 text-left flex-1 h-full min-h-0"
            >
              {/* Left Employee list */}
              <div className="premium-card h-full p-5 border border-white/5 bg-slate-950/40 backdrop-blur-md flex flex-col overflow-hidden">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300 mb-4 border-b border-white/5 pb-2 shrink-0">
                  Employee Registry Attrition Hazard
                </h3>

                <div className="space-y-2 flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
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
              <div className="premium-card p-6 border border-white/5 bg-slate-950/20 h-full flex flex-col overflow-hidden">
                {selectedAttritionEmp ? (
                  <div className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar space-y-6 pr-1">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <div>
                        <div className="text-[9px] uppercase font-bold tracking-widest text-slate-500">
                          Survival Hazard Breakdown & Simulation Sandbox
                        </div>
                        <div className="mt-1 text-[9px] uppercase tracking-wider text-amber-300">
                          Modeled · {selectedAttritionEmp.model_version || "cox-sandbox-v1"} · {selectedAttritionEmp.validation_status || "synthetic validation only"}
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

                            {/* High-Precision Interactive SVG Survival Probability Chart */}
                            <div className="relative h-64 w-full rounded-xl border border-white/10 bg-slate-950/80 p-3 shadow-inner flex flex-col justify-between overflow-hidden">
                              {/* Left Y-Axis Percentage Labels */}
                              <div className="absolute left-2 top-3 bottom-8 flex flex-col justify-between text-[9px] font-mono text-slate-400 z-10 pointer-events-none">
                                <span className="bg-slate-900/80 px-1 rounded border border-indigo-500/20 text-indigo-300 font-bold">100% S(t)</span>
                                <span className="bg-slate-900/80 px-1 rounded border border-white/5">75% S(t)</span>
                                <span className="bg-rose-950/80 px-1 rounded border border-rose-500/30 text-rose-300 font-bold">50% Critical</span>
                                <span className="bg-slate-900/80 px-1 rounded border border-white/5">25% S(t)</span>
                                <span className="bg-slate-900/80 px-1 rounded border border-white/5">0% S(t)</span>
                              </div>

                              {/* Graphic Canvas Area */}
                              <div className="relative flex-1 w-full pl-20 pr-4 pt-2 pb-2">
                                <svg
                                  className="h-full w-full overflow-visible"
                                  viewBox="0 0 100 100"
                                  preserveAspectRatio="none"
                                >
                                  <defs>
                                    <linearGradient id="survGradHigh" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                                    </linearGradient>
                                  </defs>

                                  {/* Y-Axis Grid lines */}
                                  <line x1="0" y1="0" x2="100" y2="0" stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
                                  <line x1="0" y1="25" x2="100" y2="25" stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
                                  <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(244,63,94,0.4)" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
                                  <line x1="0" y1="75" x2="100" y2="75" stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
                                  <line x1="0" y1="100" x2="100" y2="100" stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />

                                  {/* Laser Crosshair Line on hover */}
                                  {hoveredSurvMonth !== null && (
                                    <line
                                      x1={(hoveredSurvMonth / 11) * 100}
                                      y1="0"
                                      x2={(hoveredSurvMonth / 11) * 100}
                                      y2="100"
                                      stroke="#38bdf8"
                                      strokeWidth="1.5"
                                      strokeDasharray="3 3"
                                      vectorEffect="non-scaling-stroke"
                                    />
                                  )}

                                  {/* Survival Area */}
                                  {simulatedForecast.length > 0 && (
                                    <>
                                      <path
                                        fill="url(#survGradHigh)"
                                        stroke="none"
                                        d={
                                          `M 0,${100 - (simulatedForecast[0]?.survival_probability * 100 || 100)} ` +
                                          simulatedForecast
                                            .map((f, i) => {
                                              const x = (i / 11) * 100;
                                              const y = 100 - f.survival_probability * 100;
                                              return `L ${x},${y}`;
                                            })
                                            .join(" ") +
                                          ` L 100,100 L 0,100 Z`
                                        }
                                      />
                                      <polyline
                                        fill="none"
                                        stroke="#818cf8"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        vectorEffect="non-scaling-stroke"
                                        points={simulatedForecast
                                          .map((f, i) => {
                                            const x = (i / 11) * 100;
                                            const y = 100 - f.survival_probability * 100;
                                            return `${x},${y}`;
                                          })
                                          .join(" ")}
                                      />
                                    </>
                                  )}
                                </svg>

                                {/* Interactive SVG Node triggers */}
                                <div className="absolute inset-0 pl-20 pr-4 pt-2 pb-2 flex justify-between items-center pointer-events-auto">
                                  {simulatedForecast.map((f, i) => {
                                    const S_t = f.survival_probability;
                                    return (
                                      <div
                                        key={i}
                                        onMouseEnter={() => setHoveredSurvMonth(i)}
                                        onMouseLeave={() => setHoveredSurvMonth(null)}
                                        className="h-full flex-1 cursor-pointer relative group flex justify-center items-center"
                                      >
                                        <div className={`w-2 h-2 rounded-full transition-all ${hoveredSurvMonth === i ? "bg-white scale-150 shadow-[0_0_10px_#38bdf8]" : S_t < 0.5 ? "bg-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.6)]" : "bg-indigo-400/80 group-hover:scale-125"}`} />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Bottom X-Axis Month Ticks */}
                              <div className="pl-20 pr-4 flex justify-between items-center text-[9px] font-mono text-slate-400 border-t border-white/5 pt-1">
                                {simulatedForecast.map((f, i) => (
                                  <span key={i} className={`px-0.5 transition-all ${hoveredSurvMonth === i ? "text-cyan-300 font-bold scale-110" : ""}`}>
                                    M{i + 1}
                                  </span>
                                ))}
                              </div>

                              {/* Hover Data Tooltip Glass Card */}
                              {hoveredSurvMonth !== null && simulatedForecast[hoveredSurvMonth] && (
                                <div className="absolute top-3 right-3 z-20 rounded-xl border border-indigo-400/30 bg-slate-950/90 p-3 shadow-2xl backdrop-blur-md text-[10px] space-y-1">
                                  <div className="font-bold text-indigo-300 flex items-center justify-between gap-3">
                                    <span>Projection Month {simulatedForecast[hoveredSurvMonth].month}</span>
                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${simulatedForecast[hoveredSurvMonth].survival_probability > 0.75 ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20" : simulatedForecast[hoveredSurvMonth].survival_probability > 0.5 ? "bg-amber-500/10 text-amber-300 border border-amber-500/20" : "bg-rose-500/10 text-rose-300 border border-rose-500/20"}`}>
                                      {simulatedForecast[hoveredSurvMonth].survival_probability > 0.75 ? "Low Hazard" : simulatedForecast[hoveredSurvMonth].survival_probability > 0.5 ? "Elevated Risk" : "Critical Flight Danger"}
                                    </span>
                                  </div>
                                  <div className="text-slate-300">Survival Probability: <strong className="text-white font-mono">{(simulatedForecast[hoveredSurvMonth].survival_probability * 100).toFixed(1)}%</strong></div>
                                  <div className="text-slate-300">Cumulative Tenure: <strong className="text-indigo-300 font-mono">{(simulatedForecast[hoveredSurvMonth].projected_tenure ?? ((selectedAttritionEmp?.tenure_months ?? 12) + (hoveredSurvMonth + 1)))} Months</strong></div>
                                  <div className="text-slate-300">Hazard Ratio Multiplier: <strong className="text-rose-300 font-mono">x{simulatedHazardRatio.toFixed(2)}</strong></div>
                                </div>
                              )}
                            </div>

                            {/* Permanent Month Milestone Summary Grid (Visible without hovering!) */}
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
                              {simulatedForecast.filter((_, idx) => idx % 2 === 1 || idx === 0 || idx === 11).map((f) => {
                                const mIdx = f.month - 1;
                                const S_t = f.survival_probability;
                                return (
                                  <div
                                    key={f.month}
                                    onMouseEnter={() => setHoveredSurvMonth(mIdx)}
                                    onMouseLeave={() => setHoveredSurvMonth(null)}
                                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${hoveredSurvMonth === mIdx ? "border-cyan-400 bg-cyan-500/10 shadow-[0_0_12px_rgba(56,189,248,0.25)]" : "border-white/5 bg-slate-950/60 hover:border-white/10"}`}
                                  >
                                    <div className="text-[9px] uppercase font-bold text-slate-400">Month {f.month}</div>
                                    <div className={`text-xs font-black mt-0.5 ${S_t > 0.75 ? "text-emerald-400" : S_t > 0.5 ? "text-amber-400" : "text-rose-400"}`}>
                                      {(S_t * 100).toFixed(1)}%
                                    </div>
                                  </div>
                                );
                              })}
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
              className="grid grid-cols-1 items-stretch lg:grid-cols-[1fr_340px] gap-6 text-left flex-1 h-full min-h-0"
            >
              {/* Left Graph Panel */}
              <div className="premium-card p-6 border border-white/5 bg-slate-950/20 flex flex-col justify-between relative overflow-hidden h-full">
                <div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4 gap-3">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
                        Corporate collaboration graph
                      </h3>
                      <p className="mt-1 text-[10px] text-slate-500">3D force layout · drag a node · drag the canvas to rotate · wheel to zoom</p>
                    </div>
                    <button type="button" onClick={resetOnaCamera} className="shrink-0 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400 transition hover:border-cyan-300/40 hover:text-cyan-200">Reset view</button>
                  </div>

                  {/* Physics SVG Canvas */}
                  <div
                    ref={canvasRef}
                    onPointerDown={handleOnaCanvasPointerDown}
                    onPointerMove={handleOnaCanvasPointerMove}
                    onPointerUp={handleOnaCanvasPointerUp}
                    onPointerCancel={handleOnaCanvasPointerUp}
                    onWheel={handleOnaCanvasWheel}
                    className="relative h-[clamp(360px,62vh,620px)] min-h-0 cursor-grab touch-none border border-cyan-300/10 bg-[radial-gradient(circle_at_50%_45%,rgba(30,64,175,.16),transparent_52%),#020617] rounded-2xl overflow-hidden flex items-center justify-center select-none active:cursor-grabbing"
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
                            const src = projectOnaNode(srcNode);
                            const tgt = projectOnaNode(tgtNode);
                            const opacity = Math.max(0.08, Math.min(0.65, 0.7 - ((src.depth + tgt.depth) / 1200)));

                            return (
                              <line
                                key={idx}
                                x1={`${(src.x / 500) * 100}%`}
                                y1={`${(src.y / 500) * 100}%`}
                                x2={`${(tgt.x / 500) * 100}%`}
                                y2={`${(tgt.y / 500) * 100}%`}
                                stroke="#4f46e5"
                                strokeWidth={link.weight * 2.5}
                                strokeOpacity={opacity}
                              />
                            );
                          })}
                        </svg>

                        {/* Nodes */}
                        {nodesState.map((node) => {
                          const size = 15 + node.influence_pagerank * 20;
                          const isSelected = selectedOnaNode?.id === node.id;
                          const projected = projectOnaNode(node);
                          const depthScale = Math.max(0.72, Math.min(1.22, projected.perspective));
                          const depthOpacity = Math.max(0.42, Math.min(1, 0.72 + projected.perspective * 0.22));

                          return (
                            <div
                              key={node.id}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setSelectedOnaNode(node);
                                handleNodeMouseDown(node.id, e);
                              }}
                              onTouchStart={(e) => {
                                e.stopPropagation();
                                setSelectedOnaNode(node);
                                handleNodeMouseDown(node.id, e);
                              }}
                              style={{
                                left: `${(projected.x / 500) * 100}%`,
                                top: `${(projected.y / 500) * 100}%`,
                                width: `${size * depthScale}px`,
                                height: `${size * depthScale}px`,
                                marginLeft: `-${(size * depthScale) / 2}px`,
                                marginTop: `-${(size * depthScale) / 2}px`,
                                opacity: depthOpacity,
                                zIndex: Math.round(1000 - projected.depth),
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
              className="grid grid-cols-1 items-stretch lg:grid-cols-[320px_1fr] gap-6 text-left flex-1 h-full min-h-0"
            >
              {/* Left Selector */}
              <div className="premium-card p-5 border border-white/5 bg-slate-950/40 backdrop-blur-md flex flex-col justify-between h-full">
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

              {/* Right Output Transitions */}
              <div className="premium-card p-6 border border-white/5 bg-slate-950/20">
                <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-6">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
                    Markov Career Transition Horizon
                  </h3>
                  <span className="text-[10px] text-slate-500">
                    {careerPathData?.model_version || "markov-career-v1"} · modeled probabilities
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
