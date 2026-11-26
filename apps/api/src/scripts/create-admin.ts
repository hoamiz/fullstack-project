import { z } from "zod";
import { hashPassword } from "../password.js";

const schema = z.object({
  ADMIN_EMAIL: z.string().trim().email("Email không hợp lệ").toLowerCase(),
  ADMIN_PASSWORD: z
    .string()
    .min(12, "Mật khẩu phải có ít nhất 12 ký tự")
    .regex(
      /[A-Za-z]/,
      "Mật khẩu phải có ít nhất 1 chữ cái viết hoa và 1 chữ cái viết thường",
    )
    .regex(/[0-9]/, "Mật khẩu phải có ít nhất 1 số"),
  ADMIN_NAME: z.string().min(1),
});

if (process.env.CONFIRM_ADMIN_GRANT !== "yes") {
  console.error("Thiếu CONFIRM_ADMIN_GRANT=yes. Không kết nối database.");
  process.exit(1);
}

const { pool } = await import("../db.js");
const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = schema.parse(process.env);

if (
  !ADMIN_EMAIL ||
  !ADMIN_PASSWORD ||
  !ADMIN_NAME
) {
  console.error(
    "Thiếu ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME. Không tạo admin.",
  );
  process.exit(1);
}
const result = await pool.query(`SELECT id,role FROM users WHERE email = $1`, [
  ADMIN_EMAIL,
]);
if (result.rows[0]) {
  if (result.rows[0].role === "admin") {
    console.error("Admin đã tồn tại.");
    process.exit(0);
  } else {
    console.error("Email này đã là user. Script không nâng quyền.");
    process.exit(1);
  }
} else {
  const hashedPassword = await hashPassword(ADMIN_PASSWORD);
  const insertResult = await pool.query(
    `INSERT INTO users (email,name,password_hash,role) VALUES ($1,$2,$3,'admin')`,
    [ADMIN_EMAIL, ADMIN_NAME, hashedPassword],
  );
  if (insertResult.rowCount === 0) {
    console.error("Lỗi khi tạo admin.");
    process.exit(1);
  } else {
    console.log("Admin đã được tạo thành công.");
  }
}
