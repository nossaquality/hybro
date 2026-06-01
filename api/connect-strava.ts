import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const clientId = process.env.STRAVA_CLIENT_ID;
  const redirectUri = `${process.env.VITE_APP_URL}/auth/strava/callback`;
  const authUrl = `https://www.strava.com/oauth/mobile/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&approval_prompt=force&scope=read,activity:read_all`;

  return res.status(200).json({ authUrl });
}
