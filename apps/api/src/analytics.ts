import { pool } from "./db.js";
export async function createPageView(
  path: string,
  viewer_key: string,
  view_date: string,
) {
  try {
    const result = await pool.query(
      `
        INSERT INTO page_views (path, viewer_key, view_date)
        VALUES ($1, $2, $3::date)
        ON CONFLICT (path, viewer_key, view_date) DO NOTHING
        `,
      [path, viewer_key, view_date],
    );
    return result.rowCount;
  } catch (error) {
    console.error(error);
    return 0;
  }
}

export async function getLatestAnalyticsPeriod() {
  try {
    const result = await pool.query(
      `SELECT started_at
      FROM analytics_periods
      ORDER BY started_at DESC
      LIMIT 1
      `,
    );
    if (result.rows.length === 0) {
      return new Date("1970-01-01T00:00:00.000Z");
    }
    return new Date(result.rows[0].started_at);
  } catch (error) {
    console.error(error);
    return new Date("1970-01-01T00:00:00.000Z");
  }
}

export async function getTotalPageViews(started_at: Date) {
  try {
    const result = await pool.query(
      `SELECT count(*)::int AS total
      FROM page_views
      WHERE created_at >= $1`,
      [started_at.toISOString()],
    );
    return result.rows[0].total ?? 0;
  } catch (error) {
    console.error(error);
    return 0;
  }
}

export async function getPageViewsByDay(started_at: Date) {
  try {
    const result = await pool.query(
      `SELECT view_date::text AS date, count(*)::int AS count
      FROM page_views
      WHERE created_at >= $1
      GROUP BY view_date
      ORDER BY view_date`,
      [started_at.toISOString()],
    );
    return result.rows ?? [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function getAllProjects() {
  try {
    const result = await pool.query(
      `SELECT slug, title, status
      FROM projects
      ORDER BY id`,
    );
    return result.rows ?? [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function resetAnalyticsPeriod(actor_user_id: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO analytics_periods (started_at) VALUES (now())",
    );
    await client.query(
      "INSERT INTO audit_logs (action, actor_user_id) VALUES ('analytics.reset', $1)",
      [actor_user_id],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
