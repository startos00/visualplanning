import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { put } from "@vercel/blob";
import { auth } from "@/app/lib/auth";

export const runtime = "nodejs";

const MAX_PDF_BYTES = 100 * 1024 * 1024; // 100MB

export async function POST(request: Request) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: "Missing BLOB_READ_WRITE_TOKEN in .env.local (required for PDF uploads)" },
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

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
    }

    if (file.size > MAX_PDF_BYTES) {
      return NextResponse.json(
        { error: `PDF is too large (max ${(MAX_PDF_BYTES / (1024 * 1024)).toFixed(0)}MB)` },
        { status: 400 },
      );
    }

    const safeName = (file.name || "document.pdf").replace(/[^\w.\-() ]+/g, "_");
    const key = `pdfs/${session.user.id}/${Date.now()}-${safeName}`;

    const blob = await put(key, file, {
      access: "public",
      // contentType should be inferred, but keeping explicit is fine
      contentType: "application/pdf",
    });

    return NextResponse.json({
      blobUrl: blob.url,
      filename: safeName,
    });
  } catch (error) {
    console.error("PDF upload error:", error);
    return NextResponse.json({ error: "Failed to upload PDF" }, { status: 500 });
  }
}


