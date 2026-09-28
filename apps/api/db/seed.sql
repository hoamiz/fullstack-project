INSERT INTO projects (slug, title, summary, description, stack, year) VALUES
  (
    'next-notes',
    'Next Notes',
    'Ghi chú cách App Router map thư mục thành URL.',
    'Một trang tĩnh để ôn layout, page và dynamic segment. Mỗi ghi chú là một object trong mảng projects, không gọi API.',
    ARRAY['Next.js', 'TypeScript'],
    2026
  ),
  (
    'ui-lab',
    'UI Lab',
    'Vài component nhỏ viết bằng TypeScript.',
    'Nơi thử card, link và kiểu dữ liệu dùng chung giữa danh sách và trang chi tiết. Giao diện chỉ render dữ liệu có sẵn trong code.',
    ARRAY['React', 'TypeScript', 'Tailwind CSS'],
    2026
  ),
  (
    'api-sketch',
    'API Sketch',
    'Bản phác giao diện sẽ nối Node.js và PostgreSQL sau.',
    'Trang này mô tả project sẽ có danh sách lưu trong database. Hiện chưa có fetch, route handler hay schema. Nội dung vẫn là một object tĩnh.',
    ARRAY['Next.js', 'Node.js', 'PostgreSQL'],
    2026
  )
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  description = EXCLUDED.description,
  stack = EXCLUDED.stack,
  year = EXCLUDED.year;
