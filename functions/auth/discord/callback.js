import { createSession, getBaseUrl, postForm, redirect, upsertOAuthUser } from "../../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    if (!code || !env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET) {
      return redirect("/?error=discord_missing_config#home");
    }

    const redirectUri = `${getBaseUrl(request, env)}/auth/discord/callback`;
    const token = await postForm("https://discord.com/api/oauth2/token", {
      client_id: env.DISCORD_CLIENT_ID,
      client_secret: env.DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri
    });

    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { authorization: `Bearer ${token.access_token}` }
    });
    if (!userResponse.ok) throw new Error(await userResponse.text());
    const discordUser = await userResponse.json();
    const avatar = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png?size=128`
      : "";
    const user = await upsertOAuthUser(
      env,
      "discord",
      discordUser.id,
      discordUser.email || "",
      discordUser.global_name || discordUser.username || "Discord",
      avatar
    );
    const cookie = await createSession(env, user.id);

    return redirect("/#home", {
      "set-cookie": cookie
    });
  } catch (error) {
    console.error("Discord callback failed", error);
    return redirect("/?error=discord_invalid_client#home");
  }
}
