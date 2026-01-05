"use client";

import { useCallback, useEffect, useMemo, useRef, useState, use } from "react";
import ReactFlow, {
  Background,
  Controls,
  addEdge,
  useEdgesState,
  useNodesState,
  ReactFlowProvider,
  type Connection,
  type DefaultEdgeOptions,
  type ReactFlowInstance,
  type Viewport,
} from "reactflow";

import type { GrimpoNodeData, ModeSetting, NodeKind } from "@/app/lib/graph";
import { seedGraph } from "@/app/lib/graph";
import { nodeTypes } from "@/app/nodes/nodeTypes";
import { clearState } from "@/app/lib/storage";
import { loadState, saveState } from "@/app/actions/canvas";
import { useRouter } from "next/navigation";
import { Book } from "lucide-react";
import { DumboOctopus } from "@/app/components/DumboOctopus";
import { DumboOctopusCornerLogo } from "@/app/components/DumboOctopusCornerLogo";
import { Mascot } from "@/app/components/Mascot";
import { TemplateSpawner } from "@/app/components/TemplateSpawner";
import { buildThinkingPatternTemplate, type ThinkingPattern, type ThinkingRole } from "@/app/lib/templates";
import { AbyssalGardenPanel } from "@/app/components/AbyssalGarden/AbyssalGardenPanel";
import { ResourceChamber } from "@/app/components/ResourceChamber";
import { awardForTaskCompletionForTaskId } from "@/app/lib/abyssalGarden";
import { SurfaceButton } from "@/app/components/auth/SurfaceButton";
import { DecompressionOverlay } from "@/app/components/auth/DecompressionOverlay";
import { FloatingControlBar } from "@/app/components/FloatingControlBar";
import { SonarArray } from "@/app/components/SonarArray";
import { DumbyReader } from "@/app/components/DumbyReader";
import type { GrimpoNode } from "@/app/lib/graph";

// Define these outside the component to prevent re-creation on every render
const memoizedNodeTypes = nodeTypes;
const memoizedEdgeTypes = {};

function HomeContent() {
  const router = useRouter();
  const seeded = seedGraph();
  const [nodes, setNodes, onNodesChange] = useNodesState(seeded.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(seeded.edges);

  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [modeSetting, setModeSetting] = useState<ModeSetting>("auto");
  const [addOpen, setAddOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [octopusInstances, setOctopusInstances] = useState<string[]>([]);
  const [abyssalOpen, setAbyssalOpen] = useState(false);
  const [resourceChamberOpen, setResourceChamberOpen] = useState(false);
  const [isSurfacing, setIsSurfacing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "auth-required">("idle");
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [sonarArrayOpen, setSonarArrayOpen] = useState(false);
  const [bathysphereNodeId, setBathysphereNodeId] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const rfRef = useRef<ReactFlowInstance | null>(null);
  const initialViewportRef = useRef<Viewport | null>(null);

  const effectiveMode: Exclude<ModeSetting, "auto"> =
    modeSetting === "auto"
      ? (viewport.zoom < 1 ? "strategy" : "tactical")
      : modeSetting;

  // Load persisted graph on first mount.
  useEffect(() => {
    async function load() {
      const saved = await loadState();
      if (saved && (saved.nodes !== null || saved.edges !== null)) {
        // Parse JSON and update nodes and edges state
        if (saved.nodes) {
          try {
            const parsedNodes = typeof saved.nodes === "string" ? JSON.parse(saved.nodes) : saved.nodes;
            setNodes(Array.isArray(parsedNodes) ? parsedNodes : []);
          } catch {
            setNodes([]);
          }
        }
        if (saved.edges) {
          try {
            const parsedEdges = typeof saved.edges === "string" ? JSON.parse(saved.edges) : saved.edges;
            setEdges(Array.isArray(parsedEdges) ? parsedEdges : []);
          } catch {
            setEdges([]);
          }
        }
      }
      setLoaded(true);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced auto-save function
  const handleAutoSave = useCallback(() => {
    if (!loaded) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set saving status
    setSaveStatus("saving");

    // Set new timeout (1 second debounce)
    saveTimeoutRef.current = setTimeout(async () => {
      // Deep clone to remove internal ReactFlow properties (Symbols, functions, internals)
      // that cannot be passed to Server Functions
      const cleanNodes = JSON.parse(JSON.stringify(nodes));
      const cleanEdges = JSON.parse(JSON.stringify(edges));

      const result = await saveState(cleanNodes, cleanEdges);
      
      if (result.success) {
        setSaveStatus("saved");
        // Reset to idle after 2 seconds
        setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        // Check if it's an authentication error
        if (result.error?.includes("Unauthorized")) {
          setSaveStatus("auth-required");
          // Redirect to login page after a short delay
          setTimeout(() => {
            router.push("/login");
          }, 1500);
        } else {
          console.error("Failed to save:", result.error);
          setSaveStatus("idle");
        }
      }
    }, 1000);
  }, [loaded, nodes, edges]);

  // Trigger auto-save on nodes or edges changes
  useEffect(() => {
    handleAutoSave();
    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [nodes, edges, handleAutoSave]);

  const onMove = useCallback((_evt: unknown, vp: Viewport) => {
    setViewport(vp);
  }, []);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => {
        const newEdges = addEdge({ ...connection, animated: true }, eds);
        // Set edge color based on source node's color
        const sourceNode = nodes.find((n) => n.id === connection.source);
        if (sourceNode?.data.color && connection.source && connection.target) {
          const hex = sourceNode.data.color;
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          // Find the newly added edge by matching source and target
          return newEdges.map((e) =>
            e.source === connection.source && e.target === connection.target
              ? {
                  ...e,
                  style: {
                    ...e.style,
                    stroke: `rgba(${r},${g},${b},0.55)`,
                  },
                }
              : e,
          );
        }
        return newEdges;
      });
    },
    [setEdges, nodes],
  );

  const onUpdateNode = useCallback(
    (id: string, patch: Partial<GrimpoNodeData>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
      );
      
      // Update edge colors when node color changes (optional enhancement)
      if (patch.color !== undefined) {
        setEdges((eds) =>
          eds.map((e) => {
            if (e.source === id) {
              // Convert hex to rgba for edge stroke
              const hex = patch.color || "#22d3ee"; // Default cyan
              const r = parseInt(hex.slice(1, 3), 16);
              const g = parseInt(hex.slice(3, 5), 16);
              const b = parseInt(hex.slice(5, 7), 16);
              return {
                ...e,
                style: {
                  ...e.style,
                  stroke: `rgba(${r},${g},${b},0.55)`,
                },
              };
            }
            return e;
          }),
        );
      }
    },
    [setNodes, setEdges],
  );

  const onDeleteNode = useCallback(
    (id: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    },
    [setEdges, setNodes],
  );

  const onTaskDone = useCallback((nodeId: string) => {
    // Abyssal Garden rewards (monotonic, MVP: no decrement on undo).
    awardForTaskCompletionForTaskId(nodeId);

    // Generate unique ID for this octopus instance
    const octopusId = `octopus-${nodeId}-${Date.now()}`;
    setOctopusInstances((prev) => [...prev, octopusId]);
  }, []);

  const onOctopusComplete = useCallback((octopusId: string) => {
    setOctopusInstances((prev) => prev.filter((id) => id !== octopusId));
  }, []);

  // Track selected nodes from ReactFlow's internal state
  useEffect(() => {
    const selected = nodes.filter((n) => n.selected).map((n) => n.id);
    setSelectedNodeIds(new Set(selected));
  }, [nodes]);

  // Handle Bathysphere mode
  const handleBathysphereMode = useCallback((nodeId: string, enabled: boolean) => {
    setBathysphereNodeId(enabled ? nodeId : null);
  }, []);

  const getViewportCenterFlowPosition = useCallback(() => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (rect && rfRef.current?.screenToFlowPosition) {
      return rfRef.current.screenToFlowPosition({
        x: rect.width / 2,
        y: rect.height / 2,
      });
    }
    return { x: 0, y: 0 };
  }, []);

  const onExtractTask = useCallback(
    (text: string, sourceNodeId: string) => {
      // Find the source node to position the new task nearby
      const sourceNode = nodes.find((n) => n.id === sourceNodeId);
      const position = sourceNode
        ? { x: sourceNode.position.x + 400, y: sourceNode.position.y }
        : getViewportCenterFlowPosition();

      const id = `tactical-${Date.now()}`;
      const base = { title: "", notes: "" } satisfies GrimpoNodeData;
      const data: GrimpoNodeData = {
        ...base,
        title: text.slice(0, 100), // Truncate if too long
        notes: text.length > 100 ? text : "Task extracted from resource.",
        status: "todo",
      };

      setNodes((nds) => nds.concat({ id, type: "tactical", position, data }));
    },
    [getViewportCenterFlowPosition, nodes, setNodes],
  );

  // Get selected PDF nodes
  const selectedPdfNodes = useMemo(() => {
    return nodes.filter(
      (n) =>
        selectedNodeIds.has(n.id) &&
        n.type === "resource" &&
        n.data.pdfUrl?.trim()
    ) as GrimpoNode[];
  }, [nodes, selectedNodeIds]);

  // Phase 3: pass zoom + callbacks down to glass nodes (ephemeral, not persisted).
  const viewNodes = useMemo(() => {
    return nodes.map((n) => ({
      ...n,
      hidden: effectiveMode === "strategy" && n.type === "tactical",
      selected: selectedNodeIds.has(n.id),
      data: {
        ...n.data,
        zoom: viewport.zoom,
        mode: effectiveMode,
        onUpdate: onUpdateNode,
        onDelete: onDeleteNode,
        onTaskDone: onTaskDone,
        onBathysphereMode: handleBathysphereMode,
        onExtractTask: onExtractTask,
      },
    }));
  }, [effectiveMode, nodes, onDeleteNode, onTaskDone, onUpdateNode, viewport.zoom, selectedNodeIds, handleBathysphereMode, onExtractTask]);

  const defaultEdgeOptions: DefaultEdgeOptions = useMemo(
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

  const spawnThinkingPattern = useCallback(
    (args: { role: ThinkingRole; pattern: Exclude<ThinkingPattern, "blank"> }) => {
      const anchor = getViewportCenterFlowPosition();
      const { nodes: newNodes, edges: newEdges } = buildThinkingPatternTemplate({
        role: args.role,
        pattern: args.pattern,
        anchor,
      });
      setNodes((nds) => nds.concat(newNodes));
      setEdges((eds) => eds.concat(newEdges));
    },
    [getViewportCenterFlowPosition, setEdges, setNodes],
  );

  const isBathysphereActive = bathysphereNodeId !== null;

  return (
    <div
      ref={wrapperRef}
      className="relative h-screen w-screen bg-gradient-to-b from-slate-950 via-slate-950 to-black"
    >
      {!isBathysphereActive && <DumboOctopusCornerLogo corner="top-left" inset={16} size={46} decorative />}

      {isSurfacing && <DecompressionOverlay />}

      {/* Dumbo Octopus Celebration Animations */}
      {!isBathysphereActive && octopusInstances.map((octopusId) => (
        <DumboOctopus key={octopusId} id={octopusId} onComplete={onOctopusComplete} />
      ))}

      {!isBathysphereActive && <AbyssalGardenPanel open={abyssalOpen} onClose={() => setAbyssalOpen(false)} />}
      <ResourceChamber 
        isOpen={resourceChamberOpen} 
        onClose={() => setResourceChamberOpen(false)} 
        onAddResource={(data) => {
          const kind = "resource";
          const id = `${kind}-${Date.now()}`;
          const position = getViewportCenterFlowPosition();
          const base = { title: "New Resource", notes: "", link: "" } satisfies GrimpoNodeData;
          setNodes((nds) => nds.concat({ 
            id, 
            type: kind, 
            position, 
            data: { ...base, ...data } as GrimpoNodeData 
          }));
        }}
      />
      {!isBathysphereActive && (
        <FloatingControlBar
          selectedCount={selectedPdfNodes.length}
          onCompare={() => {
            if (selectedPdfNodes.length >= 2) {
              setSonarArrayOpen(true);
            }
          }}
        />
      )}
      <SonarArray
        nodes={selectedPdfNodes}
        isOpen={sonarArrayOpen}
        onClose={() => {
          setSonarArrayOpen(false);
          setSelectedNodeIds(new Set());
        }}
        onHighlight={(nodeId, content, position) => {
          // TODO: Implement shared intelligence for cross-document highlighting
          console.log("Highlight from", nodeId, ":", content);
        }}
      />
      {/* Bathysphere Mode Overlay */}
      {bathysphereNodeId && (() => {
        const node = nodes.find((n) => n.id === bathysphereNodeId);
        if (!node || !node.data.pdfUrl?.trim()) return null;
        
        // Get node screen position for smooth animation
        let nodePosition: { x: number; y: number } | undefined;
        if (rfRef.current) {
          try {
            const flowPosition = rfRef.current.getNode(node.id)?.position;
            if (flowPosition) {
              const screenPos = rfRef.current.flowToScreenPosition(flowPosition);
              nodePosition = { x: screenPos.x, y: screenPos.y };
            }
          } catch (e) {
            // Fallback if position can't be determined
            console.warn("Could not get node position for animation:", e);
          }
        }
        
        return (
          <DumbyReader
            pdfUrl={node.data.pdfUrl}
            nodeId={node.id}
            nodeTitle={node.data.title}
            viewMode="bathysphere"
            nodePosition={nodePosition}
            onViewModeChange={(mode) => {
              if (mode === "inline") {
                setBathysphereNodeId(null);
              }
            }}
          />
        );
      })()}

      {!isBathysphereActive && (
        <>
          <ReactFlow
            nodes={viewNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={memoizedNodeTypes}
            edgeTypes={memoizedEdgeTypes}
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
            multiSelectionKeyCode="Shift"
          >
            <Background gap={32} size={1} color="rgba(255,255,255,0.04)" />
            <Controls position="bottom-left" style={{ bottom: 140 }} />
          </ReactFlow>

          <TemplateSpawner onSpawnPattern={spawnThinkingPattern} />
        </>
      )}

      {/* Mode toggle overlay */}
      {!isBathysphereActive && !sonarArrayOpen && (
      <div className="pointer-events-none absolute right-4 top-4 z-50 flex flex-col items-end gap-2">
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="flex items-center rounded-full border border-cyan-300/20 bg-slate-950/40 p-1 backdrop-blur-md shadow-[0_0_18px_rgba(34,211,238,0.18)]">
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

          <button
            onClick={() => setAbyssalOpen(true)}
            className="rounded-full border border-emerald-300/15 bg-emerald-500/10 px-3 py-1 text-xs tracking-wide text-emerald-50 shadow-[0_0_18px_rgba(16,185,129,0.18)] backdrop-blur-md hover:bg-emerald-500/15"
            title="Open Abyssal Garden"
          >
            GARDEN
          </button>
        </div>
        <div className="pointer-events-none text-xs text-cyan-100/60">
          Zoom: {viewport.zoom.toFixed(2)} • Showing: {effectiveMode.toUpperCase()}
        </div>
      </div>
      )}

      {/* Add Node FAB */}
      {!isBathysphereActive && (
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
      )}

      {/* Reset */}
      {!isBathysphereActive && (
      <div className="pointer-events-none absolute bottom-5 right-24 z-50">
        <button
          className="pointer-events-auto rounded-full border border-cyan-300/20 bg-slate-950/40 px-4 py-2 text-xs text-cyan-50 backdrop-blur-md hover:bg-slate-950/55 disabled:opacity-50"
          onClick={async () => {
            await clearState();
            // Reset to a blank canvas.
            setNodes([]);
            setEdges([]);
            setModeSetting("auto");
            const resetVp: Viewport = { x: 0, y: 0, zoom: 1 };
            setViewport(resetVp);
            rfRef.current?.setViewport(resetVp, { duration: 0 });
          }}
          disabled={isSurfacing}
          title="Clear local save and reset to a blank canvas"
        >
          Reset
        </button>
      </div>
      )}

      {/* Surface Button - Positioned under the top-left logo */}
      {!isBathysphereActive && (
      <div className="pointer-events-none absolute top-[72px] left-[16px] z-50 flex flex-col gap-3">
        <div className="pointer-events-auto">
          <SurfaceButton onSurface={() => setIsSurfacing(true)} disabled={isSurfacing} />
        </div>
        <div className="pointer-events-auto">
          <button
            onClick={() => setResourceChamberOpen(true)}
            className="group flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-500/30 bg-slate-950/40 text-orange-400 backdrop-blur-md transition-all hover:bg-orange-500/10 hover:shadow-[0_0_20px_rgba(249,115,22,0.2)]"
            title="Open The Resource Chamber"
          >
            <Book className="h-6 w-6 transition-transform group-hover:scale-110" />
          </button>
        </div>
      </div>
      )}

      {/* Mascot variants (demo) */}
      {!isBathysphereActive && (
      <div className="pointer-events-none absolute bottom-5 left-5 z-50">
        <div className="pointer-events-auto rounded-3xl border border-cyan-300/15 bg-slate-950/35 p-3 backdrop-blur-md shadow-[0_0_18px_rgba(34,211,238,0.16)]">
          <div className="mb-2 text-[11px] tracking-widest text-cyan-100/70">MASCOTS</div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-1">
              <Mascot variant="dumbo" size={44} className="drop-shadow-[0_0_10px_rgba(250,204,21,0.12)]" />
              <div className="text-[10px] text-cyan-50/70">Intern</div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Mascot variant="dumby" size={44} className="drop-shadow-[0_0_10px_rgba(251,146,60,0.12)]" />
              <div className="text-[10px] text-cyan-50/70">Manager</div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Mascot variant="grimpy" size={44} />
              <div className="text-[10px] text-cyan-50/70">Architect</div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Save status indicator */}
      {!isBathysphereActive && saveStatus !== "idle" && (
        <div className="pointer-events-none absolute bottom-5 left-[200px] z-50">
          {saveStatus === "auth-required" ? (
            <div className="pointer-events-auto rounded-full border border-amber-300/30 bg-amber-500/20 px-4 py-2 text-[11px] text-amber-100 backdrop-blur-md shadow-[0_0_18px_rgba(245,158,11,0.18)]">
              <span className="mr-2">Sign in required to save</span>
              <button
                onClick={() => router.push("/login")}
                className="underline hover:text-amber-50"
              >
                Go to Login →
              </button>
            </div>
          ) : (
            <div className="pointer-events-auto rounded-full border border-cyan-300/20 bg-slate-950/60 px-3 py-1.5 text-[10px] text-cyan-100/80 backdrop-blur-md">
              {saveStatus === "saving" ? "Saving..." : "Saved to Neon"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Home(props: {
  params: Promise<any>;
  searchParams: Promise<any>;
}) {
  // Explicitly unwrap promises to avoid Next.js 15+ synchronous access errors
  // when props are enumerated by dev tools/extensions.
  use(props.params);
  use(props.searchParams);

  return (
    <ReactFlowProvider>
      <HomeContent />
    </ReactFlowProvider>
  );
}
