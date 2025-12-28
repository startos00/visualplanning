import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/app/lib/auth";

export const runtime = "nodejs";

const MAX_PDF_BYTES = 100 * 1024 * 1024; // 100MB

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) return true;

  // Block IP-literals for common private/metadata ranges (basic SSRF guard).
  // NOTE: This does not protect against DNS rebinding, but is better than nothing.
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const o1 = Number(ipv4[1]);
    const o2 = Number(ipv4[2]);
    if ([o1, o2].some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
    if (o1 === 127) return true; // loopback
    if (o1 === 10) return true; // private
    if (o1 === 192 && o2 === 168) return true; // private
    if (o1 === 172 && o2 >= 16 && o2 <= 31) return true; // private
    if (o1 === 169 && o2 === 254) return true; // link-local (incl metadata on some setups)
  }

  return false;
}

async function readWithLimit(response: Response, byteLimit: number): Promise<ArrayBuffer> {
  const reader = response.body?.getReader();
  if (!reader) {
    // Fallback: might still work for some runtimes
    const buf = await response.arrayBuffer();
    if (buf.byteLength > byteLimit) throw new Error("PDF too large");
    return buf;
  }

  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > byteLimit) throw new Error("PDF too large");
    chunks.push(value);
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out.buffer;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const urlParam = request.nextUrl.searchParams.get("url");
    if (!urlParam) return NextResponse.json({ error: "Missing url" }, { status: 400 });

    let url: URL;
    try {
      url = new URL(urlParam);
    } catch {
      return NextResponse.json({ error: "Invalid url" }, { status: 400 });
    }

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return NextResponse.json({ error: "Invalid url protocol" }, { status: 400 });
    }

    if (isBlockedHost(url.hostname)) {
      return NextResponse.json({ error: "Blocked host" }, { status: 400 });
    }

    const upstream = await fetch(url.toString(), {
      // Keep it simple: just fetch bytes
      redirect: "follow",
    });

    if (!upstream.ok) {
      return NextResponse.json({ error: `Upstream fetch failed (${upstream.status})` }, { status: 400 });
    }

    const contentType = upstream.headers.get("content-type") || "";
    if (!contentType.includes("pdf")) {
      // Still allow, some hosts return application/octet-stream; but reject obvious HTML
      if (contentType.includes("text/html")) {
        return NextResponse.json({ error: "URL did not return a PDF" }, { status: 400 });
      }
    }

    const contentLength = upstream.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_PDF_BYTES) {
      return NextResponse.json({ error: "PDF too large" }, { status: 400 });
    }

    const buf = await readWithLimit(upstream, MAX_PDF_BYTES);

    return new NextResponse(buf, {
      headers: {
        "content-type": "application/pdf",
        "cache-control": "private, max-age=60",
      },
    });
  } catch (error) {
    console.error("PDF fetch proxy error:", error);
    return NextResponse.json({ error: "Failed to fetch PDF" }, { status: 500 });
  }
}



