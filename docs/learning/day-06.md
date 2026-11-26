# Ngày 6 — Trang đăng nhập và session hết hạn

Ngày 5 đã có `POST /auth/login` và `POST /auth/logout` trên API. Trang `/login` vẫn là một tiêu đề. Form `/signup` gọi `fetch` không gửi cookie và không gửi `X-CSRF-Token`, nên bấm Đăng ký trên trình duyệt nhận 403 từ Ngày 4.

Hôm nay nối trình duyệt với session đó.

## 1. Mục tiêu

- `/login` có email, mật khẩu, nút gửi, link sang `/signup`.
- Tải lại trang vẫn còn đăng nhập.
- Session hết hạn thì không ở lại trang bảo vệ.
- Form đăng ký dùng chung cách gửi cookie và CSRF, để `POST /auth/register` hoạt động lại trên trình duyệt.

## 2. Thời lượng

6 giờ: 1 giờ lý thuyết, 3 giờ UI, 2 giờ kiểm tra ba trạng thái.

## 3. Kiến thức cần có

Login API Ngày 5. Cookie `sid`, cookie `csrf` và header `X-CSRF-Token` Ngày 4.

## 4. Bài này giải quyết gì

Cookie `sid` nằm trong trình duyệt, không nằm trong state React. Bấm F5 thì React mất hết `useState`, nhưng trình duyệt vẫn gửi `sid` cho lần request sau. Vì vậy «còn đăng nhập» không được lưu bằng `localStorage`.

Cách kiểm tra là `GET /auth/me`. Có `userId` trong session thì 200 và JSON `{ id, email, name, role }`. Không có session thì 401. Response không có `password_hash`. Role lấy bằng `SELECT` theo `userId`, không lấy từ cookie. Cookie vẫn chỉ mang mã phiên.

`GET` không cần header CSRF. `POST` login, logout và register thì cần. Helper `lib/api.ts` làm việc đó một lần. Form nào cũng gọi helper, không tự gắn header riêng.

Trang `/login` chạy trên `localhost:3000`, API trên `localhost:4000`. Hai cổng là hai origin, cùng site `localhost`. `fetch` phải có `credentials: "include"` thì trình duyệt mới gửi cookie và mới giữ `Set-Cookie` từ API. CORS Ngày 3 đã cho phép origin này với `credentials: true`. Thiếu `credentials` thì login có thể trả 200 nhưng trình duyệt bỏ cookie, F5 thành khách.

Cookie `csrf` không có `HttpOnly`, nên JavaScript trên `localhost` đọc được bằng `document.cookie`. Helper copy giá trị đó vào header khi method là `POST`, `PUT`, `PATCH` hoặc `DELETE`.

Một việc dễ nhầm với Next.js: Server Component gọi `fetch` từ process Next, không phải từ trình duyệt. Cookie của người dùng không tự đi theo request đó. Trang cần biết «tôi đã đăng nhập chưa» trong bài này là Client Component, `fetch` chạy trong trình duyệt.

`maxAge` của cookie session đặt **7 ngày** (`7 * 24 * 60 * 60 * 1000` mili giây) trong `session({ cookie: { maxAge } })` ở `server.ts`. Không commit giá trị 30 giây. Muốn thử hết hạn thì sửa cột `expire` của một dòng trong Neon, rồi trả lại bằng cách đăng nhập mới. Không hạ `maxAge` trong code để test.

## 5. Ba trạng thái cần tự bấm

1. Sai mật khẩu: ở lại `/login`, thấy câu `Email hoặc mật khẩu không đúng`. Không có câu riêng cho «email không tồn tại».
2. Đúng mật khẩu, sang trang `/account`, bấm F5: vẫn thấy email. `GET /auth/me` là 200.
3. Sửa `expire` của phiên đó về quá khứ, F5 `/account`: về `/login`.

Thêm một lần: đăng nhập sai 6 lần để UI hiện câu 429.

## Hướng dẫn làm

### Bước 1. `GET /auth/me`

Trong `apps/api/src/routes/auth.ts`. Đây là `GET`, middleware CSRF cho qua.

Không có `req.session.userId` thì 401 và `{ "error": "Chưa đăng nhập" }`.

Có `userId` thì:

```sql
SELECT id, email, name, role
FROM users
WHERE id = $1
```

Không có dòng (user đã bị xóa khỏi bảng nhưng cookie còn) thì `session.destroy` và 401 cùng câu. Có dòng thì 200 với bốn field đó. Không chọn `password_hash`.

Viết hàm đọc user trong `users.ts`, cạnh hàm login Ngày 5. Route không viết SQL trực tiếp nếu `users.ts` đã là chỗ nói chuyện với bảng `users`.

### Bước 2. `maxAge` 7 ngày

Trong `app.use(session({...}))` ở `server.ts`, thêm `maxAge: 7 * 24 * 60 * 60 * 1000` vào object `cookie`. Giữ `httpOnly`, `sameSite: "lax"`, `secure` chỉ khi production, `path: "/"`.

`express-session` ghi thời điểm hết hạn vào cột `expire` của bảng `session`. Hết hạn thì request sau không còn `userId`, dù file cookie trên máy vẫn còn chuỗi cũ cho đến khi trình duyệt xóa nó.

### Bước 3. Helper `lib/api.ts`

File mới. `apiUrl` lấy từ `@/lib/projects`, không khai báo URL lần thứ hai.

Hàm đọc cookie:

```ts
function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") {
    return undefined;
  }
  const row = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${name}=`));
  if (!row) {
    return undefined;
  }
  return decodeURIComponent(row.slice(name.length + 1));
}
```

Hàm gửi:

```ts
export async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const method = (init.method ?? "GET").toUpperCase();
  const unsafe = method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
  if (unsafe) {
    const csrf = readCookie("csrf");
    if (csrf) {
      headers.set("X-CSRF-Token", csrf);
    }
  }
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${apiUrl}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
}
```

`document` chỉ có trên trình duyệt. Đừng import file này vào Server Component.

Lần `POST` đầu tiên có thể chưa có cookie `csrf` nếu trình duyệt chưa từng gọi API. Trang login, khi mở, gọi `apiFetch("/auth/me")` trước. Response 401 vẫn kèm `Set-Cookie` nếu CSRF middleware tạo cookie. `credentials: "include"` khiến trình duyệt giữ cookie đó. Lần bấm Đăng nhập sau đó mới có header.

### Bước 4. Form `/login`

`app/login/page.tsx` giữ là server page, tiêu đề «Đăng nhập», render một Client Component, cùng kiểu `app/signup/page.tsx` đang render `SignupForm`.

Component form, ví dụ `app/login/login-form.tsx`, có `"use client"`. `useRouter` lấy từ `next/navigation`. Zod trên UI chỉ để báo trống email hoặc mật khẩu, không thay Zod của API. `preventDefault` là việc đầu tiên trong submit, nếu không mật khẩu lọt ra query string. Bài học này đã gặp ở form đăng ký.

Submit gọi:

```ts
const response = await apiFetch("/auth/login", {
  method: "POST",
  body: JSON.stringify({ email, password }),
});
```

401: hiện `error` từ JSON, ở lại `/login`. 429: hiện câu rate limit. 200: `router.push("/account")`. Không `localStorage.setItem` cho mật khẩu, email, hay role.

Có link `Đăng ký` tới `/signup`, và link hoặc nút sẽ làm ở bước 6 cho khách.

### Bước 5. Trang `/account`

`app/account/page.tsx` render Client Component. Lúc mount, `apiFetch("/auth/me")`. 401 thì `router.replace("/login")`. 200 thì hiện `name`, `email`, `role`. Nút Đăng xuất gọi `apiFetch("/auth/logout", { method: "POST" })`. 204 thì về `/login`.

Đây là trang bảo vệ tạm. Ngày 12 mới có `/admin`.

### Bước 6. Form đăng ký dùng helper

Trong `app/signup/signup-form.tsx`, thay `fetch(\`${apiUrl}/auth/register\`, ...)` bằng `apiFetch("/auth/register", ...)`. Xóa header `Content-Type` viết tay nếu helper đã gắn khi có body. Giữ Zod, thông báo lỗi, và `router.replace("/login")` như hiện tại.

Không có bước này thì đăng ký trên trình duyệt tiếp tục 403, dù login mới đã gửi CSRF.

### Bước 7. Ba trạng thái và hết hạn

Chạy `npm run dev:fe` và `npm run dev:api`.

Trạng thái 1 và 2 bấm trên trình duyệt. DevTools, mục Network: login request có `Cookie` và `X-CSRF-Token`. DevTools, mục Application, cookie của `localhost`: `sid` có HttpOnly, `csrf` không có. Console gõ `document.cookie` thấy `csrf`, không thấy `sid`.

Trạng thái 3, trong Neon, tìm dòng session vừa login và chạy:

```sql
UPDATE session
SET expire = now() - interval '1 minute'
WHERE sid = '<sid của phiên vừa đăng nhập>';
```

Chỉ sửa dòng đó. Không đổi `maxAge` trong code. F5 `/account` phải về `/login`. Đăng nhập lại để có phiên 7 ngày. Ghi `maxAge` 7 ngày vào mục 14.

Typecheck API: `npm run typecheck` trong `apps/api`.

## Cách đọc mục 6–9

Quy ước: [README.md](README.md#cách-đọc-mục-69).

---

## 6. Việc cần làm (phân công học)

**Bạn:** làm đủ ba trạng thái và ghi kết quả. UI không có câu riêng cho sai email và sai mật khẩu.

### Task checklist — mục 6

- [x] Ba trạng thái đã tự thử và ghi note.

---

## 7. Frontend (Next.js)

`app/login/page.tsx`, `app/login/login-form.tsx`, `app/account/page.tsx`, `lib/api.ts`. Form signup chuyển sang helper.

### Task checklist — Frontend

- [x] Form login, link signup, nút logout.
- [x] F5 `/account` sau login vẫn hiện user, nhờ `GET /auth/me`.
- [x] 429 hiện được trên form.
- [x] Không lưu role hay mật khẩu vào `localStorage`.
- [x] Đăng ký trên trình duyệt không còn 403 CSRF.

---

## 8. Backend (Express API)

`GET /auth/me` trả `{ id, email, name, role }` hoặc 401. `cookie.maxAge` là 7 ngày.

### Task checklist — Backend

- [x] `/auth/me` không trả hash.
- [x] Không session → 401.
- [x] Typecheck pass.

---

## 9. PostgreSQL

`SELECT` user theo id trong session. Hết hạn thử bằng `UPDATE session SET expire`, không bằng cách commit `maxAge` ngắn.

### Task checklist — PostgreSQL

- [x] Sau khi `expire` ở quá khứ, request sau không còn user.

---

## 10. Kiểm tra

### Task checklist — Kiểm tra tổng

- [x] Ba trạng thái mục 5 đạt.
- [x] Mục 14 ghi `maxAge` 7 ngày và các field của `/auth/me`.
- [x] Logout thiếu CSRF thì 403. Logout qua nút trên `/account` thì về `/login`.

## 11. Checklist tổng

- [x] Mục 6–10 đạt.

## 12. Câu hỏi ôn

1. Tải lại trang vẫn đăng nhập nhờ cookie hay nhờ state React?
2. Vì sao không lưu role vào `localStorage`?
3. Server đã hết session nhưng file cookie vẫn còn trong trình duyệt. Request sau đi tới đâu?

## 13. Lỗi hay gặp

- Quên `credentials: "include"` nên F5 mất đăng nhập.
- Gọi `/auth/me` từ Server Component và tưởng cookie tự đi theo.
- Commit `maxAge` 30 giây.
- 401 của `/auth/me` bị trang project nuốt thành trang lỗi danh sách project. `/account` xử lý 401 bằng cách về `/login`.

## 14. Báo cáo hoàn thành

Review mentor: lần 4, 2026-11-04. **Đạt đủ.**

- `session({ cookie })` có `maxAge` 7 ngày. `Set-Cookie` của `sid` hết hạn sau 7.00 ngày. Cột `session.expire` của phiên thử cũng còn 7.00 ngày. `GET /auth/me` không session thì `return` ngay, 401 `Chưa đăng nhập`, log API không còn `22P02`. Không có dòng user thì `findUserById` trả thất bại và route hủy session.
- Trình duyệt lần 3: sai mật khẩu ở `/login` với câu 401 chung; đúng mật khẩu sang `/account`; F5 vẫn thấy user; `expire` quá khứ thì về `/login`; Logout về `/login`; đăng ký không 403. Lần 4: sau 5 lần sai, form hiện `Bạn thử đăng nhập quá nhiều lần. Đợi một lát rồi thử lại.` `npm run typecheck` trong `apps/api` thoát 0.
- Chưa xong:
- `maxAge` / response `/auth/me`: `sid` 7 ngày. 200 gồm `id`, `email`, `name`, `role`, không `password_hash`.
- Ôn 1: nhờ cookie. F5 xóa state React; trình duyệt vẫn gửi `sid`; `GET /auth/me` đọc `userId` trong session.
- Ôn 2: không lưu role vào `localStorage` vì script trên trang đọc và sửa được. Role lấy bằng `SELECT` theo `userId`.
- Ôn 3: cookie cũ vẫn được gửi; store hết hạn thì không còn `userId`. `/auth/me` trả 401, `/account` về `/login`. Session mới nếu được ghi là session khách, không có `userId`.

## 15. Ngày kế

Ngày 7: 401 và 403, middleware role, script tạo admin. Script chưa chạy lên database chính nếu bạn chưa xác nhận.
