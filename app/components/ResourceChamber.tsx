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
  Highlighter,
  Plus,
  Trash2,
  Edit2,
  FolderPlus,
  ChevronDown,
  Layout
} from "lucide-react";
import type { GrimpoNode, GrimpoNodeData } from "@/app/lib/graph";
import { getHighlights, deleteHighlight, addNote, updateHighlight } from "@/app/actions/highlights";
import { getBookshelves, createBookshelf, deleteBookshelf } from "@/app/actions/bookshelves";
import type { Highlight, Bookshelf } from "@/app/lib/db/schema";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onAddResource?: (data: Partial<GrimpoNodeData>) => void;
};

type MediaTab = "all" | "read" | "watch" | "links" | "highlights" | "bookshelf";

export function ResourceChamber({ isOpen, onClose, onAddResource }: Props) {
  const { getNodes, setCenter, setNodes } = useReactFlow();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<MediaTab>("all");
  const [isDragging, setIsDragging] = useState(false);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [bookshelves, setBookshelves] = useState<Bookshelf[]>([]);
  const [expandedBooks, setExpandedBooks] = useState<Set<string>>(new Set(["uncategorized"]));
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isAddingShelf, setIsAddingShelf] = useState(false);
  const [newShelfName, setNewShelfName] = useState("");

  const nodes = getNodes() as GrimpoNode[];

  // Fetch highlights and bookshelves when sidebar opens and refresh periodically
  useEffect(() => {
    if (isOpen) {
      getHighlights().then(setHighlights);
      getBookshelves().then(setBookshelves);
      // Refresh every 2 seconds when open
      const interval = setInterval(() => {
        getHighlights().then(setHighlights);
        getBookshelves().then(setBookshelves);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const toggleBook = (id: string) => {
    setExpandedBooks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddManualNote = async () => {
    if (!newNoteContent.trim()) return;
    const result = await addNote("manual", newNoteContent, selectedCategoryId || undefined);
    if (result.success) {
      setNewNoteContent("");
      setIsAddingNote(false);
      getHighlights().then(setHighlights);
    }
  };

  const handleAddShelf = async () => {
    if (!newShelfName.trim()) return;
    const result = await createShelfAction(newShelfName);
    if (result.success) {
      setNewShelfName("");
      setIsAddingShelf(false);
      getBookshelves().then(setBookshelves);
    }
  };

  const createShelfAction = async (name: string) => {
    return await createBookshelf(name);
  };

  const handleDeleteSnippet = async (highlightId: string) => {
    const result = await deleteHighlight(highlightId);
    if (result.success) {
      // Immediately refresh highlights to remove from UI
      await getHighlights().then(setHighlights);
      // Trigger a custom event that PDF viewers can listen to for refresh
      window.dispatchEvent(new CustomEvent('highlightDeleted', { detail: { highlightId } }));
    }
  };

  const handleConvertToTask = (highlight: Highlight) => {
    const id = `tactical-${Date.now()}`;
    const base = { title: "", notes: "" } satisfies GrimpoNodeData;
    const data: GrimpoNodeData = {
      ...base,
      title: highlight.title || highlight.content.slice(0, 50),
      notes: highlight.content,
      status: "todo",
    };

    // Use setNodes from useReactFlow instead of relying on a prop
    setNodes((nds) => nds.concat({ 
      id, 
      type: "tactical", 
      position: { x: 0, y: 0 }, // Will be positioned by layout or manual move
      data 
    }));
    
    // Alert the user or provide feedback
    // In a full implementation, we might want to center on the new node
  };

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
        className={`fixed left-0 top-0 z-[80] h-full w-[320px] flex flex-col transform border-r border-orange-500/20 bg-slate-900/95 shadow-[10px_0_30px_rgba(249,115,22,0.1)] backdrop-blur-xl transition-transform duration-500 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between border-b border-orange-500/20 bg-gradient-to-r from-orange-500/10 to-transparent px-5 py-4">
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
        <div className="flex-shrink-0 p-4">
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
        <div className="flex-shrink-0 px-4 pb-4 space-y-4">
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
              { id: "bookshelf", label: "Bookshelf" }
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

        {/* Manual Note Addition (only in Bookshelf tab) */}
        {activeTab === "bookshelf" && (
          <div className="flex-shrink-0 px-4 mb-4">
            {!isAddingNote ? (
              <button 
                onClick={() => setIsAddingNote(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 py-2.5 text-[10px] font-bold uppercase tracking-widest text-orange-100 transition-all hover:bg-orange-500/20"
              >
                <Plus className="h-4 w-4" />
                Add Manual Note
              </button>
            ) : (
              <div className="rounded-2xl border border-orange-500/30 bg-slate-950/40 p-3 space-y-3">
                <textarea
                  placeholder="Type your note here..."
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  className="w-full h-24 rounded-lg bg-slate-900 border border-orange-500/10 p-2 text-xs text-orange-50 outline-none focus:border-orange-400/50"
                />
                <select 
                  value={selectedCategoryId || ""}
                  onChange={(e) => setSelectedCategoryId(e.target.value || null)}
                  className="w-full rounded-lg bg-slate-900 border border-orange-500/10 p-2 text-[10px] text-orange-300/60 outline-none"
                >
                  <option value="">Uncategorized</option>
                  {bookshelves.map(shelf => (
                    <option key={shelf.id} value={shelf.id}>{shelf.name}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsAddingNote(false)}
                    className="flex-1 rounded-lg bg-slate-800 py-2 text-[9px] font-bold uppercase tracking-widest text-orange-300/60"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAddManualNote}
                    className="flex-1 rounded-lg bg-orange-500/20 py-2 text-[9px] font-bold uppercase tracking-widest text-orange-100"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* List Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-10 custom-scrollbar">
          {activeTab === "bookshelf" ? (
            <div className="space-y-4">
              {/* Shelf Management */}
              <div className="mb-2">
                {!isAddingShelf ? (
                  <button 
                    onClick={() => setIsAddingShelf(true)}
                    className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.2em] text-orange-400/50 hover:text-orange-400 transition-colors px-2"
                  >
                    <FolderPlus className="h-3 w-3" />
                    New Shelf
                  </button>
                ) : (
                  <div className="flex gap-2 px-2">
                    <input 
                      autoFocus
                      placeholder="Shelf name..."
                      value={newShelfName}
                      onChange={(e) => setNewShelfName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddShelf()}
                      className="flex-1 bg-transparent border-b border-orange-500/30 text-[10px] text-orange-100 outline-none pb-1"
                    />
                    <button onClick={handleAddShelf} className="text-orange-400 hover:text-orange-300">
                      <Plus className="h-3 w-3" />
                    </button>
                    <button onClick={() => setIsAddingShelf(false)} className="text-orange-300/20 hover:text-orange-300/40">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Categorized Bookshelf View */}
              {[...bookshelves, { id: "uncategorized", name: "Uncategorized" }].map((shelf) => {
                const shelfHighlights = highlights.filter(h => 
                  shelf.id === "uncategorized" ? !h.categoryId : h.categoryId === shelf.id
                ).filter(h => 
                  h.content.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  (h.comment || "").toLowerCase().includes(searchQuery.toLowerCase())
                );

                if (shelfHighlights.length === 0 && shelf.id === "uncategorized" && searchQuery) return null;

                const isExpanded = expandedBooks.has(shelf.id);

                return (
                  <div key={shelf.id} className="space-y-1">
                    <div
                      onClick={() => toggleBook(shelf.id)}
                      className="flex w-full cursor-pointer items-center justify-between rounded-xl bg-orange-500/5 px-3 py-2 text-left hover:bg-orange-500/10 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <FolderPlus className={`h-4 w-4 ${shelf.id === "uncategorized" ? "text-orange-300/30" : "text-orange-400"}`} />
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${shelf.id === "uncategorized" ? "text-orange-300/40" : "text-orange-100"}`}>
                          {shelf.name}
                        </span>
                        <span className="text-[9px] text-orange-300/20 font-mono">({shelfHighlights.length})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {shelf.id !== "uncategorized" && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Delete shelf "${shelf.name}"? Snippets will be moved to General.`)) {
                                deleteBookshelf(shelf.id, 'move_to_general').then(() => getBookshelves().then(setBookshelves));
                              }
                            }}
                            className="p-1 text-orange-300/10 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                        <ChevronDown className={`h-3 w-3 text-orange-300/20 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="space-y-2 pl-2 pt-1">
                        {shelfHighlights.length > 0 ? (
                          shelfHighlights.map((h) => (
                            <div
                              key={h.id}
                              className="group relative flex flex-col gap-2 rounded-2xl border border-orange-500/5 bg-slate-950/30 p-4 text-left transition-all hover:border-orange-500/30 hover:bg-orange-500/5"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2 text-orange-400/60">
                                  {h.type === "note" ? <Layout className="h-3 w-3" /> : <Highlighter className="h-3 w-3" />}
                                  <span className="text-[9px] font-bold uppercase tracking-widest">{h.type === "note" ? "Manual Note" : "Quote from PDF"}</span>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={() => handleConvertToTask(h)}
                                    className="p-1 text-orange-400/40 hover:text-orange-400 transition-colors"
                                    title="Convert to Task"
                                  >
                                    <Zap className="h-3 w-3" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteSnippet(h.id)}
                                    className="p-1 text-rose-500/40 hover:text-rose-500 transition-colors"
                                    title="Delete snippet and remove from PDF"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                              <p className="text-xs italic text-orange-100/90 leading-relaxed">
                                "{h.content}"
                              </p>
                              <div className="flex items-center justify-between gap-2 mt-1">
                                <div className="relative">
                                  <select 
                                    value={h.categoryId || ""}
                                    onChange={async (e) => {
                                      const newCatId = e.target.value || null;
                                      await updateHighlight(h.id, { categoryId: newCatId });
                                      getHighlights().then(setHighlights);
                                    }}
                                    className="appearance-none bg-transparent text-[8px] font-bold text-orange-400/30 hover:text-orange-400/60 uppercase tracking-widest outline-none pr-4 py-1"
                                  >
                                    <option value="">Move to: General</option>
                                    {bookshelves.filter(s => s.id !== h.categoryId).map(s => (
                                      <option key={s.id} value={s.id}>Move to: {s.name}</option>
                                    ))}
                                  </select>
                                  <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 text-orange-400/30" />
                                </div>
                                {h.type === "highlight" && h.nodeId !== "manual" && (
                                  <button
                                    onClick={() => handleLocateHighlight(h)}
                                    className="text-[8px] font-bold text-orange-400/30 hover:text-orange-400/60 uppercase tracking-widest py-1"
                                  >
                                    Navigate to source →
                                  </button>
                                )}
                              </div>
                              {h.comment && (
                                <div className="mt-1 flex flex-col gap-1 rounded-lg bg-slate-950/40 p-2 border border-orange-500/10">
                                  <span className="text-[8px] font-bold text-orange-400/40 uppercase">Dumby's Note</span>
                                  <p className="text-[10px] text-orange-200/70">{h.comment}</p>
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="py-4 text-center">
                            <p className="text-[9px] text-orange-300/20 uppercase tracking-widest italic">No snippets in this shelf</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            (filteredItems.resources.length > 0 || filteredItems.highlights.length > 0) ? (
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
                    {activeTab === "all" && <h3 className="text-[10px] font-bold text-orange-400/50 uppercase tracking-widest px-2">PDF Highlights</h3>}
                    {filteredItems.highlights.map((h) => (
                      <div
                        key={h.id}
                        className="group relative flex w-full flex-col gap-2 rounded-2xl border border-orange-500/5 bg-orange-500/5 p-4 text-left transition-all hover:border-orange-500/30 hover:bg-orange-500/10"
                      >
                        <div className="flex items-start justify-between">
                          <button
                            onClick={() => handleLocateHighlight(h)}
                            className="flex-1 text-left"
                          >
                            <div className="flex items-center gap-2 text-orange-400/60">
                              <Highlighter className="h-3 w-3" />
                              <span className="text-[9px] font-bold uppercase tracking-widest">Quote from PDF</span>
                            </div>
                            <p className="text-xs italic text-orange-100/90 leading-relaxed line-clamp-3 mt-2">
                              "{h.content}"
                            </p>
                            {h.comment && (
                              <div className="mt-1 flex flex-col gap-1 rounded-lg bg-slate-950/40 p-2 border border-orange-500/10">
                                <span className="text-[8px] font-bold text-orange-400/40 uppercase">Dumby's Note</span>
                                <p className="text-[10px] text-orange-200/70">{h.comment}</p>
                              </div>
                            )}
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSnippet(h.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-rose-500/40 hover:text-rose-500 transition-all"
                            title="Delete snippet and remove from PDF"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
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
            )
          )}
        </div>
      </aside>

      <style jsx>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(249, 115, 22, 0.3) transparent;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(249, 115, 22, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(249, 115, 22, 0.5);
        }
      `}</style>
    </>
  );
}
