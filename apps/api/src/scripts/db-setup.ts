import { readFile } from "node:fs/promises";
import { pool } from "../db.js";

const files = ["db/schema.sql", "db/seed.sql"];

try {
  for (const file of files) {
    const sql = await readFile(new URL(`../../${file}`, import.meta.url), "utf8");
    await pool.query(sql);
    console.log(`Đã chạy ${file}`);
  }
} finally {
  await pool.end();
}
