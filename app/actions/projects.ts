"use server";

import { headers } from "next/headers";
import { db } from "@/app/lib/db";
import { projects } from "@/app/lib/db/schema";
import { auth } from "@/app/lib/auth";
import { eq, and, desc } from "drizzle-orm";
import type { Edge } from "reactflow";
import type { GrimpoNode } from "../lib/graph";
import { revalidatePath } from "next/cache";

/**
 * Create a new project for the authenticated user
 */
export async function createProject(name: string, description?: string) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

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
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
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
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return { nodes: null, edges: null, error: "Unauthorized" };
    }

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
    return { nodes: null, edges: null, error: "Failed to load project" };
  }
}

/**
 * Save project data (nodes and edges)
 */
export async function saveProjectData(projectId: string, nodes: GrimpoNode[], edges: Edge[]) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return { success: false, error: "Unauthorized" };
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
      return { success: false, error: "Project not found or unauthorized" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error saving project data:", error);
    return { success: false, error: "Failed to save project data" };
  }
}

/**
 * Delete (Decommission) a project
 */
export async function deleteProject(projectId: string) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

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


