import type { NodeTypes } from "reactflow";
import { GlassNode } from "./GlassNode";
import { SketchNode } from "./SketchNode";
import { MediaNode } from "./MediaNode";
import { LightboxNode } from "./LightboxNode";
import { MindMapNode } from "./MindMapNode";

export const nodeTypes: NodeTypes = {
  strategy: GlassNode,
  tactical: GlassNode,
  resource: GlassNode,
  sketch: SketchNode,
  media: MediaNode,
  lightbox: LightboxNode,
  mindmap: MindMapNode,
};


