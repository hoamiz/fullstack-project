# Ngày 14 — Dashboard và reset analytics

`page_views` đã có từng lượt. Hôm nay admin xem tổng trong mốc hiện tại, và có một nút đặt lại số trên dashboard. Đặt lại không xóa lượt cũ.

## 1. Mục tiêu

- `/admin` hiện tổng view trong mốc hiện tại, số theo ngày, và danh sách project kèm status.
- Reset có hai bước xác nhận.
- Reset thêm một mốc và một dòng audit. Không xóa `users`, `projects`, `session`, `page_views`, hay audit cũ.

## 2. Thời lượng

6 giờ: 1,5 giờ lý thuyết, 3 giờ API và UI, 1,5 giờ test quyền và đếm bảng.

## 3. Kiến thức cần có

`page_views` Ngày 13. `requireAdmin` Ngày 7. `POST` đi qua CSRF. `apiFetch` đã gắn header.

## 4. Bài này giải quyết gì

Xóa `page_views` thì mất lịch sử. Reset ở bài này chỉ nói «từ thời điểm này, dashboard đếm lại». Các dòng cũ vẫn nằm trong bảng. Câu hỏi sau này vẫn trả lời được bằng SQL.

Hai bảng mới:

- `analytics_periods`: mỗi lần reset thêm một dòng, cột `started_at`.
- `audit_logs`: mỗi lần reset thêm một dòng `action = 'analytics.reset'` và `actor_user_id` là admin đang bấm.

Dashboard lấy mốc mới nhất:

```sql
SELECT started_at
FROM analytics_periods
ORDER BY started_at DESC
LIMIT 1
```

Chưa có dòng nào thì coi mốc là `1970-01-01`, tức đếm mọi view đang có. Đó là trạng thái trước lần reset đầu tiên.

Tổng và theo ngày chỉ tính `page_views.created_at >= started_at`. Quên điều kiện này thì bấm reset mà số trên UI không đổi.

Reset dùng một client lấy từ `pool.connect()`, không gọi `pool.query` rời cho `BEGIN` và `INSERT`. `pool.query` mỗi lần có thể lấy một connection khác. `BEGIN` trên connection A không bọc `INSERT` trên connection B. Một connection làm đủ: `BEGIN`, insert period, insert audit, `COMMIT`. Lỗi thì `ROLLBACK` và nhả client trong `finally`.

Hai insert cùng thành công hoặc cùng không xảy ra. Không có chuyện đã có mốc mới mà không có audit, hoặc ngược lại.

`GET` không reset. Prefetch của trình duyệt có thể gọi `GET`. Reset là `POST /admin/analytics/reset`, có `requireUser`, `requireAdmin`, và CSRF. Không có câu `DELETE` trong hàm này.

UI hai bước: nút «Đặt lại số liệu» chỉ mở một đoạn xác nhận. Nút thứ hai «Xác nhận đặt lại» mới `POST`. Copy trên đoạn xác nhận nói số dashboard về 0, các dòng `page_views` cũ vẫn còn trong database. Request lỗi thì không hiện câu thành công.

Khách gọi reset thì 401 và không có period mới. User thường thì 403 và không có period mới. Admin xem trang public sau reset không làm tổng tăng, vì Ngày 13 không ghi view cho role admin.

Biểu đồ là một bảng ngày và số. Không cần thư viện chart.

## 5. Số cần thấy

Giả sử trước reset dashboard đang là 4 và `count(*)` của `page_views` là 4.

Sau reset của admin: dashboard là 0. `page_views` vẫn 4. `analytics_periods` tăng 1. `audit_logs` tăng 1.

## Hướng dẫn làm

### Bước 1. Migration `005_add_analytics.sql`

```sql
CREATE TABLE IF NOT EXISTS analytics_periods (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  started_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  action text NOT NULL,
  actor_user_id uuid REFERENCES users (id),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

`npm run db:migrate`. Không insert period trong file này. Mốc đầu tiên là lúc admin bấm reset, hoặc là năm 1970 khi chưa có dòng.

### Bước 2. `GET /admin/analytics`

File: `apps/api/src/routes/admin.ts`. URL đầy đủ là `GET /admin/analytics` vì `server.ts` đã gắn `adminRouter` vào `/admin`.

Handler này chỉ đọc. Không `INSERT`, không `DELETE`. Khách bị `requireUser` chặn **401**. User thường bị `requireAdmin` chặn **403**. Cả hai trường hợp không chạy tới câu đếm.

JSON mẫu ở dưới là hình dạng, không phải số viết sẵn. Xóa object đang trả `total: 0` và ngày `2026-11-04`. Số phải ra từ ba câu query.

**2.1. Lấy mốc**

```sql
SELECT started_at
FROM analytics_periods
ORDER BY started_at DESC
LIMIT 1
```

Có dòng thì `$1` của hai câu sau là `rows[0].started_at`. Không có dòng thì `$1` là `new Date("1970-01-01T00:00:00.000Z")`. Không tự `INSERT` một period ở đây. Period chỉ xuất hiện khi admin bấm reset ở bước 3.

**2.2. Đếm tổng**

```sql
SELECT count(*)::int AS total
FROM page_views
WHERE created_at >= $1
```

`total` trong JSON là `rows[0].total`. Không có view trong mốc thì số này là `0`, không phải bỏ qua query.

**2.3. Đếm theo ngày**

```sql
SELECT view_date::text AS date, count(*)::int AS count
FROM page_views
WHERE created_at >= $1
GROUP BY view_date
ORDER BY view_date
```

`byDay` là `rows`. Không có dòng thì `byDay` là `[]`. Không giữ ngày mẫu `2026-11-04`.

**2.4. Danh sách project**

```sql
SELECT slug, title, status
FROM projects
ORDER BY id
```

Câu này không lọc `status = 'published'`. Draft vẫn có trong mảng. Danh sách rỗng thì `projects` là `[]` và route vẫn **200**. Không dùng nhánh 404 của `GET /admin/projects`.

**2.5. Trả về**

```json
{
  "total": 0,
  "byDay": [{ "date": "2026-11-04", "count": 0 }],
  "projects": [{ "slug": "next-notes", "title": "Next Notes", "status": "published" }]
}
```

Status **200**. Body chỉ có `total`, `byDay`, `projects`. Không đưa `viewer_key` ra JSON.

Query lỗi thì `next(error)` để `handleError` trả **503**. Không bắt lỗi rồi trả `total: 0`, vì số 0 đó giống «chưa có view».

Thứ tự trong handler: mốc, rồi tổng, rồi theo ngày, rồi project, rồi `res.status(200).json(...)`. Hai câu đếm dùng cùng một giá trị `$1`.

### Bước 3. `POST /admin/analytics/reset`

Cùng hai middleware. Lấy `req.session.userId`. Một `client` từ `pool.connect()`:

```sql
BEGIN;
INSERT INTO analytics_periods (started_at) VALUES (now());
INSERT INTO audit_logs (action, actor_user_id)
VALUES ('analytics.reset', $1);
COMMIT;
```

Thành công thì 204. Lỗi thì rollback, 503 qua `handleError` hiện có, hoặc 500 với câu chung. Không `DELETE`.

### Bước 4. UI trên `/admin`

Trang `/admin` của Ngày 12, nhánh `role === "admin"`, gọi `apiFetch("/admin/analytics")`. Vẽ tổng, bảng theo ngày, bảng project.

Nút «Đặt lại số liệu» chỉ `setState` để hiện đoạn xác nhận và câu về dữ liệu cũ vẫn còn. Nút «Xác nhận đặt lại» gọi `apiFetch("/admin/analytics/reset", { method: "POST" })`. 204 thì tải lại `GET`. Khác 204 thì hiện `error`, không hiện «đã đặt lại».

User thường và khách không thấy nút này vì `/admin` đã chặn từ Ngày 12. Vẫn thử curl để chứng minh API tự chặn.

### Bước 5. Đếm bốn bảng

Ghi vào mục 14, trước và sau một lần reset của admin:

- `count(*)` từ `page_views`
- `count(*)` từ `analytics_periods`
- `count(*)` từ `audit_logs`
- `total` trên dashboard

Rồi curl không cookie: `POST /admin/analytics/reset` là 401, period không tăng. Curl cookie user thường, có CSRF: 403, period không tăng. Curl user thường thiếu CSRF: 403 câu CSRF, period không tăng.

Admin mở một trang public sau reset. Dashboard vẫn 0.

Typecheck `apps/api` thoát 0.

## Cách đọc mục 6–9

Quy ước: [README.md](README.md#cách-đọc-mục-69).

---

## 6. Việc cần làm (phân công học)

**Bạn:** đếm bảng trước và sau. Tự gửi reset bằng user thường.

### Task checklist — mục 6

- [x] Tự nói được reset không phải `DELETE FROM page_views`.

---

## 7. Frontend (Next.js)

`GET /admin/analytics` trên trang `/admin`. Reset chỉ sau nút xác nhận thứ hai.

### Task checklist — Frontend

- [x] Có hai bước trước khi gọi reset.
- [x] Request thất bại không hiện thành công.
- [x] Khách và user không reset được trên UI, và API vẫn chặn khi gọi thẳng.

---

## 8. Backend (Express API)

`GET` và `POST /admin/analytics/reset`. CSRF trên `POST`. Không `DELETE` page view.

### Task checklist — Backend

- [x] Khách → 401. User → 403. Period không tăng.
- [x] Admin reset: period và audit cùng một transaction.
- [x] Typecheck pass.

---

## 9. PostgreSQL

Migration `005_add_analytics.sql`.

### Task checklist — PostgreSQL

- [x] Sau reset, count `page_views` không giảm. Period và audit tăng.
- [x] Hàm reset không có câu `DELETE`.

---

## 10. Kiểm tra

### Task checklist — Kiểm tra tổng

- [x] Dashboard về 0 trong khi `page_views` giữ nguyên.
- [x] Mục 14 có bốn số trước và sau, cùng 401 và 403.

## 11. Checklist tổng

- [x] Mục 6–10 đạt.

## 12. Câu hỏi ôn

1. Reset khác `DELETE FROM page_views` ở chỗ nào?
2. Vì sao mốc và audit phải cùng một transaction?
3. Admin mở trang public sau reset. Dashboard có tăng không?

Chốt 2026-11-25:

1. Đúng. Reset chỉ thêm mốc mới để dashboard đếm lại. Dòng `page_views` cũ vẫn còn. `DELETE` xóa lịch sử.
2. Đúng. Period và audit cùng `COMMIT` hoặc cùng `ROLLBACK`. Không có mốc mới mà thiếu audit, hoặc ngược lại.
3. Đúng. Không tăng. Ngày 13 không ghi view cho role admin.

## 13. Lỗi hay gặp

- Quên `created_at >= started_at` nên UI không đổi sau reset.
- `pool.query("BEGIN")` rồi `pool.query("INSERT")` trên hai connection.
- Reset bằng `GET` nên một prefetch cũng đặt lại mốc.

## 14. Báo cáo hoàn thành

Review mentor: lần 5, 2026-11-23. **Đạt.** Hộp thoại đã nói số về 0 và dòng view cũ vẫn còn. Bấm Hủy, không reset thêm.

- Mở `/admin`: bảng ngày `2026-11-23` = 4, «Tổng lượt truy cập: 4», 8 project kèm slug và status.
- Hộp thoại: «Số trên dashboard về 0. Các dòng page_views cũ vẫn còn trong database.» Nút «Xác nhận đặt lại» và «Hủy».
- `page_views` = 16, `analytics_periods` = 2, `audit_logs` = 2. Câu ôn 1–3 chốt 2026-11-25.

## 15. Ngày kế

Ngày 15: lint, typecheck, build, đối chiếu tiêu chí Phase 1. Không thêm tính năng.
