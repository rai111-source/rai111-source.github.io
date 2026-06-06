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

-- ── 5. CART ITEMS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cart_items (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id    BIGINT REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  product_name  TEXT NOT NULL,
  product_price NUMERIC(10,2) NOT NULL,
  product_image TEXT,
  quantity      INTEGER DEFAULT 1,
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);


-- ============================================================
--  ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE products   ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery    ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;


-- ── PRODUCTS: public can read active, only admin can write ────
DROP POLICY IF EXISTS "Public read active products" ON products;
CREATE POLICY "Public read active products"
  ON products FOR SELECT
  USING (active = TRUE);

DROP POLICY IF EXISTS "Admin full access products" ON products;
CREATE POLICY "Admin full access products"
  ON products FOR ALL
  USING (auth.jwt() ->> 'email' = 'raj@littlelayers.in');

-- ── GALLERY: public can read active, only admin can write ─────
DROP POLICY IF EXISTS "Public read active gallery" ON gallery;
CREATE POLICY "Public read active gallery"
  ON gallery FOR SELECT
  USING (active = TRUE);

DROP POLICY IF EXISTS "Admin full access gallery" ON gallery;
CREATE POLICY "Admin full access gallery"
  ON gallery FOR ALL
  USING (auth.jwt() ->> 'email' = 'raj@littlelayers.in');

-- ── ORDERS: public can insert + read own, admin can read all ──
DROP POLICY IF EXISTS "Public insert orders" ON orders;
CREATE POLICY "Public insert orders"
  ON orders FOR INSERT
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Public read own order by ref" ON orders;
CREATE POLICY "Public read own order by ref"
  ON orders FOR SELECT
  USING (TRUE);   -- relies on app filtering by order_ref

DROP POLICY IF EXISTS "Admin full access orders" ON orders;
CREATE POLICY "Admin full access orders"
  ON orders FOR ALL
  USING (auth.jwt() ->> 'email' = 'raj@littlelayers.in');

-- ── MESSAGES: public can insert, only admin can read/update ───
DROP POLICY IF EXISTS "Public insert messages" ON messages;
CREATE POLICY "Public insert messages"
  ON messages FOR INSERT
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Admin read messages" ON messages;
CREATE POLICY "Admin read messages"
  ON messages FOR SELECT
  USING (auth.jwt() ->> 'email' = 'raj@littlelayers.in');

DROP POLICY IF EXISTS "Admin update messages" ON messages;
CREATE POLICY "Admin update messages"
  ON messages FOR UPDATE
  USING (auth.jwt() ->> 'email' = 'raj@littlelayers.in');

-- ── CART ITEMS: users can manage their own cart items ─────────
DROP POLICY IF EXISTS "Users can read own cart items" ON cart_items;
CREATE POLICY "Users can read own cart items"
  ON cart_items FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own cart items" ON cart_items;
CREATE POLICY "Users can insert own cart items"
  ON cart_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own cart items" ON cart_items;
CREATE POLICY "Users can update own cart items"
  ON cart_items FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own cart items" ON cart_items;
CREATE POLICY "Users can delete own cart items"
  ON cart_items FOR DELETE
  USING (auth.uid() = user_id);


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

DROP TRIGGER IF EXISTS products_updated_at ON products;
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS cart_items_updated_at ON cart_items;
CREATE TRIGGER cart_items_updated_at
  BEFORE UPDATE ON cart_items
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
DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
CREATE POLICY "Public read product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Auth upload product images" ON storage.objects;
CREATE POLICY "Auth upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth delete product images" ON storage.objects;
CREATE POLICY "Auth delete product images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public read gallery images" ON storage.objects;
CREATE POLICY "Public read gallery images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'gallery-images');

DROP POLICY IF EXISTS "Admin upload gallery images" ON storage.objects;
CREATE POLICY "Admin upload gallery images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'gallery-images' AND auth.jwt() ->> 'email' = 'raj@littlelayers.in');

DROP POLICY IF EXISTS "Admin delete gallery images" ON storage.objects;
CREATE POLICY "Admin delete gallery images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'gallery-images' AND auth.jwt() ->> 'email' = 'raj@littlelayers.in');

INSERT INTO storage.buckets (id, name, public)
  VALUES ('avatars', 'avatars', TRUE)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
CREATE POLICY "Public read avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Auth upload avatars" ON storage.objects;
CREATE POLICY "Auth upload avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth update avatars" ON storage.objects;
CREATE POLICY "Auth update avatars"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth delete avatars" ON storage.objects;
CREATE POLICY "Auth delete avatars"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');


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
-- ── 6. SITE CONTENT (CMS) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_content (
  key        TEXT PRIMARY KEY,
  content    JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read site_content" ON site_content;
CREATE POLICY "Public read site_content"
  ON site_content FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Admin full access site_content" ON site_content;
CREATE POLICY "Admin full access site_content"
  ON site_content FOR ALL
  USING (auth.jwt() ->> 'email' = 'raj@littlelayers.in');

DROP TRIGGER IF EXISTS site_content_updated_at ON site_content;
CREATE TRIGGER site_content_updated_at
  BEFORE UPDATE ON site_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 7. SITE CONTENT STORAGE BUCKET ───────────────────────────
INSERT INTO storage.buckets (id, name, public)
  VALUES ('site-images', 'site-images', TRUE)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read site-images" ON storage.objects;
CREATE POLICY "Public read site-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'site-images');

DROP POLICY IF EXISTS "Admin upload site-images" ON storage.objects;
CREATE POLICY "Admin upload site-images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'site-images' AND auth.jwt() ->> 'email' = 'raj@littlelayers.in');

DROP POLICY IF EXISTS "Admin delete site-images" ON storage.objects;
CREATE POLICY "Admin delete site-images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'site-images' AND auth.jwt() ->> 'email' = 'raj@littlelayers.in');

-- ── 8. INITIAL SITE CONTENT DATA ──────────────────────────────
INSERT INTO site_content (key, content) VALUES (
  'hero',
  '{
    "title": "Turning\\nIdeas\\nInto Reality.",
    "sub": "Custom 3D printed creations from Assam — figurines, lithophane portraits, prototypes & unique gifts. Delivered across India in 5–7 days.",
    "stats": [
      {"value": "200+", "label": "Orders Delivered"},
      {"value": "5–7", "label": "Day Delivery"},
      {"value": "₹60", "label": "Starting Price"}
    ],
    "visuals": [
      {"image_url": "Images/Goku.jpeg", "label": "Custom Figurines", "price": "From ₹499"},
      {"image_url": "Images/Zubeen.jpeg", "label": "Keychains", "price": "₹149"},
      {"image_url": "Images/Room.jpeg", "label": "Prototypes", "price": "Custom Quote"}
    ]
  }'::jsonb
) ON CONFLICT (key) DO NOTHING;

INSERT INTO site_content (key, content) VALUES (
  'process',
  '{
    "sub": "From idea to your doorstep in 4 simple steps — no technical knowledge needed.",
    "steps": [
      {"step": "Step 01", "icon": "💬", "title": "Share Your Idea", "description": "Send a design file, reference image, or just a description. We''ll take it from there."},
      {"step": "Step 02", "icon": "🎨", "title": "We Design & Quote", "description": "Our team prepares your 3D model and sends a precise quote within 24 hours."},
      {"step": "Step 03", "icon": "🖨️", "title": "We Print & Package", "description": "Printed with FDM or SLA precision, then carefully packaged to protect every layer."},
      {"step": "Step 04", "icon": "📦", "title": "Delivered to You", "description": "Shipped pan-India in 5–7 days. Track your order on this page anytime."}
    ]
  }'::jsonb
) ON CONFLICT (key) DO NOTHING;

INSERT INTO site_content (key, content) VALUES (
  'about',
  '{
    "title": "Born in Assam.\\nBuilt for India.",
    "paragraphs": [
      "Founded in Dibrugarh with a passion for making, LittleLayers.Co brings digital designs into the physical world using FDM and SLA printers.",
      "Whether you''re an engineer needing a functional prototype or someone looking for a truly unique gift — we''re here to make it real."
    ],
    "cards": [
      {"value": "FDM", "label": "Fused Deposition Modeling", "description": "Durable PLA, PETG, ABS parts"},
      {"value": "SLA", "label": "Stereolithography", "description": "Ultra-fine detail & figurines"},
      {"value": "200+", "label": "Happy Customers", "description": "From Dibrugarh to Mumbai, Delhi to Bangalore"}
    ]
  }'::jsonb
) ON CONFLICT (key) DO NOTHING;
