-- Traffic report log (D1 database lymefiber-traffic, bound as TRAFFIC_DB).
-- Apply once: npx wrangler@4.158.0 d1 execute lymefiber-traffic --remote --file functions/schema.sql
CREATE TABLE IF NOT EXISTS hits (
  ts INTEGER NOT NULL,      -- time, UTC milliseconds
  host TEXT,                -- e.g. lymefiber.net, test.lymefiber.net
  path TEXT NOT NULL,       -- path and query string
  status INTEGER NOT NULL,  -- 404 or 301
  target TEXT,              -- where a redirect sent the visitor
  referrer TEXT             -- the page that linked here, if the browser said
);
CREATE INDEX IF NOT EXISTS hits_ts ON hits(ts);
