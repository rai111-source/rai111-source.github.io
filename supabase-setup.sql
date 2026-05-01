-- ============================================================
--  LittleLayers.Co — Supabase SQL Setup
--  Run this entire file in: Supabase Dashboard → SQL Editor
-- ============================================================


-- ── 1. PRODUCTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id             BIGSERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  category       TEXT NOT NULL,
  price          NUMERIC(10,2) NOT NULL,
  original_price NUMERIC(10,2),
  description    TEXT,
  image_url      TEXT,
  badge          TEXT,
  active         BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. GALLERY ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gallery (
  id          BIGSERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  caption     TEXT,
  image_url   TEXT,
  sort_order  INTEGER DEFAULT 0,
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. ORDERS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id          BIGSERIAL PRIMARY KEY,
  order_ref   TEXT UNIQUE NOT NULL,
  items       JSONB,
  total       NUMERIC(10,2),
  status      TEXT DEFAULT 'pending'
                CHECK (status IN ('pending','confirmed','printing','dispatched','delivered')),
  customer    JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. MESSAGES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT,
  email       TEXT,
  phone       TEXT,
  service     TEXT,
  message     TEXT,
  read        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
--  ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery  ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders   ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;


-- ── PRODUCTS: public can read active, only admin can write ────
CREATE POLICY "Public read active products"
  ON products FOR SELECT
  USING (active = TRUE);

CREATE POLICY "Admin full access products"
  ON products FOR ALL
  USING (auth.jwt() ->> 'email' = 'raj@littlelayers.in');

-- ── GALLERY: public can read active, only admin can write ─────
CREATE POLICY "Public read active gallery"
  ON gallery FOR SELECT
  USING (active = TRUE);

CREATE POLICY "Admin full access gallery"
  ON gallery FOR ALL
  USING (auth.jwt() ->> 'email' = 'raj@littlelayers.in');

-- ── ORDERS: public can insert + read own, admin can read all ──
CREATE POLICY "Public insert orders"
  ON orders FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Public read own order by ref"
  ON orders FOR SELECT
  USING (TRUE);   -- relies on app filtering by order_ref

CREATE POLICY "Admin full access orders"
  ON orders FOR ALL
  USING (auth.jwt() ->> 'email' = 'raj@littlelayers.in');

-- ── MESSAGES: public can insert, only admin can read/update ───
CREATE POLICY "Public insert messages"
  ON messages FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Admin read messages"
  ON messages FOR SELECT
  USING (auth.jwt() ->> 'email' = 'raj@littlelayers.in');

CREATE POLICY "Admin update messages"
  ON messages FOR UPDATE
  USING (auth.jwt() ->> 'email' = 'raj@littlelayers.in');


-- ============================================================
--  AUTO-UPDATE updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
--  STORAGE BUCKETS
--  Run these separately in SQL Editor if buckets don't exist
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
  VALUES ('product-images', 'product-images', TRUE)
  ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
  VALUES ('gallery-images', 'gallery-images', TRUE)
  ON CONFLICT (id) DO NOTHING;

-- Allow public to read images
CREATE POLICY "Public read product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "Auth upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Auth delete product images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Public read gallery images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'gallery-images');

CREATE POLICY "Admin upload gallery images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'gallery-images' AND auth.jwt() ->> 'email' = 'raj@littlelayers.in');

CREATE POLICY "Admin delete gallery images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'gallery-images' AND auth.jwt() ->> 'email' = 'raj@littlelayers.in');


-- ============================================================
--  SAMPLE DATA (optional — delete after testing)
-- ============================================================

INSERT INTO products (name, category, price, original_price, description, badge, active, image_url) VALUES
  ('Goku Figurine',        'figurines', 599,  799,  'Custom SLA resin print of Goku in Battle Ready pose. Approx 15cm tall.', 'Popular',    TRUE, 'https://images.unsplash.com/photo-1608889175638-9322300c369e?w=400&q=80'),
  ('Lithophane Keychain',  'keychains', 149,  NULL, 'Your photo turned into a glowing PLA keychain. Magical when held up to light.', 'Bestseller', TRUE, 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&q=80'),
  ('Custom Room Décor',    'decor',      60,  NULL, 'Personalised nameplates, wall art or desk organisers in your choice of colour.', 'New',       TRUE, 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&q=80'),
  ('Lithophane Portrait',  'portraits', 149,  NULL, 'Turn a cherished photo into glowing 3D art. A gift people remember forever.',  NULL,        TRUE, 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80'),
  ('Dragon Figurine',      'figurines', 799, 999,  'Highly detailed dragon sculpture in SLA resin. Multiple colour options.',        'Premium',   TRUE, 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80'),
  ('Name Keychain',        'keychains',  99,  NULL, 'Custom name or word in your chosen font, printed in PLA.',                      NULL,        TRUE, 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=400&q=80'),
  ('Custom Gift Box Set',  'gifts',     399,  NULL, 'A curated 3D printed gift set — keychain + portrait + mini figurine.',           'Gift',      TRUE, 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=400&q=80'),
  ('Wall Art Plaque',      'decor',     249,  NULL, 'Geometric or typographic wall art printed in your brand or accent colour.',      NULL,        TRUE, 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80');

INSERT INTO gallery (title, caption, image_url, sort_order, active) VALUES
  ('Custom Goku Figurine',   'SLA Resin Print — Customer Order',    'https://images.unsplash.com/photo-1631378534457-aa7adf893b2d?w=600&q=80', 1, TRUE),
  ('Lithophane Keychain',    'PLA Print — Glowing Portrait',        'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&q=80', 2, TRUE),
  ('Prototype Part',         'PETG Print — Engineering Client',     'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=400&q=80', 3, TRUE),
  ('Room Décor Piece',       'PLA Multi-Color — Interior Design',   'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&q=80', 4, TRUE),
  ('Anime Figurine Set',     'SLA Resin — Collector Edition',       'https://images.unsplash.com/photo-1608889175638-9322300c369e?w=800&q=80', 5, TRUE),
  ('Lithophane Portrait',    'Backlit PLA — Birthday Gift',         'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80', 6, TRUE);
