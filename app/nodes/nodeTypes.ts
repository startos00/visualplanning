import type { NodeTypes } from "reactflow";
import { GlassNode } from "./GlassNode";
import { SketchNode } from "./SketchNode";

export const nodeTypes: NodeTypes = {
  strategy: GlassNode,
  tactical: GlassNode,
  resource: GlassNode,
  sketch: SketchNode,
};


