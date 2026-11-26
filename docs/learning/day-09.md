# Ngày 9 — Callback Google và liên kết tài khoản

Ngày 8 đã gửi người dùng sang Google và giữ `oauthState` cùng `oauthCodeVerifier` trong session. Callback đang trả 501 khi state đúng. Hôm nay đổi authorization code lấy danh tính, rồi gắn vào một dòng `users`.

## 1. Mục tiêu

- Callback kiểm tra token bằng `openid-client`.
- Người dùng bấm hủy trên Google thì không có session đăng nhập và không có user mới.
- Email đã đăng ký bằng mật khẩu thì gắn một dòng `oauth_accounts`, không tạo user thứ hai, không xóa hash, không đổi role.
- Tài khoản chỉ có Google thì `password_hash` là `NULL`.

## 2. Thời lượng

6 giờ: 1,5 giờ lý thuyết, 3 giờ callback, 1,5 giờ test lỗi.

## 3. Kiến thức cần có

`state` và verifier Ngày 8. Cột `users.password_hash` đã cho phép `NULL` trong `002_add_user.sql`. `session.regenerate` đã dùng ở login mật khẩu.

## 4. Bài này giải quyết gì

Google không trả «user của portfolio». Google trả một code ngắn hạn. Server đổi code đó, kèm verifier đã cất trong session, lấy ID token. `openid-client` kiểm tra chữ ký, issuer, audience và hạn dùng. Claims nằm ở `tokens.claims()`.

Claim dùng làm khóa là `sub`. Đó là id ổn định của tài khoản Google. Email có thể đổi trong tài khoản Google. Khóa bằng email thì lần sau email đổi sẽ thành user mới, hoặc gắn nhầm vào người khác vừa đổi tới email đó.

Ba nhánh sau khi token hợp lệ và `email_verified` là `true`:

1. Đã có dòng `oauth_accounts` với `provider = 'google'` và `provider_user_id = sub`. Lấy `user_id` đó. Không `INSERT` user.
2. Chưa có `sub`, nhưng `users.email` đã có. `INSERT` vào `oauth_accounts` trỏ tới user đó. Giữ nguyên `password_hash` và `role`. Người đã đăng ký bằng form vẫn đăng nhập bằng mật khẩu, và cũng đăng nhập được bằng Google.
3. Chưa có `sub` và chưa có email. `INSERT` user với `password_hash` NULL, `role` cố định `'user'`, rồi `INSERT` `oauth_accounts`.

`email_verified` không phải `true` thì dừng. Không tạo user. Không tin email trong query string của callback. Email chỉ lấy từ claims của ID token.

Sau khi biết `user_id`, làm giống login mật khẩu: `session.regenerate`, gán `userId`, xóa `oauthState` và `oauthCodeVerifier`, redirect về `http://localhost:3000/account`. Regenerate tránh session fixation trên vòng OAuth, cùng lý do Ngày 5.

Người dùng bấm hủy thì Google gọi callback với `error=access_denied`, không có code. Xóa hai field OAuth trong session, redirect về `http://localhost:3000/login?error=google_cancelled`. Không set `userId`. Mọi lỗi đổi token hoặc state cũng về `/login?error=google_failed`, không trả JSON lỗi thô của Google cho trình duyệt, không ghi token vào log.

## 5. Bảng mới

File migration `apps/api/db/migrations/003_add_oauth_accounts.sql`. Chạy bằng `npm run db:migrate` từ root, hoặc `npm run db:migrate` trong `apps/api`. Không sửa tay bảng trên Neon. Không chạy lại seed.

```sql
CREATE TABLE IF NOT EXISTS oauth_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id),
  provider text NOT NULL,
  provider_user_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_user_id)
);
```

`user_id` là `uuid` vì `users.id` là `uuid`. Unique `(provider, provider_user_id)` là hàng rào thật: cùng một `sub` không gắn được hai user. Bắt lỗi Postgres `23505` nếu có race, trả về nhánh tìm lại theo `sub`, không tạo user thứ ba.

## Hướng dẫn làm

### Bước 1. Migration

Thêm file SQL ở trên. Chạy migrate một lần. Lần sau file này bị bỏ qua vì đã có trong `schema_migrations`. Kiểm tra trên Neon: bảng có đủ cột và unique.

### Bước 2. Hàm liên kết trong `users.ts`

Một hàm nhận `sub`, `email`, `name` đã kiểm tra. Thứ tự query:

```sql
SELECT user_id FROM oauth_accounts
WHERE provider = 'google' AND provider_user_id = $1
```

Có dòng thì trả `user_id`.

Không có thì:

```sql
SELECT id, role FROM users WHERE email = $1
```

Có user thì:

```sql
INSERT INTO oauth_accounts (user_id, provider, provider_user_id)
VALUES ($1, 'google', $2)
```

Không có user thì `INSERT` user (`password_hash` để NULL, `role` là `'user'`) với `RETURNING id`, rồi insert `oauth_accounts`.

Không có câu `UPDATE users SET role` và không có `UPDATE users SET password_hash = NULL` trong hàm này.

### Bước 3. Thay callback 501

`GET /auth/google/callback` trong `routes/auth.ts`.

Đầu hàm, nếu `req.query.error === "access_denied"`: xóa `oauthState` và `oauthCodeVerifier`, `res.redirect("http://localhost:3000/login?error=google_cancelled")`.

Nếu `state` không khớp session: xóa hai field, redirect `error=google_failed`. Không gọi Google.

State khớp thì dựng URL hiện tại và đổi code:

```ts
const currentUrl = new URL(
  req.originalUrl,
  `${req.protocol}://${req.get("host")}`,
);

const tokens = await client.authorizationCodeGrant(config, currentUrl, {
  pkceCodeVerifier: req.session.oauthCodeVerifier,
  expectedState: req.session.oauthState,
});
```

`req.protocol` trên local là `http`. Redirect URI đăng ký cũng là `http://localhost:4000/...`, nên URL đưa vào `authorizationCodeGrant` phải là URL Google đã gọi, không phải URL cổng 3000.

`const claims = tokens.claims()`. Cần `sub` là string, `email` là string, `email_verified === true`. `name` có thể thiếu. Thiếu thì dùng phần trước dấu `@` của email. Thiếu `sub`, thiếu email, hoặc email chưa verified: redirect `google_failed`, không insert.

Gọi hàm liên kết. `session.regenerate`, gán `userId`, không gán role. Redirect `http://localhost:3000/account`.

`catch`: `console.error` không in token. Redirect `google_failed`.

### Bước 4. `/login` đọc lỗi

Client Component login đọc `useSearchParams()` từ `next/navigation`. `error=google_cancelled` hiện «Bạn đã hủy đăng nhập Google». `error=google_failed` hiện «Đăng nhập Google không thành công». Không hiện code, không hiện token. Bọc component dùng `useSearchParams` trong `Suspense` nếu Next báo thiếu suspense khi build.

Sau hủy, `GET /auth/me` phải 401. Trang không được nhảy vào `/account`.

### Bước 5. Ba lần thử

Ghi `count(*)` từ `users` trước khi thử.

- Bấm Google rồi hủy: count không tăng. `/account` đá về `/login`. Thấy câu đã hủy.
- Đăng ký form bằng một email, rồi đăng nhập Google cùng email đó. `users` vẫn một dòng cho email đó. `oauth_accounts` thêm một dòng. `password_hash` vẫn bắt đầu bằng `$argon2id$`. `role` vẫn `user` nếu trước đó là user. Đăng nhập mật khẩu cũ vẫn 200.
- Đăng nhập Google lần hai cùng tài khoản: không thêm user, không thêm dòng `oauth_accounts` thứ hai cho cùng `sub`.

Chưa có tài khoản Google để thử thì ghi rõ trong mục 14 là chưa thử tay, và ghi phần đã chứng minh được (migration, nhánh hủy nếu đã bấm hủy). Không bịa số user.

Typecheck `apps/api` thoát 0. Mục 14 không chứa authorization code hay ID token.

## Cách đọc mục 6–9

Quy ước: [README.md](README.md#cách-đọc-mục-69).

---

## 6. Việc cần làm (phân công học)

**Bạn:** kể được ba nhánh hủy, email mới, email đã có mật khẩu. Nhánh nào không được đổi role: cả ba. Role admin chỉ có từ script Ngày 7.

### Task checklist — mục 6

- [x] Tự nêu ba nhánh liên kết.
- [x] Tự nói vì sao khóa là `sub`.

---

## 7. Frontend (Next.js)

`/login` đọc query `error`. Không hiện token.

### Task checklist — Frontend

- [x] Hủy OAuth thì thấy câu tiếng Việt và không vào `/account` như đã đăng nhập.

---

## 8. Backend (Express API)

Lỗi xác minh không tạo session. Không trả raw error của Google ra trình duyệt.

### Task checklist — Backend

- [x] Hủy → không user mới, `/auth/me` là 401.
- [x] Email đã signup → một user, một dòng `oauth_accounts`, role và hash giữ nguyên.
- [x] Cùng `sub` lần hai → không thêm user.
- [x] Typecheck pass.

---

## 9. PostgreSQL

Unique `(provider, provider_user_id)`. Khóa ngoại `user_id`.

### Task checklist — PostgreSQL

- [x] `db:migrate` áp dụng `003_add_oauth_accounts.sql`.
- [x] Đếm user cùng email bằng 1 sau khi liên kết.

---

## 10. Kiểm tra

### Task checklist — Kiểm tra tổng

- [x] Đã thử hủy và liên kết email, hoặc ghi rõ chưa thử Google và lý do.
- [x] Mục 14 không có token.

## 11. Checklist tổng

- [x] Mục 6–10 đạt.
- [x] Không có hai user cùng email.

## 12. Câu hỏi ôn

1. Vì sao khóa là `sub`, không phải email?
2. User đã có mật khẩu, rồi Google cùng email. Hash có bị xóa không?
3. `access_denied` khác một token giả ở bước nào?

## 13. Lỗi hay gặp

- Tạo user khi `email_verified` không phải `true`.
- Quên `regenerate` sau OAuth.
- Tin `?email=` trên URL callback.
- Đổi code ở Ngày 8 nên Ngày 9 không còn code để đổi.

## 14. Báo cáo hoàn thành

Review mentor: lần 9, 2026-11-10. **Đạt.** Ba nhánh liên kết kể đúng.

- Có `sub`: trả `user_id`. Có email trong `users`: `INSERT oauth_accounts` rồi trả `user_id`. Chưa có cả hai: `INSERT users` với `password_hash` null, `role` user, rồi `INSERT oauth_accounts`. Cả ba nhánh không `UPDATE role`.
- Đã thử: hủy 302 và câu tiếng Việt, user Google mới, lần hai không thêm dòng (`users` 23, `oauth_accounts` 1, session 13:47). Câu ôn 1–3 đạt. `catch` không in token.
- Hai ô trên tick theo đọc code ngày 2026-11-26, không signup mới. Nhánh email đã có trong `users`: chỉ `INSERT oauth_accounts`. Không có `UPDATE` `password_hash` hay `role`. `users.email` là UNIQUE. `sub` đã gắn vẫn đi nhánh đầu, nên không bấm lại được.
- Chưa xong:

## 15. Ngày kế

Ngày 10: khách là người không có session. Khách xem project đã publish. Khách không ghi dữ liệu.
