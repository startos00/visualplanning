"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useReactFlow } from "reactflow";
import { 
  X, 
  Search, 
  Video, 
  FileText, 
  Link as LinkIcon, 
  ChevronRight,
  Book,
  Zap,
  Upload,
  Highlighter
} from "lucide-react";
import type { GrimpoNode, GrimpoNodeData } from "@/app/lib/graph";
import { getHighlights } from "@/app/actions/highlights";
import type { Highlight } from "@/app/lib/db/schema";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onAddResource?: (data: Partial<GrimpoNodeData>) => void;
};

type MediaTab = "all" | "read" | "watch" | "links" | "highlights";

export function ResourceChamber({ isOpen, onClose, onAddResource }: Props) {
  const { getNodes, setCenter } = useReactFlow();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<MediaTab>("all");
  const [isDragging, setIsDragging] = useState(false);
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  const nodes = getNodes() as GrimpoNode[];

  // Fetch highlights when sidebar opens
  useEffect(() => {
    if (isOpen) {
      getHighlights().then(setHighlights);
    }
  }, [isOpen]);

  // Filter nodes based on type and content
  const resources = useMemo(() => {
    return nodes.filter((node) => {
      const isResource = node.type === "resource" || node.type === "media";
      const hasMediaEmoji = /📺|📄|🔗/.test(node.data.title || "");
      const hasMediaUrls = !!(node.data.videoUrl || node.data.pdfUrl || node.data.link);
      
      return isResource || hasMediaEmoji || hasMediaUrls;
    });
  }, [nodes]);

  // Apply tab and search filters
  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase();

    // 1. Filter Resources
    const filteredResources = resources.filter((res) => {
      const title = (res.data.title || "").toLowerCase();
      const matchesSearch = title.includes(query);
      
      if (!matchesSearch) return false;
      if (activeTab === "all" || activeTab === "highlights") return true;

      const videoUrl = res.data.videoUrl || "";
      const pdfUrl = res.data.pdfUrl || "";
      const link = res.data.link || "";

      if (activeTab === "watch") {
        return !!videoUrl || title.includes("📺");
      }
      if (activeTab === "read") {
        return !!pdfUrl || title.includes("📄");
      }
      if (activeTab === "links") {
        return (!!link && !videoUrl && !pdfUrl) || title.includes("🔗");
      }
      
      return true;
    });

    // 2. Filter Highlights
    const filteredHighlights = highlights.filter((h) => {
      const matchesSearch = h.content.toLowerCase().includes(query) || (h.comment || "").toLowerCase().includes(query);
      if (!matchesSearch) return false;
      if (activeTab === "all" || activeTab === "highlights") return true;
      return false; // Highlights only show in "all" or "highlights"
    });

    return {
      resources: activeTab === "highlights" ? [] : filteredResources,
      highlights: activeTab === "watch" || activeTab === "read" || activeTab === "links" ? [] : filteredHighlights
    };
  }, [resources, highlights, searchQuery, activeTab]);

  const handleLocate = (node: GrimpoNode) => {
    setCenter(node.position.x + 160, node.position.y + 100, {
      zoom: 1.2,
      duration: 800,
    });
    // On mobile we might want to close the sidebar
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  const handleLocateHighlight = (highlight: Highlight) => {
    const parentNode = nodes.find(n => n.id === highlight.nodeId);
    if (parentNode) {
      handleLocate(parentNode);
    }
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const text = e.dataTransfer.getData("text/plain");
    const files = Array.from(e.dataTransfer.files);

    if (files.length > 0) {
      const file = files[0];
      if (file.type === "application/pdf") {
        // In a real app we'd upload this. For now, we'll create a node with a placeholder or handle via onAddResource
        onAddResource?.({
          title: `📄 ${file.name}`,
          notes: `Uploaded PDF: ${file.name}`,
          // pdfUrl would be set after upload in a real scenario
        });
      }
    } else if (text) {
      try {
        const url = new URL(text);
        const isYoutube = url.hostname.includes("youtube.com") || url.hostname.includes("youtu.be");
        const isPdf = url.pathname.endsWith(".pdf");

        if (isYoutube) {
          onAddResource?.({
            title: "📺 New Video",
            videoUrl: text,
            notes: "Added via Resource Chamber"
          });
        } else if (isPdf) {
          onAddResource?.({
            title: "📄 New Document",
            pdfUrl: text,
            notes: "Added via Resource Chamber"
          });
        } else {
          onAddResource?.({
            title: "🔗 New Link",
            link: text,
            notes: "Added via Resource Chamber"
          });
        }
      } catch {
        // Not a URL, maybe just text
        onAddResource?.({
          title: "New Resource",
          notes: text
        });
      }
    }
  }, [onAddResource]);

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed left-0 top-0 z-[80] h-full w-[320px] transform border-r border-orange-500/20 bg-slate-900/95 shadow-[10px_0_30px_rgba(249,115,22,0.1)] backdrop-blur-xl transition-transform duration-500 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-orange-500/20 bg-gradient-to-r from-orange-500/10 to-transparent px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-orange-500/20 p-2 shadow-[0_0_15px_rgba(249,115,22,0.3)]">
              <Book className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-xs font-bold tracking-[0.2em] text-orange-100 uppercase">The Resource Chamber</h2>
              <p className="text-[10px] text-orange-300/60 uppercase tracking-widest">Managed by Dumby</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-orange-200/50 transition-colors hover:bg-orange-500/20 hover:text-orange-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drop Zone (Resource Chamber) */}
        <div className="p-4">
          <div 
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 transition-all duration-300 ${
              isDragging 
                ? "border-orange-400 bg-orange-500/10 shadow-[0_0_20px_rgba(249,115,22,0.2)]" 
                : "border-orange-500/20 bg-slate-950/20"
            }`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent transition-opacity ${isDragging ? "opacity-100" : "opacity-0"}`} />
            <div className="relative flex flex-col items-center text-center">
              <div className={`mb-2 rounded-full p-3 transition-colors ${isDragging ? "bg-orange-400/20 text-orange-300" : "bg-orange-500/10 text-orange-400/60"}`}>
                <Zap className={`h-6 w-6 ${isDragging ? "animate-pulse" : ""}`} />
              </div>
              <p className="text-[11px] font-bold tracking-widest text-orange-100/80">DROP RESOURCES HERE</p>
              <p className="mt-1 text-[9px] text-orange-300/40 uppercase">YouTube • PDF • Links</p>
            </div>
          </div>
        </div>

        {/* Search & Tabs */}
        <div className="px-4 pb-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-orange-300/40" />
            <input
              type="text"
              placeholder="Search the chamber..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-orange-500/20 bg-slate-950/40 py-2 pl-10 pr-4 text-sm text-orange-50 placeholder:text-orange-300/30 outline-none focus:border-orange-400/50 focus:ring-1 focus:ring-orange-400/20"
            />
          </div>

          <div className="flex gap-1 rounded-xl border border-orange-500/10 bg-slate-950/20 p-1">
            {([
              { id: "all", label: "All" },
              { id: "watch", label: "Video" },
              { id: "read", label: "PDF" },
              { id: "links", label: "Link" },
              { id: "highlights", label: "Orange" }
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 rounded-lg px-1 py-1.5 text-[9px] font-bold uppercase tracking-wider transition-all ${
                  activeTab === tab.id
                    ? "bg-orange-500/20 text-orange-200 shadow-[0_0_10px_rgba(249,115,22,0.15)]"
                    : "text-orange-300/40 hover:text-orange-300/60"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-10 custom-scrollbar">
          {(filteredItems.resources.length > 0 || filteredItems.highlights.length > 0) ? (
            <div className="space-y-4">
              {/* Resources Section */}
              {filteredItems.resources.length > 0 && (
                <div className="space-y-2">
                  {activeTab === "all" && <h3 className="text-[10px] font-bold text-orange-400/50 uppercase tracking-widest px-2">Resources</h3>}
                  {filteredItems.resources.map((res) => {
                    const isVideo = !!res.data.videoUrl || (res.data.title || "").includes("📺");
                    const isPdf = !!res.data.pdfUrl || (res.data.title || "").includes("📄");
                    
                    return (
                      <button
                        key={res.id}
                        onClick={() => handleLocate(res)}
                        className="group relative flex w-full items-center gap-3 rounded-2xl border border-orange-500/5 bg-slate-950/30 p-3 text-left transition-all hover:border-orange-500/30 hover:bg-orange-500/5"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 border border-orange-500/10 group-hover:border-orange-500/30 transition-colors">
                          {isVideo ? (
                            <Video className="h-5 w-5 text-orange-400/80" />
                          ) : isPdf ? (
                            <FileText className="h-5 w-5 text-orange-400/80" />
                          ) : (
                            <LinkIcon className="h-5 w-5 text-orange-400/80" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-orange-50">
                            {res.data.title || "Untitled Resource"}
                          </div>
                          <div className="truncate text-[10px] text-orange-300/40 group-hover:text-orange-300/60">
                            {res.data.videoUrl || res.data.pdfUrl || res.data.link || "No attachment"}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-orange-300/20 group-hover:text-orange-400/60" />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Highlights Section */}
              {filteredItems.highlights.length > 0 && (
                <div className="space-y-2">
                  {(activeTab === "all" || activeTab === "highlights") && <h3 className="text-[10px] font-bold text-orange-400/50 uppercase tracking-widest px-2">{activeTab === "all" ? "PDF Highlights" : "Orange Highlights"}</h3>}
                  {filteredItems.highlights.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => handleLocateHighlight(h)}
                      className="group relative flex w-full flex-col gap-2 rounded-2xl border border-orange-500/5 bg-orange-500/5 p-4 text-left transition-all hover:border-orange-500/30 hover:bg-orange-500/10"
                    >
                      <div className="flex items-center gap-2 text-orange-400/60">
                        <Highlighter className="h-3 w-3" />
                        <span className="text-[9px] font-bold uppercase tracking-widest">Quote from PDF</span>
                      </div>
                      <p className="text-xs italic text-orange-100/90 leading-relaxed line-clamp-3">
                        "{h.content}"
                      </p>
                      {h.comment && (
                        <div className="mt-1 flex flex-col gap-1 rounded-lg bg-slate-950/40 p-2 border border-orange-500/10">
                          <span className="text-[8px] font-bold text-orange-400/40 uppercase">Dumby's Note</span>
                          <p className="text-[10px] text-orange-200/70">{h.comment}</p>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-10 flex flex-col items-center justify-center text-center px-6">
              <div className="mb-4 rounded-full bg-orange-500/10 p-8 shadow-[0_0_40px_rgba(249,115,22,0.15),inset_0_0_20px_rgba(249,115,22,0.1)]">
                <Upload className="h-10 w-10 text-orange-500/40 animate-pulse" />
              </div>
              <p className="text-xs font-bold text-orange-200/60 uppercase tracking-widest">No resources found in this chamber</p>
              <p className="mt-2 text-[10px] text-orange-300/30 uppercase tracking-[0.2em]">Ready to secure your cargo</p>
            </div>
          )}
        </div>
      </aside>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(249, 115, 22, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(249, 115, 22, 0.2);
        }
      `}</style>
    </>
  );
}
