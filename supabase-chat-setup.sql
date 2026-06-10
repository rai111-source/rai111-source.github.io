-- ============================================================
--  LittleLayers.Co — Supabase SQL Chat Setup
--  Run this entire file in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. CHAT SESSIONS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name   TEXT NOT NULL,
  customer_phone  TEXT,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. CHAT MESSAGES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id          BIGSERIAL PRIMARY KEY,
  session_id  UUID REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
  sender      TEXT NOT NULL CHECK (sender IN ('customer', 'admin')),
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
--  ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- ── CHAT SESSIONS POLICIES ──────────────────────────────────
DROP POLICY IF EXISTS "Admin full access chat_sessions" ON chat_sessions;
CREATE POLICY "Admin full access chat_sessions"
  ON chat_sessions FOR ALL
  USING (auth.jwt() ->> 'email' = 'raj@littlelayers.in');

DROP POLICY IF EXISTS "Public insert chat_sessions" ON chat_sessions;
CREATE POLICY "Public insert chat_sessions"
  ON chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public read chat_sessions" ON chat_sessions;
CREATE POLICY "Public read chat_sessions"
  ON chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public update chat_sessions" ON chat_sessions;
CREATE POLICY "Public update chat_sessions"
  ON chat_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- ── CHAT MESSAGES POLICIES ──────────────────────────────────
DROP POLICY IF EXISTS "Admin full access chat_messages" ON chat_messages;
CREATE POLICY "Admin full access chat_messages"
  ON chat_messages FOR ALL
  USING (auth.jwt() ->> 'email' = 'raj@littlelayers.in');

DROP POLICY IF EXISTS "Public insert chat_messages" ON chat_messages;
CREATE POLICY "Public insert chat_messages"
  ON chat_messages FOR INSERT
  WITH CHECK (session_id IN (SELECT id FROM chat_sessions));

DROP POLICY IF EXISTS "Public read chat_messages" ON chat_messages;
CREATE POLICY "Public read chat_messages"
  ON chat_messages FOR SELECT
  USING (session_id IN (SELECT id FROM chat_sessions));

-- ============================================================
--  TRIGGERS & FUNCTIONS
-- ============================================================

-- Auto-update updated_at of chat_sessions itself when modified
DROP TRIGGER IF EXISTS chat_sessions_updated_at ON chat_sessions;
CREATE TRIGGER chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-update updated_at of chat_sessions when a new message is inserted
CREATE OR REPLACE FUNCTION update_session_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE chat_sessions
  SET updated_at = NOW()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_messages_update_session ON chat_messages;
CREATE TRIGGER chat_messages_update_session
  AFTER INSERT ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION update_session_updated_at();

-- ============================================================
--  REALTIME PUBLICATION
-- ============================================================
alter table chat_sessions replica identity full;
alter table chat_messages replica identity full;

-- Safe insertion into publication if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE chat_sessions;
    EXCEPTION WHEN others THEN
      NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END IF;
END $$;


-- ============================================================
--  PERFORMANCE INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id);

