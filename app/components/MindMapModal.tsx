"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

export type MindMapGraph = {
  root: { title: string };
  nodes: Array<{ id: string; title: string }>;
  edges: Array<{ fromId: string; toId: string; label?: string }>;
  summary: string;
  provider?: "openai" | "google";
  model?: string;
};

async function imageUrlToBase64DataUrl(imageUrl: string): Promise<string> {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error("Failed to fetch image");
  const blob = await res.blob();

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(blob);
  });

  if (!dataUrl.startsWith("data:image/")) {
    throw new Error("Unsupported image type");
  }
  return dataUrl;
}

export function MindMapModal(props: {
  open: boolean;
  onClose: () => void;
  imageUrl: string | null;
  onApply: (graph: MindMapGraph) => void;
}) {
  const { open, onClose, imageUrl, onApply } = props;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [graph, setGraph] = useState<MindMapGraph | null>(null);
  const [engine, setEngine] = useState<"openai" | "google">("openai");

  const canAnalyze = useMemo(() => !!imageUrl && !loading, [imageUrl, loading]);

  async function handleAnalyze() {
    if (!imageUrl) return;
    setError("");
    setGraph(null);
    setLoading(true);
    try {
      const base64Image = await imageUrlToBase64DataUrl(imageUrl);
      const res = await fetch("/api/grimpy/analyze-mindmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64Image,
          provider: engine,
          model: engine === "google" ? "gemini-2.5-flash" : "gpt-4o",
        }),
      });

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = (body && typeof body.error === "string" && body.error) || "Analysis failed.";
        throw new Error(msg);
      }
      setGraph(body as MindMapGraph);
    } catch (e: any) {
      setError(typeof e?.message === "string" ? e.message : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[210] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-[760px] overflow-hidden rounded-3xl border border-cyan-300/20 bg-slate-950/80 text-cyan-50 shadow-[0_0_30px_rgba(34,211,238,0.12)]"
          >
            <div className="flex items-center justify-between gap-3 border-b border-cyan-300/10 px-5 py-4">
              <div className="min-w-0">
                <div className="text-xs tracking-widest text-cyan-200/70">GRIMPY</div>
                <div className="truncate text-lg font-semibold">Mind Map</div>
              </div>
              <button
                className="rounded-full border border-cyan-300/20 bg-white/5 p-2 text-cyan-100 hover:bg-white/10"
                onClick={onClose}
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2">
              <div className="space-y-3">
                <div className="text-xs tracking-widest text-cyan-200/70">IMAGE</div>
                <div className="rounded-2xl border border-cyan-300/15 bg-black/30 p-2">
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl}
                      alt="Mind map input"
                      className="max-h-[320px] w-full rounded-xl object-contain"
                    />
                  ) : (
                    <div className="p-6 text-center text-xs text-cyan-100/60">No image selected.</div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setEngine("openai")}
                    className={[
                      "rounded-full border px-3 py-1.5 text-[11px] font-semibold tracking-wide transition-all",
                      engine === "openai"
                        ? "border-cyan-300/30 bg-cyan-400/15 text-cyan-50"
                        : "border-cyan-300/10 bg-white/5 text-cyan-100/50 hover:bg-white/10",
                    ].join(" ")}
                    title="Use OpenAI GPT-4o (vision)"
                  >
                    GPT-4o
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setEngine("google")}
                    className={[
                      "rounded-full border px-3 py-1.5 text-[11px] font-semibold tracking-wide transition-all",
                      engine === "google"
                        ? "border-cyan-300/30 bg-cyan-400/15 text-cyan-50"
                        : "border-cyan-300/10 bg-white/5 text-cyan-100/50 hover:bg-white/10",
                    ].join(" ")}
                    title="Use Google Gemini Flash"
                  >
                    Gemini Flash
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    disabled={!canAnalyze}
                    onClick={handleAnalyze}
                    className={[
                      "rounded-full border px-4 py-2 text-xs font-semibold tracking-wide transition-all",
                      canAnalyze
                        ? "border-cyan-300/30 bg-cyan-400/20 text-cyan-50 hover:bg-cyan-400/25"
                        : "border-cyan-300/10 bg-white/5 text-cyan-100/40",
                    ].join(" ")}
                  >
                    {loading ? "Analyzing…" : "Analyze"}
                  </button>
                  {error ? <div className="text-xs text-rose-200/90">{error}</div> : null}
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs tracking-widest text-cyan-200/70">RESULT</div>
                <div className="rounded-2xl border border-cyan-300/15 bg-black/30 p-4">
                  {graph ? (
                    <div className="space-y-3">
                      <div className="text-[11px] text-cyan-100/60">
                        {graph.provider === "google" ? "Gemini" : "OpenAI"} {graph.model ? `• ${graph.model}` : ""}
                      </div>
                      <div>
                        <div className="text-xs font-bold tracking-widest text-cyan-200/70">SUMMARY</div>
                        <div className="mt-1 text-sm text-cyan-50/90 whitespace-pre-wrap">{graph.summary}</div>
                      </div>
                      <div className="text-xs text-cyan-100/60">
                        Root: <span className="text-cyan-50/90">{graph.root?.title}</span>
                        <br />
                        Nodes: {graph.nodes?.length ?? 0} • Edges: {graph.edges?.length ?? 0}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            onApply(graph);
                            onClose();
                          }}
                          className="rounded-full border border-emerald-300/20 bg-emerald-500/15 px-4 py-2 text-xs font-semibold tracking-wide text-emerald-50 hover:bg-emerald-500/20"
                        >
                          Apply to Canvas
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-cyan-100/60">
                      {loading ? "Waiting for Grimpy…" : "Run Analyze to generate a mind map."}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

