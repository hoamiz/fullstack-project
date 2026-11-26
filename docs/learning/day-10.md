# Ngày 10 — Khách

Project public từ Ngày 1 đã lọc `status = 'published'`. Admin thử `GET /admin/whoami` từ Ngày 7 trả 401 khi không có session và 403 khi user thường. Hôm nay đặt tên cho người không đăng nhập, và kiểm tra người đó không tạo được gì.

## 1. Mục tiêu

- Khách là trình duyệt không có session. Không có dòng `users` cho khách.
- Khách xem trang chủ và project `published`.
- Khách không tạo project, không publish, không ẩn, không reset analytics. API trả **401**.

## 2. Thời lượng

6 giờ: 1 giờ lý thuyết, 2 giờ rà route, 3 giờ test.

## 3. Kiến thức cần có

Ngày 1: public chỉ trả `published`, draft trên URL public là 404. Ngày 7: 401 khác 403. User thường trên route admin là 403.

## 4. Bài này giải quyết gì

Nút «Tiếp tục với tư cách khách» chỉ là một link về `/`. Nó không gọi API, không `INSERT`, không đặt cookie đặc biệt. Khách không phải role. Thêm `role = 'guest'` nghĩa là mỗi lần bấm nút lại có một user giả, và bài toán quyền bị lẫn với user thật.

Ẩn nút trên UI không phải là phân quyền. Curl không gửi cookie vẫn phải nhận 401 trên route ghi, dù trang web không vẽ nút đó.

`GET /projects` và `GET /projects/:slug` không đòi cookie và không đòi CSRF. Đó là dữ liệu public. `GET /admin/whoami` đòi session. Ngày 11 và 14 sẽ thêm `POST` admin. Những `POST` đó đi qua `requireUser` rồi `requireAdmin`, nên khách dừng ở 401, user thường dừng ở 403, admin đi tiếp nếu kèm CSRF.

Không làm `POST /auth/guest`. Một endpoint như vậy dễ biến thành «tạo user rỗng».

Nếu đang đăng nhập mà bấm nút khách, bài này chọn một cách và ghi vào báo cáo: nút **không** logout. Session còn thì `/account` vẫn là user đó. Muốn thành khách thì bấm Đăng xuất trước. Câu trên UI nói rõ điều này, để người bấm không tưởng mình đã thoát.

## 5. Bảng quyền

Điền bằng request thật, cửa sổ ẩn danh cho cột khách. Cửa sổ ẩn danh không gửi cookie `sid` cũ.

| Việc | Khách | User | Admin |
| --- | --- | --- | --- |
| `GET /projects` | 200, chỉ published | 200, chỉ published | 200, chỉ published |
| Mở URL public của slug draft | 404 | 404 | 404 |
| `GET /admin/whoami` | 401 | 403 | 204 |
| `POST` tạo hoặc đổi status, Ngày 11 | 401 | 403 | được, khi có CSRF |
| `POST` reset analytics, Ngày 14 | 401 | 403 | được, khi có CSRF |

Hai dòng cuối chưa có route thì ghi «chưa có route, middleware đã chặn `/admin/whoami`». Khi Ngày 11 và 14 xong, quay lại bảng này nếu một `POST` trả nhầm status.

## Hướng dẫn làm

### Bước 1. Nút khách

Trên form `/login` và form `/signup`, thêm link «Tiếp tục với tư cách khách» tới `/`. Dùng `next/link` hoặc `<a href="/">`. Không `onClick` gọi `fetch`. Không gọi `/auth/register`.

Cạnh link, một câu: «Nút này không đăng xuất. Đang đăng nhập thì hãy bấm Đăng xuất trước.»

### Bước 2. Rà route ghi

Đọc `server.ts` và các router. Mọi route dưới `/admin` phải có `requireUser` rồi `requireAdmin`. `GET /projects` không gắn hai middleware đó.

Không thêm route `/auth/guest`.

### Bước 3. Đếm user

Trong Neon, `SELECT count(*) FROM users`. Bấm nút khách ở cửa sổ ẩn danh, vào `/` và `/projects`. Đếm lại. Hai số bằng nhau.

Cùng cửa sổ ẩn danh, `curl` không kèm cookie:

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/projects
curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/admin/whoami
```

Kỳ vọng `200` rồi `401`.

Login user thường, gửi cookie vào `GET /admin/whoami`, kỳ vọng `403`.

Đừng test 401 khi trình duyệt vẫn còn `sid`. Cửa sổ thường sau khi login không phải khách.

### Bước 4. Draft vẫn 404

Slug draft, nếu database có, mở trên trình duyệt không đăng nhập. Trang public 404. Admin cũng 404 trên URL public đó. Admin xem draft qua API admin ở Ngày 12, không qua `GET /projects/:slug`.

Typecheck `apps/api` nếu có sửa router. Nếu hôm nay chỉ thêm link, ghi rõ không sửa API.

## Cách đọc mục 6–9

Quy ước: [README.md](README.md#cách-đọc-mục-69).

---

## 6. Việc cần làm (phân công học)

**Bạn:** điền bảng bằng request thật và giải thích vì sao khách là 401, không phải 403.

### Task checklist — mục 6

- [x] Bảng quyền có chứng từ curl hoặc trình duyệt.
- [x] Tự nói vì sao không tạo user role `guest`.

---

## 7. Frontend (Next.js)

Nút khách là `href="/"`. Không fetch.

### Task checklist — Frontend

- [x] Có nút trên `/login` và `/signup`.
- [x] Bấm nút không tạo request đăng ký.
- [x] UI nói nút này không đăng xuất.

---

## 8. Backend (Express API)

Không có `/auth/guest`. Route admin thiếu session thì 401.

### Task checklist — Backend

- [x] Không cookie, `GET /projects` → 200, chỉ published.
- [x] Không cookie, `GET /admin/whoami` → 401.
- [x] User thường, `GET /admin/whoami` → 403.
- [x] Typecheck pass nếu có sửa file API.

---

## 9. PostgreSQL

Không bảng guest. Không cột mới.

### Task checklist — PostgreSQL

- [x] `count(users)` trước và sau khi bấm khách là cùng một số.

---

## 10. Kiểm tra

### Task checklist — Kiểm tra tổng

- [x] Bảng mục 5 khớp thứ đã thử.
- [x] Ghi mục 14.

## 11. Checklist tổng

- [x] Mục 6–10 đạt.
- [x] UI không phải hàng rào duy nhất.

## 12. Câu hỏi ôn

1. Khách và user khác nhau ở request public nào? Ở bài này, request public giống nhau. Khác nhau ở route admin.
2. Vì sao không có user `role = guest` trong database?
3. Đang có session mà bấm nút khách thì session còn hay mất?

## 13. Lỗi hay gặp

- Tạo user khách với mật khẩu rỗng.
- Bắt cookie trên `GET /projects` nên trang chủ không mở được khi chưa login.
- Test 401 trong trình duyệt vẫn còn cookie `sid`.

## 14. Báo cáo hoàn thành

Review mentor: lần 1, 2026-11-10. **Đạt.** Câu ôn 1–3 đạt.

- Nút `href="/"` trên `/login` và `/signup`, kèm câu không đăng xuất. Bấm từ `/login` mở `/`. Không có route `/auth/guest`. API không sửa.
- Không cookie: `GET /projects` **200**, 3 project, khớp 3 dòng `published` trong DB. `GET /admin/whoami` **401**. User thường **403**. Admin **204**. `users` 23 trước và sau khi bấm khách.
- `POST` tạo project và reset analytics chưa có route. Middleware đã chặn `/admin/whoami`. Không có project `draft`, nên chưa mở URL draft. Slug không tồn tại trả 404.
- Câu 1: request public giống nhau. `GET /admin/whoami` thì khách 401, user 403. Câu 2: không tạo user `guest` mỗi lần vào. Câu 3: nút khách không xóa session, chỉ logout mới mất.
- Chưa xong:

## 15. Ngày kế

Ngày 11: `POST /admin/projects` tạo project. Cần một admin trong database. Chưa có thì xác nhận trước khi chạy script Ngày 7.
