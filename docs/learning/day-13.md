# Ngày 13 — Ghi một lượt xem

Hôm nay đếm người mở trang public. Cùng một trình duyệt, cùng một trang, trong cùng một ngày thì chỉ tính một lần. Admin không bị đếm. Khu `/admin` không bị đếm.

Bạn tự viết code. Cursor giải thích và review. Cursor không điền file hộ, trừ khi bạn nói «hãy code» hoặc chỉ đúng một lỗi.

Bạn đã có sẵn ba mảnh, đừng tạo lại:

- `apps/api/db/migrations/004_add_page_views.sql` đã có bảng.
- `apps/api/src/server.ts` đã gắn `/analytics`.
- `apps/api/src/routes/analytics.ts` đã nhận `path`. Phần còn lại của handler đang trống.

## 1. Mục tiêu

Xong ngày này thì mở trang chủ bằng cửa sổ ẩn danh sẽ thêm đúng một dòng vào `page_views`. Tải lại cùng ngày không thêm dòng. Admin mở trang public không thêm dòng. Mở `/admin` hoặc một slug chưa published không thêm dòng.

## 2. Kiến thức nền

Đọc hết phần này trước khi gõ.

**Một lượt xem** là một bộ ba: trang nào, trình duyệt nào, ngày nào. Không phải «một người». Hai trình duyệt là hai lượt. Cùng trình duyệt ngày mai là lượt mới.

`**path**` là đường dẫn trang, ví dụ `/` hoặc `/projects/next-notes`. Khách chỉ được gửi mỗi thứ này. Khóa và ngày do server tự tính, vì nếu khách gửi thì họ có thể bịa.

`**viewer_key**` là tên riêng của trình duyệt trong bảng đếm. Không phải địa chỉ IP. Không có cột IP.

Có hai cách lấy tên đó:

- Đã đăng nhập, và không phải admin: lấy mã phiên `req.sessionID` (chuỗi trong cookie `sid`). Đăng nhập lại thì phiên mới, tên mới.
- Chưa đăng nhập: dùng cookie tên `vid`. Chưa có thì server tạo một chuỗi ngẫu nhiên 32 byte, ghi thành chữ hex, gửi cookie về. Cookie sống một năm, `httpOnly` (JavaScript trên trang không đọc được), `sameSite: "lax"`, `path: "/"`. `secure` chỉ bật khi production.

Không ghi thẳng `sessionID` hay `vid` vào bảng. Hai chuỗi đó là vé đăng nhập và vé khách. Bảng đếm chỉ cần một tên ổn định, không cần giữ vé. **SHA-256** biến một chuỗi thành 64 ký tự hex. Cùng đầu vào thì cùng kết quả. Từ kết quả không suy ngược ra vé. Node có sẵn `createHash("sha256")` trong module `crypto`.

**Ngày** lấy bằng `new Date().toISOString().slice(0, 10)`. `toISOString()` ra giờ UTC, mười ký tự đầu là `YYYY-MM-DD`. Khoảng 7 giờ sáng ở Việt Nam đã sang ngày UTC mới. Test trong một buổi thì chưa chạm biên này. Khi báo cáo, ghi ngày UTC chứ không ghi giờ máy.

**UNIQUE (path, viewer_key, view_date)** nghĩa là database từ chối bộ ba đã có. `INSERT ... ON CONFLICT DO NOTHING` là câu ghi «thêm nếu chưa có, có rồi thì im». Không cần `SELECT` trước. Hai request tới cùng lúc cũng chỉ một dòng thắng. Không trả lỗi cho khách.

**204** là «xong, không có nội dung». Khách không được thấy số đếm. Số đếm là việc của trang admin ở Ngày 14.

**Bot** trong bài này chỉ là chuỗi trình duyệt tự khai. Header `User-Agent` của Googlebot có chữ `bot`. Đổi header thành chữ thường, thấy `bot`, `crawler`, hoặc `spider` thì trả 204 và không ghi. Đây là lọc thô: bot giấu chữ vẫn lọt, người dùng tình cờ có chữ đó cũng bị bỏ.

**CSRF**, nhắc lại cho đủ dùng hôm nay. Cookie `csrf` không giấu với JavaScript. Mọi `POST` phải gửi lại đúng giá trị đó trong header `X-CSRF-Token`. Middleware trong `server.ts` chạy trước route. Thiếu hoặc sai thì 403, handler của bạn không chạy. `GET` không bị cửa này.

**Rate limit** chặn một vòng lặp gọi liên tục. Route này cho 60 lần mỗi phút mỗi IP. Lần 61 trả 429 và không ghi. Login vẫn giữ giới hạn riêng của nó. Mẫu limiter đang nằm trong `apps/api/src/routes/auth.ts`, biến `loginLimiter`.

## 3. Luồng hoạt động

Ví dụ: bạn mở cửa sổ ẩn danh, vào `http://localhost:3000/`.

1. Trình duyệt hỏi Next trang chủ.
2. `app/page.tsx` chạy trên server Next, không chạy trong trình duyệt.
3. Server Next gửi `POST http://localhost:4000/analytics/page-view` với body `{ "path": "/" }`.
4. Express gặp middleware CSRF trước. Có header khớp cookie thì đi tiếp.
5. Handler nhìn `User-Agent`, nhìn `path`, nhìn session. Khách ẩn danh không có `userId`.
6. Chưa có cookie `vid` thì tạo, băm thành `viewer_key`, ngày UTC là hôm nay.
7. PostgreSQL chạy `INSERT`. Chưa có bộ ba thì thêm một dòng.
8. API trả 204.
9. Next vẫn render trang chủ. Nếu bước 3 lỗi mạng, trang vẫn hiện. Mất một lượt còn hơn làm hỏng trang.

Bạn bấm tải lại. Các bước giống vậy, nhưng `INSERT` gặp bộ ba đã có nên không thêm dòng. Vẫn 204.

Admin đăng nhập rồi mở `/projects`. Handler đọc `userId`, hỏi `role`, thấy `admin`, trả 204 trước khi tính khóa. Bảng không đổi.

Khách gõ `/admin` trên trình duyệt thì trang admin của Next mở. Route đếm không được gọi từ layout. Nếu ai đó tự `POST` với `path: "/admin"`, API trả 400 và không ghi.

## 4. Phân tích thiết kế

Một cột `view_count` trên `projects` chỉ có một số. Nó không biết ngày, không biết trình duyệt vừa tải lại, và không bỏ được admin. Bảng riêng nhớ từng lượt. Ngày 14 mới cộng trong một khoảng ngày.

Chỉ trang public được đếm: `/`, `/projects`, và `/projects/<slug>` khi slug đang published. `findProjectBySlug` trong `apps/api/src/projects.ts` đã lọc `status = 'published'`. Không thấy dòng thì slug đó là draft hoặc không có. Không ghi.

Không gọi hàm ghi trong `app/layout.tsx`. Layout bọc cả `/admin`, mọi trang admin sẽ bị đếm. Không gọi trong `generateMetadata`. Next có thể chạy metadata một lần nữa, cạnh page. Unique có thể nuốt lần trùng, nhưng chỗ gọi sai thì sau này một path lạ cũng bị đếm.

Cookie là phần khó, tách riêng ở task 4. Khi bạn tự gọi API bằng terminal, `Set-Cookie` về đúng client đó. Khi server Next gọi hộ, response của API về process Next, không về trình duyệt. Lần đầu khách chưa có `vid` thì Next phải tự tạo `vid`, gắn vào header `Cookie` của `fetch`, và `cookieStore.set` để trình duyệt giữ cho lần tải lại. Làm API xong và đếm được bằng terminal trước. Rồi mới nối trang Next.

## 5. Hướng dẫn thực hành

Mỗi task có đầu vào, việc bạn làm, và đầu ra. Làm lần lượt. Dừng ở cuối task 2 để tự gọi API trước khi đụng Next.

### Task 1. Bảng đã có, chỉ áp dụng

Đầu vào: file `apps/api/db/migrations/004_add_page_views.sql` đã đúng cột `path`, `viewer_key`, `view_date` và unique ba cột đó.

Việc làm: trong thư mục `apps/api` chạy `npm run db:migrate`.

Đầu ra: lệnh thoát 0. Bảng `page_views` có trên database. Không `DROP`, không seed.

### Task 2. Viết nốt handler

Đầu vào: `apps/api/src/routes/analytics.ts`. Zod đã nhận `path` dài từ 1 đến 200.

Việc làm: bạn viết tiếp trong file này. Thứ tự dừng sớm:

1. `User-Agent` chữ thường có `bot`, `crawler`, hoặc `spider` → 204, dừng.
2. `path` là `/` hoặc `/projects` → được ghi.
3. `path` bắt đầu bằng `/projects/` và phần sau là một đoạn slug → `findProjectBySlug`. Không có project → 204, dừng.
4. Mọi `path` còn lại → 400 `{ "error": "Path không được ghi" }`.
5. Có `req.session.userId` → `SELECT role FROM users WHERE id = $1`. Role `admin` → 204, dừng.
6. Không phải admin và có session → khóa là SHA-256 hex của `req.sessionID`.
7. Không có session → đọc `req.cookies.vid`. Thiếu thì `randomBytes(32).toString("hex")`, `res.cookie("vid", value, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 })`, rồi băm giá trị đó.
8. Ngày là `new Date().toISOString().slice(0, 10)`.
9. Ghi một dòng. Trùng thì bỏ qua. Cả hai trường hợp trả 204, không gửi JSON.

```sql
INSERT INTO page_views (path, viewer_key, view_date)
VALUES ($1, $2, $3::date)
ON CONFLICT (path, viewer_key, view_date) DO NOTHING
```

Gắn limiter 60 lần mỗi phút lên đúng route này, cùng kiểu `loginLimiter` nhưng `windowMs` là một phút và `limit` là 60. Vượt ngưỡng thì 429, không ghi.

Đầu ra: `cd apps/api && npm run typecheck` thoát 0. Gọi thử ở phần 7, task API, trước khi sửa trang Next.

### Task 3. Hai trang public gọi API

Chỉ bắt đầu sau khi task 2 đếm đúng bằng một request trực tiếp.

Đầu vào: `app/page.tsx` và `app/projects/[slug]/page.tsx`.

Việc làm: sau khi biết trang sẽ render (ở trang chi tiết là sau khi đã có project published), gọi:

```ts
await fetch(`${apiUrl}/analytics/page-view`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    cookie: cookieHeader,
    ...(csrf ? { "X-CSRF-Token": csrf } : {}),
  },
  body: JSON.stringify({ path }),
  cache: "no-store",
});
```

`cookies` lấy từ `next/headers`. Trong repo này hàm đó là async: `const cookieStore = await cookies()`. `cookieHeader` là `cookieStore.toString()`. `csrf` là `cookieStore.get("csrf")?.value`. Path trang chủ là `"/"`. Path chi tiết là `/projects/${slug}`. Bọc `try/catch`. Lỗi thì không làm gì, hàm page vẫn return JSX.

Không thêm lời gọi trong `generateMetadata`. Không thêm trong `app/layout.tsx`.

Đầu ra: mở trang chủ và một trang project published thì bảng tăng. Mở trang admin thì bảng không tăng.

### Task 4. Cookie lần đầu, làm riêng

Đầu vào: task 3 gọi được khi trình duyệt đã có cookie `csrf` từ một lần mở API trước đó. Lần đầu cửa sổ ẩn danh thường chưa có.

Việc làm, chỉ trong hàm ghi view phía Next:

- Chưa có `vid`: tự tạo 32 byte hex, thêm vào header `Cookie` gửi sang API, và `cookieStore.set("vid", value, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 })`.
- Chưa có `csrf`: `GET ${apiUrl}/projects` không cần body. Đọc `Set-Cookie`, lấy giá trị `csrf`, gửi header `X-CSRF-Token` cho `POST`, và `cookieStore.set("csrf", value, { httpOnly: false, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" })`.

API thấy request đã có `vid` thì không tạo cookie `vid` khác.

Đầu ra: cửa sổ ẩn danh mở `/` lần đầu thêm một dòng. Tải lại không thêm dòng.

## 6. Giải thích code

`createHash("sha256").update(raw).digest("hex")` lấy vé (`sessionID` hoặc `vid`) và trả về tên ghi vào cột `viewer_key`. `raw` không được đưa vào câu `INSERT`.

`ON CONFLICT DO NOTHING` dựa vào unique đã khai trong migration. Thiếu đúng bộ cột trong unique thì Postgres báo lỗi chứ không im lặng.

`findProjectBySlug` trả về rỗng với draft. Vì vậy handler không cần một câu SQL mới để «cấm draft». Không có project là 204.

204 và 400 khác nhau. 204 là «đã hiểu, cố ý không ghi» (bot, admin, draft, hoặc ghi xong). 400 là «path này không thuộc danh sách được đếm». Khách mở `/login` bằng trình duyệt không gọi API. 400 dành cho request tự gửi path lạ.

Limiter đứng trước handler, giống `authRouter.post("/login", loginLimiter, ...)`. Request bị 429 không tới chỗ `INSERT`.

## 7. Kiểm thử

Chạy API (`npm run dev:api`) và, từ task 3, cả web (`npm run dev:fe`).

Đếm trước mỗi case:

```sql
SELECT count(*) FROM page_views;
```

Ghi số. Làm một case. Đếm lại. Hiệu là cột «dòng mới».

| Việc làm | Dòng mới | Nếu sai thì nhìn đâu |
| --- | --- | --- |
| Khách, chưa đăng nhập, `POST` path `/` một lần | 1 | 403: thiếu header CSRF. 500: bảng chưa migrate, hoặc `INSERT` lỗi cột. |
| Gửi lại đúng path, đúng cookie `vid` hoặc cùng phiên, cùng ngày | 0 | Tăng thêm: khóa đổi mỗi request, thường vì tạo `vid` mới dù cookie đã có. |
| Đăng nhập admin, rồi mở hoặc `POST` path `/projects` | 0 | Tăng thêm: quên `SELECT role`, hoặc chưa đăng nhập nên bị tính là khách. |
| `POST` path `/admin` | 0, và HTTP 400 | 204 mà vẫn không có dòng: lỡ xếp `/admin` vào nhóm «bỏ qua im lặng». Bài này muốn 400. |
| `POST` path `/projects/slug-draft` hoặc slug không có | 0, và HTTP 204 | Có dòng: đang ghi trước khi gọi `findProjectBySlug`. |

Bot: gửi header `User-Agent: Googlebot` cùng path `/`. Kỳ vọng 204 và số dòng không đổi.

Typecheck: `cd apps/api && npm run typecheck`, thoát 0.

Nhìn schema: không có cột IP. `viewer_key` dài 64 ký tự hex, không phải chuỗi cookie thô.

## 8. Bài tập

Tự trả lời trước khi gửi review. Viết vào phần 10.

1. Vì sao không thêm một cột số trên bảng `projects`?
2. Unique đã chặn ghi trùng. Vì sao vẫn không gọi hàm ghi từ `generateMetadata`?
3. `viewer_key` của khách đổi khi nào?

## 9. Checklist

- [x] Đọc xong phần 2 trước khi viết handler.
- [x] `db:migrate` đã áp dụng bảng.
- [x] F5 cùng ngày không thêm dòng.
- [x] Admin xem trang public không thêm dòng.
- [x] `/admin` và path lạ không thêm dòng. Path lạ trả 400.
- [x] Slug draft hoặc slug không có không thêm dòng.
- [x] `generateMetadata` và `app/layout.tsx` không gọi ghi.
- [x] Typecheck `apps/api` thoát 0.
- [x] Ba câu phần 8 đã có câu trả lời của bạn.

## 10. Báo cáo

Review mentor: lần 12, 2026-11-13. **Đạt.** Khách ghi một dòng mỗi path mỗi ngày. Gửi lại cùng cookie thì không thêm. Admin không ghi.

- Khách, `POST /page-view`: `/`, `/projects`, `/projects/next-notes` mỗi path thêm 1, lần hai thêm 0. Khóa dài 64, hex. Cookie `vid` HttpOnly `path=/`, `csrf` không HttpOnly `path=/`.
- Draft `day11-rev-draft` và slug không có: **204**, không dòng. Path `/admin`: không dòng. Trang draft mở trên trình duyệt **404**, không gọi `POST /page-view`.
- Admin đăng nhập rồi `POST` path `/`: **204**, không dòng. Trình duyệt đang là admin mở `/`, `/projects`, `/projects/next-notes`: trang **200**, bảng không tăng.
- `page_views` sau review: `/` = 5, `/projects` = 3, `/projects/next-notes` = 2.
