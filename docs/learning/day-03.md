# Ngày 3 — Trang đăng ký

## 1. Mục tiêu

- `/signup` tiếng Việt: họ tên, email, mật khẩu, xác nhận, nút gửi, link `/login`.
- Trạng thái loading / success / error.
- UI dùng Zod; server Ngày 2 vẫn quyết định cuối.

## 2. Thời lượng

6 giờ: 1 giờ lý thuyết form, 3,5 giờ UI, 1,5 giờ kiểm tra tay.

## 3. Kiến thức cần có

Ngày 2: 400 / 409 / 201. Form cần `"use client"` vì có state và `onSubmit`.

## 4. Lý thuyết

Fetch trình duyệt → `:4000` là cross-origin. Chưa có cookie. CORS phải cho origin FE; nếu không, `curl` 201 nhưng form lỗi mạng.

Zod UI fail → không `fetch`. Zod UI pass ≠ server pass: thử sửa body trong DevTools.

Không lưu mật khẩu vào `localStorage`. Thành công → `/login` hoặc thông báo đã tạo; **không** tự đăng nhập (session ở Ngày 4).

## 5. Ví dụ

Form → `safeParse` → lỗi field / hoặc POST JSON → 201 success / 409 email đã dùng / 400 lỗi server. Nút `disabled` khi `pending`.

## Cách đọc mục 6–9

Quy ước: [README.md](README.md#cách-đọc-mục-69).

---

## 6. Việc cần làm (phân công học)

**Bạn:** schema form + message tiếng Việt; thử payload cắt field bằng DevTools.

**AI:** layout form khớp portfolio (`max-w-3xl`, zinc) sau khi bắt đầu ngày.

### Task checklist — mục 6

- [x] Tự liệt kê message lỗi từng field.
- [x] Đã thử một request cố ý sai sau khi UI validate.

---

## 7. Frontend (Next.js)

File mới `app/signup/page.tsx` (+ form client nếu tách). Bốn field + link đăng nhập. Ba trạng thái nhìn thấy được. `/login` chưa cần hoạt động, chỉ đúng path.

### Task checklist — Frontend

- [x] Bốn field + link `/login`.
- [x] Loading / success / error rõ trên UI.
- [x] Không ghi mật khẩu vào storage trình duyệt.
- [x] `Content-Type: application/json` khi fetch.

---

## 8. Backend (Express API)

Chỉ sửa **CORS** nếu trình duyệt bị chặn. Không nới validation Zod server để form “đỡ lỗi”.

### Task checklist — Backend

- [x] Form gọi được API từ origin FE (hoặc ghi rõ đã bật CORS).
- [x] Payload thiếu `password` (sửa trong DevTools) vẫn 400.

---

## 9. PostgreSQL

Không schema mới. Sau đăng ký thành công: một dòng `users`, `email` thường, `role = user`.

### Task checklist — PostgreSQL

- [x] Đếm dòng trước/sau đăng ký email mới (+1).
- [x] Đăng ký trùng: số dòng không tăng.

---

## 10. Kiểm tra

Trình duyệt: trống → không request; confirm lệch → không request; email mới → success; trùng → 409; body bị cắt → 400.

### Task checklist — Kiểm tra tổng

- [x] Năm case trên đã thử.
- [x] Ghi mục 14.

## 11. Checklist tổng

- [x] Mục 6–10 đạt.
- [x] Server vẫn là nguồn quyết định.

## 12. Câu hỏi ôn

1. Vì sao form phải Client Component?
2. Bỏ Zod UI được không nếu server đã có Zod?
3. 409 và 400 hiện khác nhau thế nào trên trang?

## 13. Lỗi hay gặp

- Thiếu `Content-Type` → body không parse.
- Hiện stack/`error.message` lộ SQL.
- 201 rồi đẩy thẳng `/admin`.

## 14. Báo cáo hoàn thành

Review mentor: 2026-10-28 (lần 9). Ngày 3 **đạt đủ**.

- Đã sửa file: `app/signup/signup-form.tsx`, `app/signup/page.tsx`, `app/login/page.tsx`, `apps/api/src/server.ts`, `apps/api/package.json`.
- Lệnh / URL đã thử và kết quả:
  - Form trống và xác nhận lệch: câu Zod tiếng Việt, không có request đăng ký.
  - Email mới: sang `/login`. `users` 8 → 9, rồi thêm một lần thành công thành **10**.
  - Gửi trùng: **409** «Email đã tồn tại». `count(*)` vẫn **10**.
  - Body thiếu `password`: **400**.
  - Câu ôn đạt. Form là Client Component vì hook. Zod UI chặn request sai. 400 hiện JSON Zod, 409 hiện «Email đã tồn tại».
- Chưa xong:
- Server Zod không bị nới. Đăng ký không tạo session.

## 15. Ngày kế

Ngày 4: session PostgreSQL, cookie, CSRF. Đăng ký vẫn chưa tạo session.
