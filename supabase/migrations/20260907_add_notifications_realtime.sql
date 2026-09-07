-- Bảng thông báo (notifications) + bật Supabase Realtime để đẩy thông báo
-- tức thì tới mọi thiết bị/tab đang mở app mà không cần polling.
--
-- Vì Vercel chạy Express dưới dạng serverless function (mỗi request có thể
-- rơi vào một instance khác nhau), một EventEmitter in-memory trong server
-- không thể phát broadcast đáng tin cậy tới các client đang kết nối trên
-- instance khác. Supabase Realtime (dựa trên Postgres logical replication)
-- giải quyết đúng vấn đề này: client subscribe thẳng tới Postgres, không
-- phụ thuộc vào việc request ghi dữ liệu rơi vào instance server nào.

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    content_key TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    "timestamp" BIGINT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    is_dismissed BOOLEAN NOT NULL DEFAULT false,
    meta JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_content_key ON notifications(content_key);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_timestamp ON notifications("timestamp" DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to notifications" ON notifications;
CREATE POLICY "Allow all access to notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);

-- REPLICA IDENTITY FULL để sự kiện UPDATE/DELETE qua Realtime mang theo đầy đủ
-- dữ liệu dòng cũ (mặc định Postgres chỉ gửi khóa chính).
ALTER TABLE notifications REPLICA IDENTITY FULL;

-- Thêm bảng vào publication mặc định của Supabase Realtime.
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
