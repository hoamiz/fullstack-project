import { readdir, readFile } from "node:fs/promises";
import { pool } from "../db.js";

const migrationsDir = new URL("../../db/migrations/", import.meta.url);

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const files = (await readdir(migrationsDir))
    .filter((name) => name.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const already = await pool.query(
      "SELECT 1 FROM schema_migrations WHERE id = $1",
      [file],
    );

    if (already.rowCount && already.rowCount > 0) {
      console.log(`Bỏ qua ${file} (đã chạy)`);
      continue;
    }

    const sql = await readFile(new URL(file, migrationsDir), "utf8");
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (id) VALUES ($1)", [
        file,
      ]);
      await client.query("COMMIT");
      console.log(`Đã chạy ${file}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
} finally {
  await pool.end();
}
