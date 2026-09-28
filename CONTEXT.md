# Status & context

Cập nhật: 2026-09-28

## Status

Portfolio frontend để ôn Next.js App Router. `/projects` và `/projects/[slug]` là Server Component, `fetch` tới API Node (`API_URL` hoặc `http://localhost:4000`) với `cache: "no-store"`. Frontend cần API đang chạy. Danh sách có `<Suspense>` fallback trong page (không dùng `loading.tsx`, để slug lạ giữ HTTP 404). Slug lạ: API trả 404, trang gọi `notFound()`. API down: `app/projects/error.tsx`. API đọc project từ PostgreSQL qua `pg` (chỉ đọc, chưa auth hay CRUD). API cần `DATABASE_URL` trong `apps/api/.env`; thiếu thì không khởi động. Database lỗi: API trả 503 `{ "error": "Không đọc được database" }`. PostgreSQL 18 cho Windows không chạy được: Application Control (có thể là Smart App Control) chặn `plpgsql.dll`, nên `initdb` thất bại và không có service. Đã chọn dùng Postgres trên cloud (Neon); chưa có `DATABASE_URL`, nên chưa chạy thật với database.

Đang chạy được các route:

| Route | File | Việc làm |
| --- | --- | --- |
| `/` | `app/page.tsx` | Trang chủ, link sang danh sách |
| `/projects` | `app/projects/page.tsx` | Danh sách từ `GET /projects` |
| `/projects/[slug]` | `app/projects/[slug]/page.tsx` | Chi tiết từ `GET /projects/:slug` |
| slug không tồn tại | `app/projects/[slug]/not-found.tsx` | `notFound()` |

Ba slug hiện có: `next-notes`, `ui-lab`, `api-sketch`.

## Context

- Chủ dự án: Lê
- Ngôn ngữ UI: tiếng Việt (`<html lang="vi">`)
- Stack: Next.js 16.3.6, React 19.2.8, TypeScript, Tailwind CSS 4
- App Router. `params` trên trang dynamic là `Promise` và phải `await`
- Font: Geist qua `next/font` trong `app/layout.tsx`
- Metadata gốc: title mặc định `Lê — Portfolio`, template `%s · Lê`

### Dữ liệu

`lib/projects.ts` export type `Project` (`slug`, `title`, `summary`, `description`, `stack`, `year`), `getProjects()`, và `getProject(slug)`. Không còn mảng tĩnh trên frontend.

`components/project-card.tsx` render một card trong danh sách.

Bảng `projects` định nghĩa trong `apps/api/db/schema.sql`. Ba project mẫu nằm trong `apps/api/db/seed.sql` (`ON CONFLICT (slug) DO UPDATE`, chạy lại được). Truy vấn nằm trong `apps/api/src/projects.ts`, `Pool` trong `apps/api/src/db.ts`.

### Thay đổi

- 2026-09-28: Thêm `apps/api` — GET /projects và GET /projects/:slug. Frontend chưa gọi API. Chưa có PostgreSQL.
- 2026-09-28: `/projects` và `/projects/[slug]` lấy dữ liệu từ API qua `lib/projects.ts`. Đã kiểm tra: list/detail 200, slug lạ 404, lint pass. Chưa có PostgreSQL.
- 2026-09-28: Đã thử API tắt: `/projects` hiện `app/projects/error.tsx`; bật API lại, bấm "Thử lại" thì danh sách hiện lại, không cần tải lại trang.
- 2026-09-28: Thêm script gốc `dev:fe`, `dev:api`, `start:api` trong `package.json`. Chưa có lệnh chạy cả hai cùng lúc.
- 2026-09-28: API đọc từ PostgreSQL — `apps/api/db/*.sql`, `src/db.ts`, `npm run db:setup`, middleware lỗi 503. Đã kiểm tra: typecheck, thiếu `DATABASE_URL`, database tắt (503, API vẫn sống). Chưa kiểm tra với database thật và chưa so response với mốc cũ.

### Lệnh

```bash
npm run dev:fe     # frontend http://localhost:3000 (giống npm run dev)
npm run dev:api    # API http://localhost:4000, tự restart khi sửa
npm run start:api  # API không watch
npm run db:setup   # tạo bảng và seed 3 project (cần apps/api/.env)
npm run build
npm run lint
```

Next.js bản này khác training data. Trước khi sửa API, đọc guide trong `node_modules/next/dist/docs/`.
