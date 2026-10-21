CREATE TABLE IF NOT EXISTS digest_subscribers (email text PRIMARY KEY, token text NOT NULL, confirmed_at timestamptz, unsubscribed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
