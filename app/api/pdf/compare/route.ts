import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/app/lib/auth";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";

type CompareBody = {
  pdfs: Array<{
    url: string;
    title: string;
  }>;
};

type PdfSummariserProvider = "anthropic" | "google";

function getPdfSummariserProvider(): PdfSummariserProvider {
  const raw = (process.env.PDF_SUMMARISER_PROVIDER || "").trim().toLowerCase();
  return raw === "google" ? "google" : "anthropic";
}

function getPdfSummariserModelId(provider: PdfSummariserProvider): string {
  return provider === "google" ? "gemini-3-flash-preview" : "claude-3-5-sonnet-latest";
}

async function extractFirstPageText(pdfUrl: string, requestUrl: string): Promise<string> {
  let pdfBytes: ArrayBuffer;
  try {
    const res = await fetch(pdfUrl);
    if (!res.ok) throw new Error("Failed to fetch PDF");
    pdfBytes = await res.arrayBuffer();
  } catch {
    // Fallback to proxy route for CORS issues
    const baseUrl = new URL(requestUrl).origin;
    const proxyRes = await fetch(`${baseUrl}/api/pdf/fetch?url=${encodeURIComponent(pdfUrl)}`);
    if (!proxyRes.ok) {
      throw new Error("Failed to fetch PDF (proxy).");
    }
    pdfBytes = await proxyRes.arrayBuffer();
  }

  // pdfjs setup
  // Dynamic import for pdfjs-dist (server-side)
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - pdfjs-dist legacy build path may not have full type definitions
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf");
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - pdfjs-dist GlobalWorkerOptions type may not be fully defined
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const doc = await pdfjs.getDocument({ data: pdfBytes }).promise;
  
  // Extract only first page
  const page = await doc.getPage(1);
  const textContent = await page.getTextContent();
  type PdfjsTextItem = { str?: string };
  const strings = (textContent.items as unknown as PdfjsTextItem[])
    .map((it) => it.str ?? "")
    .filter(Boolean);
  return strings.join(" ").replace(/\s+/g, " ").trim();
}

function buildComparePrompt(pdfContents: Array<{ title: string; text: string }>) {
  const documentsSection = pdfContents
    .map((pdf, idx) => {
      return `## Document ${idx + 1}: ${pdf.title}\n\n${pdf.text.slice(0, 2000)}`;
    })
    .join("\n\n---\n\n");

  return [
    "You are Dumby, an efficient Knowledge Manager analyzing multiple documents.",
    "Compare the first pages of these documents and generate a structured comparison table.",
    "",
    "Return Markdown with EXACTLY these sections:",
    "",
    "## Overview",
    "Brief summary of what these documents are about.",
    "",
    "## Comparison Table",
    "Create a table comparing key aspects like:",
    "- Methodology / Approach",
    "- Key Findings / Results",
    "- Conclusions / Takeaways",
    "- Unique aspects per document",
    "",
    "## Differences",
    "List the main differences between these documents.",
    "",
    "## Similarities",
    "List what these documents have in common.",
    "",
    "Rules:",
    "- Keep it concise and practical.",
    "- Use bullet points and tables where appropriate.",
    "- If information is missing/unclear, say so.",
    "",
    "Documents to compare:",
    documentsSection,
  ].join("\n");
}

export async function POST(request: Request) {
  let provider: PdfSummariserProvider = "anthropic";
  let modelId = "claude-3-5-sonnet-latest";

  try {
    provider = getPdfSummariserProvider();
    modelId = getPdfSummariserModelId(provider);

    if (provider === "anthropic" && !process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error:
            "Missing ANTHROPIC_API_KEY in .env.local (required for PDF comparison when PDF_SUMMARISER_PROVIDER=anthropic)",
        },
        { status: 500 },
      );
    }

    if (provider === "google" && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json(
        {
          error:
            "Missing GOOGLE_GENERATIVE_AI_API_KEY in .env.local (required for PDF comparison when PDF_SUMMARISER_PROVIDER=google)",
        },
        { status: 500 },
      );
    }

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as Partial<CompareBody>;
    const pdfs = body.pdfs || [];

    if (pdfs.length < 2) {
      return NextResponse.json({ error: "At least 2 PDFs required for comparison" }, { status: 400 });
    }

    // Extract first page text from each PDF
    const requestUrl = request.url || "http://localhost:3000";
    const pdfContents = await Promise.all(
      pdfs.map(async (pdf) => {
        try {
          const text = await extractFirstPageText(pdf.url, requestUrl);
          return { title: pdf.title, text };
        } catch (error) {
          console.error(`Failed to extract text from ${pdf.title}:`, error);
          return { title: pdf.title, text: `[Error: Could not extract text from this PDF]` };
        }
      }),
    );

    // Generate comparison
    const model = provider === "google" ? google(modelId) : anthropic(modelId);
    const { text: comparisonMarkdown } = await generateText({
      model: model as any, // Type assertion for AI SDK 5 compatibility
      system: "You are Dumby, an efficient Knowledge Manager. You compare documents and generate structured, actionable insights.",
      prompt: buildComparePrompt(pdfContents),
      // AI SDK v6 uses `maxOutputTokens` (not `maxTokens`)
      maxOutputTokens: 2000,
    });

    return NextResponse.json({
      comparisonMarkdown,
      provider,
      model: modelId,
    });
  } catch (error: any) {
    console.error("PDF comparison error:", error);
    return NextResponse.json(
      { error: error?.message || "PDF comparison failed." },
      { status: 500 },
    );
  }
}

