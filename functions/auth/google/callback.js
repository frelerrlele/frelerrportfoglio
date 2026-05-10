import { createSession, getBaseUrl, postForm, redirect, upsertOAuthUser } from "../../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    if (!code || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      return redirect("/?error=google_missing_config#home");
    }

    const redirectUri = `${getBaseUrl(request, env)}/auth/google/callback`;
    const token = await postForm("https://oauth2.googleapis.com/token", {
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri
    });

    const userResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { authorization: `Bearer ${token.access_token}` }
    });
    if (!userResponse.ok) throw new Error(await userResponse.text());
    const googleUser = await userResponse.json();
    const user = await upsertOAuthUser(
      env,
      "google",
      googleUser.sub,
      googleUser.email || "",
      googleUser.name || googleUser.email || "Google",
      googleUser.picture || ""
    );
    const cookie = await createSession(env, user.id);

    return redirect("/#home", {
      "set-cookie": cookie
    });
  } catch (error) {
    console.error("Google callback failed", error);
    return redirect("/?error=google_invalid_client#home");
  }
}
