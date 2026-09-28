import express, { type ErrorRequestHandler } from "express";
import { projectsRouter } from "./routes/projects.js";

const app = express();
const port = Number(process.env.PORT) || 4000;

app.use("/projects", projectsRouter);

const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
  console.error(error);
  res.status(503).json({ error: "Không đọc được database" });
};

app.use(handleError);

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
