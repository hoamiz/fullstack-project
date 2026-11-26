# Ngày 1 — Project published và draft

## 1. Mục tiêu

- Thêm `status` vào bảng `projects` mà không xóa 3 dòng hiện có.
- `GET /projects` và `GET /projects/:slug` chỉ trả project `published`.
- Slug tồn tại nhưng `draft` trả 404, giống slug không có.

## 2. Thời lượng

6 giờ: 1,5 giờ lý thuyết, 3 giờ làm và debug, 1,5 giờ kiểm tra và báo cáo.

## 3. Kiến thức cần có

Đã đọc `apps/api/db/schema.sql`, `apps/api/src/projects.ts` và `lib/projects.ts`. Biết `SELECT` có `$1` khác với ghép chuỗi SQL.

## 4. Lý thuyết

Bảng hiện tại không có chỗ ghi "được công khai hay chưa". API đang `SELECT` mọi dòng, nên thêm project nháp sẽ lộ ra trang public.

`status` là `text` với `CHECK (status IN ('draft', 'published'))`. `CHECK` để database từ chối giá trị khác, không chỉ dựa vào code. Default `published` để 3 dòng cũ, khi thêm cột, vẫn hiện trên trang.

Migration là file SQL chạy một lần, ghi vào bảng `schema_migrations`. `schema.sql` hiện dùng `CREATE TABLE IF NOT EXISTS`, chạy lại không thêm cột mới. Vì vậy Ngày 1 không sửa dữ liệu bằng cách chạy lại `db/seed.sql`: seed đang `ON CONFLICT DO UPDATE` và sẽ ghi đè title của 3 slug.

Ẩn project và xóa project là hai việc khác nhau. Draft còn trong database. Public không thấy nó, nên detail trả 404 để khỏi lộ là slug đó tồn tại.

## 5. Ví dụ

```sql
ALTER TABLE projects
  ADD COLUMN status text NOT NULL DEFAULT 'published'
  CHECK (status IN ('draft', 'published'));
```

```sql
SELECT slug, title, summary, description, stack, year
FROM projects
WHERE status = 'published'
ORDER BY id;
```

Detail thêm cùng điều kiện: `WHERE slug = $1 AND status = 'published'`. Không có dòng thì 404.

## Cách đọc mục 6–9

Quy ước chung (mọi ngày): [README.md](README.md#cách-đọc-mục-69).

Ngày 1: DB có `status` → API lọc `published` → FE không đổi contract. Lớp không sửa file → brief, không checklist.

---

## 6. Việc cần làm (phân công học)

**Giải thích:** Mục này không bảo “sửa file X”, mà tách phần **bạn phải tự hiểu** và phần **AI/mentor được phép đụng code** sau khi bạn nói bắt đầu ngày.

**Bạn tự làm (không nhờ AI viết hộ):**

- Viết (trên giấy hoặc comment) hai câu SQL public:
  - danh sách: có `WHERE status = 'published'`
  - chi tiết: có `WHERE slug = $1 AND status = 'published'`
- Giải thích được vì sao **không** chạy lại `db/seed.sql` / `npm run db:setup` trên database đã có 3 project (seed `ON CONFLICT DO UPDATE` sẽ ghi đè title).

**AI được phép (chỉ sau khi bạn nói “bắt đầu Ngày 1”):**

- Thêm file migration và script `db:migrate` nếu chưa có.
- Sửa `listProjects` / `findProjectBySlug` trong `apps/api/src/projects.ts`.

### Task checklist — mục 6

- [x] Tự viết / nói lại được 2 câu `SELECT` public (list + detail).
- [x] Tự nói được vì sao không chạy lại seed.
- [x] Chỉ nhờ AI sửa code sau khi đã bắt đầu ngày (hoặc tự code hết).

---

## 7. Frontend (Next.js)

Không đổi file. Contract JSON giữ nguyên; `lib/projects.ts` vẫn coi 404 → `notFound()` (kể cả draft). Nút publish/ẩn để Ngày 12. Sau khi API xong, mở `/projects` kiểm tra tay còn 3 card.

---

## 8. Backend (Express API)

**Giải thích:** Chỗ **bắt buộc sửa** ngày này. Hai hàm đọc dữ liệu nằm trong `apps/api/src/projects.ts`:

- `listProjects()` → dùng cho `GET /projects`
- `findProjectBySlug(slug)` → dùng cho `GET /projects/:slug`

Cả hai phải thêm điều kiện `status = 'published'`.  
`apps/api/src/routes/projects.ts` **không cần đổi logic status HTTP**: tìm thấy → `200` + JSON; không tìm thấy (kể cả draft) → `404`.

Nếu chỉ lọc ở list mà quên detail: card biến mất nhưng gõ URL `/projects/ui-lab` khi draft vẫn xem được → lỗi bảo mật/visibility.

### Task checklist — Backend

- [x] `listProjects` có `WHERE status = 'published'`.
- [x] `findProjectBySlug` có `WHERE slug = $1 AND status = 'published'`.
- [x] Route vẫn chỉ `200` / `404` (không bịa status mới cho draft).
- [x] `npm run typecheck` trong `apps/api` chạy được (exit 0).
- [x] `GET /projects` trả đúng 3 slug mẫu khi cả 3 đang `published`.
- [x] `GET /projects/missing` vẫn `404`.

---

## 9. PostgreSQL

**Giải thích:** Thêm cột bằng **migration additive** = chỉ thêm, không xóa bảng/dòng.

- File kiểu `apps/api/db/migrations/001_....sql` + bảng `schema_migrations` để chạy lại không áp dụng trùng.
- `ADD COLUMN status ... DEFAULT 'published'` + `CHECK (status IN ('draft', 'published'))`.
- **Cấm** ngày này: `DROP TABLE`, `DELETE FROM projects`, chạy lại seed ghi đè.
- Sau migration: vẫn **3 dòng**; cả 3 `status = 'published'`.

Kiểm tra draft **không** sửa lâu dài trên DB chính: dùng `BEGIN` → `UPDATE ... draft` → thử query → `ROLLBACK`.

### Task checklist — PostgreSQL

- [x] Có file migration (hoặc tương đương) thêm `status`.
- [x] Chạy migrate lần 1 thành công; lần 2 không lỗi / bỏ qua vì đã chạy.
- [x] `SELECT count(*) FROM projects` = 3.
- [x] Cả 3 dòng `status = 'published'`.
- [x] Trong `BEGIN…ROLLBACK`: một slug `draft` thì query public không thấy; sau rollback lại `published`.
- [x] (Tuỳ chọn) `UPDATE ... status = 'hidden'` bị `CHECK` từ chối.

---

## 10. Kiểm tra (gộp cả ba lớp)

Chưa có Neon branch. Trên DB chính chỉ `ADD COLUMN` + default; không để 3 project mẫu thành draft sau bài học.

Đối chiếu nhanh:

1. `GET /projects` → `next-notes`, `ui-lab`, `api-sketch`.
2. Transaction draft một slug → public list/detail không còn slug đó → `ROLLBACK`.
3. Frontend `/projects` vẫn tải được (API đang chạy).

### Task checklist — Kiểm tra tổng

- [x] List API còn 3 slug sau migration.
- [x] Draft 404/ẩn khỏi list đã chứng minh (rollback hoặc branch).
- [x] Không chạy seed trong buổi học này.
- [x] Ghi kết quả vào mục 14.

## 11. Checklist tổng (đánh dấu khi cả 6–10 xong)

- [x] Mục 6: tự giải thích được SELECT + lý do không seed.
- [x] Mục 7: không sửa FE; `/projects` vẫn xem được 3 project.
- [x] Mục 8: hai hàm API đều lọc `published`; typecheck pass.
- [x] Mục 9: migration additive; 3 dòng vẫn `published`.
- [x] Mục 10: đã kiểm tra list + draft (rollback) + không seed.

## 12. Câu hỏi ôn

1. Vì sao default `published` cần thiết khi `ADD COLUMN ... NOT NULL` trên bảng đã có dòng?
2. `WHERE slug = $1` và ``WHERE slug = '${slug}'`` khác nhau thế nào?
3. Trả 404 cho draft thay vì 403 giúp giấu điều gì?

## 13. Lỗi hay gặp

- Chạy seed và thấy title bị viết lại.
- Quên lọc ở detail nhưng có lọc ở danh sách: card không hiện, gõ URL vẫn thấy.
- `CHECK` đặt sai tên giá trị (`public` thay vì `published`) rồi API và database lệch nhau.

Bài debug: cố `UPDATE` một dòng thành `status = 'hidden'` và đọc lỗi `check constraint`.

## 14. Báo cáo hoàn thành

Review mentor: 2026-10-27 (lần 2). Ngày 1 **đạt đủ**.

- Đã sửa file: `apps/api/db/migrations/001_add_project_status.sql`, `apps/api/src/scripts/db-migrate.ts`, `apps/api/src/projects.ts`, `apps/api/db/schema.sql`, script `db:migrate` (gốc + api).
- Lệnh đã chạy và kết quả:
  - `npm run db:migrate` lần 1: chạy `001`; lần 2: bỏ qua.
  - `npm run typecheck` (apps/api): exit 0.
  - SQL: 3 dòng `published`; `BEGIN…ROLLBACK` + `CHECK` `hidden` → `23514`.
  - API bình thường: list 3 slug; `ui-lab` 200; `missing` 404.
  - **HTTP khi `ui-lab` = draft:** `GET /projects/ui-lab` → **404**; `GET /projects` chỉ `next-notes`, `api-sketch`.
  - **Sau restore `published`:** `ui-lab` → **200**; list lại đủ 3 slug (xác nhận lại lúc review).
  - Câu hỏi ôn: đạt.
- Chưa xong:
- Bạn giải thích lại được câu SELECT public: list = mọi dòng `published`; detail = đúng `slug` + `published`, không khớp → 0 dòng → 404.

## 15. Ngày kế

Ngày 2 thêm bảng `users`, hash Argon2id và `POST /auth/register`. Cột `status` phải xong trước, vì các ngày sau không quay lại phá bảng `projects`.
