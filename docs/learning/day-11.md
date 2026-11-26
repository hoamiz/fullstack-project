# Ngày 11 — API tạo project

Bảng `projects` đã có từ đầu: `slug` unique, `title`, `summary`, `description`, `stack`, `year`, và `status` là `draft` hoặc `published`. Public `GET` chỉ trả `published`. Hôm nay admin tạo dòng mới và đổi `status` qua API. Chưa có form. Form là Ngày 12. Chưa sửa nội dung, chưa xóa. Hai việc đó thuộc Phase 2.

## 1. Mục tiêu

- Admin tạo project với slug, title, description và status.
- Slug trùng thì 409. User thường thì 403. Khách thì 401.
- Dòng mới có trong PostgreSQL vì gọi API, không vì gõ `INSERT` tay trên Neon.

## 2. Thời lượng

6 giờ: 1 giờ lý thuyết, 3 giờ route và quyền, 2 giờ curl với cookie admin.

## 3. Kiến thức cần có

`status` Ngày 1. `requireUser` và `requireAdmin` Ngày 7. CSRF Ngày 4. Script admin Ngày 7 nếu database chưa có admin.

## 4. Bài này giải quyết gì

`GET /projects` là cửa public. Thêm `?all=1` trên cửa đó thì bất kỳ ai cũng xem draft. Danh sách có draft sẽ là `GET /admin/projects` ở Ngày 12. Hôm nay chỉ cần `POST` tạo và `PATCH` đổi status.

`summary`, `stack` và `year` là `NOT NULL` trong `schema.sql`. Form Ngày 12 chưa gửi ba field này. API tự điền, và để một comment trong code nói vì sao:

- `summary`: 160 ký tự đầu của `description`. Description ngắn hơn thì lấy nguyên description.
- `stack`: mảng rỗng `'{}'`.
- `year`: năm UTC hiện tại.

Card trang chủ đang hiện `summary`. Project tạo từ API sẽ có summary là đoạn đầu mô tả, cho đến khi Phase 2 cho sửa từng field.

Slug do Zod kiểm tra hình dạng, rồi Postgres giữ unique. Hai request cùng slug có thể cùng qua Zod. Hàng rào thật là unique index. Bắt mã Postgres `23505` và trả 409 `{ "error": "Slug đã tồn tại" }`. Đừng `SELECT` trước rồi mới `INSERT`. Khoảng trống giữa hai câu là chỗ hai request cùng lọt.

`PATCH /admin/projects/:slug` chỉ nhận `{ "status": "draft" | "published" }`. Body có `title` thì Zod từ chối, không cập nhật title. Không có route `DELETE`.

Thứ tự trong handler: middleware `requireUser`, `requireAdmin` đã chạy trước khi vào handler. Handler không insert nếu chưa qua hai middleware đó. CSRF toàn cục chạy trước cả router. 403 với câu «CSRF token không hợp lệ» là sai header. 403 với câu «Không đủ quyền» là sai role. Ghi cả hai vào báo cáo để không trộn.

Slug không tồn tại khi `PATCH`: admin nhận 404. Public cũng 404 khi slug rác hoặc slug đang draft. Public 404 cho cả hai để người ngoài không dò được slug nào đang viết dở. Admin 404 chỉ khi không có dòng, vì admin được biết draft tồn tại. `GET` admin list là Ngày 12. Hôm nay `PATCH` một slug không có trong bảng là đủ để thấy 404 của admin.

## 5. SQL tạo dòng

```sql
INSERT INTO projects (slug, title, summary, description, stack, year, status)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING slug, title, status
```

Đổi status:

```sql
UPDATE projects
SET status = $2
WHERE slug = $1
RETURNING slug, status
```

`RETURNING` không có dòng thì 404.

## Hướng dẫn làm

Cần một user `admin`. Chưa có thì dừng và xác nhận database trước khi chạy `admin:create` của Ngày 7. Không tự chạy script lên Neon chính.

### Bước 1. Zod

Trong file route admin, schema tạo mới:

- `slug`: `z.string().trim().toLowerCase()`, độ dài 1 đến 80, regex `^[a-z0-9]+(?:-[a-z0-9]+)*$`. Không dấu cách, không viết hoa, không gạch đầu hoặc cuối.
- `title`: trim, 1 đến 120 ký tự.
- `description`: trim, 1 đến 5000 ký tự.
- `status`: `z.enum(["draft", "published"])`. Thiếu thì mặc định `"draft"`.

Schema đổi status chỉ có `status`, cùng enum. `.strict()` để field lạ bị 400.

### Bước 2. `POST /admin/projects`

`adminRouter.post("/projects", requireUser, requireAdmin, handler)`.

Trong handler, `safeParse` thất bại thì 400. Tính `summary`, `stack`, `year` như mục 4. `INSERT`. Mã `23505` thì 409 và câu «Slug đã tồn tại». Thành công thì 201 và JSON `RETURNING`.

Viết SQL trong `apps/api/src/projects.ts` hoặc file repository cạnh đó. Route không copy câu SQL nếu `projects.ts` đã là chỗ đọc bảng này. Hàm public `listProjects` giữ `WHERE status = 'published'`. Hàm insert mới không dùng filter đó.

### Bước 3. `PATCH /admin/projects/:slug`

`requireUser`, `requireAdmin`, rồi Zod, rồi `UPDATE`. Không có dòng trả về thì 404 `{ "error": "Không tìm thấy project" }`. Có dòng thì 200 và `{ slug, status }`.

Không thêm `DELETE`. Không thêm `PATCH` title.

### Bước 4. Curl với ba danh tính

Mỗi `POST` cần cookie và header `X-CSRF-Token` khớp cookie `csrf`. Lấy cookie bằng một `GET` có `-c`, rồi login.

1. Không cookie: **401**. `count(*)` từ `projects` không đổi.
2. Cookie user thường, header CSRF đúng: **403** «Không đủ quyền». Count không đổi.
3. Cookie user thường, không header CSRF: **403** câu CSRF. Count không đổi. Đây không phải 403 role.
4. Cookie admin, header đúng, status `published`, slug mới: **201**. `GET /projects` của public thấy slug đó.
5. Cookie admin, status `draft`: **201**. `GET /projects` không có slug. `GET /projects/<slug>` là 404.
6. Gửi lại đúng slug đó: **409**. Vẫn một dòng trong bảng.
7. `PATCH` slug draft thành `published`: public `GET` thấy. `PATCH` lại thành `draft`: public không thấy và detail 404.
8. `PATCH` slug không có thật: 404.

Typecheck `apps/api` thoát 0. Mục 14 ghi slug đã tạo, và ghi script admin đã chạy trên database nào hoặc admin lấy từ lần xác nhận trước.

## Cách đọc mục 6–9

Quy ước: [README.md](README.md#cách-đọc-mục-69).

---

## 6. Việc cần làm (phân công học)

**Bạn:** chốt rule slug và biết admin trong database đến từ lệnh nào.

### Task checklist — mục 6

- [x] Tự viết được rule slug: chữ thường, số, gạch ngang ở giữa.
- [x] Biết admin lấy từ script nào, và script đó đã chạy chưa.

---

## 7. Frontend (Next.js)

Chưa có form. UI là Ngày 12.

---

## 8. Backend (Express API)

`POST /admin/projects` và `PATCH /admin/projects/:slug` chỉ đổi status. Có `requireAdmin`. CSRF dùng middleware sẵn.

### Task checklist — Backend

- [x] Khách POST → 401, count không đổi.
- [x] User POST → 403, count không đổi.
- [x] Admin POST published → có trên public GET.
- [x] Admin POST draft → public list không có, detail 404.
- [x] Slug trùng → 409, vẫn một dòng.
- [x] PATCH status đổi đúng list public.
- [x] Typecheck pass.

---

## 9. PostgreSQL

Không bảng mới. `RETURNING` sau `INSERT` và `UPDATE`.

### Task checklist — PostgreSQL

- [x] Dòng mới có đúng `status`.
- [x] Hai POST cùng slug: lần hai chỉ 409.

---

## 10. Kiểm tra

### Task checklist — Kiểm tra tổng

- [x] Đã ghi 401, 403 role, 403 CSRF, 409.
- [x] Mục 14 có slug thử và nguồn admin.

## 11. Checklist tổng

- [x] Mục 6–10 đạt.
- [x] Không có route DELETE và không có PATCH title.

## 12. Câu hỏi ôn

1. Vì sao URL public trả 404 cho cả draft lẫn slug rác, còn PATCH của admin chỉ 404 khi không có dòng?
2. `summary` tự điền thì card trang chủ hiện gì?
3. Slug trùng do Zod chặn hay do Postgres? Postgres là hàng rào sau cùng.

## 13. Lỗi hay gặp

- Quên CSRF, thấy 403, kết luận nhầm là sai role.
- `INSERT` trong handler trước khi gắn `requireAdmin`.
- `SELECT` slug trước `INSERT` rồi tin là không trùng.

## 14. Báo cáo hoàn thành

Review mentor: lần 5, 2026-11-11. **Đạt.** Câu ôn 1–3 đạt. Mục 6 đạt.

- PATCH `day11-rev-draft` thành `published`: **200**, public list có slug, detail **200**. PATCH lại `draft`: **200**, list không có, detail **404**. Slug không có: **404**. Body có `title`: **400**. Slug trùng **409**. `npm run typecheck` thoát 0.
- Slug: chữ thường, số, gạch ngang ở giữa. Admin từ script `admin:create` trong `apps/api`, đã chạy Ngày 7 trên Neon `fullstack-project`.
- Comment cạnh `summary`, `stack`, `year`: form chưa gửi, API tự điền.
- Chưa xong:

## 15. Ngày kế

Ngày 12: trang `/admin` gọi đúng API này.
