import express, { type ErrorRequestHandler } from "express";
import { projectsRouter } from "./routes/projects.js";
import { authRouter } from "./routes/auth.js";
import cors from "cors";
import session from "express-session";
import pgSessionModule from "connect-pg-simple";
import { pool } from "./db.js";
import cookieParser from "cookie-parser";
import { randomBytes } from "crypto";
import { adminRouter } from "./routes/admin.js";
import { analyticsRouter } from "./routes/analytics.js";

declare module "express-session" {
  interface SessionData {
    csrfToken?: string;
    userId?: string;
    oauthState?: string;
    oauthCodeVerifier?: string;
  }
}

const PgSession = pgSessionModule(session);
const sessionStore = new PgSession({
  pool: pool,
  createTableIfMissing: true,
});

const secretKey = process.env.SESSION_SECRET;
if (!secretKey) {
  throw new Error("SESSION_SECRET is not set");
}

const app = express();
const port = Number(process.env.PORT) || 4000;

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);

app.use(
  session({
    store: sessionStore,
    name: "sid",
    secret: secretKey,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    },
  }),
);

app.use(cookieParser());

app.use(express.json({ limit: "20kb" }));
app.use((req, res, next) => {
  if (!req.cookies.csrf) {
    const token = randomBytes(32).toString("hex");
    res.cookie("csrf", token, {
      httpOnly: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    req.session.csrfToken = token;
  }
  const safeMethod =
    req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS";
  if (safeMethod) {
    next();
    return;
  }

  const header = req.get("X-CSRF-Token");
  if (!header || header !== req.cookies.csrf) {
    res.status(403).json({ error: "CSRF token không hợp lệ" });
    return;
  }
  next();
});

app.use("/projects", projectsRouter);
app.use("/admin", adminRouter);
app.use("/auth", authRouter);
app.use("/analytics", analyticsRouter);

const handleError: ErrorRequestHandler = (error, _req, res) => {
  console.error(error);
  res.status(503).json({ error: "Không đọc được database" });
};

app.use(handleError);

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
