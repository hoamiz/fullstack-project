import { Router } from "express";
import { hashPassword } from "../password.js";
import { addOAuthAccount, addUser, findUser, findUserById } from "../users.js";
import z from "zod";
import rateLimit from "express-rate-limit";
import { getGoogleConfig, googleRedirectUri } from "../google.js";
import * as client from "openid-client";

const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Tên không được để trống"),
    email: z.string().trim().email("Email không hợp lệ").toLowerCase(),
    password: z
      .string()
      .min(12, "Mật khẩu phải có ít nhất 12 ký tự")
      .regex(
        /[A-Za-z]/,
        "Mật khẩu phải có ít nhất 1 chữ cái viết hoa và 1 chữ cái viết thường",
      )
      .regex(/[0-9]/, "Mật khẩu phải có ít nhất 1 số"),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) =>
      data.confirmPassword === undefined ||
      data.password === data.confirmPassword,
    {
      message: "Mật khẩu và xác nhận mật khẩu không khớp",
      path: ["confirmPassword"],
    },
  );

const loginSchema = z.object({
  email: z.string().trim().email("Email không hợp lệ").toLowerCase(),
  password: z.string().min(1, "Mật khẩu không được để trống"),
});

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const safeParse = registerSchema.safeParse(req.body);
  if (!safeParse.success) {
    res.status(400).json({ error: safeParse.error.message });
    return;
  }
  const { email, name, password } = registerSchema.parse(req.body);
  const passwordHash = await hashPassword(password);

  const { success, data, status, message } = await addUser(
    email,
    name,
    passwordHash,
  );
  if (!success) {
    res.status(status).json({ error: message });
    return;
  } else {
    res.status(status).json(data);
  }
});

authRouter.post("/session-check", (_req, res) => {
  res.status(204).end();
});

////login function
function generateSession(req: Express.Request) {
  return new Promise<void>((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

function saveSession(req: Express.Request) {
  return new Promise<void>((resolve, reject) => {
    req.session.save((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: "Bạn thử đăng nhập quá nhiều lần. Đợi một lát rồi thử lại.",
    });
  },
});
authRouter.post("/login", loginLimiter, async (req, res) => {
  const safeParse = loginSchema.safeParse(req.body);

  if (!safeParse.success) {
    res.status(400).json({ error: safeParse.error.message });
    return;
  }

  const { email, password } = loginSchema.parse(req.body);
  if (!email || !password) {
    res.status(400).json({ error: "Email và mật khẩu không được để trống" });
    return;
  }
  const { success, data, status, message } = await findUser(email, password);
  if (!success) {
    res.status(status).json({ error: message });
    return;
  } else {
    await generateSession(req);
    req.session.userId = data?.id;
    await saveSession(req);
    res.status(status).send();
  }
});
////

////logout function

function destroySession(req: Express.Request) {
  return new Promise<void>((resolve, reject) => {
    req.session.destroy((err: Error) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}
authRouter.post("/logout", async (req, res) => {
  await destroySession(req);

  res.clearCookie("sid", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return res.status(204).end();
});
////

authRouter.get("/me", async (req, res) => {
  if (!req.session || !req.session.userId) {
    res.status(401).json({ error: "Chưa đăng nhập" });
    return;
  }
  const result = await findUserById(req.session.userId || "");
  if (!result.success) {
    await destroySession(req);
    res.status(401).json({ error: result.message });
    return;
  }
  res.status(200).json({
    id: result.data?.id,
    email: result.data?.email,
    name: result.data?.name,
    role: result.data?.role,
  });
});

authRouter.get("/providers", async (req, res) => {
  const google = (await getGoogleConfig()) !== null;
  res.status(200).json({ google });
});
authRouter.get("/google", async (req, res) => {
  const config = await getGoogleConfig();
  const redirect_uri = await googleRedirectUri();
  if (!config) {
    res.status(503).json({ error: "Google chưa được cấu hình" });
    return;
  }
  const code_verifier = client.randomPKCECodeVerifier();
  const code_challenge = await client.calculatePKCECodeChallenge(code_verifier);
  const state = client.randomState();
  req.session.oauthCodeVerifier = code_verifier;
  req.session.oauthState = state;
  const url = client.buildAuthorizationUrl(config, {
    redirect_uri,
    scope: "openid email profile",
    code_challenge,
    code_challenge_method: "S256",
    state,
  });
  res.redirect(url.href);
});

authRouter.get("/google/callback", async (req, res) => {
  if (req.query.error === "access_denied") {
    req.session.oauthState = undefined;
    req.session.oauthCodeVerifier = undefined;
    res.redirect("http://localhost:3000/login?error=google_cancelled");
    return;
  }

  const state = req.query.state as string;
  if (!state || !req.session.oauthState || state !== req.session.oauthState) {
    req.session.oauthState = undefined;
    req.session.oauthCodeVerifier = undefined;
    res.redirect("http://localhost:3000/login?error=google_failed");
    return;
  }
  const config = await getGoogleConfig();
  if (!config) {
    res.status(503).json({ error: "Google chưa được cấu hình" });
    return;
  }
  const currentUrl = new URL(
    req.originalUrl,
    `${req.protocol}://${req.get("host")}`,
  );
  try {
    const tokens = await client.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: req.session.oauthCodeVerifier,
      expectedState: req.session.oauthState,
    });

    const claims = tokens.claims();
    if (!claims) {
      req.session.oauthState = undefined;
      req.session.oauthCodeVerifier = undefined;
      res.redirect("http://localhost:3000/login?error=google_failed");
      return;
    }
    const { sub, email, email_verified, name } = claims;
    if (
      typeof sub !== "string" ||
      sub.trim() === "" ||
      typeof email !== "string" ||
      email.trim() === "" ||
      email_verified !== true
    ) {
      req.session.oauthState = undefined;
      req.session.oauthCodeVerifier = undefined;
      res.redirect("http://localhost:3000/login?error=google_failed");
      return;
    }
    const trimedEmail = email.trim().toLowerCase();
    let trimedName = "";
    if (typeof name === "string" && name.trim() !== "") {
      trimedName = name.trim();
    } else {
      trimedName = trimedEmail.split("@")[0];
    }
    const user_id = await addOAuthAccount(sub.trim(), trimedEmail, trimedName);
    if (!user_id) {
      req.session.oauthState = undefined;
      req.session.oauthCodeVerifier = undefined;
      res.redirect("http://localhost:3000/login?error=google_failed");
      return;
    }
    await generateSession(req);
    req.session.userId = user_id;
    await saveSession(req);
    res.redirect("http://localhost:3000/account");
    return;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Lỗi khi đăng nhập với Google" + error.message);
    } else {
      console.error("Lỗi khi đăng nhập với Google");
    }
    req.session.oauthState = undefined;
    req.session.oauthCodeVerifier = undefined;
    res.redirect("http://localhost:3000/login?error=google_failed");
  }
});
