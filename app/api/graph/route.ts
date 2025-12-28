import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/app/lib/db";
import { graphStates } from "@/app/lib/db/schema";
import { auth } from "@/app/lib/auth";
import { eq, and } from "drizzle-orm";
import type { PersistedState } from "@/app/lib/storage";

const GRAPH_STATE_ID = "main";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const result = await db
      .select()
      .from(graphStates)
      .where(and(eq(graphStates.id, GRAPH_STATE_ID), eq(graphStates.userId, userId)))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(null);
    }

    const state = result[0];
    const persistedState: PersistedState = {
      nodes: (state.nodes as PersistedState["nodes"]) ?? [],
      edges: (state.edges as PersistedState["edges"]) ?? [],
      modeSetting: (state.modeSetting as PersistedState["modeSetting"]) ?? "auto",
      viewport: state.viewport as PersistedState["viewport"],
    };

    return NextResponse.json(persistedState);
  } catch (error) {
    console.error("Error loading graph state:", error);
    return NextResponse.json({ error: "Failed to load graph state" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const body: PersistedState = await request.json();

    await db
      .insert(graphStates)
      .values({
        id: GRAPH_STATE_ID,
        userId,
        nodes: body.nodes ?? [],
        edges: body.edges ?? [],
        modeSetting: body.modeSetting ?? "auto",
        viewport: body.viewport ?? null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [graphStates.id, graphStates.userId],
        set: {
          nodes: body.nodes ?? [],
          edges: body.edges ?? [],
          modeSetting: body.modeSetting ?? "auto",
          viewport: body.viewport ?? null,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving graph state:", error);
    return NextResponse.json({ error: "Failed to save graph state" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    await db
      .delete(graphStates)
      .where(and(eq(graphStates.id, GRAPH_STATE_ID), eq(graphStates.userId, userId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error clearing graph state:", error);
    return NextResponse.json({ error: "Failed to clear graph state" }, { status: 500 });
  }
}

