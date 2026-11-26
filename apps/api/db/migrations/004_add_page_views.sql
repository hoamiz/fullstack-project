CREATE TABLE IF NOT EXISTS page_views(
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    path text NOT NULL,
    viewer_key text NOT NULL,
    view_date date NOT NULL,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    UNIQUE(path,viewer_key,view_date)

);

CREATE INDEX IF NOT EXISTS page_views_view_date_idx
ON page_views (view_date);

