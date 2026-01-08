"use server";

import { headers } from "next/headers";
import { db } from "@/app/lib/db";
import { projects } from "@/app/lib/db/schema";
import { safeGetSession } from "@/app/lib/safeSession";
import { eq, and, desc } from "drizzle-orm";
import type { Edge } from "reactflow";
import type { GrimpoNode } from "../lib/graph";
import { revalidatePath } from "next/cache";

/**
 * Create a new project for the authenticated user
 */
export async function createProject(name: string, description?: string) {
  try {
    const { session, error, debug } = await safeGetSession();
    if (!session) return { success: false, error: error ?? "Unauthorized", debug: debug ?? undefined };

    const userId = session.user.id;

    const [newProject] = await db.insert(projects).values({
      userId,
      name,
      description,
      nodes: [],
      edges: [],
    }).returning();

    revalidatePath("/");
    return { success: true, project: newProject };
  } catch (error) {
    console.error("Error creating project:", error);
    return { success: false, error: "Failed to create project" };
  }
}

/**
 * Get all projects for the authenticated user
 */
export async function getUserProjects() {
  try {
    const { session, error, debug } = await safeGetSession();
    if (!session) {
      // Keep UI resilient: project switcher can be empty if auth/db is down.
      if (error) console.warn("getUserProjects: session unavailable", { error, debug });
      return [];
    }

    const userId = session.user.id;

    return await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.updatedAt));
  } catch (error) {
    console.error("Error fetching user projects:", error);
    return [];
  }
}

/**
 * Get a single project's data (nodes and edges)
 */
export async function getProjectData(projectId: string) {
  try {
    const { session, error, debug } = await safeGetSession();
    if (!session) return { nodes: null, edges: null, error: error ?? "Unauthorized", debug: debug ?? undefined };

    const userId = session.user.id;

    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
      .limit(1);

    if (!project) {
      return { nodes: null, edges: null, error: "Project not found" };
    }

    return {
      name: project.name,
      description: project.description,
      nodes: project.nodes as GrimpoNode[],
      edges: project.edges as Edge[],
    };
  } catch (error) {
    console.error("Error fetching project data:", error);
    const debug = {
      name: (error as any)?.name ?? "Error",
      code: (error as any)?.code ?? null,
      message: String((error as any)?.message ?? error).slice(0, 400),
      cause: (error as any)?.cause ? String((error as any)?.cause) : null,
    };
    return { nodes: null, edges: null, error: "Failed to load project", debug };
  }
}

/**
 * Save project data (nodes and edges)
 */
export async function saveProjectData(projectId: string, nodes: GrimpoNode[], edges: Edge[]) {
  try {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/7dbc43bc-e431-48bc-a404-d2c7ab4b2a70',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/actions/projects.ts:saveProjectData:entry',message:'saveProjectData entry',data:{projectId,nodesLen:Array.isArray(nodes)?nodes.length:null,edgesLen:Array.isArray(edges)?edges.length:null,approxJsonLen:(()=>{try{return JSON.stringify({nodes,edges}).length}catch{return -1}})()},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion

    const { session, error, debug } = await safeGetSession();
    if (!session) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/7dbc43bc-e431-48bc-a404-d2c7ab4b2a70',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/actions/projects.ts:saveProjectData:noSession',message:'No session for saveProjectData',data:{projectId},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      return { success: false, error: error ?? "Unauthorized", debug: debug ?? undefined };
    }

    const userId = session.user.id;

    const [updatedProject] = await db
      .update(projects)
      .set({
        nodes,
        edges,
        updatedAt: new Date(),
      })
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
      .returning();

    if (!updatedProject) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/7dbc43bc-e431-48bc-a404-d2c7ab4b2a70',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/actions/projects.ts:saveProjectData:notFound',message:'No project updated (not found/unauthorized)',data:{projectId},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
      return { success: false, error: "Project not found or unauthorized" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error saving project data:", error);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/7dbc43bc-e431-48bc-a404-d2c7ab4b2a70',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/actions/projects.ts:saveProjectData:catch',message:'Exception in saveProjectData',data:{projectId,errorName:(error as any)?.name??null,errorMessage:String((error as any)?.message??error).slice(0,300),errorCode:(error as any)?.code??null},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    const debug = {
      name: (error as any)?.name ?? "Error",
      code: (error as any)?.code ?? null,
      message: String((error as any)?.message ?? error).slice(0, 300),
      cause: (error as any)?.cause ? String((error as any)?.cause) : null,
    };
    return { success: false, error: "Failed to save project data", debug };
  }
}

/**
 * Delete (Decommission) a project
 */
export async function deleteProject(projectId: string) {
  try {
    const { session, error, debug } = await safeGetSession();
    if (!session) return { success: false, error: error ?? "Unauthorized", debug: debug ?? undefined };

    const userId = session.user.id;

    await db
      .delete(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error deleting project:", error);
    return { success: false, error: "Failed to delete project" };
  }
}


