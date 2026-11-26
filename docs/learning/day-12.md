# Ngày 12 — UI admin: tạo, publish, ẩn

Ngày 11 đã có `POST /admin/projects` và `PATCH` đổi `status`. Public `GET /projects` vẫn chỉ trả project `published`, và `lib/projects.ts` đã gọi API với `cache: "no-store"`. Hôm nay là trang để admin bấm, không thêm quyền mới trên API ngoài một `GET` danh sách có draft.

## 1. Mục tiêu

- `/admin` và `/admin/projects` chỉ dùng được khi `GET /auth/me` trả `role: "admin"`.
- Form tạo project và nút publish hoặc ẩn.
- Trang public, sau khi tải lại, khớp status vừa đổi.

## 2. Thời lượng

6 giờ: 1 giờ điều hướng, 3,5 giờ UI, 1,5 giờ kiểm tra trên trình duyệt.

## 3. Kiến thức cần có

API Ngày 11. `apiFetch` trong `lib/api.ts` đã gửi `credentials` và CSRF. `getProjects` đã `no-store`.

## 4. Bài này giải quyết gì

UI là hàng rào thứ hai. API là hàng rào thứ nhất. User thường gõ thẳng `/admin/projects` vẫn thấy báo không đủ quyền, và `GET /admin/projects` vẫn trả 403.

Danh sách admin không được gọi `GET /projects`. Route đó cố tình giấu draft. Cũng không thêm `?include=draft` lên route public. Một query như vậy sớm muộn bị gọi từ bên ngoài. Route riêng là `GET /admin/projects`, có `requireUser` và `requireAdmin`, trả thêm `status`.

Cookie phiên nằm ở trình duyệt. Trang admin vì vậy là Client Component, gọi `apiFetch`. Server Component `fetch` từ process Next không tự mang cookie `sid` của người đang mở tab.

401 từ `/auth/me` hoặc từ API admin thì `router.replace("/login")`. 403 thì ở lại trang và hiện «Không đủ quyền». Không dùng trang `error.tsx` của danh sách project cho hai status này.

Form không có nút sửa nội dung, không có nút xóa, không có upload ảnh. Phase 1 dừng ở tạo và đổi status.

Tắt API giữa chừng thì form hiện lỗi. Không hiện câu «đã tạo» nếu response không phải 201.

## 5. Năm bước trên trình duyệt

1. Admin tạo draft.
2. Cửa sổ ẩn danh mở `/projects`: không thấy slug.
3. Admin bấm publish.
4. Ẩn danh tải lại `/projects`: thấy slug. Card hiện `summary`, tức đoạn đầu description.
5. Admin bấm ẩn. Ẩn danh tải lại: slug biến mất. Mở `/projects/<slug>` thì 404.

User thường gõ `/admin/projects`: thấy «Không đủ quyền», không thấy form đang dùng được. DevTools của user đó, `GET /admin/projects` là 403.

## Hướng dẫn làm

### Bước 1. `GET /admin/projects`

Trong router admin, sau `requireUser` và `requireAdmin`:

```sql
SELECT slug, title, summary, description, stack, year, status
FROM projects
ORDER BY id
```

Không lọc `published`. Không trả field nào từ bảng `users`. 200 và mảng JSON.

Public `listProjects` giữ nguyên `WHERE status = 'published'`.

### Bước 2. Khung `/admin`

`app/admin/page.tsx` render Client Component. Mount thì `apiFetch("/auth/me")`.

- 401: về `/login`.
- 200 và `role !== "admin"`: hiện «Không đủ quyền» và link về `/`. Không gọi API admin.
- `role === "admin"`: link tới `/admin/projects` và một câu ngắn nói đây là khu tạo project. Dashboard số liệu là Ngày 14. Hôm nay chưa cần biểu đồ.

### Bước 3. `/admin/projects`

`app/admin/projects/page.tsx`, Client Component.

Cùng cách xử lý 401 và 403. Admin thì `apiFetch("/admin/projects")` và vẽ danh sách. Mỗi dòng có slug, title, status, và một nút. Status `draft` thì nút «Xuất bản» gửi:

```ts
apiFetch(`/admin/projects/${slug}`, {
  method: "PATCH",
  body: JSON.stringify({ status: "published" }),
});
```

Status `published` thì nút «Ẩn» gửi `{ status: "draft" }`. Xong thì gọi lại `GET /admin/projects`.

Form tạo có slug, title, description, và chọn draft hoặc published. Submit `POST /admin/projects` qua `apiFetch`. 201 thì thêm vào danh sách hoặc tải lại list. 409 hiện «Slug đã tồn tại». 400 hiện lỗi Zod. 403 CSRF thì hiện lỗi, không báo đã tạo.

Không có input cho summary. Người học nhìn card public để thấy summary là đoạn đầu description, đúng như API Ngày 11 đã điền.

### Bước 4. Năm bước và user thường

Chạy fe và api. Làm đủ năm bước mục 5. User thường, không phải admin, mở `/admin/projects`. Ghi slug đã dùng vào mục 14.

Tắt `npm run dev:api` rồi bấm tạo. Form phải báo lỗi mạng hoặc status không phải 201. Bật lại API sau đó.

Typecheck `apps/api` thoát 0.

## Cách đọc mục 6–9

Quy ước: [README.md](README.md#cách-đọc-mục-69).

---

## 6. Việc cần làm (phân công học)

**Bạn:** tự bấm năm bước, và mở `/admin/projects` bằng user thường.

### Task checklist — mục 6

- [x] Flow draft, publish, ẩn đã chạy trên trình duyệt.

---

## 7. Frontend (Next.js)

`app/admin/page.tsx` và `app/admin/projects/page.tsx`. 401 về `/login`. 403 hiện không đủ quyền.

### Task checklist — Frontend

- [x] Không có nút sửa nội dung, xóa, hay upload.
- [x] Form tạo và nút đổi status chạy được.
- [x] User thường không dùng được dù biết URL.
- [x] Trang public khớp status sau khi tải lại.

---

## 8. Backend (Express API)

`GET /admin/projects` trả `status` và đi qua `requireAdmin`.

### Task checklist — Backend

- [x] Admin thấy draft vừa tạo trong list admin.
- [x] User gọi GET admin → 403.
- [x] Typecheck pass.

---

## 9. PostgreSQL

Không migration. Có thể đối chiếu cột `status` với nút vừa bấm.

### Task checklist — PostgreSQL

- [x] Sau publish hoặc ẩn, `status` trong database khớp UI.

---

## 10. Kiểm tra

### Task checklist — Kiểm tra tổng

- [x] Năm bước mục 5 đạt.
- [x] Mục 14 ghi slug thử và kết quả user thường mở `/admin`.

## 11. Checklist tổng

- [x] Mục 6–10 đạt.

## 12. Câu hỏi ôn

1. Vì sao không thêm `?include=draft` vào `GET /projects`?
2. Card public lấy `summary` từ đâu khi form không có ô summary?
3. Trên UI admin, 401 và 403 mỗi loại đưa người dùng đi đâu?

## 13. Lỗi hay gặp

- List admin gọi nhầm `GET /projects` nên không thấy draft.
- Form tự `fetch` và quên CSRF. Dùng `apiFetch`.
- Tưởng trình duyệt cache dù `getProjects` đã `no-store`. Tải lại bằng cửa sổ ẩn danh nếu tab cũ còn trang cũ.

## 14. Báo cáo hoàn thành

Review mentor: lần 8, 2026-11-12. **Đạt.**

- User `day7.review.1@example.com` mở `/admin`: ở lại, «Không đủ quyền» và link «Về trang chủ». Bấm link thì về `/`. Cùng user mở `/admin/projects`: ở lại, «Không đủ quyền», không có form.
- Admin vẫn thấy list và form. Form mở không còn huy hiệu lỗi Next. Slug sai lần 7 hiện «Invalid request body».
- Ôn 1–3 đã chốt. `day11-rev-draft` đã xuất bản rồi ẩn. `test-card` vẫn draft, public **404**.
- Chưa xong: trống.

## 15. Ngày kế

Ngày 13: ghi page view. Một path, một trình duyệt, một ngày UTC.
