# Ngày 7 — Role và script admin đầu tiên

Sau Ngày 6, `GET /auth/me` trả `role` đọc từ bảng `users`. Session chỉ giữ `userId`. Đăng ký luôn ghi `role = 'user'`. Chưa có admin, và chưa có chỗ nào từ chối một user thường.

## 1. Mục tiêu

- Chưa đăng nhập gọi route admin thì **401**. Đã đăng nhập nhưng role không phải `admin` thì **403**.
- Script local tạo admin bằng Argon2id. Chạy lại không làm hỏng admin đang có. Không tự nâng một user thường lên admin.
- Không có route HTTP nào đổi `role` thành `admin`.

## 2. Thời lượng

6 giờ: 1,5 giờ lý thuyết, 3 giờ middleware và script, 1,5 giờ test 403. Script chỉ chạy lên database Neon chính khi bạn xác nhận từng lần.

## 3. Kiến thức cần có

`/auth/me` có `role`. Session chỉ có `userId`. CSRF vẫn bọc mọi `POST`.

## 4. Bài này giải quyết gì

401 nghĩa là API chưa biết bạn là ai. 403 nghĩa là API biết bạn là user nào, và user đó không được làm việc này. Trộn hai status thì giao diện không biết nên đưa về trang login hay báo không đủ quyền.

Role không đọc từ cookie và không đọc từ `req.body`. Mỗi request admin làm:

```sql
SELECT role
FROM users
WHERE id = $1
```

`$1` là `req.session.userId`. User vừa bị đổi role trong database thì request sau thấy role mới, không cần đăng nhập lại. Đó là lý do Ngày 4 không nhét role vào session.

Ẩn nút trên giao diện không thay thế 403. Người biết URL vẫn gọi API bằng curl.

Script tạo admin là cách duy nhất để có dòng `role = 'admin'` trong Phase 1. Script đòi biến môi trường `CONFIRM_ADMIN_GRANT=yes`. Thiếu biến này thì process thoát trước khi tạo `Pool`, nên gõ nhầm lệnh không chạm database. Email đã là admin thì thoát 0, không hash lại mật khẩu. Email đang là `user` thì thoát với thông báo, không `UPDATE` role. Email chưa có thì `INSERT` với role `admin`.

Không có `PATCH /users/:id/role`. Một route như vậy là cửa nâng quyền mà bài này cấm.

## 5. Bảng cần điền bằng request thật

| Ai | Gọi route admin thử | Status |
| --- | --- | --- |
| Không cookie | có | 401 |
| User vừa đăng ký | có | 403 |
| Admin, sau khi bạn xác nhận chạy script | có | 204 |

Route thử là `GET /admin/whoami`. `GET` không cần CSRF, nên 401 và 403 không bị nhầm với 403 của header CSRF. Ngày 11 route này được thay bằng API tạo project. Hôm nay nó chỉ để chứng minh middleware.

## Hướng dẫn làm

### Bước 1. `requireUser` và `requireAdmin`

File mới `apps/api/src/require-admin.ts`.

`requireUser` là middleware. Không có `req.session.userId` thì `401` và `{ "error": "Chưa đăng nhập" }`, không gọi `next()`.

`requireAdmin` chạy sau `requireUser`. Dùng `pool` từ `db.ts`:

```sql
SELECT role FROM users WHERE id = $1
```

Không có dòng, hoặc `role` khác `'admin'`, thì `403` và `{ "error": "Không đủ quyền" }`. Đúng admin thì `next()`.

Không cache role trong biến toàn cục. Hai user xen kẽ request sẽ thấy nhầm role của nhau.

### Bước 2. Router admin thử

File `apps/api/src/routes/admin.ts`:

```ts
export const adminRouter = Router();

adminRouter.get("/whoami", requireUser, requireAdmin, (_req, res) => {
  res.status(204).end();
});
```

Trong `server.ts`, gắn `app.use("/admin", adminRouter)` sau middleware CSRF, cạnh `/auth`. Không thêm route `POST` hoặc `PATCH` nào chứa chữ `role`.

### Bước 3. Script `apps/api/src/scripts/create-admin.ts`

Đọc bốn biến: `CONFIRM_ADMIN_GRANT`, `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD`.

Việc đầu tiên, trước `import` pool nếu import đó tự nối database. `db.ts` hiện tạo `Pool` ngay khi import và ném lỗi nếu thiếu `DATABASE_URL`. Vì vậy script phải tự kiểm tra `CONFIRM_ADMIN_GRANT === "yes"` trước khi import động `pool`.

```ts
if (process.env.CONFIRM_ADMIN_GRANT !== "yes") {
  console.error("Thiếu CONFIRM_ADMIN_GRANT=yes. Không kết nối database.");
  process.exit(1);
}
const { pool } = await import("../db.js");
```

Thiếu email, tên, hoặc mật khẩu thì thoát trước khi query. Mật khẩu dùng cùng rule đăng ký: ít nhất 12 ký tự, có chữ và có số. Hash bằng `hashPassword` trong `password.ts`. Không `console.log` mật khẩu, hash, hay `process.env`.

Email chuẩn hóa `trim().toLowerCase()` trước khi query.

```sql
SELECT id, role FROM users WHERE email = $1
```

- Không có dòng: `INSERT INTO users (email, name, password_hash, role) VALUES ($1, $2, $3, 'admin')`.
- `role` đã là `admin`: in «Admin đã tồn tại», thoát 0, không `UPDATE` hash.
- `role` là `user`: in «Email này đã là user. Script không nâng quyền.», thoát 1, không `UPDATE`.

Trong `apps/api/package.json` thêm script:

```json
"admin:create": "tsx --env-file-if-exists=.env src/scripts/create-admin.ts"
```

Chạy từ `apps/api`. Biến `ADMIN_*` và `CONFIRM_ADMIN_GRANT` để trên dòng lệnh, không ghi vào `.env` nếu máy đó dùng database chính. Không commit các giá trị đó.

### Bước 4. Chứng minh 401 và 403 trước khi tạo admin

Đăng ký một user thường bằng form hoặc curl có CSRF. Login để có cookie. `GET http://localhost:4000/admin/whoami` với cookie đó là **403**. Cùng URL không gửi cookie là **401**.

Chạy script thiếu confirm, với `DATABASE_URL` giả, để thấy nó thoát trước khi nối:

```bash
CONFIRM_ADMIN_GRANT=no DATABASE_URL=postgres://invalid:invalid@127.0.0.1:1/none npm run admin:create
```

Kỳ vọng: thông báo thiếu confirm, không có lỗi kết nối `ECONNREFUSED`. Lệnh này không đụng Neon.

### Bước 5. Tạo admin chỉ khi bạn xác nhận

Hỏi rõ database nào trước khi chạy. Không tự chạy lên Neon chính trong lúc học nếu bạn chưa nói có. Khi chạy, truyền email mới, chưa có trong `users`. Sau đó login bằng email đó và `GET /admin/whoami` phải **204**.

Chạy script lần hai cùng email admin: thoát 0, hash trong database không đổi. Bạn kiểm tra bằng cách login vẫn dùng mật khẩu cũ.

Đừng trỏ script vào email user đã dùng để test 403.

Typecheck trong `apps/api` thoát 0.

## Cách đọc mục 6–9

Quy ước: [README.md](README.md#cách-đọc-mục-69).

---

## 6. Việc cần làm (phân công học)

**Bạn:** điền bảng 401/403 bằng request thật. Đọc script và chỉ chỗ nào có thể lộ mật khẩu nếu log nhầm.

### Task checklist — mục 6

- [x] Tự điền được bảng 401 và 403.
- [x] Tự chỉ ra vì sao không có route đổi role.

---

## 7. Frontend (Next.js)

Chưa có trang admin. `/account` đã hiện `role` từ `/auth/me`. Đủ để nhìn. Không bắt buộc sửa UI hôm nay.

---

## 8. Backend (Express API)

Middleware cộng `GET /admin/whoami`. Không endpoint đổi role.

### Task checklist — Backend

- [x] Không cookie → 401.
- [x] User thường → 403.
- [x] Không có `PATCH` hoặc `POST` nâng role.
- [x] Typecheck pass.

---

## 9. PostgreSQL

`users.role` đã có check `user` hoặc `admin` từ migration `002_add_user.sql`. Không thêm cột. Script chỉ `INSERT` khi email chưa tồn tại.

### Task checklist — PostgreSQL

- [x] Source script không chứa mật khẩu viết sẵn.
- [x] Thiếu `CONFIRM_ADMIN_GRANT=yes` thì thoát trước khi nối database.
- [x] Nếu đã chạy script: ghi rõ database nào trong mục 14. Nếu chưa chạy: ghi chưa chạy.

---

## 10. Kiểm tra

User thường gọi admin phải là 403, không phải 401.

### Task checklist — Kiểm tra tổng

- [x] 401 và 403 tách đúng.
- [x] Mục 14 ghi script đã chạy trên database nào, hoặc chưa chạy.

## 11. Checklist tổng

- [x] Mục 6–10 đạt.
- [x] Không có API tự thăng admin.

## 12. Câu hỏi ôn

1. Ẩn nút admin trên UI có thay được 403 không?
2. Vì sao script không tự nâng một email đang là `user` lên `admin`?
3. `CONFIRM_ADMIN_GRANT` chặn nhầm lệnh bằng cách nào?

## 13. Lỗi hay gặp

- Tin `req.body.role`.
- `console.log(process.env)` làm lộ `DATABASE_URL` và mật khẩu admin.
- Nhớ role trong biến module. Request sau dùng nhầm role của user trước.
- Gọi `POST /admin/whoami` rồi thấy 403 CSRF và tưởng đó là 403 role. Route thử là `GET`.

## 14. Báo cáo hoàn thành

Review mentor: lần 8, 2026-11-09. **Đạt đủ.**

- Neon `fullstack-project`, bảng `users`. `day7.review.1@example.com` qua script: «Email này đã là user. Script không nâng quyền.», thoát 1. Login vẫn 200, `GET /auth/me` vẫn `role = user`, `GET /admin/whoami` vẫn 403.
- Email truyền vào có khoảng trắng và chữ hoa `Day7.Admin.1@Example.com`. Script in «Admin đã được tạo thành công.», thoát 0. `GET /auth/me` trả `day7.admin.1@example.com`, `role = admin`. Login 200 rồi `GET /admin/whoami` **204**. Chạy lại cùng email: «Admin đã tồn tại.», thoát 0. Login lại vẫn 200, nên hash cũ vẫn khớp mật khẩu cũ.
- Chưa xong:
- Ôn 1–3 đạt (lần 1).
- Script đã chạy trên database nào: Neon `fullstack-project`, bảng `users`. Admin mới: `day7.admin.1@example.com`.

## 15. Ngày kế

Ngày 8: bắt đầu đăng nhập Google. Redirect, PKCE, `state`. Chưa đổi code lấy user.
