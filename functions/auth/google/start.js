import { getBaseUrl, redirect } from "../../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return redirect("/?error=google_missing_config#home");
  }

  const redirectUri = `${getBaseUrl(request, env)}/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account"
  });

  return redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
