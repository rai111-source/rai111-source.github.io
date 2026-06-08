# LittleLayers.Co — Website Setup Guide

Complete website for **LittleLayers.Co** hosted on **GitHub Pages** with **Supabase** as the backend database and storage.

---

## 📁 File Structure

```
littlelayers/
├── index.html            ← Public website (customers see this)
├── supabase-setup.sql    ← Run once in Supabase to create tables
├── css/
│   └── index.css         ← Shared styles
└── js/
    ├── supabase.js       ← Database config + helper functions
    └── index.js          ← Public site logic (cart, products, etc.)
```

---

## 🚀 Step 1 — Supabase Setup

### 1.1 Create a Project
1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Name it `littlelayers`, choose a region close to India (e.g. Singapore)
3. Set a strong database password and save it

### 1.2 Run the SQL Schema
1. In your Supabase dashboard → **SQL Editor** → **New Query**
2. Paste the entire contents of `supabase-setup.sql`
3. Click **Run** — this creates all tables, security rules, storage buckets, and sample data

### 1.3 Get Your API Keys
1. Go to **Project Settings → API**
2. Copy:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)



---

## ⚙️ Step 2 — Add Your API Keys

Open `js/supabase.js` and replace the placeholders at the top:

```js
const SUPABASE_URL      = 'https://YOUR_PROJECT_ID.supabase.co';  // ← paste here
const SUPABASE_ANON_KEY = 'YOUR_ANON_PUBLIC_KEY';                 // ← paste here
```

Also update your WhatsApp number in two places:

**`index.html`** — search for `91XXXXXXXXXX` and replace all 4 occurrences with your number, e.g. `919876543210`

---

## 🌐 Step 3 — GitHub Pages Setup

### 3.1 Create a GitHub Repository
1. Go to [github.com](https://github.com) → **New Repository**
2. Name it `littlelayers` (or `littlelayers.github.io` for a root domain)
3. Set it to **Public**

### 3.2 Upload Your Files
Option A — GitHub Web UI (easiest):
1. Click **Add file → Upload files**
2. Upload all files maintaining the folder structure:
    - `index.html` (root)
    - `css/index.css`
    - `js/supabase.js`
    - `js/index.js`

Option B — Git CLI:
```bash
git init
git add .
git commit -m "Initial deploy"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/littlelayers.git
git push -u origin main
```

### 3.3 Enable GitHub Pages
1. Repository → **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: **main** / **root**
4. Click **Save**
5. Your site will be live at: `https://YOUR_USERNAME.github.io/littlelayers/`

### 3.4 Custom Domain (optional)
If you own `littlelayers.in`:
1. In GitHub Pages settings → Custom domain → enter `littlelayers.in`
2. In your domain registrar (GoDaddy, Namecheap, etc.), add these DNS records:

```
Type    Name    Value
A       @       185.199.108.153
A       @       185.199.109.153
A       @       185.199.110.153
A       @       185.199.111.153
CNAME   www     YOUR_USERNAME.github.io
```
3. Check **Enforce HTTPS** in GitHub Pages settings after DNS propagates (up to 48h)

---

## 🔒 Security Notes

- The anon key in `supabase.js` is safe to be public — it only allows what the Row Level Security policies permit (public read, auth write)
- Never share your Supabase **service_role** key (that one bypasses all security)

---

## 🧰 Tech Stack

| Layer       | Technology                              |
|-------------|-----------------------------------------|
| Hosting     | GitHub Pages (free, global CDN)         |
| Database    | Supabase PostgreSQL (free tier: 500MB)  |
| Storage     | Supabase Storage (free tier: 1GB)       |
| Auth        | Supabase Auth (built-in)                |
| Frontend    | Vanilla HTML/CSS/JS (no build step)     |
| Fonts       | Google Fonts (Syne + DM Sans)           |

---

## 💡 Tips

- **Images**: Upload at 800×800px or larger for best quality. WebP format gives the smallest file size.
- **Categories**: Use lowercase: `figurines`, `keychains`, `decor`, `portraits`, `gifts`, `prototypes`
- **WhatsApp**: The checkout button sends the full cart as a WhatsApp message to your number
- **Free limits**: Supabase free tier supports up to 50,000 monthly active users and 1GB storage — more than enough to start

---

## 📞 Need Help?

Contact form submissions go directly to your Supabase `messages` table.

For Supabase questions: [supabase.com/docs](https://supabase.com/docs)
For GitHub Pages questions: [docs.github.com/pages](https://docs.github.com/en/pages)
