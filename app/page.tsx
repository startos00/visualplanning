"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Viewport,
} from "reactflow";

import type { GrimpoNodeData, ModeSetting, NodeKind } from "@/app/lib/graph";
import { seedGraph } from "@/app/lib/graph";
import { nodeTypes } from "@/app/nodes/nodeTypes";
import { clearState, loadState, saveState } from "@/app/lib/storage";

export default function Home() {
  const seeded = seedGraph();
  const [nodes, setNodes, onNodesChange] = useNodesState(seeded.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(seeded.edges);

  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [modeSetting, setModeSetting] = useState<ModeSetting>("auto");
  const [addOpen, setAddOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const rfRef = useRef<any>(null);
  const initialViewportRef = useRef<Viewport | null>(null);

  const effectiveMode: Exclude<ModeSetting, "auto"> =
    modeSetting === "auto"
      ? (viewport.zoom < 1 ? "strategy" : "tactical")
      : modeSetting;

  // Load persisted graph on first mount.
  useEffect(() => {
    const saved = loadState();
    if (saved?.nodes?.length) {
      setNodes(saved.nodes);
      setEdges(saved.edges ?? []);
      setModeSetting(saved.modeSetting ?? "auto");
      if (saved.viewport) initialViewportRef.current = saved.viewport;
    }
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save whenever graph changes (after initial load).
  useEffect(() => {
    if (!loaded) return;
    saveState({ nodes, edges, modeSetting, viewport });
  }, [edges, loaded, modeSetting, nodes, viewport]);

  const onMove = useCallback((_evt: unknown, vp: Viewport) => {
    setViewport(vp);
  }, []);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, animated: true }, eds));
    },
    [setEdges],
  );

  const onUpdateNode = useCallback(
    (id: string, patch: Partial<GrimpoNodeData>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
      );
    },
    [setNodes],
  );

  const onDeleteNode = useCallback(
    (id: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    },
    [setEdges, setNodes],
  );

  // Phase 3: pass zoom + callbacks down to glass nodes (ephemeral, not persisted).
  const viewNodes = useMemo(() => {
    return nodes.map((n) => ({
      ...n,
      hidden: effectiveMode === "strategy" && n.type === "tactical",
      data: {
        ...n.data,
        zoom: viewport.zoom,
        mode: effectiveMode,
        onUpdate: onUpdateNode,
        onDelete: onDeleteNode,
      },
    }));
  }, [effectiveMode, nodes, onDeleteNode, onUpdateNode, viewport.zoom]);

  const defaultEdgeOptions: Edge = useMemo(
    () => ({
      animated: true,
      style: {
        stroke: "rgba(34,211,238,0.55)",
        strokeWidth: 2,
      },
    }),
    [],
  );

  const addNode = useCallback(
    (kind: NodeKind) => {
      const id = `${kind}-${Date.now()}`;

      // Spawn near the center of the current viewport (hacky but good enough for MVP).
      let position = { x: 0, y: 0 };
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (rect && rfRef.current?.screenToFlowPosition) {
        position = rfRef.current.screenToFlowPosition({
          x: rect.width / 2,
          y: rect.height / 2,
        });
      }

      const base = { title: "", notes: "" } satisfies GrimpoNodeData;
      const data: GrimpoNodeData =
        kind === "strategy"
          ? { ...base, title: "New strategy", notes: "Big picture…" }
          : kind === "tactical"
            ? { ...base, title: "New task", notes: "Next step…", status: "todo" }
            : { ...base, title: "New resource", notes: "Summary…", link: "" };

      setNodes((nds) => nds.concat({ id, type: kind, position, data }));
      setAddOpen(false);
    },
    [setNodes],
  );

  return (
    <div
      ref={wrapperRef}
      className="relative h-screen w-screen bg-gradient-to-b from-slate-950 via-slate-950 to-black"
    >
      <ReactFlow
        nodes={viewNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        onMove={onMove}
        onInit={(instance) => {
          rfRef.current = instance;
          if (initialViewportRef.current) {
            instance.setViewport(initialViewportRef.current, { duration: 0 });
            setViewport(initialViewportRef.current);
            initialViewportRef.current = null;
          }
        }}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={32} size={1} color="rgba(255,255,255,0.04)" />
        <Controls />
      </ReactFlow>

      {/* Mode toggle overlay */}
      <div className="pointer-events-none absolute right-4 top-4 z-50 flex flex-col items-end gap-2">
        <div className="pointer-events-auto flex items-center rounded-full border border-cyan-300/20 bg-slate-950/40 p-1 backdrop-blur-md shadow-[0_0_18px_rgba(34,211,238,0.18)]">
          {(["auto", "strategy", "tactical"] as const).map((m) => {
            const active = modeSetting === m;
            return (
              <button
                key={m}
                onClick={() => setModeSetting(m)}
                className={[
                  "rounded-full px-3 py-1 text-xs tracking-wide transition-colors",
                  active
                    ? "bg-cyan-400/20 text-cyan-50 shadow-[0_0_14px_rgba(34,211,238,0.25)]"
                    : "text-cyan-100/70 hover:text-cyan-50",
                ].join(" ")}
                title={`Mode: ${m}`}
              >
                {m.toUpperCase()}
              </button>
            );
          })}
        </div>
        <div className="pointer-events-none text-xs text-cyan-100/60">
          Zoom: {viewport.zoom.toFixed(2)} • Showing: {effectiveMode.toUpperCase()}
        </div>
      </div>

      {/* Add Node FAB */}
      <div className="pointer-events-none absolute bottom-5 right-5 z-50">
        <div className="pointer-events-auto relative">
          {addOpen ? (
            <div className="mb-3 flex flex-col gap-2 rounded-3xl border border-rose-300/20 bg-slate-950/50 p-2 backdrop-blur-md shadow-[0_0_24px_rgba(244,63,94,0.22)]">
              <button
                className="rounded-2xl px-4 py-2 text-left text-sm text-rose-100 hover:bg-white/5"
                onClick={() => addNode("strategy")}
              >
                + Strategy node
              </button>
              <button
                className="rounded-2xl px-4 py-2 text-left text-sm text-rose-100 hover:bg-white/5"
                onClick={() => addNode("tactical")}
              >
                + Tactical node
              </button>
              <button
                className="rounded-2xl px-4 py-2 text-left text-sm text-rose-100 hover:bg-white/5"
                onClick={() => addNode("resource")}
              >
                + Resource node
              </button>
            </div>
          ) : null}

          <button
            onClick={() => setAddOpen((v) => !v)}
            className="grid h-14 w-14 place-items-center rounded-full border border-rose-300/25 bg-rose-500/20 text-rose-50 shadow-[0_0_26px_rgba(244,63,94,0.35)] backdrop-blur-md transition-transform hover:scale-[1.03]"
            title="Add node"
          >
            <span className="text-2xl leading-none">+</span>
          </button>
        </div>
      </div>

      {/* Reset (demo-friendly) */}
      <div className="pointer-events-none absolute bottom-5 left-5 z-50">
        <button
          className="pointer-events-auto rounded-full border border-cyan-300/20 bg-slate-950/40 px-4 py-2 text-xs text-cyan-50 backdrop-blur-md hover:bg-slate-950/55"
          onClick={() => {
            clearState();
            const fresh = seedGraph();
            setNodes(fresh.nodes);
            setEdges(fresh.edges);
            setModeSetting("auto");
          }}
          title="Clear local save and restore the demo graph"
        >
          Reset demo
        </button>
      </div>
    </div>
  );
}
