#!/usr/bin/env node
/**
 * 静态性能指标采集：把可自动测量的数字写进 baseline.json。
 *
 * 只采集「能客观拿到」的项：前端产物体积、源码规模。冷启动与滚动帧率
 * 必须真实窗口手测，见同目录 README.md。
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");
const baselinePath = join(here, "baseline.json");

const round = (value, digits = 2) => Number(value.toFixed(digits));

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });

const dirSize = (dir) => {
  if (!existsSync(dir)) return null;
  const files = walk(dir);
  return {
    files: files.length,
    bytes: files.reduce((sum, file) => sum + statSync(file).size, 0),
  };
};

const countLines = (dir, extensions) => {
  if (!existsSync(dir)) return null;
  const files = walk(dir).filter((file) =>
    extensions.some((extension) => file.endsWith(extension)),
  );
  let lines = 0;
  for (const file of files) {
    lines += readFileSync(file, "utf8").split("\n").length;
  }
  return { files: files.length, lines };
};

const rustSide = () => {
  try {
    const output = execFileSync(
      "cargo",
      [
        "test",
        "--release",
        "bench_open_100k_rows",
        "--",
        "--ignored",
        "--nocapture",
      ],
      { cwd: join(repoRoot, "src-tauri"), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    const match = output.match(/BENCH_JSON (\{.*\})/);
    return match ? JSON.parse(match[1]) : null;
  } catch (error) {
    console.warn(`[bench] 跳过 open_100k_rows：${error.message?.split("\n")[0] ?? error}`);
    return null;
  }
};

const previous = existsSync(baselinePath)
  ? JSON.parse(readFileSync(baselinePath, "utf8"))
  : {};

const dist = dirSize(join(repoRoot, "dist"));
const payload = {
  measuredAt: new Date().toISOString(),
  commit: (() => {
    try {
      return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
        cwd: repoRoot,
        encoding: "utf8",
      }).trim();
    } catch {
      return null;
    }
  })(),
  dist: dist
    ? { files: dist.files, bytes: dist.bytes, kib: round(dist.bytes / 1024) }
    : null,
  source: {
    rust: countLines(join(repoRoot, "src-tauri", "src"), [".rs"]),
    frontend: countLines(join(repoRoot, "src"), [".ts", ".tsx"]),
  },
  manual: previous.manual ?? { cold_start_ms: null, scroll_fps: null },
};

// 需要 Rust 基准时传 --with-rust（release 编译较慢，默认不跑）。
if (process.argv.includes("--with-rust")) {
  const rustSideResult = rustSide();
  if (rustSideResult) {
    payload.open_100k_rows = rustSideResult;
  }
}

writeFileSync(baselinePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(JSON.stringify(payload, null, 2));
console.log(`\n[bench] 写入 ${relative(repoRoot, baselinePath)}`);
