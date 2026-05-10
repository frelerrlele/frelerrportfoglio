const http = require("http");
const https = require("https");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const dns = require("dns/promises");

loadEnv();

const rootDir = __dirname;
const dataDir = path.join(rootDir, "data");
const usersFile = path.join(dataDir, "users.json");
const sessionsFile = path.join(dataDir, "sessions.json");
const port = Number(process.env.PORT || 3000);
const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;
const sessionSecret = process.env.SESSION_SECRET || "local-dev-session-secret";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

async function main() {
  await ensureDb();
  http.createServer(handleRequest).listen(port, () => {
    console.log(`Frelerr server running on ${baseUrl}`);
  });
}

async function handleRequest(req, res) {
  try {
    const url = new URL(req.url, baseUrl);

    if (req.method === "GET" && url.pathname === "/auth/discord/start") {
      return startDiscordAuth(res);
    }

    if (req.method === "GET" && url.pathname === "/auth/discord/callback") {
      try {
        return await finishDiscordAuth(url, res);
      } catch (error) {
        console.error("Discord auth failed:", error.message);
        return redirect(res, "/?error=discord_invalid_client#home");
      }
    }

    if (req.method === "GET" && url.pathname === "/auth/google/start") {
      return startGoogleAuth(res);
    }

    if (req.method === "GET" && url.pathname === "/auth/google/callback") {
      try {
        return await finishGoogleAuth(url, res);
      } catch (error) {
        console.error("Google auth failed:", error.message);
        return redirect(res, "/?error=google_invalid_client#home");
      }
    }

    if (req.method === "GET" && url.pathname === "/api/me") {
      return sendJson(res, 200, { profile: await getProfileFromRequest(req) });
    }

    if (req.method === "POST" && url.pathname === "/api/logout") {
      await destroySession(req, res);
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === "POST" && url.pathname === "/api/register") {
      return registerAccount(req, res);
    }

    if (req.method === "GET" || req.method === "HEAD") {
      return serveStatic(url.pathname, res, req.method === "HEAD");
    }

    sendJson(res, 405, { error: "Metodo non supportato." });
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: "Errore server." });
  }
}

async function registerAccount(req, res) {
  const body = await readJson(req);
  const email = String(body.email || "").trim().toLowerCase();
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  const avatar = typeof body.avatar === "string" ? body.avatar : "";

  if (!username || username.length < 2) return sendJson(res, 400, { error: "Nome utente non valido." });
  if (password.length < 6) return sendJson(res, 400, { error: "La password deve avere almeno 6 caratteri." });
  if (!(await isEmailDeliverable(email))) return sendJson(res, 400, { error: "Inserisci una E-Mail valida." });
  if (!(await verifyRecaptcha(body.recaptchaToken))) return sendJson(res, 400, { error: "Completa la verifica reCAPTCHA." });
  if (avatar && (!avatar.startsWith("data:image/") || avatar.length > 1_500_000)) {
    return sendJson(res, 400, { error: "Foto profilo non valida o troppo grande." });
  }

  const db = await readDb(usersFile, { users: [] });
  if (db.users.some((user) => user.email === email)) {
    return sendJson(res, 409, { error: "Questa email e gia registrata." });
  }

  const now = new Date().toISOString();
  const user = {
    id: crypto.randomUUID(),
    provider: "email",
    email,
    username,
    avatar,
    password: hashPassword(password),
    createdAt: now,
    updatedAt: now
  };

  db.users.push(user);
  await writeDb(usersFile, db);
  await createSession(res, user.id);
  sendJson(res, 201, { profile: publicProfile(user) });
}

function startDiscordAuth(res) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret || clientSecret.includes("put-your-rotated-secret-here")) {
    return redirect(res, "/?error=discord_missing_config#home");
  }
  const redirectUri = `${baseUrl}/auth/discord/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify email",
    prompt: "consent"
  });
  redirect(res, `https://discord.com/oauth2/authorize?${params.toString()}`);
}

async function finishDiscordAuth(url, res) {
  const code = url.searchParams.get("code");
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!code || !clientId || !clientSecret) return redirect(res, "/?error=discord_missing_config#home");

  const redirectUri = `${baseUrl}/auth/discord/callback`;
  const token = await postForm("https://discord.com/api/oauth2/token", {
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri
  });
  const discordUser = await getDiscordUser(token.access_token);

  const db = await readDb(usersFile, { users: [] });
  let user = db.users.find((item) => item.provider === "discord" && item.discordId === discordUser.id);
  const avatar = discordUser.avatar
    ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png?size=128`
    : "";
  if (!user) {
    user = {
      id: crypto.randomUUID(),
      provider: "discord",
      discordId: discordUser.id,
      email: discordUser.email || "",
      username: discordUser.global_name || discordUser.username || "Discord",
      avatar,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.users.push(user);
  } else {
    user.email = discordUser.email || user.email;
    user.username = discordUser.global_name || discordUser.username || user.username;
    user.avatar = avatar || user.avatar;
    user.updatedAt = new Date().toISOString();
  }
  await writeDb(usersFile, db);
  await createSession(res, user.id);
  redirect(res, "/#home");
}

async function getDiscordUser(accessToken) {
  return requestJson("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

function startGoogleAuth(res) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret || clientSecret.includes("put-your-google-secret-here")) {
    return redirect(res, "/?error=google_missing_config#home");
  }
  const redirectUri = `${baseUrl}/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account"
  });
  redirect(res, `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}

async function finishGoogleAuth(url, res) {
  const code = url.searchParams.get("code");
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!code || !clientId || !clientSecret) return redirect(res, "/?error=google_missing_config#home");

  const redirectUri = `${baseUrl}/auth/google/callback`;
  const token = await postForm("https://oauth2.googleapis.com/token", {
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri
  });
  const googleUser = await getGoogleUser(token.access_token);

  const db = await readDb(usersFile, { users: [] });
  let user = db.users.find((item) => item.provider === "google" && item.googleId === googleUser.sub);
  if (!user) {
    user = {
      id: crypto.randomUUID(),
      provider: "google",
      googleId: googleUser.sub,
      email: googleUser.email || "",
      username: googleUser.name || googleUser.email || "Google",
      avatar: googleUser.picture || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.users.push(user);
  } else {
    user.email = googleUser.email || user.email;
    user.username = googleUser.name || user.username;
    user.avatar = googleUser.picture || user.avatar;
    user.updatedAt = new Date().toISOString();
  }
  await writeDb(usersFile, db);
  await createSession(res, user.id);
  redirect(res, "/#home");
}

async function getGoogleUser(accessToken) {
  return requestJson("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

async function isEmailDeliverable(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return false;
  const domain = email.split("@")[1];
  const blocked = new Set(["prova.it", "test.it", "fake.it", "example.com", "example.it", "invalid.com", "localhost"]);
  const parts = domain.split(".");
  if (blocked.has(domain)) return false;
  if (parts.some((part) => ["prova", "test", "fake", "example", "invalid"].includes(part))) return false;
  try {
    const records = await dns.resolveMx(domain);
    return records.some((record) => record.exchange);
  } catch {
    return false;
  }
}

async function verifyRecaptcha(token) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  const result = await postForm("https://www.google.com/recaptcha/api/siteverify", {
    secret,
    response: token
  });
  return Boolean(result.success);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
  return { salt, hash, iterations: 120000, digest: "sha256" };
}

function publicProfile(user) {
  return {
    provider: user.provider,
    name: user.username,
    email: user.email,
    avatar: user.avatar || ""
  };
}

async function getProfileFromRequest(req) {
  const sid = getCookie(req, "sid");
  if (!sid) return null;
  const sessions = await readDb(sessionsFile, { sessions: [] });
  const session = sessions.sessions.find((item) => item.id === sid && item.expiresAt > Date.now());
  if (!session) return null;
  const db = await readDb(usersFile, { users: [] });
  const user = db.users.find((item) => item.id === session.userId);
  return user ? publicProfile(user) : null;
}

async function createSession(res, userId) {
  const id = crypto.randomBytes(32).toString("hex");
  const signature = crypto.createHmac("sha256", sessionSecret).update(id).digest("hex");
  const sid = `${id}.${signature}`;
  const sessions = await readDb(sessionsFile, { sessions: [] });
  sessions.sessions = sessions.sessions.filter((item) => item.expiresAt > Date.now());
  sessions.sessions.push({ id: sid, userId, expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30 });
  await writeDb(sessionsFile, sessions);
  res.setHeader("Set-Cookie", `sid=${sid}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`);
}

async function destroySession(req, res) {
  const sid = getCookie(req, "sid");
  if (sid) {
    const sessions = await readDb(sessionsFile, { sessions: [] });
    sessions.sessions = sessions.sessions.filter((item) => item.id !== sid);
    await writeDb(sessionsFile, sessions);
  }
  res.setHeader("Set-Cookie", "sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
}

function getCookie(req, name) {
  const cookies = String(req.headers.cookie || "").split(";").map((part) => part.trim());
  const pair = cookies.find((part) => part.startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : "";
}

async function serveStatic(urlPath, res, headOnly) {
  const cleanPath = decodeURIComponent(urlPath === "/" ? "/index.html" : urlPath);
  const filePath = path.resolve(rootDir, `.${cleanPath}`);
  if (!filePath.startsWith(rootDir)) return sendText(res, 403, "Forbidden");
  try {
    const stat = await fsp.stat(filePath);
    if (!stat.isFile()) return sendText(res, 404, "Not found");
    res.writeHead(200, { "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream" });
    if (headOnly) return res.end();
    fs.createReadStream(filePath).pipe(res);
  } catch {
    sendText(res, 404, "Not found");
  }
}

async function ensureDb() {
  await fsp.mkdir(dataDir, { recursive: true });
  await ensureFile(usersFile, { users: [] });
  await ensureFile(sessionsFile, { sessions: [] });
}

async function ensureFile(file, fallback) {
  try {
    await fsp.access(file);
  } catch {
    await writeDb(file, fallback);
  }
}

async function readDb(file, fallback) {
  try {
    return JSON.parse(await fsp.readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeDb(file, value) {
  await fsp.writeFile(file, JSON.stringify(value, null, 2));
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 2_000_000) throw new Error("Request too large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function sendJson(res, status, value) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(value));
}

function sendText(res, status, value) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(value);
}

function redirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
}

function requestJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        if (res.statusCode < 200 || res.statusCode >= 300) return reject(new Error(text));
        resolve(JSON.parse(text));
      });
    });
    req.on("error", reject);
    req.end();
  });
}

function postForm(url, values) {
  const body = new URLSearchParams(values).toString();
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(body)
      }
    }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        if (res.statusCode < 200 || res.statusCode >= 300) return reject(new Error(text));
        resolve(JSON.parse(text));
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function loadEnv() {
  const file = path.join(__dirname, ".env");
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const index = trimmed.indexOf("=");
    if (index === -1) return;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
