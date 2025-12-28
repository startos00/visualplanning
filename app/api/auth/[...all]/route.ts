import { auth } from "@/app/lib/auth";

export async function GET(request: Request, context: { params: Promise<{ all: string[] }> }) {
  await context.params;
  return auth.handler(request);
}

export async function POST(request: Request, context: { params: Promise<{ all: string[] }> }) {
  await context.params;
  return auth.handler(request);
}

