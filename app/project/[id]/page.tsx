"use client";

import { useCallback, useEffect, useMemo, useRef, useState, use } from "react";
import { motion } from "framer-motion";
import ReactFlow, {
  Background,
  BackgroundVariant,
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
import { getProjectData, saveProjectData } from "@/app/actions/projects";
import { useRouter } from "next/navigation";
import { Book, ChevronLeft } from "lucide-react";
import { DumboOctopus } from "@/app/components/DumboOctopus";
import { DumboOctopusCornerLogo } from "@/app/components/DumboOctopusCornerLogo";
import { Mascot, type MascotVariant } from "@/app/components/Mascot";
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
import { AgentChat } from "@/app/components/AgentChat";
import { MascotAgentPanel } from "@/app/components/MascotAgentPanel";
import type { GrimpoNode } from "@/app/lib/graph";
import { useChat } from "@ai-sdk/react";

// Define these outside the component to prevent re-creation on every render
const memoizedNodeTypes = nodeTypes;
const memoizedEdgeTypes = {};

function ProjectContent({ id }: { id: string }) {
  const router = useRouter();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [projectName, setProjectName] = useState("Loading Sector...");

  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [modeSetting, setModeSetting] = useState<ModeSetting>("auto");
  const [theme, setTheme] = useState<"abyss" | "surface">("abyss");
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
  const [highlightedNodes, setHighlightedNodes] = useState<{ nodeIds: string[]; color: string; }>({ nodeIds: [], color: '' });
  const [currentAgent, setCurrentAgent] = useState<MascotVariant>("dumbo");
  const [activeMascot, setActiveMascot] = useState<MascotVariant | null>(null);

  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rfRef = useRef<ReactFlowInstance | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Handle node highlighting from AI agent
  const handleHighlightNodes = useCallback((nodeIds: string[], color: string, duration: number = 8000) => {
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }
    setHighlightedNodes({ nodeIds, color });
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedNodes({ nodeIds: [], color: '' });
    }, duration);

    if (nodeIds.length > 0 && rfRef.current) {
      const highlightedNodeObjects = nodes.filter(n => nodeIds.includes(n.id));
      if (highlightedNodeObjects.length === 1) {
        const node = highlightedNodeObjects[0];
        rfRef.current.setCenter(node.position.x + 150, node.position.y + 100, {
          zoom: 1.2,
          duration: 1000,
        });
      } else if (highlightedNodeObjects.length > 1) {
        rfRef.current.fitView({
          nodes: highlightedNodeObjects,
          padding: 0.4,
          duration: 1000,
        });
      }
    }
  }, [nodes]);
  
  const [input, setInput] = useState("");
  const [chatData, setChatData] = useState<any[]>([]);

  const { messages, setMessages, sendMessage, status, error: chatError, stop } = useChat({
    api: "/api/chat",
    body: {
      agent: currentAgent,
      userDateTime: new Date().toISOString(),
      projectId: id, // Pass projectId to chat
    },
    onData: (data) => {
      setChatData(prev => [...prev, data]);
    }
  });

  const isLoading = status === "submitted" || status === "streaming";

  const append = useCallback(async (message: { role: "user"; content: string }) => {
    await sendMessage(message);
  }, [sendMessage]);

  const handleSubmit = useCallback((e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!input.trim()) return;
    sendMessage({ role: 'user', content: input });
    setInput("");
  }, [input, sendMessage]);

  // Effect to handle highlight data from AI SDK stream
  useEffect(() => {
    if (chatData && Array.isArray(chatData)) {
      const lastData = chatData[chatData.length - 1];
      if (lastData && typeof lastData === 'object' && 'type' in lastData && lastData.type === 'highlightNodes') {
        const { nodeIds, color } = lastData as any;
        handleHighlightNodes(nodeIds, color);
      }
    }
  }, [chatData, handleHighlightNodes]);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialViewportRef = useRef<Viewport | null>(null);

  const effectiveMode: Exclude<ModeSetting, "auto"> =
    modeSetting === "auto"
      ? (viewport.zoom < 1 ? "strategy" : "tactical")
      : modeSetting;

  // Load project data
  useEffect(() => {
    const savedTheme = localStorage.getItem("grimpo-theme") as "abyss" | "surface" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme === "surface" ? "light" : "dark");
    }

    async function load() {
      const result = await getProjectData(id);
      if (result.error) {
        console.error("Failed to load project:", result.error);
        if (result.error === "Unauthorized") {
          router.push("/login");
        } else {
          router.push("/");
        }
        return;
      }

      setProjectName(result.name || "Unnamed Sector");
      
      if (result.nodes) {
        setNodes(result.nodes);
      } else {
        // Fallback to seeded graph if new/empty project
        const seeded = seedGraph();
        setNodes(seeded.nodes);
        setEdges(seeded.edges);
      }
      
      if (result.edges) {
        setEdges(result.edges);
      }
      
      setLoaded(true);
    }
    load();
  }, [id, router, setNodes, setEdges]);

  // Debounced auto-save function
  const handleAutoSave = useCallback(() => {
    if (!loaded) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setSaveStatus("saving");

    saveTimeoutRef.current = setTimeout(async () => {
      const cleanNodes = JSON.parse(JSON.stringify(nodes));
      const cleanEdges = JSON.parse(JSON.stringify(edges));

      const result = await saveProjectData(id, cleanNodes, cleanEdges);
      
      if (result.success) {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        if (result.error?.includes("Unauthorized")) {
          setSaveStatus("auth-required");
          setTimeout(() => {
            router.push("/login");
          }, 1500);
        } else {
          console.error("Failed to save:", result.error);
          setSaveStatus("idle");
        }
      }
    }, 1000);
  }, [loaded, nodes, edges, id, router]);

  // Trigger auto-save on nodes or edges changes
  useEffect(() => {
    handleAutoSave();
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [nodes, edges, handleAutoSave]);

  // Update data-theme when theme changes
  useEffect(() => {
    localStorage.setItem("grimpo-theme", theme);
    document.documentElement.setAttribute("data-theme", theme === "surface" ? "light" : "dark");
  }, [theme]);

  const onMove = useCallback((_evt: unknown, vp: Viewport) => {
    setViewport(vp);
  }, []);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => {
        const newEdges = addEdge({ ...connection, animated: true }, eds);
        const sourceNode = nodes.find((n) => n.id === connection.source);
        if (sourceNode?.data.color && connection.source && connection.target) {
          const hex = sourceNode.data.color;
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
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
      
      if (patch.color !== undefined) {
        setEdges((eds) =>
          eds.map((e) => {
            if (e.source === id) {
              const hex = patch.color || "#22d3ee";
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
    awardForTaskCompletionForTaskId(nodeId);
    const octopusId = `octopus-${nodeId}-${Date.now()}`;
    setOctopusInstances((prev) => [...prev, octopusId]);
  }, []);

  const onOctopusComplete = useCallback((octopusId: string) => {
    setOctopusInstances((prev) => prev.filter((id) => id !== octopusId));
  }, []);

  useEffect(() => {
    const selected = nodes.filter((n) => n.selected).map((n) => n.id);
    setSelectedNodeIds(new Set(selected));
  }, [nodes]);

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
      const sourceNode = nodes.find((n) => n.id === sourceNodeId);
      const position = sourceNode
        ? { x: sourceNode.position.x + 400, y: sourceNode.position.y }
        : getViewportCenterFlowPosition();

      const id = `tactical-${Date.now()}`;
      const base = { title: "", notes: "" } satisfies GrimpoNodeData;
      const data: GrimpoNodeData = {
        ...base,
        title: text.slice(0, 100),
        notes: text.length > 100 ? text : "Task extracted from resource.",
        status: "todo",
      };

      setNodes((nds) => nds.concat({ id, type: "tactical", position, data }));
    },
    [getViewportCenterFlowPosition, nodes, setNodes],
  );

  const selectedPdfNodes = useMemo(() => {
    return nodes.filter(
      (n) =>
        selectedNodeIds.has(n.id) &&
        n.type === "resource" &&
        n.data.pdfUrl?.trim()
    ) as GrimpoNode[];
  }, [nodes, selectedNodeIds]);

  const viewNodes = useMemo(() => {
    return nodes.map((n) => {
      const isHighlighted = highlightedNodes.nodeIds.includes(n.id);
      return {
        ...n,
        hidden: effectiveMode === "strategy" && n.type === "tactical",
        selected: selectedNodeIds.has(n.id),
        className: isHighlighted ? `node-highlight node-highlight-${highlightedNodes.color}` : '',
        data: {
          ...n.data,
          zoom: viewport.zoom,
          mode: effectiveMode,
          theme,
          onUpdate: onUpdateNode,
          onDelete: onDeleteNode,
          onTaskDone: onTaskDone,
          onBathysphereMode: handleBathysphereMode,
          onExtractTask: onExtractTask,
          isHighlighted,
          highlightColor: isHighlighted ? highlightedNodes.color : null,
        },
      };
    });
  }, [effectiveMode, nodes, onDeleteNode, onTaskDone, onUpdateNode, viewport.zoom, selectedNodeIds, handleBathysphereMode, onExtractTask, highlightedNodes, theme]);

  const defaultEdgeOptions: DefaultEdgeOptions = useMemo(
    () => ({
      animated: theme === "abyss",
      style: {
        stroke: theme === "abyss" ? "rgba(34,211,238,0.55)" : "#94a3b8",
        strokeWidth: theme === "abyss" ? 2 : 1.5,
      },
    }),
    [theme],
  );

  const addNode = useCallback(
    (kind: NodeKind) => {
      const id = `${kind}-${Date.now()}`;
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
      className={`relative h-screen w-screen transition-colors duration-500 ${
        theme === "abyss"
          ? "bg-gradient-to-b from-slate-950 via-slate-950 to-black"
          : "bg-slate-50 text-slate-900"
      }`}
    >
      {!isBathysphereActive && (
        <div className="absolute top-4 left-4 z-50 flex items-center gap-4">
          <button
            onClick={() => router.push("/")}
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs backdrop-blur-md transition-all duration-300 ${
              theme === 'surface'
                ? 'border-slate-300 bg-white/80 text-slate-600 hover:bg-slate-100 shadow-sm'
                : 'border-cyan-300/20 bg-slate-950/40 text-cyan-50 hover:bg-slate-950/55 shadow-[0_0_18px_rgba(34,211,238,0.1)]'
            }`}
          >
            <ChevronLeft size={14} />
            Mission Control
          </button>
          <div className={`px-2 py-1 rounded-lg backdrop-blur-md border text-sm font-medium ${
            theme === 'surface'
              ? 'border-slate-200 bg-white/50 text-slate-700'
              : 'border-cyan-500/20 bg-slate-900/40 text-cyan-200 shadow-[0_0_15px_rgba(34,211,238,0.05)]'
          }`}>
            Sector: {projectName}
          </div>
        </div>
      )}

      {isSurfacing && <DecompressionOverlay />}

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
          console.log("Highlight from", nodeId, ":", content);
        }}
      />
      
      {bathysphereNodeId && (() => {
        const node = nodes.find((n) => n.id === bathysphereNodeId);
        if (!node || !node.data.pdfUrl?.trim()) return null;
        
        let nodePosition: { x: number; y: number } | undefined;
        if (rfRef.current) {
          try {
            const flowPosition = rfRef.current.getNode(node.id)?.position;
            if (flowPosition) {
              const screenPos = rfRef.current.flowToScreenPosition(flowPosition);
              nodePosition = { x: screenPos.x, y: screenPos.y };
            }
          } catch (e) {
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
            onPaneClick={() => setActiveMascot(null)}
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
            <Background 
              gap={32} 
              variant={theme === "surface" ? BackgroundVariant.Lines : BackgroundVariant.Dots}
              color={theme === "abyss" ? "rgba(255,255,255,0.04)" : "#e2e8f0"} 
            />
            <Controls position="bottom-left" style={{ bottom: 140 }} />
          </ReactFlow>

          <TemplateSpawner onSpawnPattern={spawnThinkingPattern} />
        </>
      )}

      {!isBathysphereActive && !sonarArrayOpen && (
      <div className="pointer-events-none absolute right-4 top-4 z-50 flex flex-col items-end gap-2">
        <div className="pointer-events-auto flex items-center gap-3">
          <div className={`flex items-center rounded-full border p-1 backdrop-blur-md transition-all duration-300 ${
            theme === 'surface' 
              ? 'border-slate-300 bg-white/80 shadow-md' 
              : 'border-cyan-300/20 bg-slate-950/40 shadow-[0_0_18px_rgba(34,211,238,0.18)]'
          }`}>
            {(["abyss", "surface"] as const).map((t) => {
              const active = theme === t;
              return (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={[
                    "rounded-full px-3 py-1 text-xs tracking-wide transition-all duration-300",
                    active
                      ? theme === 'surface'
                        ? "bg-slate-900 text-white shadow-sm"
                        : "bg-cyan-400/20 text-cyan-50 shadow-[0_0_14px_rgba(34,211,238,0.25)]"
                      : theme === 'surface'
                        ? "text-slate-500 hover:text-slate-900"
                        : "text-cyan-100/70 hover:text-cyan-50",
                  ].join(" ")}
                  title={`Theme: ${t}`}
                >
                  {t.toUpperCase()}
                </button>
              );
            })}
          </div>

          <div className={`flex items-center rounded-full border p-1 backdrop-blur-md transition-all duration-300 ${
            theme === 'surface' 
              ? 'border-slate-300 bg-white/80 shadow-md' 
              : 'border-cyan-300/20 bg-slate-950/40 shadow-[0_0_18px_rgba(34,211,238,0.18)]'
          }`}>
            {(["auto", "strategy", "tactical"] as const).map((m) => {
              const active = modeSetting === m;
              return (
                <button
                  key={m}
                  onClick={() => setModeSetting(m)}
                  className={[
                    "rounded-full px-3 py-1 text-xs tracking-wide transition-all duration-300",
                    active
                      ? theme === 'surface'
                        ? "bg-slate-900 text-white shadow-sm"
                        : "bg-cyan-400/20 text-cyan-50 shadow-[0_0_14px_rgba(34,211,238,0.25)]"
                      : theme === 'surface'
                        ? "text-slate-500 hover:text-slate-900"
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
            className={`rounded-full border px-3 py-1 text-xs tracking-wide backdrop-blur-md transition-all duration-300 ${
              theme === 'surface'
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm hover:bg-emerald-100"
                : "border-emerald-300/15 bg-emerald-500/10 text-emerald-50 shadow-[0_0_18px_rgba(16,185,129,0.18)] hover:bg-emerald-500/15"
            }`}
            title="Open Abyssal Garden"
          >
            GARDEN
          </button>
        </div>
        <div className={`pointer-events-none text-xs transition-colors duration-300 ${
          theme === 'surface' ? 'text-slate-500' : 'text-cyan-100/60'
        }`}>
          Zoom: {viewport.zoom.toFixed(2)} • Showing: {effectiveMode.toUpperCase()}
        </div>
      </div>
      )}

      {!isBathysphereActive && (
      <div className="pointer-events-none absolute bottom-5 right-5 z-50">
        <div className="pointer-events-auto relative">
          {addOpen ? (
            <div className={`mb-3 flex flex-col gap-2 rounded-3xl border p-2 backdrop-blur-md transition-all duration-300 ${
              theme === 'surface'
                ? 'border-slate-300 bg-white/90 shadow-xl'
                : 'border-rose-300/20 bg-slate-950/50 shadow-[0_0_24px_rgba(244,63,94,0.22)]'
            }`}>
              <button
                className={`rounded-2xl px-4 py-2 text-left text-sm transition-colors ${
                  theme === 'surface' ? 'text-slate-700 hover:bg-slate-100' : 'text-rose-100 hover:bg-white/5'
                }`}
                onClick={() => addNode("strategy")}
              >
                + Strategy node
              </button>
              <button
                className={`rounded-2xl px-4 py-2 text-left text-sm transition-colors ${
                  theme === 'surface' ? 'text-slate-700 hover:bg-slate-100' : 'text-rose-100 hover:bg-white/5'
                }`}
                onClick={() => addNode("tactical")}
              >
                + Tactical node
              </button>
              <button
                className={`rounded-2xl px-4 py-2 text-left text-sm transition-colors ${
                  theme === 'surface' ? 'text-slate-700 hover:bg-slate-100' : 'text-rose-100 hover:bg-white/5'
                }`}
                onClick={() => addNode("resource")}
              >
                + Resource node
              </button>
            </div>
          ) : null}

          <button
            onClick={() => setAddOpen((v) => !v)}
            className={`grid h-14 w-14 place-items-center rounded-full border backdrop-blur-md transition-all hover:scale-[1.03] ${
              theme === 'surface'
                ? 'border-slate-300 bg-slate-900 text-white shadow-lg hover:bg-slate-800'
                : 'border-rose-300/25 bg-rose-500/20 text-rose-50 shadow-[0_0_26px_rgba(244,63,94,0.35)]'
            }`}
            title="Add node"
          >
            <span className="text-2xl leading-none">+</span>
          </button>
        </div>
      </div>
      )}

      {!isBathysphereActive && (
      <div className="pointer-events-none absolute bottom-5 right-24 z-50">
        <button
          className={`pointer-events-auto rounded-full border px-4 py-2 text-xs backdrop-blur-md transition-all duration-300 disabled:opacity-50 ${
            theme === 'surface'
              ? 'border-slate-300 bg-white/80 text-slate-600 hover:bg-slate-100 hover:text-slate-900 shadow-sm'
              : 'border-cyan-300/20 bg-slate-950/40 text-cyan-50 hover:bg-slate-950/55'
          }`}
          onClick={async () => {
            setNodes([]);
            setEdges([]);
            setModeSetting("auto");
            const resetVp: Viewport = { x: 0, y: 0, zoom: 1 };
            setViewport(resetVp);
            rfRef.current?.setViewport(resetVp, { duration: 0 });
          }}
          disabled={isSurfacing}
          title="Clear canvas (but not the project)"
        >
          Clear Canvas
        </button>
      </div>
      )}

      {!isBathysphereActive && (
      <div className="pointer-events-none absolute top-[120px] left-[16px] z-50 flex flex-col gap-3">
        <div className="pointer-events-auto">
          <SurfaceButton 
            onSurface={() => setIsSurfacing(true)} 
            disabled={isSurfacing} 
            theme={theme}
          />
        </div>
        <div className="pointer-events-auto">
          <button
            onClick={() => setResourceChamberOpen(true)}
            className={`group flex h-12 w-12 items-center justify-center rounded-2xl border backdrop-blur-md transition-all duration-300 ${
              theme === 'surface'
                ? 'border-slate-300 bg-white/80 text-slate-700 shadow-md hover:bg-slate-50 hover:shadow-lg'
                : 'border-orange-500/30 bg-slate-950/40 text-orange-400 hover:bg-orange-500/10 hover:shadow-[0_0_20px_rgba(249,115,22,0.2)]'
            }`}
            title="Open The Resource Chamber"
          >
            <Book className="h-6 w-6 transition-transform group-hover:scale-110" />
          </button>
        </div>
      </div>
      )}

      {!isBathysphereActive && (
        <MascotAgentPanel 
          theme={theme} 
          onAppend={(msg) => append(msg)}
          onOpenResourceChamber={() => setResourceChamberOpen(true)}
          dragConstraints={wrapperRef}
          activeMascot={activeMascot as any}
          onActiveMascotChange={setActiveMascot as any}
        />
      )}

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
              {saveStatus === "saving" ? "Saving..." : "Saved to Sector"}
            </div>
          )}
        </div>
      )}

      <AgentChat 
        chat={{ messages, input, setInput, handleSubmit, append, isLoading }}
        agent={currentAgent}
        onAgentChange={setCurrentAgent}
        theme={theme} 
      />
    </div>
  );
}

export default function ProjectPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<any>;
}) {
  const { id } = use(props.params);
  use(props.searchParams);

  return (
    <ReactFlowProvider>
      <ProjectContent id={id} />
    </ReactFlowProvider>
  );
}

