# Roadmap — Portfolio CMS

Cập nhật: 2026-10-27. Phase 1: Ngày 1 đạt. Bài `docs/learning/` (Ngày 2–15 đã cùng format checklist). Review: tick + mục 14; «Chưa xong» liệt kê phần còn lại.

## Đã chốt

- Auth: Express session lưu PostgreSQL. Next.js gọi API. Cookie `HttpOnly`; `Secure` chỉ khi HTTPS production; `SameSite=Lax`.
- Hash: Argon2id, một module riêng.
- Validation: Zod ở UI và API. API là nơi quyết định cuối.
- Phase 1 có tạo project tối thiểu (slug, title, description, draft/published) và publish/hide. Chưa edit/delete, ảnh, tag, rich text.
- Không tạo Neon branch và không chạy script admin trên database chính nếu chưa xác nhận từng lần.
- Admin đầu tiên: script local, không có API nâng quyền.

## Phase 0

Đánh giá repo và chốt hướng. Xong ngày 2026-10-26.

## Phase 1 — 15 ngày, khoảng 90 giờ

Lịch 6 giờ/ngày, học các ngày liên tiếp: khoảng 3 tuần.

| Ngày | Việc | Xong khi |
| --- | --- | --- |
| 1 | Cột `status`, API public chỉ trả `published` | ✅ 2026-10-27 — đạt; xem `docs/learning/day-01.md` mục 14 |
| 2 | Cài Zod + Argon2id, bảng `users`, `POST /auth/register`, test validation | Email trùng 409; DB không có plaintext; không nhận `role` từ client |
| 3 | UI `/signup` | Lỗi hiện trước khi gửi; server vẫn từ chối payload sai |
| 4 | `express-session` + `connect-pg-simple` + CORS credentials; cookie và CSRF | Mutation không có header CSRF bị từ chối; cookie không chứa role |
| 5 | Login, logout, rate limit, test sai mật khẩu | Một thông báo chung khi sai; logout xóa session |
| 6 | UI `/login`, session còn sau refresh, hết hạn thì ra khỏi trang bảo vệ | Kiểm tra tay đúng 3 trạng thái |
| 7 | Middleware role, script admin (chưa chạy production) | `user` gọi API admin nhận 403 |
| 8 | Google OIDC: redirect, PKCE, state | Thiếu env thì nút không dùng được; state sai bị từ chối |
| 9 | Callback, liên kết email, hủy quyền | Hủy OAuth không tạo session; không tạo 2 user cùng email |
| 10 | Guest = không session; test 401 | Guest xem published; không publish/hide/create |
| 11 | `POST /admin/projects` tạo draft hoặc published | Slug trùng 409; `user` nhận 403; dòng nằm trong PostgreSQL |
| 12 | UI admin: tạo, publish, hide | Trang public phản ánh status ngay sau thao tác |
| 13 | Ghi page view: 1 path / trình duyệt / ngày UTC; bỏ qua `/admin` và role admin | Reload cùng ngày không tăng số |
| 14 | Dashboard số liệu; reset chỉ đổi mốc `analytics_periods` + audit | Reset không xóa user, project, session |
| 15 | Lint, typecheck, build, đối chiếu tiêu chí | Kết quả lệnh ghi trong báo cáo; mục trượt không đánh dấu xong |

Ngày nào quá 6 giờ thì tách thành ngày mới, không bỏ test hoặc kiểm tra quyền.

## Ngoài Phase 1

- Phase 2: sửa/xóa project, thứ tự, nội dung dài hơn.
- Phase 3: transaction, pagination, index, đọc query plan.
- Phase 4: component dùng lại, a11y, responsive.
- Phase 5: review bảo mật, quan sát lỗi.
- Phase 6: deploy, CI, chỉ khi bạn yêu cầu đổi hạ tầng.
