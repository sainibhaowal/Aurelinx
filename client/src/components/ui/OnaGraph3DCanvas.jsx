import React, { useEffect, useMemo, useRef, useState } from "react";

const WORLD_CENTER = 250;
const FOCAL = 640;
const MIN_SCALE = 0.35;
const MAX_SCALE = 4.5;
const WORLD_CLAMP = [-560, 1060];
const MONO =
  'ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const buildLayout = (nodes) => {
  const depts = Array.from(
    new Set(nodes.map((n) => n.department || "General")),
  );
  const deptIndexMap = {};
  depts.forEach((d, i) => {
    deptIndexMap[d] = i;
  });
  const totalDepts = Math.max(1, depts.length);
  return nodes.map((node, idx) => {
    const deptIdx = deptIndexMap[node.department || "General"] || 0;
    const deptAzimuth = (deptIdx / totalDepts) * Math.PI * 2;
    const deptElevation = ((deptIdx % 2 === 0 ? 1 : -1) * Math.PI) / 5;
    const clusterRadius = 280;
    const cx =
      WORLD_CENTER +
      clusterRadius * Math.cos(deptAzimuth) * Math.cos(deptElevation);
    const cy =
      WORLD_CENTER +
      clusterRadius * Math.sin(deptAzimuth) * Math.cos(deptElevation);
    const cz = clusterRadius * Math.sin(deptElevation);
    const intraRadius = 70 + (idx % 5) * 24;
    const phi = (idx * 137.5 * Math.PI) / 180;
    const theta = ((idx % 7) / 7) * Math.PI - Math.PI / 2;
    return {
      ...node,
      x: cx + intraRadius * Math.cos(phi) * Math.cos(theta),
      y: cy + intraRadius * Math.sin(phi) * Math.cos(theta),
      z: cz + intraRadius * Math.sin(theta),
      cx,
      cy,
      cz,
      vx: 0,
      vy: 0,
      vz: 0,
    };
  });
};

const projectPoint = (x, y, z, cam, w, h) => {
  const cx = x - WORLD_CENTER;
  const cy = y - WORLD_CENTER;
  const cosYaw = Math.cos(cam.yaw);
  const sinYaw = Math.sin(cam.yaw);
  const yawX = cx * cosYaw - z * sinYaw;
  const yawZ = cx * sinYaw + z * cosYaw;
  const cosPitch = Math.cos(cam.pitch);
  const sinPitch = Math.sin(cam.pitch);
  const pitchY = cy * cosPitch - yawZ * sinPitch;
  const depth = cy * sinPitch + yawZ * cosPitch;
  const persp = clamp(FOCAL / Math.max(FOCAL * 0.55, FOCAL - depth), 0.35, 3);
  return {
    sx: w / 2 + cam.panX + yawX * persp * cam.scale,
    sy: h / 2 + cam.panY + pitchY * persp * cam.scale,
    depth,
    persp,
  };
};

const unprojectPoint = (sx, sy, depth, cam, w, h) => {
  const persp = clamp(FOCAL / Math.max(FOCAL * 0.55, FOCAL - depth), 0.35, 3);
  const X1 = (sx - w / 2 - cam.panX) / (persp * cam.scale);
  const Y1 = (sy - h / 2 - cam.panY) / (persp * cam.scale);
  const cosPitch = Math.cos(cam.pitch);
  const sinPitch = Math.sin(cam.pitch);
  const y = Y1 * cosPitch + depth * sinPitch;
  const Z1 = depth * cosPitch - Y1 * sinPitch;
  const cosYaw = Math.cos(cam.yaw);
  const sinYaw = Math.sin(cam.yaw);
  const x = X1 * cosYaw + Z1 * sinYaw;
  const z = -X1 * sinYaw + Z1 * cosYaw;
  return { x: x + WORLD_CENTER, y: y + WORLD_CENTER, z };
};

const physicsStep = (nodes, links, idToIndex, draggedIdx) => {
  const n = nodes.length;
  for (let i = 0; i < n; i++) {
    const a = nodes[i];
    for (let j = i + 1; j < n; j++) {
      const b = nodes[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dz = (b.z || 0) - (a.z || 0);
      const d2 = dx * dx + dy * dy + dz * dz + 60;
      if (d2 < 16900) {
        const dist = Math.sqrt(d2);
        const force = Math.min(3300 / d2, 1.1);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        const fz = (dz / dist) * force;
        if (i !== draggedIdx) {
          a.vx -= fx;
          a.vy -= fy;
          a.vz -= fz;
        }
        if (j !== draggedIdx) {
          b.vx += fx;
          b.vy += fy;
          b.vz += fz;
        }
      }
    }
  }

  for (let i = 0; i < links.length; i++) {
    const l = links[i];
    const si = idToIndex[l.source];
    const ti = idToIndex[l.target];
    if (si === undefined || ti === undefined) continue;
    const a = nodes[si];
    const b = nodes[ti];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = (b.z || 0) - (a.z || 0);
    const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy + dz * dz));
    const rest = 92 - (l.weight || 0.5) * 48;
    const force = clamp(
      (dist - rest) * (0.016 + (l.weight || 0.5) * 0.026),
      -0.85,
      0.85,
    );
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;
    const fz = (dz / dist) * force;
    if (si !== draggedIdx) {
      a.vx += fx;
      a.vy += fy;
      a.vz += fz;
    }
    if (ti !== draggedIdx) {
      b.vx -= fx;
      b.vy -= fy;
      b.vz -= fz;
    }
  }

  let energy = 0;
  for (let i = 0; i < n; i++) {
    const nd = nodes[i];
    if (i === draggedIdx) continue;
    if (nd.cx !== undefined) {
      nd.vx += (nd.cx - nd.x) * 0.0022;
      nd.vy += (nd.cy - nd.y) * 0.0022;
      nd.vz += ((nd.cz || 0) - (nd.z || 0)) * 0.0022;
    }
    nd.vx += (WORLD_CENTER - nd.x) * 0.0007;
    nd.vy += (WORLD_CENTER - nd.y) * 0.0007;
    nd.vz += -(nd.z || 0) * 0.0007;

    nd.vx *= 0.885;
    nd.vy *= 0.885;
    nd.vz *= 0.885;
    const sp = Math.sqrt(nd.vx * nd.vx + nd.vy * nd.vy + nd.vz * nd.vz);
    energy += sp;
    if (sp < 0.035) {
      nd.vx = 0;
      nd.vy = 0;
      nd.vz = 0;
      continue;
    }
    if (sp > 5.5) {
      const k = 5.5 / sp;
      nd.vx *= k;
      nd.vy *= k;
      nd.vz *= k;
    }
    nd.x = clamp(nd.x + nd.vx, WORLD_CLAMP[0], WORLD_CLAMP[1]);
    nd.y = clamp(nd.y + nd.vy, WORLD_CLAMP[0], WORLD_CLAMP[1]);
    nd.z = clamp((nd.z || 0) + (nd.vz || 0), WORLD_CLAMP[0], WORLD_CLAMP[1]);
  }
  return energy;
};

const getNodeColor = (node, colorMode) => {
  if (colorMode === "pagerank") {
    const pr = node.influence_pagerank || 0;
    if (pr > 0.75) return { r: 234, g: 179, b: 8 };
    if (pr > 0.45) return { r: 245, g: 158, b: 11 };
    if (pr > 0.25) return { r: 129, g: 140, b: 248 };
    return { r: 99, g: 102, b: 241 };
  }
  if (colorMode === "betweenness") {
    const bc = node.bridge_betweenness || 0;
    if (bc > 0.6) return { r: 45, g: 212, b: 191 };
    if (bc > 0.3) return { r: 6, g: 182, b: 212 };
    if (bc > 0.15) return { r: 2, g: 132, b: 199 };
    return { r: 71, g: 85, b: 105 };
  }
  if (colorMode === "silo") {
    const ei = node.ei_silo_index || 0;
    if (ei > 0.3) return { r: 16, g: 185, b: 129 };
    if (ei >= -0.2) return { r: 56, g: 189, b: 248 };
    return { r: 244, g: 63, b: 94 };
  }
  const hex = node.department_color || "#22d3ee";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
};

const OnaGraph3DCanvas = ({
  nodes,
  links,
  colorMode = "department",
  deptFilter = "all",
  searchQuery = "",
  selectedId = null,
  onSelect,
  onCameraChange,
  onColorModeChange,
}) => {
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const tooltipRef = useRef(null);
  const readoutRef = useRef(null);
  const zoomRef = useRef(null);

  const nodesRef = useRef([]);
  const linksRef = useRef([]);
  const idToIndexRef = useRef({});
  const screenRef = useRef([]);

  const cameraRef = useRef({
    yaw: 0.1,
    pitch: -0.32,
    scale: 1.0,
    panX: 0,
    panY: 0,
  });
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const fittedRef = useRef(false);
  const introStartRef = useRef(performance.now());

  const selRef = useRef({ colorMode, deptFilter, searchQuery, selectedId });
  selRef.current = { colorMode, deptFilter, searchQuery, selectedId };

  const neighborRef = useRef(new Set());
  const neighborIds = useMemo(() => {
    const set = new Set();
    for (const l of links) {
      if (l.source === selectedId) set.add(l.target);
      if (l.target === selectedId) set.add(l.source);
    }
    return set;
  }, [links, selectedId]);
  neighborRef.current = neighborIds;

  const [mode, setMode] = useState("orbit");
  const [frozen, setFrozen] = useState(false);
  const modeRef = useRef("orbit");
  const frozenRef = useRef(false);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    frozenRef.current = frozen;
  }, [frozen]);

  const [hovered, setHovered] = useState(null);
  const hoverIdxRef = useRef(-1);
  const hoverSwitchRef = useRef(0);
  const hoverScreenRef = useRef({ sx: 0, sy: 0, visible: false });

  const nodeDragRef = useRef(null);
  const camDragRef = useRef(null);
  const lastSyncRef = useRef(0);
  const onSelectRef = useRef(onSelect);
  const onCameraChangeRef = useRef(onCameraChange);
  onSelectRef.current = onSelect;
  onCameraChangeRef.current = onCameraChange;

  const syncCamera = (force) => {
    const now = performance.now();
    if (!force && now - lastSyncRef.current < 150) return;
    lastSyncRef.current = now;
    onCameraChangeRef.current?.({ ...cameraRef.current });
  };

  const fitCamera = () => {
    const { w, h } = sizeRef.current;
    const layout = nodesRef.current;
    if (!w || !h || !layout.length) return;
    let maxR = 0;
    for (const n of layout) {
      const r = Math.hypot(n.x - WORLD_CENTER, n.y - WORLD_CENTER, n.z || 0);
      if (r > maxR) maxR = r;
    }
    maxR = Math.max(maxR, 280);
    const cam = cameraRef.current;
    cam.scale = clamp((Math.min(w, h) * 0.6) / (maxR * 1.25), MIN_SCALE, 1.05);
    fittedRef.current = true;
    syncCamera(true);
  };

  useEffect(() => {
    if (!nodes.length) return;
    const layout = buildLayout(nodes);
    nodesRef.current = layout;
    screenRef.current = new Array(layout.length).fill(null);
    const map = {};
    layout.forEach((n, i) => {
      map[n.id] = i;
    });
    idToIndexRef.current = map;
    fitCamera();
  }, [nodes]);

  useEffect(() => {
    linksRef.current = links;
    const map = {};
    nodesRef.current.forEach((n, i) => {
      map[n.id] = i;
    });
    idToIndexRef.current = map;
  }, [links]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return undefined;
    const resize = () => {
      const rect = wrapper.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      sizeRef.current = { w, h, dpr };
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }
    };
    resize();
    if (!fittedRef.current) fitCamera();
    const ro = new ResizeObserver(resize);
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    ctxRef.current = canvas.getContext("2d");

    let raf;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      const ctx = ctxRef.current;
      const { w, h, dpr } = sizeRef.current;
      if (!ctx || !w || !h) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const cam = cameraRef.current;
      const layout = nodesRef.current;
      const edgeLinks = linksRef.current;
      const filters = selRef.current;

      const intro = clamp(
        (performance.now() - introStartRef.current) / 400,
        0,
        1,
      );

      // subtle atmosphere - single horizon line
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = 0.12 * intro;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.52);
      ctx.lineTo(w, h * 0.52);
      ctx.stroke();
      ctx.globalAlpha = 1;

      if (!layout.length) return;

      let energy = Infinity;
      if (!frozenRef.current) {
        energy = physicsStep(
          layout,
          edgeLinks,
          idToIndexRef.current,
          nodeDragRef.current ? nodeDragRef.current.idx : -1,
        );
      }

      const q = filters.searchQuery.trim().toLowerCase();
      const proj = new Array(layout.length);
      const vis = new Array(layout.length);
      for (let i = 0; i < layout.length; i++) {
        const nd = layout[i];
        const deptOk =
          filters.deptFilter === "all" || nd.department === filters.deptFilter;
        const searchOk =
          !q ||
          (nd.name || "").toLowerCase().includes(q) ||
          (nd.role || "").toLowerCase().includes(q);
        vis[i] = deptOk && searchOk;
        proj[i] = projectPoint(nd.x, nd.y, nd.z || 0, cam, w, h);
      }

      // depth-sorted edges first
      const edgeOrder = [];
      for (let i = 0; i < edgeLinks.length; i++) {
        const l = edgeLinks[i];
        const si = idToIndexRef.current[l.source];
        const ti = idToIndexRef.current[l.target];
        if (si === undefined || ti === undefined || !vis[si] || !vis[ti])
          continue;
        const pa = proj[si];
        const pb = proj[ti];
        const avgDepth = (pa.depth + pb.depth) * 0.5;
        edgeOrder.push({ l, si, ti, pa, pb, avgDepth });
      }
      edgeOrder.sort((a, b) => b.avgDepth - a.avgDepth);

      for (const { l, pa, pb } of edgeOrder) {
        const connected =
          filters.selectedId &&
          (l.source === filters.selectedId || l.target === filters.selectedId);
        const dimmed = filters.selectedId && !connected;
        // edge color: very subtle
        let r, g, b;
        if (connected) {
          r = 34;
          g = 211;
          b = 238;
        } else if (l.is_cross_dept) {
          r = 91;
          g = 91;
          b = 122;
        } else {
          r = 51;
          g = 65;
          b = 85;
        }
        const width =
          (0.35 + (l.weight || 0.5) * 0.5) *
          clamp((pa.persp + pb.persp) / 2, 0.6, 1.4);
        const baseAlpha = dimmed
          ? 0.08
          : connected
            ? 0.9
            : l.is_cross_dept
              ? 0.28
              : 0.22;
        ctx.beginPath();
        ctx.moveTo(pa.sx, pa.sy);
        ctx.lineTo(pb.sx, pb.sy);
        ctx.strokeStyle = `rgba(${r},${g},${b},${baseAlpha * intro})`;
        ctx.lineWidth = width;
        if (l.is_cross_dept && !connected) ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // depth-sorted nodes - 3D spheres with lighting
      const order = [];
      for (let i = 0; i < layout.length; i++) order.push(i);
      order.sort((a, b) => proj[b].depth - proj[a].depth);

      let hoverVisible = false;
      for (const i of order) {
        const nd = layout[i];
        const p = proj[i];
        const isSelected = filters.selectedId === nd.id;
        const isNeighbor = neighborRef.current.has(nd.id);
        const isHover = hoverIdxRef.current === i;
        const dim =
          !vis[i] || (filters.selectedId && !isSelected && !isNeighbor);

        // sphere radius in world units scaled by PageRank
        const baseRadius =
          (2.2 + (nd.influence_pagerank || 0) * 3.5) * (isSelected ? 1.55 : 1);
        const radius = baseRadius * clamp(0.48 + 0.52 * p.persp, 0.4, 1.4);
        if (radius < 1.2) continue;

        const depthFade = clamp(1.1 - Math.max(0, p.depth) * 0.0008, 0.45, 1);
        const alpha = (dim ? 0.18 : 0.55 + 0.45 * depthFade) * intro;

        const color = getNodeColor(nd, filters.colorMode);
        const lightDir = { x: -0.3, y: -0.5, z: -0.8 };
        const lightLen = Math.sqrt(
          lightDir.x ** 2 + lightDir.y ** 2 + lightDir.z ** 2,
        );
        lightDir.x /= lightLen;
        lightDir.y /= lightLen;
        lightDir.z /= lightLen;

        // create radial gradient for 3D sphere lighting
        const grad = ctx.createRadialGradient(
          p.sx - radius * 0.3,
          p.sy - radius * 0.3,
          radius * 0.05,
          p.sx,
          p.sy,
          radius,
        );
        const highlight = `rgba(${Math.min(255, color.r + 60)},${Math.min(255, color.g + 60)},${Math.min(255, color.b + 60)},${alpha})`;
        const mid = `rgba(${color.r},${color.g},${color.b},${alpha})`;
        const shadow = `rgba(${Math.max(0, color.r - 80)},${Math.max(0, color.g - 80)},${Math.max(0, color.b - 80)},${alpha * 0.6})`;
        grad.addColorStop(0, highlight);
        grad.addColorStop(0.45, mid);
        grad.addColorStop(1, shadow);

        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // selected ring
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, radius + 2.5, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(34,211,238,${0.7 * intro})`;
          ctx.lineWidth = 1;
          ctx.stroke();
          // crosshair
          ctx.beginPath();
          ctx.moveTo(p.sx - radius * 2, p.sy);
          ctx.lineTo(p.sx + radius * 2, p.sy);
          ctx.moveTo(p.sx, p.sy - radius * 2);
          ctx.lineTo(p.sx, p.sy + radius * 2);
          ctx.strokeStyle = `rgba(34,211,238,${0.5 * intro})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }

        screenRef.current[i] = {
          sx: p.sx,
          sy: p.sy,
          size: Math.max(4, radius),
          depth: p.depth,
          visible: vis[i],
        };

        if (i === hoverIdxRef.current && !dim) {
          hoverScreenRef.current = { sx: p.sx, sy: p.sy, visible: true };
          hoverVisible = true;
        }

        // label - clean mono beside sphere
        if ((isSelected || isHover) && !dim && nd.name) {
          const label = nd.name.toUpperCase();
          ctx.font = `500 8px ${MONO}`;
          const tw = ctx.measureText(label).width;
          const lx = p.sx + radius + 5;
          const ly = p.sy - 1;
          ctx.fillStyle = "rgba(2,6,23,0.85)";
          ctx.fillRect(lx - 2, ly - 9, tw + 4, 13);
          ctx.strokeStyle = isSelected
            ? "rgba(34,211,238,0.3)"
            : "rgba(91,91,122,0.25)";
          ctx.lineWidth = 0.5;
          ctx.strokeRect(lx - 2, ly - 9, tw + 4, 13);
          ctx.fillStyle = isSelected ? "#e2e8f0" : "#94a3b8";
          ctx.fillText(label, lx, ly + 1);
        }
      }
      if (!hoverVisible) hoverScreenRef.current.visible = false;

      // tooltip
      const tt = tooltipRef.current;
      if (tt) {
        if (hoverVisible) {
          tt.style.opacity = "1";
          tt.style.transform = `translate(${hoverScreenRef.current.sx}px, ${hoverScreenRef.current.sy}px) translate(-50%, -125%)`;
        } else {
          tt.style.opacity = "0";
        }
      }

      // readout
      const stateLabel = frozenRef.current
        ? "LOCKED"
        : energy < layout.length * 0.12
          ? "STABLE"
          : "ACTIVE";
      if (readoutRef.current) {
        readoutRef.current.textContent = `NODES ${layout.length}  LINKS ${edgeLinks.length}  DENSITY ${(edgeLinks.length / Math.max(1, (layout.length * (layout.length - 1)) / 2)).toFixed(4)}  MODE ${modeRef.current.toUpperCase()}  PHYSICS ${stateLabel}`;
      }
      if (zoomRef.current) {
        zoomRef.current.textContent = `${(cam.scale * 100).toFixed(0)}%`;
      }

      canvas.style.cursor =
        hoverIdxRef.current >= 0
          ? "crosshair"
          : nodeDragRef.current || camDragRef.current
            ? "grabbing"
            : "crosshair";
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const cam = cameraRef.current;
      cam.scale = clamp(
        cam.scale * Math.exp(-e.deltaY * 0.0011),
        MIN_SCALE,
        MAX_SCALE,
      );
      syncCamera(false);
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, []);

  const localPoint = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX ?? e.touches?.[0]?.clientX ?? 0) - rect.left,
      y: (e.clientY ?? e.touches?.[0]?.clientY ?? 0) - rect.top,
    };
  };

  const hitTest = (x, y) => {
    let best = -1;
    let bestDepth = Infinity;
    const s = screenRef.current;
    for (let i = 0; i < s.length; i++) {
      const e = s[i];
      if (!e || !e.visible) continue;
      const r = Math.max(6, e.size / 2 + 4);
      const dx = e.sx - x;
      const dy = e.sy - y;
      if (dx * dx + dy * dy <= r * r && e.depth < bestDepth) {
        best = i;
        bestDepth = e.depth;
      }
    }
    return best;
  };

  const updateHover = (idx) => {
    if (idx === hoverIdxRef.current) return;
    const now = performance.now();
    if (idx >= 0 && now - hoverSwitchRef.current < 120) return;
    hoverSwitchRef.current = now;
    hoverIdxRef.current = idx;
    const layout = nodesRef.current;
    setHovered(idx >= 0 && idx < layout.length ? layout[idx] : null);
  };

  const handlePointerDown = (e) => {
    const { x, y } = localPoint(e);
    const idx = hitTest(x, y);
    if (idx >= 0) {
      nodeDragRef.current = { idx, moved: 0, lastX: x, lastY: y };
      updateHover(idx);
    } else {
      const cam = cameraRef.current;
      const isPan =
        modeRef.current === "pan" ||
        e.button === 2 ||
        e.button === 1 ||
        e.shiftKey;
      camDragRef.current = {
        isPan,
        startX: x,
        startY: y,
        startPanX: cam.panX || 0,
        startPanY: cam.panY || 0,
        startYaw: cam.yaw,
        startPitch: cam.pitch,
      };
      updateHover(-1);
    }
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e) => {
    const { x, y } = localPoint(e);
    if (nodeDragRef.current) {
      const d = nodeDragRef.current;
      d.moved += Math.abs(x - d.lastX) + Math.abs(y - d.lastY);
      d.lastX = x;
      d.lastY = y;
      const nd = nodesRef.current[d.idx];
      if (nd) {
        const p = screenRef.current[d.idx];
        const depth = p ? p.depth : nd.z || 0;
        const world = unprojectPoint(
          x,
          y,
          depth,
          cameraRef.current,
          sizeRef.current.w,
          sizeRef.current.h,
        );
        nd.x = clamp(world.x, WORLD_CLAMP[0], WORLD_CLAMP[1]);
        nd.y = clamp(world.y, WORLD_CLAMP[0], WORLD_CLAMP[1]);
        nd.z = clamp(world.z, WORLD_CLAMP[0], WORLD_CLAMP[1]);
        nd.vx = 0;
        nd.vy = 0;
        nd.vz = 0;
      }
      return;
    }
    if (camDragRef.current) {
      const d = camDragRef.current;
      const cam = cameraRef.current;
      if (d.isPan) {
        cam.panX = d.startPanX + (x - d.startX);
        cam.panY = d.startPanY + (y - d.startY);
      } else {
        cam.yaw = d.startYaw + (x - d.startX) * 0.0065;
        cam.pitch = clamp(d.startPitch + (y - d.startY) * 0.0065, -1.35, 1.35);
      }
      syncCamera(false);
      return;
    }
    updateHover(hitTest(x, y));
  };

  const handlePointerUp = () => {
    if (nodeDragRef.current) {
      const d = nodeDragRef.current;
      if (d.moved < 6) {
        const nd = nodesRef.current[d.idx];
        if (nd && onSelectRef.current) onSelectRef.current(nd);
      }
      nodeDragRef.current = null;
    }
    if (camDragRef.current) {
      camDragRef.current = null;
      syncCamera(true);
    }
  };

  const zoomBy = (factor) => {
    const cam = cameraRef.current;
    cam.scale = clamp(cam.scale * factor, MIN_SCALE, MAX_SCALE);
    syncCamera(true);
  };

  const resetCamera = () => {
    cameraRef.current = {
      yaw: 0.1,
      pitch: -0.32,
      scale: 1.0,
      panX: 0,
      panY: 0,
    };
    fittedRef.current = false;
    fitCamera();
    syncCamera(true);
  };

  const toggleLock = () => {
    if (frozenRef.current) {
      setFrozen(false);
      frozenRef.current = false;
    } else {
      setFrozen(true);
    }
  };

  return (
    <div
      ref={wrapperRef}
      className="absolute inset-0 overflow-hidden touch-none"
      style={{ background: "#020408" }}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={() => updateHover(-1)}
        onContextMenu={(e) => e.preventDefault()}
        className="absolute inset-0 h-full w-full"
      />

      <div
        ref={tooltipRef}
        className="pointer-events-none absolute left-0 top-0 z-40 transition-opacity duration-80"
        style={{ opacity: 0, transform: "translate(0px, 0px)" }}
      >
        {hovered && (
          <div className="flex flex-col bg-[#020408]/98 text-white px-2 py-1.5 rounded border border-white/5 shadow-xl">
            <span className="text-[9px] font-bold text-white tracking-wide">
              {hovered.name}
            </span>
            <span className="text-[7.5px] text-slate-500 uppercase tracking-[0.18em] mt-0.5">
              {hovered.role} {hovered.department}
            </span>
            <span className="text-[7.5px] font-mono text-cyan-300 mt-1 border-t border-white/5 pt-1">
              PR {(hovered.influence_pagerank || 0).toFixed(4)} BC{" "}
              {(hovered.bridge_betweenness || 0).toFixed(4)} DEG{" "}
              {hovered.degree || 0}
            </span>
          </div>
        )}
      </div>

      <div
        ref={readoutRef}
        className="pointer-events-none absolute top-2 left-2 z-30 font-mono text-[8px] tracking-[0.1em] text-slate-500 uppercase"
      >
        NODES 0 LINKS 0 DENSITY 0.0000 MODE ORBIT PHYSICS ACTIVE
      </div>

      <div className="absolute bottom-2 left-2 right-2 sm:right-auto flex justify-center sm:justify-start z-30">
        <div className="flex flex-wrap items-center gap-1 p-1 rounded border border-white/5 bg-[#020408]/95 backdrop-blur-xl shadow-xl">
          <div className="flex items-center rounded border border-white/5 overflow-hidden">
            <button
              type="button"
              onClick={() => setMode("orbit")}
              title="Orbit mode"
              className={`h-6 px-2 flex items-center text-[8px] font-semibold uppercase tracking-[0.14em] transition cursor-pointer ${mode === "orbit" ? "text-cyan-300 bg-white/3" : "text-slate-500 hover:text-slate-300 bg-white/2"}`}
            >
              ORBIT
            </button>
            <button
              type="button"
              onClick={() => setMode("pan")}
              title="Pan mode"
              className={`h-6 px-2 flex items-center text-[8px] font-semibold uppercase tracking-[0.14em] transition cursor-pointer border-l border-white/5 ${mode === "pan" ? "text-indigo-300 bg-white/3" : "text-slate-500 hover:text-slate-300 bg-white/2"}`}
            >
              PAN
            </button>
          </div>

          <button
            type="button"
            onClick={toggleLock}
            title={frozen ? "Unlock physics" : "Lock physics"}
            className={`h-6 px-2 flex items-center gap-1 text-[8px] font-semibold uppercase tracking-[0.14em] rounded border transition cursor-pointer ${frozen ? "text-amber-300 bg-amber-500/5 border-amber-500/15" : "text-slate-500 bg-white/2 border-white/5 hover:text-slate-300"}`}
          >
            LOCK
          </button>

          <div className="h-3 w-px bg-white/5" />

          <button
            type="button"
            onClick={() => zoomBy(1 / 1.3)}
            title="Zoom out"
            className="h-6 w-6 flex items-center justify-center rounded border border-white/5 bg-white/2 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <span className="text-[10px] font-bold leading-none -mt-px">−</span>
          </button>
          <span
            ref={zoomRef}
            className="w-9 text-center font-mono text-[8px] text-slate-400"
          >
            100%
          </span>
          <button
            type="button"
            onClick={() => zoomBy(1.3)}
            title="Zoom in"
            className="h-6 w-6 flex items-center justify-center rounded border border-white/5 bg-white/2 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <span className="text-[10px] font-bold leading-none -mt-px">+</span>
          </button>

          <div className="h-3 w-px bg-white/5" />

          <button
            type="button"
            onClick={resetCamera}
            title="Reset view"
            className="h-6 px-2 flex items-center text-[8px] font-semibold uppercase tracking-[0.14em] text-slate-500 bg-white/2 border border-white/5 rounded hover:text-cyan-200 transition cursor-pointer"
          >
            RESET
          </button>
        </div>
      </div>

      <div className="absolute top-2 right-2 flex flex-wrap items-center gap-0.5 p-0.5 rounded border border-white/5 bg-[#020408]/95 backdrop-blur-xl z-30 shadow-xl">
        {[
          { id: "department", label: "DEPT" },
          { id: "pagerank", label: "PR" },
          { id: "betweenness", label: "BC" },
          { id: "silo", label: "SILO" },
        ].map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onColorModeChange?.(m.id)}
            className={`h-5 px-1.5 rounded text-[7.5px] font-semibold uppercase tracking-[0.12em] transition cursor-pointer ${colorMode === m.id ? "text-emerald-300 bg-white/3" : "text-slate-500 hover:text-slate-300 bg-white/2"}`}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default OnaGraph3DCanvas;
