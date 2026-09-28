import pg from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Thiếu DATABASE_URL. Copy apps/api/.env.example thành apps/api/.env rồi điền giá trị.",
  );
}

export const pool = new pg.Pool({
  connectionString,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (error) => {
  console.error("Kết nối PostgreSQL đang rảnh bị lỗi:", error);
});
