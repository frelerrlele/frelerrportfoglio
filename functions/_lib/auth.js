const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...headers
    }
  });
}

export function redirect(location, headers = {}) {
  return new Response(null, {
    status: 302,
    headers: {
      location,
      ...headers
    }
  });
}

export function getBaseUrl(request, env) {
  return env.BASE_URL || new URL(request.url).origin;
}

export function getCookie(request, name) {
  const cookies = String(request.headers.get("cookie") || "").split(";").map((item) => item.trim());
  const pair = cookies.find((item) => item.startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : "";
}

export function clearSessionCookie() {
  return "sid=; HttpOnly; SameSite=Lax; Secure; Path=/; Max-Age=0";
}

export async function createSession(env, userId) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const expiresAt = Date.now() + SESSION_MAX_AGE * 1000;
  await env.DB.prepare(
    "INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)"
  ).bind(id, userId, expiresAt, now).run();
  return `sid=${encodeURIComponent(id)}; HttpOnly; SameSite=Lax; Secure; Path=/; Max-Age=${SESSION_MAX_AGE}`;
}

export async function getProfileFromRequest(request, env) {
  const sid = getCookie(request, "sid");
  if (!sid) return null;

  const row = await env.DB.prepare(`
    SELECT users.provider, users.provider_id, users.email, users.username, users.avatar
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.id = ? AND sessions.expires_at > ?
  `).bind(sid, Date.now()).first();

  return row ? publicProfile(row) : null;
}

export async function destroySession(request, env) {
  const sid = getCookie(request, "sid");
  if (!sid) return;
  await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(sid).run();
}

export function publicProfile(user) {
  return {
    provider: user.provider,
    providerId: user.provider_id,
    name: user.username,
    email: user.email || "",
    avatar: user.avatar || ""
  };
}

export async function upsertOAuthUser(env, provider, providerId, email, username, avatar) {
  const now = new Date().toISOString();
  const existing = await env.DB.prepare(
    "SELECT * FROM users WHERE provider = ? AND provider_id = ?"
  ).bind(provider, providerId).first();

  if (existing) {
    await env.DB.prepare(`
      UPDATE users
      SET email = ?, username = ?, avatar = ?, updated_at = ?
      WHERE id = ?
    `).bind(email || existing.email || "", username || existing.username, avatar || existing.avatar || "", now, existing.id).run();
    return {
      ...existing,
      email: email || existing.email || "",
      username: username || existing.username,
      avatar: avatar || existing.avatar || ""
    };
  }

  const id = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO users (id, provider, provider_id, email, username, avatar, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, provider, providerId, email || "", username, avatar || "", now, now).run();

  return {
    id,
    provider,
    provider_id: providerId,
    email: email || "",
    username,
    avatar: avatar || "",
    created_at: now,
    updated_at: now
  };
}

export async function postForm(url, values) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams(values)
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(JSON.stringify(payload));
  return payload;
}
