# Status & context

Cập nhật: 2026-11-26

## Tiếp tục chat mới — đọc trước

1. Kiến trúc: `docs/architecture.md`
2. Lịch Phase 1: `ROADMAP.md`
3. Bài học: `docs/learning/README.md` → ngày hiện tại
4. **Tiến độ:** Ngày 1–15 **đạt** (Ngày 15 lần 6, 2026-11-25). Lint 0, typecheck 0, build Next 0, `build:api` 0. Output nằm trong `apps/api/dist`. Phase 1 đóng. 2026-11-26 nhánh Google cùng email đạt theo đọc code, không signup mới.
5. **Cách làm với mentor:** user tự code. «Bắt đầu Ngày N» = giảng theo `docs/learning/day-0N.md` (vấn đề, luồng, file, cách kiểm tra), không viết code. Giải thích khi được hỏi. Cuối bài review (tick checklist, mục 14, «Chưa xong»). Chỉ viết code khi user nói rõ «hãy code» hoặc bảo sửa một lỗi cụ thể. Khi review, mỗi lần một câu ôn rồi chờ trả lời.
6. **Ngày 6 đạt đủ** (2026-11-04, lần 4). Cookie `sid` `maxAge` 7 ngày, `session.expire` khớp 7 ngày. `GET /auth/me` không session thì `return` 401. Form hiện câu 429. Câu ôn 1–3 đã chốt. Login đúng mật khẩu từ localhost đang bị limiter 5 lần / 15 phút cho đến khi hết cửa sổ hoặc restart `npm run dev:api`.

## Status

Portfolio + API đọc PostgreSQL (Neon). Public chỉ trả project `status = 'published'`.

- FE: Next.js 16.3.6 App Router, React 19, TS, Tailwind 4, UI tiếng Việt.
- BE: Express 5 trong `apps/api`, `pg`, cổng 4000.
- DB: Neon `fullstack-project` (Singapore, PG 18). `DATABASE_URL` trong `apps/api/.env` (gitignored). Host pooled, `sslmode=verify-full`.
- Auth: register, login, logout, `GET /auth/me` đã khép. Login đúng mật khẩu **200 body rỗng**, rồi `regenerate` và ghi `userId`. Cookie `sid` `maxAge` 7 ngày. `GET /auth/me` trả `id`, `email`, `name`, `role` (không hash), không session thì 401 và `return`. Email lạ và mật khẩu sai cùng **401** `Email hoặc mật khẩu không đúng`. Logout **204**, `destroy` rồi `clearCookie("sid")`. Rate limit login: 5 lần / 15 phút, `skipSuccessfulRequests: true`. CSRF: cookie `csrf` không HttpOnly, `sid` HttpOnly, `SameSite=Lax`, `Secure` chỉ production. Admin: `GET /admin/whoami` không cookie 401, user thường 403, admin 204. Script `admin:create` đã chạy trên Neon `fullstack-project`: không nâng user, tạo `day7.admin.1@example.com`, chạy lại thoát 0. Google: hủy và state sai đều 302 về `/login`. Lần Google thứ hai lúc 13:47 không thêm user. `users` 23, `oauth_accounts` 1. 2026-11-26 nhánh email đã có mật khẩu đạt theo đọc code, không signup mới. Analytics: Ngày 13 đạt. `POST /analytics/page-view` ghi một dòng mỗi path, mỗi khách, mỗi ngày UTC. Admin không ghi.
- Repo: [hoamiz/fullstack-project](https://github.com/hoamiz/fullstack-project) `main`. Working tree có thể có file docs chưa commit.

Route: `/`, `/projects`, `/projects/[slug]` (+ `not-found`, `error.tsx`), `/signup`, `/login` (có form), `/account` (client, chưa đăng nhập thì về `/login`). Slug mẫu: `next-notes`, `ui-lab`, `api-sketch`.

## Dữ liệu & API

- `projects`: có cột `status` (`draft`|`published`), migration `apps/api/db/migrations/001_add_project_status.sql`, bảng `schema_migrations`.
- Public SQL trong `apps/api/src/projects.ts`: `WHERE status = 'published'` (list + detail).
- FE: `lib/projects.ts` fetch API; 404 → `notFound()`. Không đổi contract JSON Ngày 1.
- Bảng `users` (migration `002_add_user.sql`). Review Ngày 3 có 10 dòng. Ngày 5 thêm `day5.*`. Review Ngày 6 thêm `day6.review.*`, `day6.ui.*`, `day6.signup.ui@example.com`. Review Ngày 7 thêm `day7.review.1@example.com` (`role = user`, whoami 403) và `day7.admin.1@example.com` (`role = admin`, whoami 204). Script không nâng email user. Không giả định count. Không chạy lại `db:setup`/seed (`ON CONFLICT DO UPDATE` ghi đè). Dùng `npm run db:migrate`. Không `SELECT` email kèm hash nếu chưa được user chấp nhận.
- CORS: `apps/api/src/server.ts`, origin `http://localhost:3000`, `credentials: true`. Package `cors` nằm trong `apps/api`.

## Phase 1 đã chốt, phần còn lại

- Session PostgreSQL, cookie và CSRF đã code ở Ngày 4–5. CORS credentials đã bật từ Ngày 3. UI login, admin, Google OIDC, analytics đã có ở Ngày 6–14.
- Argon2id và Zod FE+BE đã có ở đăng ký. Google OIDC đã có redirect, PKCE, `state`, callback đổi code. Ngày 9 đạt.
- Admin: tạo project tối thiểu + publish/hide; script local tạo admin; không API nâng quyền.
- Neon branch test: chỉ khi user xác nhận từng lần.

## Học tập

- 15 bài: `docs/learning/day-01.md` … `day-15.md`. Ngày 5–15 có «Hướng dẫn làm». Ngày 1–15 đạt. Phase 1 đóng. Nhánh Google cùng email đạt theo đọc code ngày 2026-11-26.
- Ngày 1 khép: migration status, API lọc published, HTTP draft `ui-lab` → 404 rồi restore → 200; câu hỏi ôn đạt; «Chưa xong» trống.
- Ngày 2 khép: `POST /auth/register`, Argon2id, bảng `users`. Câu hỏi ôn đạt. «Chưa xong» trống.
- Ngày 3 khép: trang `/signup`, CORS, 409 không tăng `users`. Câu hỏi ôn đạt. «Chưa xong» trống.
- Ngày 4 khép: session PostgreSQL, cookie `sid` HttpOnly, cookie `csrf` không HttpOnly, CSRF 403/204. Câu hỏi ôn đạt. «Chưa xong» trống.
- Ngày 5 khép: login 200 ghi `userId`, logout 204, 401 chung, rate limit 5 lần / 15 phút. Câu hỏi ôn đạt. «Chưa xong» trống.
- Ngày 6 khép: `/login`, `/account`, `GET /auth/me`, cookie `sid` 7 ngày, 429 trên form. Câu hỏi ôn đạt. «Chưa xong» trống.
- Ngày 7 khép: 401/403/204 trên `GET /admin/whoami`. Script admin trên Neon, không nâng user, chạy lại thoát 0. Câu hỏi ôn đạt. «Chưa xong» trống.
- Ngày 8 khép: redirect Google, PKCE, `state` 400/501, nút `/login`. Chưa đổi code. Câu hỏi ôn đạt. «Chưa xong» trống.

## Lệnh

```bash
npm run dev:fe      # :3000
npm run dev:api     # :4000
npm run db:migrate  # migration chưa áp dụng
npm run db:setup    # chỉ môi trường trống (tránh khi đã có data)
npm run lint
npm run build
cd apps/api && npm run typecheck
```

## Thay đổi gần đây

- 2026-11-26: Review nhánh Google cùng email bằng code. Có email thì chỉ `INSERT oauth_accounts`. Không signup mới. `docs/learning/day-09.md`, `docs/learning/day-15.md`, `CONTEXT.md`.
- 2026-11-26: Bỏ qua nhánh Google cùng email đã có mật khẩu. Không thử tay, không đánh dấu đạt. Phase 1 đóng. `docs/learning/day-15.md`, `CONTEXT.md`.
- 2026-11-25: Ngày 15 đạt, lần 6. `build:api` thoát 0. 15 file `.js` trong `apps/api/dist`, `src` không còn `.js`. Phase 1 chưa đóng vì Google cùng email chưa thử tay. `docs/learning/day-15.md`, `CONTEXT.md`.
- 2026-11-25: Review Ngày 15 lần 5, chưa đạt. `rootDir` và `outDir` ngoài `compilerOptions`. `tsc --showConfig` không thấy hai key đó. `docs/learning/day-15.md`, `CONTEXT.md`.
- 2026-11-25: Review Ngày 15 lần 4, chưa đạt. `build:api` thoát 0. 15 file `.js` nằm trong `apps/api/src`. `docs/learning/day-15.md`, `CONTEXT.md`.
- 2026-11-25: Ngày 15 đạt, lần 3. Lint 0, typecheck 0, build 0. Phase 1 chưa đóng vì Google cùng email chưa thử tay. `docs/learning/day-15.md`, `CONTEXT.md`.
- 2026-11-25: Review Ngày 15 lần 2, chưa đạt. Lint 0. `getAdminProject(req, res, next)` không khớp chữ ký. `docs/learning/day-15.md`, `CONTEXT.md`.
- 2026-11-25: Ngày 15 câu ôn 1–3 chốt. Lint vẫn thoát 1. `docs/learning/day-15.md`, `CONTEXT.md`.
- 2026-11-25: Review Ngày 15 lần 1, chưa đạt. Lint 1, typecheck 0, build 0, `build:api` thiếu script. `docs/learning/day-15.md`, `CONTEXT.md`.
- 2026-11-25: Ngày 14 câu ôn 1–3 chốt. Reset giữ lịch sử. Admin mở trang public không tăng dashboard. `docs/learning/day-14.md`, `CONTEXT.md`.
- 2026-11-23: Ngày 14 đạt, lần 5. Hộp thoại nói số về 0 và view cũ vẫn còn. `docs/learning/day-14.md`, `CONTEXT.md`.
- 2026-11-23: Review Ngày 14 lần 4, chưa đạt. UI đủ tổng, bảng ngày, project. Câu xác nhận thiếu phần view cũ vẫn còn. `docs/learning/day-14.md`, `CONTEXT.md`.
- 2026-11-23: Review Ngày 14 lần 3, chưa đạt. UI có tổng và project. Thiếu bảng theo ngày và câu xác nhận. `docs/learning/day-14.md`, `CONTEXT.md`.
- 2026-11-23: Review Ngày 14 lần 2, chưa đạt. API reset đúng. UI giấu tổng khi bằng 0 và chưa vẽ project. `docs/learning/day-14.md`, `CONTEXT.md`.
- 2026-11-23: Review Ngày 14 lần 1, chưa đạt. Chưa có period thì GET ném lỗi. Reset dùng nhiều lệnh trong một `pool.query`. `docs/learning/day-14.md`, `CONTEXT.md`.
- 2026-11-13: Ngày 13 đạt, lần 12. Khách ghi một lần, admin không ghi. `docs/learning/day-13.md`, `CONTEXT.md`.
- 2026-11-13: Review Ngày 13 lần 11, chưa đạt. Cookie đủ, thiếu header `X-CSRF-Token`. `docs/learning/day-13.md`, `CONTEXT.md`.
- 2026-11-13: Review Ngày 13 lần 10, chưa đạt. JSX đã gắn recorder. Route vẫn gửi `Cookie` chỉ có `vid`. `docs/learning/day-13.md`, `CONTEXT.md`.
- 2026-11-13: Review Ngày 13 lần 9, chưa đạt. Route 204, API 403 vì `Cookie` chỉ có `vid`. `docs/learning/day-13.md`, `CONTEXT.md`.
- 2026-11-13: Review Ngày 13 lần 8, chưa đạt. `route.ts` không có `POST`, trang gọi component như hàm. `docs/learning/day-13.md`, `CONTEXT.md`.
- 2026-11-13: Review Ngày 13 lần 7, chưa đạt. `cookies().set` trong Server Component bị Next 16 chặn. `docs/learning/day-13.md`, `CONTEXT.md`.
- 2026-11-13: Review Ngày 13 lần 6, chưa đạt. Trang gọi đúng API. Lần đầu thiếu cookie nên không ghi ổn định. `docs/learning/day-13.md`, `CONTEXT.md`.
- 2026-11-11: Ngày 11 đạt. Mục 6: slug chữ thường, số, gạch ngang ở giữa. Admin từ `admin:create` đã chạy Ngày 7. `docs/learning/day-11.md`, `CONTEXT.md`.
- 2026-11-10: Ngày 10 đạt. Câu ôn 1–3 đúng. Nút khách về `/` và không xóa session. `users` 23. `docs/learning/day-10.md`, `CONTEXT.md`.
- 2026-11-10: Review Ngày 9 lần 4, chưa đạt. Hủy Google 302 và `/auth/me` 401. `users` 22, `oauth_accounts` 1, hash null. Câu ôn 1–2 đạt, câu 3 chưa. `docs/learning/day-09.md`, `CONTEXT.md`.
- 2026-11-10: Review Ngày 9 lần 3, chưa đạt. Form hiện đúng hai câu tiếng Việt. Callback hủy và state sai vẫn trả JSON. `docs/learning/day-09.md`, `CONTEXT.md`.
- 2026-11-10: Review Ngày 9 lần 2, chưa đạt. `RETURNING user_id` đúng. Hủy Google gửi JSON trước redirect, không có `Location`. State sai chỉ JSON 400. Trang login hiện `google_cancelled`. `docs/learning/day-09.md`, `CONTEXT.md`.
- 2026-11-10: Review Ngày 9 lần 1, chưa đạt. `oauth_accounts` đã migrate, 0 dòng. Hủy Google 302. State sai gửi thêm JSON. `addOAuthAccount` trả id không có vì thiếu `RETURNING`. Login đọc sai query `error`. `docs/learning/day-09.md`, `CONTEXT.md`.
- 2026-11-09: Ngày 8 đạt đủ. Providers `{"google":true}`, `/auth/google` 302 cổng 4000, không có verifier. Cache discovery ghi `Promise.resolve(conf)`. Lỗi thì `config = null`. `docs/learning/day-08.md`, `CONTEXT.md`.
- 2026-11-09: Review Ngày 8 lần 3, chưa đạt. Đủ env nhưng providers `{"google":false}` và `/auth/google` 503. `.then((config) => config = config)` không lưu kết quả discovery. `docs/learning/day-08.md`, `CONTEXT.md`.
- 2026-11-09: Review Ngày 8 lần 2, chưa đạt. Nút Google tới trang Google. Thiếu env: providers `false`, `/auth/google` 503, login mật khẩu 200. `users` 21 trước và sau state sai. Cache discovery chưa xóa khi lỗi. `docs/learning/day-08.md`, `CONTEXT.md`.
- 2026-11-09: Review Ngày 8 lần 1, chưa đạt. Redirect Google 302, callback 400/501. `/auth/providers` không `res.json`, `/login` không có nút. `docs/learning/day-08.md`, `CONTEXT.md`.
- 2026-11-09: Ngày 7 đạt đủ. Neon `users`: user thường không bị nâng quyền; `day7.admin.1@example.com` login 200 và `GET /admin/whoami` 204; chạy lại script thoát 0, login vẫn 200. `docs/learning/day-07.md`, `CONTEXT.md`.
- 2026-11-09: Review Ngày 7 lần 7, chưa đạt. Terminal gán confirm một dòng riêng nên process con không thấy. `CONFIRM=yes` cùng URL giả, thiếu `ADMIN_*`, `ZodError` trước query. Chưa có 204. `docs/learning/day-07.md`, `CONTEXT.md`.
- 2026-11-09: Review Ngày 7 lần 6, chưa đạt. Email có khoảng trắng và chữ hoa thành `day7.admin@example.com`, rồi mới `SELECT` (thấy bằng `ECONNREFUSED` trên URL giả). Chưa chạy script lên Neon, chưa có 204. `docs/learning/day-07.md`, `CONTEXT.md`.
- 2026-11-09: Review Ngày 7 lần 5, chưa đạt. Mật khẩu `short` ra `ZodError`, không nối database. Email hoa thành chữ thường. Email có khoảng trắng vẫn «Email không hợp lệ» vì `email()` trước `trim()`. Chưa chạy script lên Neon. `docs/learning/day-07.md`, `CONTEXT.md`.
- 2026-11-09: Review Ngày 7 lần 4, chưa đạt. Ba nhánh script đúng thứ tự. Email chưa `trim`/`toLowerCase`. Mật khẩu `short` vẫn tới `SELECT` (`ECONNREFUSED` trên URL giả). Chưa chạy script lên Neon. `docs/learning/day-07.md`, `CONTEXT.md`.
- 2026-11-09: Review Ngày 7 lần 3, chưa đạt. Confirm thoát 1 trước database. `CONFIRM=yes` với `ADMIN_*` vẫn `ZodError` vì schema tìm `email`/`password`/`name`. Chưa chạy script lên Neon. `docs/learning/day-07.md`, `CONTEXT.md`.
- 2026-11-09: Review Ngày 7 lần 2, chưa đạt. Không cookie 401 đủ body. `day7.review.1@example.com` thì 403. Script vẫn `ZodError` trước câu confirm, chưa `INSERT`. `docs/learning/day-07.md`, `CONTEXT.md`.
- 2026-11-09: Review Ngày 7 lần 1, chưa đạt. `GET /admin/whoami` không cookie 401 body cụt (`requireUser` gọi `next()`). Có `userId` thì không `next()`. Script thiếu `INSERT`, parse nhầm key env, confirm không chạy trước. Chưa chạy script lên Neon. `docs/learning/day-07.md`, `CONTEXT.md`.
- 2026-11-04: Ngày 6 đạt đủ. `sid` 7 ngày, `GET /auth/me` có `return` sau 401, form hiện 429. Tiếp theo Ngày 7, chưa code. `docs/learning/day-06.md`, `CONTEXT.md`.
- 2026-11-04: Review Ngày 6 lần 3, chưa đạt. Ba trạng thái UI, logout và đăng ký trình duyệt đã chạy. `sid` chưa `maxAge` 7 ngày. `GET /auth/me` thiếu `return`. `docs/learning/day-06.md`, `CONTEXT.md`.
- 2026-11-04: Review Ngày 6 lần 2, chưa đạt. `/account` đã `"use client"`, 401 thì về `/login`. Form login 400 vì thiếu `Content-Type`. Login 200 body rỗng. `sid` chưa `maxAge`. `/auth/me` 200 có `id`, `email`, `name`, `role`. `docs/learning/day-06.md`, `CONTEXT.md`.
- 2026-11-04: Review Ngày 6 lần 1, chưa đạt. `/account` thiếu `"use client"`. `GET /auth/me` thiếu `return`. `maxAge` 7 ngày đang ở cookie `csrf`, cookie `sid` chưa có. Helper gắn `Content-Type` khi header đã có. Login form chờ `data.status`. Typecheck API thoát 0. `docs/learning/day-06.md`, `CONTEXT.md`.
- 2026-11-04: Lưu context sang chat mới. Ngày 1–5 đạt đủ. Ngày 6 chưa code. Signup trên trình duyệt vẫn 403. `CONTEXT.md`.
- 2026-10-28: Ngày 3 đạt đủ. `users` giữ 10 sau 409. Tiếp theo Ngày 4, chưa code. `docs/learning/day-03.md`.
- 2026-10-28: «Bắt đầu Ngày N» chỉ là hướng dẫn các bước, không code. Ngày 3 chưa bắt đầu. `CONTEXT.md`.
- 2026-10-28: Ngày 2 đạt đủ. Tiếp theo Ngày 3, chưa code. `docs/learning/day-02.md`.
- 2026-10-27: Chốt mentor chỉ review/đánh giá; user tự làm bài. Ngày 2 chưa bắt đầu. `CONTEXT.md`.
- 2026-10-27: Ngày 1 xong + review (HTTP draft). Format bài 2–15. `docs/architecture.md`.
- 2026-10-26: ROADMAP + 15 bài lý thuyết (bản đầu).
- 2026-09-28: API Express, nối Neon, FE fetch API.

Next.js bản này khác training data: trước khi sửa Next API, đọc `node_modules/next/dist/docs/`.
