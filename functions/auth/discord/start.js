import { getBaseUrl, redirect } from "../../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  if (!env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET) {
    return redirect("/?error=discord_missing_config#home");
  }

  const redirectUri = `${getBaseUrl(request, env)}/auth/discord/callback`;
  const params = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify email",
    prompt: "consent"
  });

  return redirect(`https://discord.com/oauth2/authorize?${params}`);
}
