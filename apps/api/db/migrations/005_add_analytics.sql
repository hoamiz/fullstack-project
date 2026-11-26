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