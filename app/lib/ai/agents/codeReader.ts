import fs from "fs/promises";
import path from "path";

// Allowed file extensions for reading
const ALLOWED_EXTENSIONS = new Set([
  ".md",
  ".mdx",
  ".txt",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".css",
  ".html",
  ".sql",
  ".env.example",
  ".yaml",
  ".yml",
  ".toml",
  ".sh",
  ".py",
  ".rs",
  ".go",
]);

// Directories to skip when listing
const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  ".turbo",
  "dist",
  "build",
  ".vercel",
  ".cache",
]);

// Max file size to read (500KB)
const MAX_FILE_SIZE = 500 * 1024;

function getProjectRoot(): string {
  return process.cwd();
}

function isPathSafe(filePath: string): boolean {
  const projectRoot = getProjectRoot();
  const resolved = path.resolve(projectRoot, filePath);
  return resolved.startsWith(projectRoot);
}

function hasAllowedExtension(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext);
}

export async function readProjectFile({
  filePath,
}: {
  filePath: string;
}): Promise<{
  success: boolean;
  filePath: string;
  content?: string;
  error?: string;
  lineCount?: number;
}> {
  try {
    // Normalize - strip leading slash or ./ for relative paths
    const cleanPath = filePath.replace(/^\.?\//, "");
    const projectRoot = getProjectRoot();
    const fullPath = path.resolve(projectRoot, cleanPath);

    if (!isPathSafe(cleanPath)) {
      return {
        success: false,
        filePath: cleanPath,
        error: "Path is outside the project directory",
      };
    }

    if (!hasAllowedExtension(cleanPath)) {
      return {
        success: false,
        filePath: cleanPath,
        error: `File type not allowed. Supported: ${[...ALLOWED_EXTENSIONS].join(", ")}`,
      };
    }

    const stat = await fs.stat(fullPath);
    if (!stat.isFile()) {
      return {
        success: false,
        filePath: cleanPath,
        error: "Path is not a file",
      };
    }

    if (stat.size > MAX_FILE_SIZE) {
      return {
        success: false,
        filePath: cleanPath,
        error: `File too large (${Math.round(stat.size / 1024)}KB). Max: ${MAX_FILE_SIZE / 1024}KB`,
      };
    }

    const content = await fs.readFile(fullPath, "utf-8");
    const lineCount = content.split("\n").length;

    return {
      success: true,
      filePath: cleanPath,
      content,
      lineCount,
    };
  } catch (err: any) {
    if (err.code === "ENOENT") {
      return {
        success: false,
        filePath,
        error: "File not found",
      };
    }
    return {
      success: false,
      filePath,
      error: err.message || "Failed to read file",
    };
  }
}

export async function listProjectFiles({
  directory = "",
  pattern,
  recursive = false,
  maxDepth = 3,
}: {
  directory?: string;
  pattern?: string;
  recursive?: boolean;
  maxDepth?: number;
}): Promise<{
  success: boolean;
  directory: string;
  files: Array<{ path: string; type: "file" | "directory"; size?: number }>;
  error?: string;
}> {
  try {
    const cleanDir = directory.replace(/^\.?\//, "");
    const projectRoot = getProjectRoot();
    const fullDir = path.resolve(projectRoot, cleanDir);

    if (!isPathSafe(cleanDir || ".")) {
      return {
        success: false,
        directory: cleanDir,
        files: [],
        error: "Path is outside the project directory",
      };
    }

    const stat = await fs.stat(fullDir);
    if (!stat.isDirectory()) {
      return {
        success: false,
        directory: cleanDir,
        files: [],
        error: "Path is not a directory",
      };
    }

    const files: Array<{ path: string; type: "file" | "directory"; size?: number }> = [];

    async function scanDir(dir: string, depth: number) {
      if (depth > maxDepth) return;

      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (SKIP_DIRS.has(entry.name)) continue;
        if (entry.name.startsWith(".") && entry.name !== ".env.example") continue;

        const entryPath = path.join(dir, entry.name);
        const relativePath = path.relative(projectRoot, entryPath);

        if (entry.isDirectory()) {
          files.push({ path: relativePath, type: "directory" });
          if (recursive && depth < maxDepth) {
            await scanDir(entryPath, depth + 1);
          }
        } else if (entry.isFile()) {
          // Filter by pattern if provided
          if (pattern) {
            const matchesPattern =
              entry.name.includes(pattern) ||
              entry.name.endsWith(pattern) ||
              relativePath.includes(pattern);
            if (!matchesPattern) continue;
          }

          const fileStat = await fs.stat(entryPath);
          files.push({
            path: relativePath,
            type: "file",
            size: fileStat.size,
          });
        }
      }
    }

    await scanDir(fullDir, 0);

    // Sort: directories first, then files
    files.sort((a, b) => {
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
      return a.path.localeCompare(b.path);
    });

    return {
      success: true,
      directory: cleanDir || ".",
      files,
    };
  } catch (err: any) {
    if (err.code === "ENOENT") {
      return {
        success: false,
        directory,
        files: [],
        error: "Directory not found",
      };
    }
    return {
      success: false,
      directory,
      files: [],
      error: err.message || "Failed to list files",
    };
  }
}

export async function searchInFiles({
  query,
  directory = "",
  filePattern,
  maxResults = 20,
}: {
  query: string;
  directory?: string;
  filePattern?: string;
  maxResults?: number;
}): Promise<{
  success: boolean;
  query: string;
  results: Array<{
    filePath: string;
    lineNumber: number;
    line: string;
  }>;
  totalMatches: number;
  error?: string;
}> {
  try {
    const cleanDir = directory.replace(/^\.?\//, "");
    const projectRoot = getProjectRoot();
    const fullDir = path.resolve(projectRoot, cleanDir);

    if (!isPathSafe(cleanDir || ".")) {
      return {
        success: false,
        query,
        results: [],
        totalMatches: 0,
        error: "Path is outside the project directory",
      };
    }

    const results: Array<{ filePath: string; lineNumber: number; line: string }> = [];
    let totalMatches = 0;
    const queryLower = query.toLowerCase();

    async function searchDir(dir: string, depth: number) {
      if (depth > 4 || results.length >= maxResults) return;

      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (results.length >= maxResults) return;
        if (SKIP_DIRS.has(entry.name)) continue;
        if (entry.name.startsWith(".")) continue;

        const entryPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await searchDir(entryPath, depth + 1);
        } else if (entry.isFile() && hasAllowedExtension(entry.name)) {
          // Filter by file pattern
          if (filePattern && !entry.name.includes(filePattern) && !entry.name.endsWith(filePattern)) {
            continue;
          }

          try {
            const stat = await fs.stat(entryPath);
            if (stat.size > MAX_FILE_SIZE) continue;

            const content = await fs.readFile(entryPath, "utf-8");
            const lines = content.split("\n");

            for (let i = 0; i < lines.length; i++) {
              if (results.length >= maxResults) break;
              if (lines[i].toLowerCase().includes(queryLower)) {
                totalMatches++;
                const relativePath = path.relative(projectRoot, entryPath);
                results.push({
                  filePath: relativePath,
                  lineNumber: i + 1,
                  line: lines[i].trim().substring(0, 200),
                });
              }
            }
          } catch {
            // Skip unreadable files
          }
        }
      }
    }

    await searchDir(fullDir, 0);

    return {
      success: true,
      query,
      results,
      totalMatches,
    };
  } catch (err: any) {
    return {
      success: false,
      query,
      results: [],
      totalMatches: 0,
      error: err.message || "Failed to search files",
    };
  }
}
