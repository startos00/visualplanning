import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { put } from "@vercel/blob";
import { auth } from "@/app/lib/auth";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export async function POST(request: Request) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: "Missing BLOB_READ_WRITE_TOKEN in .env.local (required for uploads)" },
        { status: 500 },
      );
    }

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Only PDF and image files (JPG, PNG, WebP, GIF) are supported" },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `File is too large (max ${(MAX_FILE_BYTES / (1024 * 1024)).toFixed(0)}MB)` },
        { status: 400 },
      );
    }

    const typeDir = file.type === "application/pdf" ? "pdfs" : "images";
    const safeName = (file.name || "file").replace(/[^\w.\-() ]+/g, "_");
    const key = `${typeDir}/${session.user.id}/${Date.now()}-${safeName}`;

    const blob = await put(key, file, {
      access: "public",
      contentType: file.type,
    });

    return NextResponse.json({
      blobUrl: blob.url,
      filename: safeName,
      contentType: file.type,
    });
  } catch (error) {
    console.error("Media upload error:", error);
    return NextResponse.json({ error: "Failed to upload media" }, { status: 500 });
  }
}
