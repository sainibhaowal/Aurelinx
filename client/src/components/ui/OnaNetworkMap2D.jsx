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

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Minus, Plus } from "lucide-react";

const VIEW_WIDTH = 1200;
const VIEW_HEIGHT = 760;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const departmentColor = (node) =>
  /^#[0-9a-f]{6}$/i.test(node?.department_color || "")
    ? node.department_color
    : "#38bdf8";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
};

const hexagonPoints = (x, y, radius) =>
  Array.from({ length: 6 }, (_, index) => {
    const angle = ((index * 60 - 30) * Math.PI) / 180;
    return `${(x + radius * Math.cos(angle)).toFixed(1)},${(y + radius * Math.sin(angle)).toFixed(1)}`;
  }).join(" ");

const buildNetwork = (nodes, links) => {
  const degreeById = new Map(nodes.map((node) => [String(node.id), 0]));
  const validLinks = [];
  links.forEach((link, index) => {
    const source = String(link.source);
    const target = String(link.target);
    if (
      source === target ||
      !degreeById.has(source) ||
      !degreeById.has(target)
    ) {
      return;
    }
    degreeById.set(source, degreeById.get(source) + 1);
    degreeById.set(target, degreeById.get(target) + 1);
    validLinks.push({
      ...link,
      source,
      target,
      key: `${source}::${target}::${index}`,
    });
  });

  const departmentMap = new Map();
  nodes.forEach((node) => {
    const department = node.department || "General";
    if (!departmentMap.has(department)) departmentMap.set(department, []);
    departmentMap.get(department).push(node);
  });
  const departments = Array.from(departmentMap.keys()).sort((a, b) =>
    a.localeCompare(b),
  );
  const columnCount = Math.max(
    1,
    Math.ceil(Math.sqrt(departments.length * 1.35)),
  );
  const rowCount = Math.max(1, Math.ceil(departments.length / columnCount));
  const cellWidth = VIEW_WIDTH / columnCount;
  const cellHeight = (VIEW_HEIGHT - 68) / rowCount;
  const positions = new Map();

  departments.forEach((department, departmentIndex) => {
    const col = departmentIndex % columnCount;
    const row = Math.floor(departmentIndex / columnCount);
    const group = departmentMap
      .get(department)
      .slice()
      .sort((a, b) =>
        String(a.name || a.id).localeCompare(String(b.name || b.id)),
      );
    const columns = Math.max(1, Math.ceil(Math.sqrt(group.length * 1.25)));
    const rows = Math.max(1, Math.ceil(group.length / columns));
    const stepX = Math.min(19, (cellWidth - 34) / Math.max(1, columns));
    const stepY = Math.min(18, (cellHeight - 42) / Math.max(1, rows));
    const groupWidth = (columns - 1) * stepX + stepX / 2;
    const groupHeight = (rows - 1) * stepY;
    const centerX = cellWidth * (col + 0.5);
    const centerY = 54 + cellHeight * (row + 0.5);
    const startX = centerX - groupWidth / 2;
    const startY = centerY - groupHeight / 2;

    group.forEach((node, index) => {
      const gridRow = Math.floor(index / columns);
      const gridCol = index % columns;
      // Offset alternating rows to make a compact, legible hexagonal lattice.
      const x = startX + gridCol * stepX + (gridRow % 2 ? stepX / 2 : 0);
      const y = startY + gridRow * stepY;
      const degree = degreeById.get(String(node.id)) || 0;
      positions.set(String(node.id), {
        x,
        y,
        radius: clamp(5.7 + Math.sqrt(degree) * 0.65, 5.7, 9.5),
      });
    });
  });

  const nodeById = new Map(nodes.map((node) => [String(node.id), node]));
  const renderedNodes = nodes.map((node) => ({
    ...node,
    id: String(node.id),
    department: node.department || "General",
    degree: degreeById.get(String(node.id)) || 0,
    color: departmentColor(node),
    ...positions.get(String(node.id)),
  }));
  const renderedLinks = validLinks.map((link) => {
    const source = positions.get(link.source);
    const target = positions.get(link.target);
    const count = Math.max(1, Number(link.record_count || 1));
    return {
      ...link,
      x1: source.x,
      y1: source.y,
      x2: target.x,
      y2: target.y,
      count,
      width: clamp(1 + Math.log2(count + 1) * 0.62, 1.3, 4),
      color: link.is_cross_dept ? "#b39be8" : "#91a0b5",
      eventTypes: link.event_types || [],
      firstDate: link.first_occurred_at,
      lastDate: link.last_occurred_at,
      isCrossDepartment: Boolean(link.is_cross_dept),
    };
  });

  return {
    nodes: renderedNodes,
    links: renderedLinks,
    nodeById,
    unlinkedCount: renderedNodes.filter((node) => node.degree === 0).length,
    departments: departments.map((department) => ({
      department,
      color: departmentColor(departmentMap.get(department)[0]),
    })),
  };
};

const OnaNetworkMap2D = ({
  nodes = [],
  links = [],
  selectedId,
  onSelect,
  deptFilter = "all",
  searchQuery = "",
  focusId = null,
}) => {
  const wrapperRef = useRef(null);
  const svgRef = useRef(null);
  const dragRef = useRef(null);
  const panRef = useRef(null);
  const graph = useMemo(() => buildNetwork(nodes, links), [nodes, links]);
  const [positions, setPositions] = useState(
    () =>
      new Map(graph.nodes.map((node) => [node.id, { x: node.x, y: node.y }])),
  );
  const [viewBox, setViewBox] = useState({
    x: 0,
    y: 0,
    width: VIEW_WIDTH,
    height: VIEW_HEIGHT,
  });
  const [hovered, setHovered] = useState(null);
  const [tooltipPoint, setTooltipPoint] = useState({ x: 0, y: 0 });
  const [includeUnlinked, setIncludeUnlinked] = useState(false);

  useEffect(() => {
    setPositions(
      new Map(graph.nodes.map((node) => [node.id, { x: node.x, y: node.y }])),
    );
  }, [graph]);

  const positionFor = (node) => positions.get(node.id) || node;
  const positionFromPointer = (event) => {
    const bounds = svgRef.current?.getBoundingClientRect();
    if (!bounds) return { x: 0, y: 0 };
    return {
      x:
        viewBox.x +
        ((event.clientX - bounds.left) / bounds.width) * viewBox.width,
      y:
        viewBox.y +
        ((event.clientY - bounds.top) / bounds.height) * viewBox.height,
    };
  };
  const showTooltip = (event, value) => {
    const bounds = wrapperRef.current?.getBoundingClientRect();
    if (!bounds) return;
    setHovered(value);
    setTooltipPoint({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
  };

  const query = searchQuery.trim().toLocaleLowerCase();
  const visibleNodeIds = new Set(
    graph.nodes
      .filter((node) => {
        const departmentMatches =
          deptFilter === "all" || node.department === deptFilter;
        const focusMatches =
          !focusId ||
          node.id === String(focusId) ||
          graph.links.some(
            (link) =>
              (link.source === node.id && link.target === String(focusId)) ||
              (link.target === node.id && link.source === String(focusId)),
          );
        const linkedMatches =
          includeUnlinked ||
          node.degree > 0 ||
          node.id === String(selectedId || "");
        return departmentMatches && focusMatches && linkedMatches;
      })
      .map((node) => node.id),
  );
  const visibleNodes = graph.nodes.filter((node) =>
    visibleNodeIds.has(node.id),
  );
  const visibleLinks = graph.links.filter(
    (link) =>
      visibleNodeIds.has(link.source) && visibleNodeIds.has(link.target),
  );

  const zoomBy = (factor) => {
    setViewBox((current) => {
      const width = clamp(current.width * factor, 260, VIEW_WIDTH);
      const height = clamp(current.height * factor, 170, VIEW_HEIGHT);
      return {
        x: current.x + (current.width - width) / 2,
        y: current.y + (current.height - height) / 2,
        width,
        height,
      };
    });
  };
  const resetLayout = () => {
    setPositions(
      new Map(graph.nodes.map((node) => [node.id, { x: node.x, y: node.y }])),
    );
    setViewBox({ x: 0, y: 0, width: VIEW_WIDTH, height: VIEW_HEIGHT });
  };
  const handlePointerMove = (event) => {
    if (dragRef.current) {
      const point = positionFromPointer(event);
      const id = dragRef.current;
      setPositions((current) => new Map(current).set(id, point));
      return;
    }
    if (panRef.current) {
      const bounds = svgRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const { startX, startY, initialView } = panRef.current;
      const dx = ((event.clientX - startX) / bounds.width) * initialView.width;
      const dy =
        ((event.clientY - startY) / bounds.height) * initialView.height;
      setViewBox({
        ...initialView,
        x: initialView.x - dx,
        y: initialView.y - dy,
      });
    }
    if (hovered) {
      const bounds = wrapperRef.current?.getBoundingClientRect();
      if (bounds) {
        setTooltipPoint({
          x: event.clientX - bounds.left,
          y: event.clientY - bounds.top,
        });
      }
    }
  };
  const endPointerAction = () => {
    dragRef.current = null;
    panRef.current = null;
  };

  const tooltipMaxX = Math.max(
    8,
    (wrapperRef.current?.clientWidth || VIEW_WIDTH) - 280,
  );
  const tooltipMaxY = Math.max(
    8,
    (wrapperRef.current?.clientHeight || VIEW_HEIGHT) - 138,
  );

  return (
    <div
      ref={wrapperRef}
      className="absolute inset-0 overflow-hidden bg-[#070b12]"
    >
      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-x-0 bottom-0 top-14 h-[calc(100%-3.5rem)] w-full touch-none"
        role="img"
        aria-label={`Network map showing ${visibleNodes.length} people and ${visibleLinks.length} recorded collaboration ties`}
        onPointerMove={handlePointerMove}
        onPointerUp={endPointerAction}
        onPointerCancel={endPointerAction}
        onPointerDown={(event) => {
          if (event.target === svgRef.current) {
            panRef.current = {
              startX: event.clientX,
              startY: event.clientY,
              initialView: viewBox,
            };
            svgRef.current?.setPointerCapture(event.pointerId);
          }
        }}
      >
        <rect
          x={viewBox.x - 5000}
          y={viewBox.y - 5000}
          width={VIEW_WIDTH + 10000}
          height={VIEW_HEIGHT + 10000}
          fill="#070b12"
          pointerEvents="none"
        />
        {visibleLinks.map((link) => {
          const source = graph.nodeById.get(link.source);
          const target = graph.nodeById.get(link.target);
          const sourcePosition = positionFor(source);
          const targetPosition = positionFor(target);
          const active =
            String(selectedId || "") === link.source ||
            String(selectedId || "") === link.target ||
            (hovered?.kind === "node" &&
              (hovered.node.id === link.source ||
                hovered.node.id === link.target));
          const searchMatches =
            !query ||
            `${source?.name || ""} ${target?.name || ""}`
              .toLocaleLowerCase()
              .includes(query);
          return (
            <g key={link.key}>
              <line
                x1={sourcePosition.x}
                y1={sourcePosition.y}
                x2={targetPosition.x}
                y2={targetPosition.y}
                stroke={active ? "#d9e8f6" : link.color}
                strokeOpacity={active ? 0.9 : searchMatches ? 0.42 : 0.12}
                strokeWidth={active ? Math.max(2.4, link.width) : link.width}
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1={sourcePosition.x}
                y1={sourcePosition.y}
                x2={targetPosition.x}
                y2={targetPosition.y}
                stroke="transparent"
                strokeWidth="10"
                pointerEvents="stroke"
                onPointerEnter={(event) =>
                  showTooltip(event, {
                    kind: "edge",
                    source,
                    target,
                    count: link.count,
                    eventTypes: link.eventTypes,
                    firstDate: link.firstDate,
                    lastDate: link.lastDate,
                    isCrossDepartment: link.isCrossDepartment,
                  })
                }
                onPointerLeave={() => setHovered(null)}
              />
            </g>
          );
        })}
        {visibleNodes.map((node) => {
          const point = positionFor(node);
          const selected = String(selectedId || "") === node.id;
          const isHovered =
            hovered?.kind === "node" && hovered.node.id === node.id;
          const matchesSearch =
            !query ||
            `${node.name || ""} ${node.role || ""} ${node.department}`
              .toLocaleLowerCase()
              .includes(query);
          const nearSelected = graph.links.some(
            (link) =>
              (String(selectedId || "") === link.source &&
                link.target === node.id) ||
              (String(selectedId || "") === link.target &&
                link.source === node.id),
          );
          return (
            <g
              key={node.id}
              role="button"
              tabIndex={0}
              aria-label={`${node.name || "Unknown person"}, ${node.department}, ${node.degree} observed ties`}
              className="cursor-grab active:cursor-grabbing"
              opacity={matchesSearch ? 1 : 0.24}
              onPointerDown={(event) => {
                event.stopPropagation();
                dragRef.current = node.id;
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onClick={() => onSelect?.(node)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect?.(node);
                }
              }}
              onPointerEnter={(event) =>
                showTooltip(event, { kind: "node", node })
              }
              onPointerLeave={() => setHovered(null)}
            >
              {(selected || isHovered) && (
                <polygon
                  points={hexagonPoints(point.x, point.y, node.radius + 6)}
                  fill="none"
                  stroke="#e6f4ff"
                  strokeOpacity="0.8"
                  strokeWidth="1.4"
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                />
              )}
              <polygon
                points={hexagonPoints(point.x, point.y, node.radius)}
                fill={selected || isHovered ? node.color : `${node.color}b8`}
                stroke={
                  selected || isHovered
                    ? "#ffffff"
                    : nearSelected
                      ? "#e2e8f0"
                      : "#dce7f0"
                }
                strokeOpacity={
                  selected || isHovered ? 1 : nearSelected ? 0.82 : 0.44
                }
                strokeWidth={selected ? 2 : nearSelected ? 1.5 : 0.8}
                vectorEffect="non-scaling-stroke"
              />
              {(selected || isHovered) && (
                <text
                  x={point.x + node.radius + 8}
                  y={point.y + 4}
                  fill="#f8fafc"
                  fontSize="12"
                  fontWeight="600"
                  paintOrder="stroke"
                  stroke="#070b12"
                  strokeWidth="3"
                  pointerEvents="none"
                >
                  {node.name || "Unknown person"}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="pointer-events-none absolute inset-x-3 top-2 z-10 flex min-h-9 flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-md border border-white/[0.08] bg-[#070b12]/95 px-2.5 py-1.5 text-[10px] text-slate-300">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
          {graph.departments.map(({ department, color }) => (
            <span
              key={department}
              className="flex items-center gap-1.5 whitespace-nowrap"
            >
              <i
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              {department}
            </span>
          ))}
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <i className="h-px w-4 bg-slate-400" /> Recorded tie
          </span>
          <span className="flex items-center gap-1.5 whitespace-nowrap text-slate-400">
            Line weight reflects event count
          </span>
        </div>
        <div className="pointer-events-auto ml-auto flex shrink-0 items-center gap-1 rounded-md border border-white/10 bg-slate-950 px-1">
          {graph.unlinkedCount > 0 && (
            <button
              type="button"
              onClick={() => setIncludeUnlinked((current) => !current)}
              aria-pressed={includeUnlinked}
              title="Show people with no ties in this displayed sample"
              className="rounded px-2 py-1.5 text-[10px] font-medium text-slate-400 hover:bg-white/10 hover:text-white"
            >
              {includeUnlinked
                ? `Hide unlinked (${graph.unlinkedCount})`
                : `Show unlinked (${graph.unlinkedCount})`}
            </button>
          )}
          <button
            type="button"
            onClick={() => zoomBy(0.8)}
            aria-label="Zoom in"
            title="Zoom in"
            className="rounded p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <Plus size={14} />
          </button>
          <button
            type="button"
            onClick={() => zoomBy(1.25)}
            aria-label="Zoom out"
            title="Zoom out"
            className="rounded p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <Minus size={14} />
          </button>
          <button
            type="button"
            onClick={resetLayout}
            aria-label="Reset network layout"
            title="Reset network layout"
            className="flex items-center gap-1 rounded px-2 py-1.5 text-[10px] font-semibold text-slate-200 hover:bg-white/10"
          >
            <Maximize2 size={13} /> Reset layout
          </button>
        </div>
      </div>

      {hovered && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-20 w-64 rounded-lg border border-slate-600/80 bg-[#0b111b]/[0.98] p-3 text-white shadow-xl"
          style={{
            left: clamp(tooltipPoint.x + 14, 8, tooltipMaxX),
            top: clamp(tooltipPoint.y + 14, 8, tooltipMaxY),
          }}
        >
          {hovered.kind === "node" ? (
            <>
              <div className="truncate text-sm font-semibold">
                {hovered.node.name}
              </div>
              <div className="mt-0.5 truncate text-[11px] text-slate-300">
                {hovered.node.role} · {hovered.node.department || "General"}
              </div>
              <div className="mt-2 border-t border-white/10 pt-2 text-[11px] text-slate-300">
                {hovered.node.degree || 0} observed ties · PageRank{" "}
                {Number(hovered.node.influence_pagerank || 0).toFixed(3)}
              </div>
              <div className="mt-1 text-[10px] text-slate-500">
                Click for profile · drag to reposition
              </div>
            </>
          ) : (
            <>
              <div className="truncate text-xs font-semibold">
                {hovered.source?.name} ↔ {hovered.target?.name}
              </div>
              <div className="mt-1 text-[11px] text-slate-300">
                {hovered.count} recorded{" "}
                {hovered.count === 1 ? "event" : "events"}
                {hovered.isCrossDepartment ? " · Cross-department" : ""}
              </div>
              <div className="mt-1 truncate text-[10px] text-slate-400">
                {hovered.eventTypes
                  .map(({ type, count }) => `${type}: ${count}`)
                  .join(" · ") || "Imported collaboration"}
              </div>
              <div className="mt-1 text-[10px] text-slate-500">
                {formatDate(hovered.firstDate)} – {formatDate(hovered.lastDate)}
              </div>
            </>
          )}
        </div>
      )}

      <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded border border-white/[0.08] bg-[#070b12]/90 px-2 py-1 text-[9px] text-slate-500">
        Drag a person to reposition · drag the background to pan · scroll is
        available for zoom controls
      </div>
    </div>
  );
};

export default OnaNetworkMap2D;
