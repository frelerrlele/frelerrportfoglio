import { getProfileFromRequest, json } from "../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  return json({ profile: await getProfileFromRequest(request, env) });
}
