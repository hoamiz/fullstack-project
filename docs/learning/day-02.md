# Ngày 2 — Đăng ký: Zod, Argon2id, bảng users

## 1. Mục tiêu

- Cài `zod` và `@node-rs/argon2` sau khi đã hiểu vai trò từng gói.
- Tạo bảng `users`.
- `POST /auth/register` hash mật khẩu, từ chối email trùng, bỏ qua mọi `role` client gửi lên.

## 2. Thời lượng

6 giờ: 1,5 giờ lý thuyết, 3 giờ API và test, 1,5 giờ review.

## 3. Kiến thức cần có

Ngày 1 xong: migration additive. Biết body JSON chưa được Express đọc nếu chưa có `express.json()`.

## 4. Lý thuyết

Đăng ký tạo một dòng `users` với role cố định `user`. Không có đường nào trong request để thành `admin`.

Email lưu đã chuẩn hóa: `lower(trim(email))`. Unique trên giá trị đó.

Mật khẩu không lưu dạng đọc lại được. Argon2id trộn mật khẩu với salt. Module `apps/api/src/password.ts` chỉ export `hashPassword` và `verifyPassword`.

Zod trên server parse body. Sai → 400, chưa đụng DB. Email đã có → 409. Cách chốt: bỏ field `role` lạ (nếu có) và vẫn tạo `user`, không bao giờ ghi `admin`.

`@node-rs/argon2` có binary sẵn cho Windows. Nếu `.node` bị Application Control chặn, dừng và hỏi.

## 5. Ví dụ

```sql
CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  name          text NOT NULL,
  password_hash text,
  role          text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at    timestamptz NOT NULL DEFAULT now()
);
```

Body tối thiểu: `name`, `email`, `password` (≥ 12 ký tự, có chữ và số). `confirmPassword` nếu client gửi thì kiểm khớp.

## Cách đọc mục 6–9

Quy ước chung: [README.md](README.md#cách-đọc-mục-69). Lớp không sửa file → brief, không checklist.

---

## 6. Việc cần làm (phân công học)

**Bạn tự làm:** viết schema Zod (field nào bắt buộc / từ chối); giải thích vì sao không hash khi Zod fail.

**AI được phép** (sau “bắt đầu Ngày 2”): cài package, migration `users`, `password.ts`, route register. Neon branch test: chỉ khi bạn xác nhận riêng.

### Task checklist — mục 6

- [x] Tự nêu được rule Zod (email, password, confirm).
- [x] Tự nói được: Zod fail → không gọi Argon2 / không INSERT.
- [x] Đã quyết định cách xử lý `role` trong body (strip, vẫn `user`).

---

## 7. Frontend (Next.js)

Chưa làm trang. Kiểm tra bằng `curl`. Trang `/signup` là Ngày 3.

---

## 8. Backend (Express API)

Bật `express.json({ limit: '20kb' })` trước route auth. Handler: Zod → `hashPassword` → `INSERT` với role cứng `'user'` (không lấy từ `req.body`). Bắt unique Postgres `23505` → 409. Không log mật khẩu/hash.

### Task checklist — Backend

- [x] `password.ts` là chỗ duy nhất import `@node-rs/argon2`.
- [x] `POST /auth/register` trả 400 / 409 / 201 đúng case.
- [x] Body có `"role":"admin"` → dòng DB vẫn `role = user`.
- [x] `password_hash` không bằng plaintext.
- [x] `npm run typecheck` (apps/api) exit 0.

---

## 9. PostgreSQL

Migration additive tạo `users`. `gen_random_uuid()` (PG 18). Unique email. Không bảng session ngày này. Không chạy seed projects.

### Task checklist — PostgreSQL

- [x] Migration `users` chạy qua `db:migrate`; lần 2 bỏ qua.
- [x] `SELECT role, password_hash IS NOT NULL` sau đăng ký hợp lệ.
- [x] Email khác hoa thường vẫn đụng unique → 409.

---

## 10. Kiểm tra

- Thiếu field → 400, không thêm dòng.
- Email trùng (kể cả khác hoa) → 409.
- Hợp lệ → 201, `role = user`.
- Tắt DB → 503 (middleware sẵn có), không phải 400.

### Task checklist — Kiểm tra tổng

- [x] Bốn case trên đã ghi kết quả (curl hoặc test).
- [x] Không log secret.
- [x] Ghi mục 14.

## 11. Checklist tổng

- [x] Mục 6–10 đã tick tương ứng.
- [x] Không plaintext trong DB.
- [x] Không API nào gán `admin` lúc đăng ký.

## 12. Câu hỏi ôn

1. Salt nằm ở đâu nếu không có cột `salt` riêng?
2. Unique trên email đã `lower` khác unique trên email gốc thế nào?
3. Request gửi `role: admin` thì dòng DB phải là gì?

## 13. Lỗi hay gặp

- `express.json()` đặt sau router → `req.body` undefined.
- Hash trước khi Zod fail → tốn CPU.
- Unique `23505` trả 500 thay vì 409.

## 14. Báo cáo hoàn thành

Review mentor: 2026-10-28. Ngày 2 **đạt đủ**. Câu hỏi ôn đạt.

- Đã sửa file: `apps/api/src/password.ts`, `apps/api/src/users.ts`, `apps/api/src/routes/auth.ts`, `apps/api/src/server.ts`, `apps/api/db/migrations/002_add_user.sql`, `apps/api/package.json`.
- Lệnh đã chạy và kết quả:
  - `npm --prefix apps/api run typecheck`: exit 0.
  - Thiếu field → **400**. Email trùng khác hoa → **409**. Hợp lệ + `"role":"admin"` → **201**, `role = user`, hash prefix `$argon2id$`.
  - Database không kết nối được, body hợp lệ → **503**. Thiếu field lúc đó vẫn **400**.
  - `users` lúc review cuối: 0 dòng. Không còn hash plaintext.
- Chưa xong:
- `role` từ client xử lý thế nào: schema không có `role`. `INSERT` ghi cứng `'user'`. Dòng DB là `user`.

## 15. Ngày kế

Ngày 3: trang `/signup`. Server Ngày 2 vẫn từ chối payload sai dù UI đã validate.
