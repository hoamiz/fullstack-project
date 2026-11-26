# Ngày 8 — Google OIDC: bắt đầu đăng nhập

Đăng nhập mật khẩu đã xong. Ngày 8 chỉ đưa trình duyệt sang Google và chứng minh request quay về là request mình đã tạo. Chưa tạo user từ Google. Việc đó là Ngày 9.

## 1. Mục tiêu

- Dùng `openid-client` để tạo URL đăng nhập Google có PKCE và `state`.
- `state` không khớp session thì từ chối, chưa tạo user.
- Thiếu biến môi trường thì API vẫn listen, nút Google trên `/login` không bấm được.

## 2. Thời lượng

6 giờ: 2 giờ OIDC, 3 giờ redirect, 1 giờ test state.

## 3. Kiến thức cần có

Session Ngày 4. Redirect của trình duyệt khác `fetch` JSON. Cookie `sid` là chỗ cất `state`, vì cookie đó HttpOnly và JavaScript trên trang không đọc được.

## 4. Bài này giải quyết gì

OpenID Connect là cách Google xác nhận một tài khoản, rồi trả ứng dụng một authorization code. Ứng dụng đổi code đó lấy ID token ở Ngày 9. Hôm nay dừng trước bước đổi code.

PKCE là một cặp chuỗi. `code_verifier` ở lại trên server, trong session. `code_challenge` là dạng băm của verifier, gửi sang Google. Kẻ nhìn thấy code trên URL callback vẫn không đổi được code nếu không có verifier. Verifier không được đưa vào URL, không đưa vào `NEXT_PUBLIC_`, không trả về JSON cho trình duyệt.

`state` là một chuỗi ngẫu nhiên thứ hai, cũng nằm trong session. Google gửi lại đúng chuỗi đó. Nếu query `state` khác session, callback bị từ chối. Việc này chặn kẻ mở URL callback giả để gắn login vào phiên của nạn nhân. `state` không thay cookie `csrf` Ngày 4. CSRF bảo vệ `POST` từ trang của bạn. `state` bảo vệ vòng redirect sang Google và quay lại.

Ba biến, đặt trong `apps/api/.env`, không commit:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI=http://localhost:4000/auth/google/callback`

Redirect URI trỏ cổng **4000**, vì route callback nằm trên Express. Trỏ cổng 3000 thì Google trả code về Next, nơi không có verifier. URI trên Google Cloud phải khớp từng ký tự, gồm cả `http` và path.

Thiếu một trong ba biến thì process API vẫn listen. `GET /auth/providers` trả `{ "google": false }`. `GET /auth/google` trả 503 và `{ "error": "Google chưa được cấu hình" }`. Không ném lỗi lúc khởi động, nếu không máy không có tài khoản Google sẽ không chạy được đăng nhập mật khẩu.

Package là `openid-client` bản 6, cài trong `apps/api`. Issuer đưa vào `discovery` là `https://accounts.google.com`. Thư viện tự tải `/.well-known/openid-configuration`. Không hard-code URL token của Google trong route.

## 5. Ví dụ URL

Redirect URI đăng ký với Google:

```text
http://localhost:4000/auth/google/callback
```

Nút trên `/login` là thẻ link tới `http://localhost:4000/auth/google`, không phải `fetch`. Trình duyệt đi sang Google, người dùng có thể bấm hủy. Hủy xử lý hết ở Ngày 9. Hôm nay chỉ cần thấy trình duyệt rời khỏi `/login` khi provider bật.

## Hướng dẫn làm

### Bước 1. Google Cloud và env

Bạn tạo OAuth client loại Web. Thêm đúng redirect URI ở trên. Authorized JavaScript origin có thể là `http://localhost:3000`. Dán client id và secret vào `apps/api/.env`. Thêm ba tên biến, với giá trị giả `replace-me`, vào `apps/api/.env.example` nếu file đó đang được commit. Không dán secret vào chat, không `console.log` secret.

`git status` không được thấy `.env` trong vùng staged.

### Bước 2. Cài package và kiểu session

Trong `apps/api`:

```bash
npm install openid-client
```

Trong `declare module "express-session"` ở `server.ts`, thêm:

```ts
oauthState?: string;
oauthCodeVerifier?: string;
```

Hai field này là dữ liệu tạm của vòng Google. Chúng không phải `userId`.

### Bước 3. Cấu hình lười

File `apps/api/src/google.ts`. Hàm `getGoogleConfig()` đọc ba biến. Thiếu biến thì trả `null`, không throw. Đủ biến thì:

```ts
import * as client from "openid-client";

const config = await client.discovery(
  new URL("https://accounts.google.com"),
  clientId,
  clientSecret,
);
```

Cache promise ở biến module để không gọi discovery mỗi request. Nếu discovery lỗi, xóa cache đó để lần sau thử lại, và route trả 503.

Hàm `googleRedirectUri()` trả `process.env.GOOGLE_REDIRECT_URI`.

### Bước 4. `GET /auth/providers` và `GET /auth/google`

Trong `routes/auth.ts`:

`GET /auth/providers` trả `{ google: boolean }`. `true` chỉ khi cả ba biến env có mặt. Route này là `GET`, không cần CSRF.

`GET /auth/google`:

1. Không có config thì 503 và câu «Google chưa được cấu hình».
2. `code_verifier = client.randomPKCECodeVerifier()`.
3. `code_challenge = await client.calculatePKCECodeChallenge(code_verifier)`.
4. `state = client.randomState()`. Luôn tạo `state`, kể cả khi Google báo hỗ trợ PKCE. Bài này muốn cả hai.
5. Gán `req.session.oauthCodeVerifier` và `req.session.oauthState`.
6. `client.buildAuthorizationUrl(config, { redirect_uri, scope: "openid email profile", code_challenge, code_challenge_method: "S256", state })`.
7. `res.redirect(url.href)`.

Verifier chỉ nằm trong session. Response redirect không chứa verifier.

### Bước 5. Callback chưa đăng nhập

`GET /auth/google/callback` hôm nay:

- Query `state` khác `req.session.oauthState`, hoặc session không có `oauthState`: trả 400 `{ "error": "state không hợp lệ" }`. Không `INSERT` user. Đếm `users` trước và sau phải bằng nhau.
- Query `state` khớp: trả 501 `{ "error": "Callback Google chưa hoàn thành" }`. Giữ `oauthState` và verifier trong session để Ngày 9 dùng. Vẫn không `INSERT` user.

Ngày 9 thay nhánh 501 bằng đổi code. Đừng đổi code hôm nay. Một code Google chỉ dùng một lần. Đổi thử rồi bỏ thì lần thử Ngày 9 sẽ hết code.

### Bước 6. Nút trên `/login`

Client Component login gọi `apiFetch("/auth/providers")` khi mở trang. `google: false` thì không render nút, hoặc render nút disabled với câu «Google chưa được cấu hình». `google: true` thì render link:

```tsx
<a href={`${apiUrl}/auth/google`}>Đăng nhập với Google</a>
```

`apiUrl` lấy từ `@/lib/projects`. Đây là điều hướng cả trang, không phải `apiFetch`. `apiFetch` là `fetch`, Google không nhận kiểu đó cho trang đăng nhập.

Bấm nút khi đã cấu hình: trình duyệt tới trang Google. Bạn có thể đóng tab. Chưa cần đăng nhập xong.

### Bước 7. Kiểm tra

- Xóa tạm ba biến, restart API. `GET /auth/providers` là `{ "google": false }`. Trang login không có nút bấm được. `GET /auth/google` là 503. Đăng nhập mật khẩu vẫn 200.
- Bật lại env. Bấm nút, thấy Google. Sửa cookie jar hoặc gọi callback với `?state=sai`. Status 400. `SELECT count(*) FROM users` không tăng.
- `npm run typecheck` trong `apps/api` thoát 0.
- Mục 14 ghi redirect URI đã đăng ký. Không ghi secret, không ghi authorization code.

## Cách đọc mục 6–9

Quy ước: [README.md](README.md#cách-đọc-mục-69).

---

## 6. Việc cần làm (phân công học)

**Bạn:** tạo OAuth client, điền `.env`, giải thích `state` đang nằm ở đâu.

### Task checklist — mục 6

- [x] Tự nói được PKCE và `state` để làm gì.
- [x] Redirect URI đã đăng ký đúng cổng 4000.

---

## 7. Frontend (Next.js)

Nút là link tới `GET /auth/google`, chỉ khi `GET /auth/providers` báo bật.

### Task checklist — Frontend

- [x] Thiếu env thì không có nút dùng được.
- [x] Có env thì bấm được và trình duyệt tới Google.

---

## 8. Backend (Express API)

`state` và verifier nằm trong session. Callback từ chối state lệch trước khi tạo user.

### Task checklist — Backend

- [x] `.env.example` chỉ placeholder. `.env` không nằm trong `git status` staged.
- [x] `state` sai → từ chối, `count(users)` không tăng.
- [x] Verifier không xuất hiện trong HTML hay JSON gửi cho trình duyệt.
- [x] Typecheck pass.

---

## 9. PostgreSQL

Chưa có bảng `oauth_accounts`. Chưa `INSERT` user từ Google. Session chỉ thêm field tạm.

### Task checklist — PostgreSQL

- [x] Sau thử state sai, số dòng `users` không đổi.

---

## 10. Kiểm tra

### Task checklist — Kiểm tra tổng

- [x] Đã thử thiếu env và state sai.
- [x] Mục 14 không có secret và không có token.

## 11. Checklist tổng

- [x] Mục 6–10 đạt.

## 12. Câu hỏi ôn

1. Redirect URI trỏ cổng 3000 thì hỏng ở bước nào?
2. `state` khác cookie `csrf` Ngày 4 ở chỗ nào?
3. Vì sao một query `?email=` do mình tự gõ không đủ để tạo user?

## 13. Lỗi hay gặp

- Nhét client secret vào biến `NEXT_PUBLIC_`. Biến đó có mặt trong bundle trình duyệt.
- Đưa `code_verifier` lên URL.
- Hiện nút Google dù `/auth/providers` lỗi hoặc trả `google: false`.
- Gọi `discovery` với URL `/.well-known/...`. Issuer đúng là `https://accounts.google.com`.

## 14. Báo cáo hoàn thành

Review mentor: lần 4, 2026-11-09. **Đạt đủ.**

- `GET /auth/providers` **200** `{"google":true}`. `GET /auth/google` **302**, `redirect_uri` cổng 4000, có `code_challenge` và `state`, không có `code_verifier`. `npm run typecheck` thoát 0. Cache thành công gán `Promise.resolve(conf)` vào biến module. `.catch` gán `config = null` nên lần sau gọi `discovery` lại. Hàm trả `null`, route `/auth/google` gửi 503.
- Chưa xong:
- Ôn 1–3 đạt.
- Redirect URI: `http://localhost:4000/auth/google/callback`. Không ghi secret.

## 15. Ngày kế

Ngày 9: callback đổi code, liên kết email, hủy quyền trên trang Google.
