# Ngày 4 — Session, cookie, CORS, CSRF

## 1. Mục tiêu

- Session lưu PostgreSQL (`express-session` + `connect-pg-simple`).
- Cookie `HttpOnly`, `SameSite=Lax`, `Secure` chỉ khi HTTPS production.
- CORS đúng origin FE + `credentials`.
- Mọi mutation cần header CSRF.

## 2. Thời lượng

6 giờ: 2 giờ lý thuyết, 3 giờ cấu hình và test, 1 giờ giải thích lại.

## 3. Kiến thức cần có

Origin ≠ site. `:3000` và `:4000` hai origin, cùng site `localhost`.

## 4. Lý thuyết

Cookie chỉ mang **session id**. Role đọc từ DB mỗi request, không nhét vào cookie.

`HttpOnly` / `Secure` / `SameSite=Lax` như đã chốt trong roadmap. CSRF: header `X-CSRF-Token` khớp cookie csrf (không HttpOnly). Thiếu/sai → 403 trước nghiệp vụ. CORS không dùng `origin: '*'`.

## 5. Ví dụ

```text
Set-Cookie: sid=...; HttpOnly; SameSite=Lax; Path=/
Cookie: sid=...; csrf=...
X-CSRF-Token: <cùng giá trị csrf>
```

## Cách đọc mục 6–9

Quy ước: [README.md](README.md#cách-đọc-mục-69).

---

## 6. Việc cần làm (phân công học)

**Bạn:** vẽ request từ `evil.example` — cookie nào không đi; CSRF token khác session id chỗ nào.

**AI:** nối middleware; có thể thêm `POST /auth/session-check` chỉ để test CSRF.

### Task checklist — mục 6

- [x] Tự giải thích được CSRF vs session id.
- [x] Tự nói được vì sao local không bật `Secure`.

---

## 7. Frontend (Next.js)

Chưa đổi UI. Ghi chú helper sau này: `credentials: 'include'` + gắn CSRF. Ngày 5–6 dùng.

---

## 8. Backend (Express API)

Cài `express-session`, `connect-pg-simple`, `cors`. `SESSION_SECRET` từ env — thiếu thì không listen. Thứ tự middleware: CORS → session → CSRF → routes.

### Task checklist — Backend

- [x] Cookie session có `HttpOnly`; local không `Secure`.
- [x] Mutation không CSRF → 403; header sai → 403.
- [x] CORS không `*`; có `credentials`.
- [x] Secret không hardcode / không log.
- [x] Typecheck pass.

---

## 9. PostgreSQL

Bảng session do store tạo (`sid`, `sess`, `expire`). Không chứa mật khẩu/role trong cookie; JSON session không chứa `password_hash`.

### Task checklist — PostgreSQL

- [x] Bảng session tồn tại sau khi start API + tạo session thử.
- [x] Đọc một dòng session: không thấy hash mật khẩu.

---

## 10. Kiểm tra

DevTools → Cookies: flag đúng. `document.cookie` không thấy cookie HttpOnly.

### Task checklist — Kiểm tra tổng

- [x] 403 CSRF đã chứng minh (curl).
- [x] Ghi mục 14.

## 11. Checklist tổng

- [x] Mục 6–10 đạt.
- [x] Cookie không chứa role.

## 12. Câu hỏi ôn

1. Vì sao local không bật `Secure`?
2. `SameSite=Lax` chặn gì, chưa chặn gì?
3. Session id và CSRF token có được trùng một giá trị không?

## 13. Lỗi hay gặp

- Quên `credentials: 'include'`.
- Lưu cả user object kèm hash vào session.
- `trust proxy` sai khi sau HTTPS.

## 14. Báo cáo hoàn thành

Review mentor: 2026-11-04. Ngày 4 **đạt đủ**.

- Đã sửa file: `apps/api/src/server.ts`, `apps/api/src/routes/auth.ts`, `apps/api/package.json`. UI không đổi.
- Lệnh đã chạy và kết quả:
  - `npm run typecheck` trong `apps/api`: thoát 0.
  - `GET /projects` lần sau khi sửa: `sid` có `HttpOnly`, `SameSite=Lax`, không `Secure`. `csrf` có `SameSite=Lax`, không `HttpOnly`, không `Secure`.
  - `POST /auth/session-check` không header: **403**. Header sai: **403**. Header đúng bằng cookie `csrf`: **204**.
  - Bảng `session` có `sid`, `sess`, `expire`. `sess` có `csrfToken`, không có `password` hay `role`.
  - Câu ôn: `Secure` tắt trên HTTP local. `SameSite=Lax` giữ cookie ở `POST` từ site khác. Session id và CSRF token không trùng nhau.
- Chưa xong:
- Tên cookie + flag thực tế: `sid` — HttpOnly, SameSite=Lax, không Secure. `csrf` — SameSite=Lax, không HttpOnly, không Secure.

## 15. Ngày kế

Ngày 5: login / logout / rate limit dùng session này.
