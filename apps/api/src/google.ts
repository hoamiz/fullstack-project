import * as client from "openid-client";

let config: Promise<client.Configuration> | null = null;

export async function getGoogleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    return null;
  }
  if (!config) {
    await client
      .discovery(new URL("https://accounts.google.com"), clientId, clientSecret)
      .then((conf) => {
        config = Promise.resolve(conf);
      })
      .catch(() => {
        config = null;
      });
  }
  return config;
}

export async function googleRedirectUri(): Promise<string> {
  return process.env.GOOGLE_REDIRECT_URI ?? "";
}
