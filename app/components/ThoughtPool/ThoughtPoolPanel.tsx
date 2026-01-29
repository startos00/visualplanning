"use client";

import { useState, useEffect, useCallback } from "react";
import { useReactFlow } from "reactflow";
import {
  X,
  Lightbulb,
  List,
  LayoutGrid,
  Plus,
  Trash2,
  Archive,
  Sparkles,
  GripVertical,
  Image as ImageIcon,
  CheckCircle2,
  Send,
  MessageSquare,
} from "lucide-react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import type { GrimpoNodeData } from "@/app/lib/graph";
import type { Idea } from "@/app/lib/db/schema";
import {
  getIdeas,
  addIdea,
  updateIdea,
  deleteIdea,
  archiveIdea,
  markIdeaProcessed,
  reorderIdeas,
} from "@/app/actions/ideas";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  theme?: "abyss" | "surface";
  onOpenWorkshop?: (selectedIdeas: Idea[]) => void;
  onSendToGrimpy?: (idea: Idea) => void;
};

type ViewMode = "list" | "cards";

export function ThoughtPoolPanel({
  isOpen,
  onClose,
  projectId,
  theme = "abyss",
  onOpenWorkshop,
  onSendToGrimpy,
}: Props) {
  const { setNodes } = useReactFlow();
  const [ideas, setIdeasState] = useState<Idea[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [newIdeaContent, setNewIdeaContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const isSurface = theme === "surface";

  // Fetch ideas when panel opens
  useEffect(() => {
    if (isOpen) {
      fetchIdeas();
      const interval = setInterval(fetchIdeas, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen, projectId]);

  const fetchIdeas = async () => {
    const result = await getIdeas(projectId);
    setIdeasState(result);
  };

  const handleAddIdea = async () => {
    if (!newIdeaContent.trim()) return;
    setIsLoading(true);
    const result = await addIdea(newIdeaContent.trim(), projectId);
    if (result.success) {
      setNewIdeaContent("");
      await fetchIdeas();
    }
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddIdea();
    }
  };

  const handleDeleteIdea = async (id: string) => {
    await deleteIdea(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    await fetchIdeas();
  };

  const handleArchiveIdea = async (id: string) => {
    await archiveIdea(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    await fetchIdeas();
  };

  const handleConvertToTactical = async (idea: Idea) => {
    const id = `tactical-${Date.now()}`;
    const data: GrimpoNodeData = {
      title: idea.content.slice(0, 80),
      notes: idea.content,
      status: "todo",
      color: "#22d3ee",
    };

    setNodes((nds) =>
      nds.concat({
        id,
        type: "tactical",
        position: { x: Math.random() * 200, y: Math.random() * 200 },
        data,
      })
    );

    await markIdeaProcessed(idea.id);
    await fetchIdeas();
  };

  const handleBatchConvert = async () => {
    const selected = ideas.filter((i) => selectedIds.has(i.id));
    for (const idea of selected) {
      await handleConvertToTactical(idea);
    }
    setSelectedIds(new Set());
  };

  const handleBatchDelete = async () => {
    for (const id of selectedIds) {
      await deleteIdea(id);
    }
    setSelectedIds(new Set());
    await fetchIdeas();
  };

  const handleBatchArchive = async () => {
    for (const id of selectedIds) {
      await archiveIdea(id);
    }
    setSelectedIds(new Set());
    await fetchIdeas();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === ideas.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(ideas.map((i) => i.id)));
    }
  };

  const handleReorder = async (reordered: Idea[]) => {
    setIdeasState(reordered);
    await reorderIdeas(reordered.map((i) => i.id));
  };

  const handleStartEdit = (idea: Idea) => {
    setEditingId(idea.id);
    setEditContent(idea.content);
  };

  const handleSaveEdit = async () => {
    if (editingId && editContent.trim()) {
      await updateIdea(editingId, { content: editContent.trim() });
      setEditingId(null);
      setEditContent("");
      await fetchIdeas();
    }
  };

  const handleOpenWorkshop = () => {
    const selected = ideas.filter((i) => selectedIds.has(i.id));
    const toWorkshop = selected.length > 0 ? selected : ideas;
    onOpenWorkshop?.(toWorkshop);
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed right-0 top-0 z-[60] h-full w-[360px] flex flex-col transform border-l transition-transform duration-500 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        } ${
          isSurface
            ? "border-slate-200 bg-white/95 shadow-[-10px_0_30px_rgba(0,0,0,0.1)]"
            : "border-cyan-500/20 bg-slate-900/95 shadow-[-10px_0_30px_rgba(34,211,238,0.1)] backdrop-blur-xl"
        }`}
      >
        {/* Header */}
        <div
          className={`flex-shrink-0 flex items-center justify-between border-b px-5 py-4 ${
            isSurface
              ? "border-slate-200 bg-gradient-to-r from-cyan-50 to-transparent"
              : "border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 to-transparent"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`rounded-lg p-2 ${
                isSurface
                  ? "bg-cyan-100 shadow-md"
                  : "bg-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.3)]"
              }`}
            >
              <Lightbulb
                className={`h-5 w-5 ${isSurface ? "text-cyan-600" : "text-cyan-400"}`}
              />
            </div>
            <div>
              <h2
                className={`text-xs font-bold tracking-[0.2em] uppercase ${
                  isSurface ? "text-slate-700" : "text-cyan-100"
                }`}
              >
                Thought Pool
              </h2>
              <p
                className={`text-[10px] uppercase tracking-widest ${
                  isSurface ? "text-slate-400" : "text-cyan-300/60"
                }`}
              >
                Dump ideas here
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`rounded-full p-1.5 transition-colors ${
              isSurface
                ? "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                : "text-cyan-200/50 hover:bg-cyan-500/20 hover:text-cyan-200"
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick Input */}
        <div className="flex-shrink-0 p-4">
          <div
            className={`rounded-2xl border p-3 ${
              isSurface
                ? "border-slate-200 bg-slate-50"
                : "border-cyan-500/20 bg-slate-950/40"
            }`}
          >
            <textarea
              placeholder="Dump your idea here... (Enter to add)"
              value={newIdeaContent}
              onChange={(e) => setNewIdeaContent(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              className={`w-full resize-none bg-transparent text-sm outline-none ${
                isSurface
                  ? "text-slate-700 placeholder:text-slate-400"
                  : "text-cyan-50 placeholder:text-cyan-300/30"
              }`}
            />
            <div className="flex items-center justify-between mt-2">
              <button
                className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] transition-colors ${
                  isSurface
                    ? "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    : "text-cyan-300/40 hover:bg-cyan-500/10 hover:text-cyan-300"
                }`}
              >
                <ImageIcon className="h-3 w-3" />
                Add Image
              </button>
              <button
                onClick={handleAddIdea}
                disabled={!newIdeaContent.trim() || isLoading}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
                  isSurface
                    ? "bg-cyan-500 text-white hover:bg-cyan-600 disabled:bg-slate-200 disabled:text-slate-400"
                    : "bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/30 disabled:bg-slate-800 disabled:text-slate-500"
                }`}
              >
                <Plus className="h-3 w-3" />
                Add
              </button>
            </div>
          </div>
        </div>

        {/* View Toggle & Selection Controls */}
        <div className="flex-shrink-0 px-4 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("list")}
              className={`rounded-lg p-2 transition-colors ${
                viewMode === "list"
                  ? isSurface
                    ? "bg-cyan-100 text-cyan-600"
                    : "bg-cyan-500/20 text-cyan-300"
                  : isSurface
                    ? "text-slate-400 hover:bg-slate-100"
                    : "text-cyan-300/40 hover:bg-cyan-500/10"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={`rounded-lg p-2 transition-colors ${
                viewMode === "cards"
                  ? isSurface
                    ? "bg-cyan-100 text-cyan-600"
                    : "bg-cyan-500/20 text-cyan-300"
                  : isSurface
                    ? "text-slate-400 hover:bg-slate-100"
                    : "text-cyan-300/40 hover:bg-cyan-500/10"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

          {ideas.length > 0 && (
            <button
              onClick={handleSelectAll}
              className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${
                isSurface
                  ? "text-slate-400 hover:text-slate-600"
                  : "text-cyan-300/40 hover:text-cyan-300"
              }`}
            >
              {selectedIds.size === ideas.length ? "Deselect All" : "Select All"}
            </button>
          )}
        </div>

        {/* Batch Actions */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex-shrink-0 px-4 pb-3"
            >
              <div
                className={`flex items-center justify-between rounded-xl border p-2 ${
                  isSurface
                    ? "border-cyan-200 bg-cyan-50"
                    : "border-cyan-500/30 bg-cyan-500/10"
                }`}
              >
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    isSurface ? "text-cyan-600" : "text-cyan-300"
                  }`}
                >
                  {selectedIds.size} selected
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={handleBatchConvert}
                    className={`rounded-lg p-1.5 transition-colors ${
                      isSurface
                        ? "text-cyan-600 hover:bg-cyan-100"
                        : "text-cyan-300 hover:bg-cyan-500/20"
                    }`}
                    title="Convert to Tactical Cards"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleBatchArchive}
                    className={`rounded-lg p-1.5 transition-colors ${
                      isSurface
                        ? "text-amber-600 hover:bg-amber-100"
                        : "text-amber-300 hover:bg-amber-500/20"
                    }`}
                    title="Archive Selected"
                  >
                    <Archive className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleBatchDelete}
                    className={`rounded-lg p-1.5 transition-colors ${
                      isSurface
                        ? "text-rose-600 hover:bg-rose-100"
                        : "text-rose-400 hover:bg-rose-500/20"
                    }`}
                    title="Delete Selected"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ideas List */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-24 custom-scrollbar">
          {ideas.length > 0 ? (
            viewMode === "list" ? (
              <Reorder.Group
                axis="y"
                values={ideas}
                onReorder={handleReorder}
                className="space-y-2"
              >
                {ideas.map((idea) => (
                  <Reorder.Item
                    key={idea.id}
                    value={idea}
                    className={`group relative flex items-start gap-3 rounded-2xl border p-3 cursor-grab active:cursor-grabbing transition-all ${
                      selectedIds.has(idea.id)
                        ? isSurface
                          ? "border-cyan-300 bg-cyan-50"
                          : "border-cyan-400/50 bg-cyan-500/10"
                        : isSurface
                          ? "border-slate-200 bg-white hover:border-cyan-200 hover:bg-cyan-50/50"
                          : "border-cyan-500/10 bg-slate-950/30 hover:border-cyan-500/30 hover:bg-cyan-500/5"
                    }`}
                  >
                    {/* Drag Handle */}
                    <div
                      className={`mt-1 ${
                        isSurface ? "text-slate-300" : "text-cyan-300/20"
                      }`}
                    >
                      <GripVertical className="h-4 w-4" />
                    </div>

                    {/* Checkbox */}
                    <button
                      onClick={() => toggleSelect(idea.id)}
                      className={`mt-1 flex-shrink-0 h-4 w-4 rounded border transition-colors ${
                        selectedIds.has(idea.id)
                          ? isSurface
                            ? "border-cyan-500 bg-cyan-500"
                            : "border-cyan-400 bg-cyan-400"
                          : isSurface
                            ? "border-slate-300 hover:border-cyan-400"
                            : "border-cyan-500/30 hover:border-cyan-400"
                      }`}
                    >
                      {selectedIds.has(idea.id) && (
                        <svg
                          className="h-full w-full text-white"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                        >
                          <path d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z" />
                        </svg>
                      )}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {editingId === idea.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className={`w-full rounded-lg border p-2 text-sm outline-none ${
                              isSurface
                                ? "border-cyan-200 bg-white text-slate-700"
                                : "border-cyan-500/30 bg-slate-900 text-cyan-50"
                            }`}
                            rows={3}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingId(null)}
                              className={`text-[10px] uppercase tracking-wider ${
                                isSurface ? "text-slate-400" : "text-cyan-300/40"
                              }`}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSaveEdit}
                              className={`text-[10px] font-bold uppercase tracking-wider ${
                                isSurface ? "text-cyan-600" : "text-cyan-300"
                              }`}
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p
                            onClick={() => handleStartEdit(idea)}
                            className={`text-sm leading-relaxed cursor-text ${
                              isSurface ? "text-slate-700" : "text-cyan-50/90"
                            }`}
                          >
                            {idea.content}
                          </p>
                          <p
                            className={`mt-1 text-[10px] ${
                              isSurface ? "text-slate-400" : "text-cyan-300/30"
                            }`}
                          >
                            {new Date(idea.createdAt).toLocaleDateString()}
                          </p>
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    {editingId !== idea.id && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onSendToGrimpy && (
                          <button
                            onClick={() => onSendToGrimpy(idea)}
                            className={`rounded-lg p-1.5 transition-colors ${
                              isSurface
                                ? "text-violet-500 hover:bg-violet-100"
                                : "text-violet-400 hover:bg-violet-500/20"
                            }`}
                            title="Send to Grimpy"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleConvertToTactical(idea)}
                          className={`rounded-lg p-1.5 transition-colors ${
                            isSurface
                              ? "text-cyan-500 hover:bg-cyan-100"
                              : "text-cyan-400 hover:bg-cyan-500/20"
                          }`}
                          title="Convert to Tactical Card"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleArchiveIdea(idea.id)}
                          className={`rounded-lg p-1.5 transition-colors ${
                            isSurface
                              ? "text-amber-500 hover:bg-amber-100"
                              : "text-amber-400 hover:bg-amber-500/20"
                          }`}
                          title="Archive"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteIdea(idea.id)}
                          className={`rounded-lg p-1.5 transition-colors ${
                            isSurface
                              ? "text-rose-500 hover:bg-rose-100"
                              : "text-rose-400 hover:bg-rose-500/20"
                          }`}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            ) : (
              /* Cards View */
              <div className="grid grid-cols-2 gap-3">
                {ideas.map((idea) => (
                  <motion.div
                    key={idea.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`group relative rounded-2xl border p-3 transition-all ${
                      selectedIds.has(idea.id)
                        ? isSurface
                          ? "border-cyan-300 bg-cyan-50"
                          : "border-cyan-400/50 bg-cyan-500/10"
                        : isSurface
                          ? "border-slate-200 bg-white hover:border-cyan-200"
                          : "border-cyan-500/10 bg-slate-950/30 hover:border-cyan-500/30"
                    }`}
                  >
                    {/* Selection checkbox */}
                    <button
                      onClick={() => toggleSelect(idea.id)}
                      className={`absolute top-2 right-2 h-4 w-4 rounded border transition-colors ${
                        selectedIds.has(idea.id)
                          ? isSurface
                            ? "border-cyan-500 bg-cyan-500"
                            : "border-cyan-400 bg-cyan-400"
                          : isSurface
                            ? "border-slate-300 opacity-0 group-hover:opacity-100"
                            : "border-cyan-500/30 opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      {selectedIds.has(idea.id) && (
                        <svg
                          className="h-full w-full text-white"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                        >
                          <path d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z" />
                        </svg>
                      )}
                    </button>

                    <p
                      className={`text-xs leading-relaxed line-clamp-4 ${
                        isSurface ? "text-slate-700" : "text-cyan-50/90"
                      }`}
                    >
                      {idea.content}
                    </p>

                    {idea.imageUrl && (
                      <div className="mt-2 h-16 rounded-lg bg-slate-800 overflow-hidden">
                        <img
                          src={idea.imageUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="mt-2 flex items-center justify-between">
                      <p
                        className={`text-[9px] ${
                          isSurface ? "text-slate-400" : "text-cyan-300/30"
                        }`}
                      >
                        {new Date(idea.createdAt).toLocaleDateString()}
                      </p>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onSendToGrimpy && (
                          <button
                            onClick={() => onSendToGrimpy(idea)}
                            className={`p-1 ${
                              isSurface ? "text-violet-500" : "text-violet-400"
                            }`}
                            title="Send to Grimpy"
                          >
                            <Send className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          onClick={() => handleConvertToTactical(idea)}
                          className={`p-1 ${
                            isSurface ? "text-cyan-500" : "text-cyan-400"
                          }`}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteIdea(idea.id)}
                          className={`p-1 ${
                            isSurface ? "text-rose-500" : "text-rose-400"
                          }`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )
          ) : (
            <div className="mt-16 flex flex-col items-center justify-center text-center px-6">
              <div
                className={`mb-4 rounded-full p-8 ${
                  isSurface
                    ? "bg-cyan-50 shadow-lg"
                    : "bg-cyan-500/10 shadow-[0_0_40px_rgba(34,211,238,0.15),inset_0_0_20px_rgba(34,211,238,0.1)]"
                }`}
              >
                <Lightbulb
                  className={`h-10 w-10 animate-pulse ${
                    isSurface ? "text-cyan-400" : "text-cyan-500/40"
                  }`}
                />
              </div>
              <p
                className={`text-xs font-bold uppercase tracking-widest ${
                  isSurface ? "text-slate-500" : "text-cyan-200/60"
                }`}
              >
                Your thought pool is empty
              </p>
              <p
                className={`mt-2 text-[10px] uppercase tracking-[0.2em] ${
                  isSurface ? "text-slate-400" : "text-cyan-300/30"
                }`}
              >
                Start dumping ideas above
              </p>
            </div>
          )}
        </div>

        {/* Workshop with Grimpy Button */}
        {ideas.length > 0 && (
          <div
            className={`absolute bottom-0 left-0 right-0 p-4 border-t ${
              isSurface
                ? "border-slate-200 bg-white/95"
                : "border-cyan-500/20 bg-slate-900/95 backdrop-blur-xl"
            }`}
          >
            <button
              onClick={handleOpenWorkshop}
              className={`w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold uppercase tracking-wider transition-all ${
                isSurface
                  ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg hover:shadow-xl"
                  : "bg-gradient-to-r from-violet-500/20 to-purple-500/20 text-violet-200 border border-violet-500/30 hover:bg-violet-500/30 shadow-[0_0_20px_rgba(139,92,246,0.2)]"
              }`}
            >
              <Sparkles className="h-5 w-5" />
              Workshop with Grimpy
              {selectedIds.size > 0 && (
                <span
                  className={`ml-1 rounded-full px-2 py-0.5 text-[10px] ${
                    isSurface ? "bg-white/20" : "bg-violet-500/30"
                  }`}
                >
                  {selectedIds.size}
                </span>
              )}
            </button>
          </div>
        )}
      </aside>

      <style jsx>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: ${isSurface
            ? "rgba(34,211,238,0.3) transparent"
            : "rgba(34,211,238,0.3) transparent"};
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(34, 211, 238, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(34, 211, 238, 0.5);
        }
      `}</style>
    </>
  );
}
