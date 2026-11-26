# Ngày 15 — Đối chiếu Phase 1

Các ngày trước đã có mục 14. Hôm nay không thêm trang, route, hay bảng mới. Việc là chạy lệnh, nhìn exit code, và đối chiếu từng tiêu chí roadmap với thứ đã xảy ra trên máy.

## 1. Mục tiêu

- Chạy lint, typecheck API, và build Next.js. Ghi exit code thật.
- Mỗi tiêu chí Phase 1 được ghi đạt hoặc chưa đạt.
- Không thêm tính năng.

## 2. Thời lượng

6 giờ: 30 phút đọc bảng tiêu chí, 4 giờ chạy và sửa lỗi làm lệch tiêu chí đã có, 1,5 giờ viết báo cáo.

## 3. Kiến thức cần có

Mục 14 của Ngày 1 đến Ngày 14. Mục 14 để trống nghĩa là ngày đó chưa tính là xong. Không điền hộ bằng trí nhớ nếu lệnh chưa chạy lại.

## 4. Bài này giải quyết gì

«Có file» không phải là «xong». Xong nghĩa là lệnh đã chạy và hành vi đã thấy. Ví dụ đăng nhập sai phải là cùng một JSON 401, không chỉ là trong source có chữ `401`.

Ba lệnh từ root repo:

```bash
npm run lint
npm --prefix apps/api run typecheck
npm run build
```

Ghi exit code của từng lệnh vào mục 14. Exit khác 0 thì dán câu lỗi ngắn và để trong «Chưa xong». Không đổi thành dấu đạt.

Root `package.json` có `build:api` gọi `npm --prefix apps/api run build`. `apps/api/package.json` hiện không có script `build`. Chạy `npm run build:api` sẽ báo thiếu script. Ghi đúng câu đó. Không bịa exit 0. Không thêm script build chỉ để có dấu đạt, trừ khi lệnh đó thật sự compile API và bạn cần nó cho tiêu chí. Typecheck mới là lệnh API đang có.

Sửa code hôm nay chỉ khi một tiêu chí Phase 1 đã viết bị fail: lint lỗi do chính code bài học, typecheck lỗi, build lỗi, hoặc một quyền trả sai status. Không mở Phase 2. Không thêm sửa project, xóa project, upload, hay phân trang.

Không migration mới, trừ khi một tiêu chí chứng minh thiếu bảng và bạn đồng ý trước. Không `DROP`. Không chạy `db:setup` trên database đã có dữ liệu. Seed dùng `ON CONFLICT DO UPDATE` và sẽ ghi đè title project.

`git status` không được staged file `apps/api/.env`.

Google: nếu Ngày 9 chưa tự bấm hủy và chưa liên kết email, tiêu chí đó là chưa đạt. Không đánh dấu xong vì route đã tồn tại.

## 5. Bảng tiêu chí

Điền đạt hoặc chưa, kèm chỗ đã xem. Một ô không được để «chắc là được».

| Tiêu chí | Đạt khi |
| --- | --- |
| Public chỉ thấy `published` | Draft trên `/projects` và trên URL chi tiết là 404 |
| Đăng ký | Email trùng 409. Database không có mật khẩu plaintext. Body gửi `role: admin` vẫn lưu `user` |
| CSRF | `POST` thiếu header thì 403. Cookie `sid` HttpOnly. Cookie `csrf` không HttpOnly |
| Login | Email lạ và mật khẩu sai cùng 401, cùng câu. Logout làm `sid` cũ hết user |
| Session trên UI | F5 `/account` vẫn là user. `expire` quá khứ thì về `/login` |
| Role | Khách gọi admin là 401. User thường là 403. Không có route đổi role |
| Google | Thiếu env thì không có nút dùng được. State sai không tạo user. Hủy không tạo session. Cùng email không thành hai user |
| Khách | Nút khách không tăng `users`. `GET /projects` không cần cookie |
| Tạo project | Slug trùng 409. Draft không ra public. Không có DELETE |
| Page view | F5 cùng ngày không tăng. Admin không tăng. `/admin` không tăng |
| Reset | Dashboard về 0. `page_views` không giảm. Khách 401, user 403 |

## Hướng dẫn làm

### Bước 1. Đọc mục 14 từng ngày

Mở `docs/learning/day-01.md` đến `day-14.md`, phần báo cáo. Ngày nào còn «điền khi review» hoặc «Chưa xong» có việc thì ghi vào mục 14 của Ngày 15 là nợ Phase 1. Không sửa lịch sử cho đẹp nếu việc chưa xảy ra.

### Bước 2. Chạy ba lệnh

Chạy đúng lệnh mục 4, từ root. Ghi exit code. Build Next fail vì thiếu env thì ghi tên biến đó, không ghi giá trị secret.

`npm run build:api` chạy riêng và ghi kết quả thiếu script nếu đó vẫn là sự thật.

### Bước 3. Sửa chỉ lỗi làm fail tiêu chí

Một lỗi typecheck hoặc build do code Phase 1 thì sửa cho lệnh thoát 0, rồi chạy lại và ghi exit code mới. Một ý tưởng mới xuất hiện trong lúc sửa thì dừng, không nhét vào bài.

### Bước 4. Trả lời ba câu bằng thứ đang chạy

Viết câu trả lời vào mục 14, dựa trên code hiện tại:

1. Cookie `sid` chứa mã phiên đã ký. Nó không chứa role và không chứa `password_hash`. Những thứ đó nằm trong PostgreSQL, hoặc không nằm trong session.
2. URL public trả 404 cho draft để người ngoài không phân biệt slug đang viết dở với slug không tồn tại.
3. Reset analytics không xóa bảng. Nó thêm dòng `analytics_periods` và `audit_logs`. `page_views` giữ nguyên.

### Bước 5. Khớp `CONTEXT.md`

Nếu một dòng trong `CONTEXT.md` nói Ngày 5 chưa code trong khi Ngày 5 đã có mục 14 đạt, sửa dòng đó cho khớp. Không đổi kiến trúc. Không commit trừ khi bạn yêu cầu.

## Cách đọc mục 6–9

Quy ước: [README.md](README.md#cách-đọc-mục-69). Ngày 15 chỉ sửa file nếu một tiêu chí fail.

---

## 6. Việc cần làm (phân công học)

**Bạn:** đọc 14 báo cáo và trả lời ba câu. Lệnh thì tự chạy và dán exit code.

### Task checklist — mục 6

- [x] Đã rà mục 14 các ngày trước. Ngày trống được ghi là chưa xong Phase 1.
- [x] Đã trả lời ba câu ôn.

---

## 7. Frontend (Next.js)

Chỉ sửa nếu build hoặc một flow UI trong bảng tiêu chí fail. Không chỉnh layout cho đẹp.

### Task checklist — Frontend

- [x] `npm run build` exit 0, hoặc mục 14 ghi lỗi cụ thể.
- [x] Login, signup, và admin tối thiểu đã được đối chiếu với bảng.

---

## 8. Backend (Express API)

Chỉ sửa nếu quyền, validation, hoặc typecheck fail.

### Task checklist — Backend

- [x] `npm run typecheck` trong `apps/api` exit 0, hoặc mục 14 ghi lỗi.
- [x] Từng dòng auth, admin, analytics trong bảng có đạt hoặc chưa.

---

## 9. PostgreSQL

Không migration mới nếu bạn chưa đồng ý. Không `DROP`. Không seed ghi đè.

### Task checklist — PostgreSQL

- [x] Không chạy lệnh xóa dữ liệu cho «sạch database».
- [x] Nếu có migration mới, mục 14 ghi bạn đã xác nhận.

---

## 10. Kiểm tra

### Task checklist — Kiểm tra tổng

- [x] Lint, typecheck, build có exit code trong mục 14.
- [x] Mỗi tiêu chí trong bảng mục 5 là đạt hoặc chưa.
- [x] `CONTEXT.md` khớp những ngày đã có mục 14.
- [x] `.env` không staged.

## 11. Checklist tổng

- [x] Mục 6–10 đạt, hoặc «Chưa xong» liệt kê đúng blocker.
- [x] Không ghi Phase 1 xong khi còn một tiêu chí quan trọng chưa đạt.

## 12. Câu hỏi ôn

1. Cookie session chứa gì, và không chứa gì?
2. Public trả 404 cho draft để làm gì?
3. Reset analytics xóa bảng nào?

Chốt 2026-11-25:

1. Đúng phần không chứa mật khẩu và role. Tên cookie là `sid`. Giá trị là mã phiên đã ký, không phải role và không phải `password_hash`. Hai thứ đó nằm trong PostgreSQL.
2. Đúng ý tránh lộ draft. 404 còn làm slug đang viết dở trông giống slug không tồn tại.
3. Đúng. Reset không xóa bảng. Nó thêm `analytics_periods` và `audit_logs`. `page_views` giữ nguyên.

## 13. Lỗi hay gặp

- Thấy warning lint rồi đánh fail cả phase mà không đọc warning đó là gì.
- Build fail vì thiếu env, rồi ghi thành lỗi logic đăng nhập.
- Đánh dấu Google xong dù chưa bấm hủy.

## 14. Báo cáo hoàn thành

Review mentor: lần 6, 2026-11-25. **Đạt** cho các lệnh của bài. 2026-11-26: nhánh Google cùng email đạt theo đọc code, không signup mới. Phase 1 đóng.

- Đã sửa file: không sửa code. `rootDir` và `outDir` nằm trong `compilerOptions`. `tsc --showConfig` thấy `rootDir` `./src` và `outDir` `./dist`.
- Lệnh đã chạy và kết quả:
  - lint: **0**.
  - typecheck: **0**.
  - build: **0**.
  - build:api: **0**. 15 file `.js` trong `apps/api/dist`. `apps/api/src` không còn file `.js`. `dist` nằm trong `.gitignore`. `start` vẫn chạy `tsx` trên `src/server.ts`.
- Bảng tiêu chí, dựa trên mục 14 các ngày đã đạt, không chạy lại từng request hôm nay:
  - Public chỉ `published`: **đạt**. Draft trả 404.
  - Đăng ký: **đạt**. 409 khi trùng. Body `role` không nâng admin. Mật khẩu là hash.
  - CSRF: **đạt**. POST thiếu header 403. `sid` HttpOnly. `csrf` không HttpOnly.
  - Login: **đạt**. Email lạ và mật khẩu sai cùng 401. Logout hết user trên `sid` cũ.
  - Session trên UI: **đạt** theo Ngày 6. F5 `/account` còn user. `expire` quá khứ thì về `/login`.
  - Role: **đạt**. Khách 401. User 403. Không có route đổi role.
  - Google: **đạt theo code** (2026-11-26), không signup mới. Hủy và state sai đã 302. Nhánh cùng email chỉ `INSERT oauth_accounts`. Không `UPDATE` hash hay role. `users.email` UNIQUE.
  - Khách: **đạt**. Nút khách không tạo user. `GET /projects` không cần cookie.
  - Tạo project: **đạt**. Slug trùng 409. Draft không ra public. Không có `DELETE`.
  - Page view: **đạt**. F5 cùng ngày không tăng. Admin không tăng. `/admin` không được ghi.
  - Reset: **đạt**. Dashboard về 0, `page_views` không giảm. GET không cookie 401. User 403. POST không cookie là 403 CSRF, vì middleware CSRF đứng trước `requireUser`.
- Ngày 1–14 đều có mục 14 đạt. Không migration mới. Không `DROP`. `apps/api/.env` không nằm trong staged. `cookies.txt` đang untracked, không commit file đó.
- Chưa xong: trống.
- Câu hỏi ôn 1–3 chốt 2026-11-25.

## 15. Ngày kế

Phase 1 không có Ngày 16. Phase 2 bắt đầu khi bạn yêu cầu.
