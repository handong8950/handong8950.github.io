import crypto from "node:crypto";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = __dirname;

loadDotEnv();

const publicDataDir = path.join(publicDir, "data");
const secretDir = path.join(__dirname, "data");
const siteFile = path.join(publicDataDir, "site.json");
const projectsFile = path.join(publicDataDir, "projects.json");
const secretFile = path.join(secretDir, "admin-secret.txt");
const port = Number(process.env.PORT || 5177);
const publicUrl = process.env.PUBLIC_URL?.replace(/\/+$/, "");
const sessions = new Map();
const sessionMaxAgeMs = 1000 * 60 * 60 * 8;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};

function loadDotEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fsSync.existsSync(envPath)) return;
  const content = fsSync.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...valueParts] = trimmed.split("=");
    if (!process.env[key]) {
      process.env[key] = valueParts.join("=").trim().replace(/^["']|["']$/g, "");
    }
  }
}

async function readJson(file, fallback) {
  try {
    const content = await fs.readFile(file, "utf8");
    return JSON.parse(content);
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeJson(file, data) {
  const tmpFile = `${file}.tmp`;
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(tmpFile, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  await fs.rename(tmpFile, file);
}

async function ensureDataDir() {
  await fs.mkdir(publicDataDir, { recursive: true });
  await fs.mkdir(secretDir, { recursive: true });
}

async function getAdminPassword() {
  if (process.env.ADMIN_PASSWORD_HASH) return { value: process.env.ADMIN_PASSWORD_HASH, hashed: true };
  if (process.env.ADMIN_PASSWORD) return { value: process.env.ADMIN_PASSWORD, hashed: false };

  try {
    const existing = (await fs.readFile(secretFile, "utf8")).trim();
    if (existing) return { value: existing, hashed: false };
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const generated = crypto.randomBytes(18).toString("base64url");
  await fs.mkdir(secretDir, { recursive: true });
  await fs.writeFile(secretFile, `${generated}\n`, { encoding: "utf8", flag: "wx" }).catch(async (error) => {
    if (error.code !== "EEXIST") throw error;
  });
  const current = (await fs.readFile(secretFile, "utf8")).trim();
  console.log(`管理员初始密码已生成：${secretFile}`);
  console.log(`请使用该文件中的密码登录 /admin，发布到公网前建议改为 .env 中的 ADMIN_PASSWORD。`);
  return { value: current, hashed: false };
}

function hash(value) {
  return crypto.createHash("sha256").update(String(value)).digest();
}

function safePasswordEqual(input, stored) {
  const inputHash = hash(input);
  const storedHash = stored.hashed ? Buffer.from(stored.value, "hex") : hash(stored.value);
  return inputHash.length === storedHash.length && crypto.timingSafeEqual(inputHash, storedHash);
}

function parseCookies(header = "") {
  return Object.fromEntries(
    header
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const index = item.indexOf("=");
        return [decodeURIComponent(item.slice(0, index)), decodeURIComponent(item.slice(index + 1))];
      })
  );
}

function getSession(req) {
  const cookies = parseCookies(req.headers.cookie || "");
  const token = cookies.portfolio_session;
  if (!token) return null;
  const session = sessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  session.expiresAt = Date.now() + sessionMaxAgeMs;
  return { token, session };
}

function isAuthed(req) {
  return Boolean(getSession(req));
}

function createSession(res) {
  const token = crypto.randomBytes(32).toString("base64url");
  sessions.set(token, { createdAt: Date.now(), expiresAt: Date.now() + sessionMaxAgeMs });
  const secure = process.env.COOKIE_SECURE === "true" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `portfolio_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${sessionMaxAgeMs / 1000}${secure}`
  );
}

function clearSession(req, res) {
  const current = getSession(req);
  if (current) sessions.delete(current.token);
  res.setHeader("Set-Cookie", "portfolio_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
}

async function readBody(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 1024 * 1024) {
      const error = new Error("请求内容过大");
      error.status = 413;
      throw error;
    }
  }
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    const error = new Error("JSON 格式不正确");
    error.status = 400;
    throw error;
  }
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(data));
}

function sendError(res, status, message) {
  sendJson(res, status, { error: message });
}

function normalizeLinks(input) {
  if (!Array.isArray(input)) return [];
  return input
    .map((link) => ({
      label: String(link?.label || "").trim(),
      url: String(link?.url || "").trim()
    }))
    .filter((link) => link.label && link.url);
}

function normalizeProject(input, existing = {}) {
  const title = String(input.title || "").trim();
  if (!title) {
    const error = new Error("项目标题不能为空");
    error.status = 400;
    throw error;
  }

  return {
    id: existing.id || crypto.randomUUID(),
    title,
    role: String(input.role || "").trim(),
    category: String(input.category || "作品").trim(),
    year: String(input.year || new Date().getFullYear()).trim(),
    status: String(input.status || "进行中").trim(),
    featured: Boolean(input.featured),
    sortOrder: Number.isFinite(Number(input.sortOrder)) ? Number(input.sortOrder) : 99,
    image: String(input.image || "/assets/project-portfolio.svg").trim(),
    summary: String(input.summary || "").trim(),
    description: String(input.description || "").trim(),
    tags: Array.isArray(input.tags)
      ? input.tags.map((tag) => String(tag).trim()).filter(Boolean)
      : String(input.tags || "")
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
    links: normalizeLinks(input.links)
  };
}

function normalizeSite(input) {
  return {
    name: String(input.name || "我的作品集").trim(),
    title: String(input.title || "个人作品集").trim(),
    headline: String(input.headline || "").trim(),
    summary: String(input.summary || "").trim(),
    location: String(input.location || "").trim(),
    availability: String(input.availability || "").trim(),
    email: String(input.email || "").trim(),
    phone: String(input.phone || "").trim(),
    resumeUrl: String(input.resumeUrl || "").trim(),
    socials: normalizeLinks(input.socials)
  };
}

function sortProjects(projects) {
  return [...projects].sort((a, b) => {
    const order = Number(a.sortOrder || 99) - Number(b.sortOrder || 99);
    if (order !== 0) return order;
    return String(b.year || "").localeCompare(String(a.year || ""));
  });
}

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/site") {
    const [site, projects] = await Promise.all([
      readJson(siteFile, {}),
      readJson(projectsFile, [])
    ]);
    sendJson(res, 200, { site, projects: sortProjects(projects) });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/login") {
    const { password } = await readBody(req);
    const adminPassword = await getAdminPassword();
    if (!password || !safePasswordEqual(password, adminPassword)) {
      sendError(res, 401, "管理员密码不正确");
      return true;
    }
    createSession(res);
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/logout") {
    clearSession(req, res);
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/me") {
    sendJson(res, 200, { authenticated: isAuthed(req) });
    return true;
  }

  if (!url.pathname.startsWith("/api/admin/")) return false;
  if (!isAuthed(req)) {
    sendError(res, 401, "请先以管理员身份登录");
    return true;
  }

  if (req.method === "PUT" && url.pathname === "/api/admin/site") {
    const body = await readBody(req);
    const site = normalizeSite(body);
    await writeJson(siteFile, site);
    sendJson(res, 200, { site });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/projects") {
    const projects = await readJson(projectsFile, []);
    sendJson(res, 200, { projects: sortProjects(projects) });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/projects") {
    const body = await readBody(req);
    const projects = await readJson(projectsFile, []);
    const project = normalizeProject(body);
    projects.push(project);
    await writeJson(projectsFile, sortProjects(projects));
    sendJson(res, 201, { project });
    return true;
  }

  const projectMatch = url.pathname.match(/^\/api\/admin\/projects\/([^/]+)$/);
  if (projectMatch && req.method === "PUT") {
    const id = decodeURIComponent(projectMatch[1]);
    const body = await readBody(req);
    const projects = await readJson(projectsFile, []);
    const index = projects.findIndex((project) => project.id === id);
    if (index === -1) {
      sendError(res, 404, "没有找到这个项目");
      return true;
    }
    const project = normalizeProject(body, projects[index]);
    projects[index] = project;
    await writeJson(projectsFile, sortProjects(projects));
    sendJson(res, 200, { project });
    return true;
  }

  if (projectMatch && req.method === "DELETE") {
    const id = decodeURIComponent(projectMatch[1]);
    const projects = await readJson(projectsFile, []);
    const nextProjects = projects.filter((project) => project.id !== id);
    if (nextProjects.length === projects.length) {
      sendError(res, 404, "没有找到这个项目");
      return true;
    }
    await writeJson(projectsFile, nextProjects);
    sendJson(res, 200, { ok: true });
    return true;
  }

  sendError(res, 404, "接口不存在");
  return true;
}

async function serveStatic(req, res, url) {
  const cleanPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const requestedPath = cleanPath === "/admin" || cleanPath === "/admin/" ? "/admin.html" : cleanPath;
  const filePath = path.normalize(path.join(publicDir, requestedPath));
  const relative = path.relative(publicDir, filePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const content = await fs.readFile(filePath);
    const type = mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": type,
      "Cache-Control": "no-store"
    });
    res.end(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("页面不存在");
      return;
    }
    throw error;
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (await handleApi(req, res, url)) return;
    if (req.method !== "GET" && req.method !== "HEAD") {
      sendError(res, 405, "请求方法不支持");
      return;
    }
    await serveStatic(req, res, url);
  } catch (error) {
    console.error(error);
    sendError(res, error.status || 500, error.message || "服务器错误");
  }
});

function startServer(candidatePort, attempts = 0) {
  const onListening = async () => {
    server.off("error", onError);
    const actualPort = server.address().port;
    await ensureDataDir();
    await getAdminPassword();
    console.log(`作品集网站已启动：http://localhost:${actualPort}`);
    console.log(`后台管理入口：http://localhost:${actualPort}/admin`);
    if (publicUrl) {
      console.log(`公网展示地址：${publicUrl}`);
      console.log(`公网后台入口：${publicUrl}/admin`);
    }
  };

  const onError = (error) => {
    server.off("listening", onListening);
    if (error.code === "EADDRINUSE" && !process.env.PORT && attempts < 10) {
      startServer(candidatePort + 1, attempts + 1);
      return;
    }
    throw error;
  };

  server.once("error", onError);
  server.once("listening", onListening);
  server.listen(candidatePort);
}

startServer(port);
