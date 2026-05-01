# LittleLayers.Co — Website Setup Guide

Complete website for **LittleLayers.Co** hosted on **GitHub Pages** with **Supabase** as the backend database and storage.

---

## 📁 File Structure

```
littlelayers/
├── index.html            ← Public website (customers see this)
├── admin.html            ← Admin dashboard (only you use this)
├── supabase-setup.sql    ← Run once in Supabase to create tables
├── css/
│   └── style.css         ← Shared styles
└── js/
    ├── supabase.js       ← Database config + helper functions
    ├── main.js           ← Public site logic (cart, products, etc.)
    └── admin.js          ← Admin panel logic (CRUD, uploads)
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

### 1.4 Create Your Admin User
1. Go to **Authentication → Users → Invite User**
2. Enter your email — you'll get a link to set a password
3. Use this email + password to log into `admin.html`

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
   - `admin.html` (root)
   - `css/style.css`
   - `js/supabase.js`
   - `js/main.js`
   - `js/admin.js`

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

## 🛠️ Step 4 — Admin Panel Usage

### Access
Go to: `https://YOUR_USERNAME.github.io/littlelayers/admin.html`

Sign in with the admin email/password you created in Supabase.

### Adding Products
1. Click **Products** in the sidebar
2. Click **➕ Add Product**
3. Fill in name, category, price, description
4. Upload a product image (it uploads to Supabase Storage automatically)
5. Toggle **Visible on site** on/off at any time
6. Click **Save Product** — it appears on the live site instantly

### Adding Gallery Images
1. Click **Gallery** in the sidebar
2. Click **📸 Add Image**
3. Upload the image, add a title and caption
4. Set **Sort Order** (0 = first, higher numbers = later)
5. Toggle visibility on/off instantly

### Managing Orders
- Orders appear automatically when customers checkout via WhatsApp cart
- Update status: `Pending → Confirmed → Printing → Dispatched → Delivered`
- Customer sees their status on the **Track Order** section of the site

### Viewing Messages
- All contact form submissions appear here
- Click **WhatsApp** or **Email** to reply directly

---

## 🔄 How to Update Products Without Touching Code

You **never need to edit any code** to:
- ✅ Add or remove products
- ✅ Change prices
- ✅ Upload new gallery photos
- ✅ Hide/show items instantly
- ✅ Update order statuses

Just go to `admin.html` and everything is point-and-click.

---

## 🔒 Security Notes

- The `admin.html` page is protected by Supabase Authentication — only logged-in users can write data
- The anon key in `supabase.js` is safe to be public — it only allows what the Row Level Security policies permit (public read, auth write)
- Never share your Supabase **service_role** key (that one bypasses all security)
- For extra security, you can password-protect `admin.html` via a `.htaccess` file or Cloudflare Access

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

Contact form submissions go directly to your Supabase `messages` table and are visible in the admin panel.

For Supabase questions: [supabase.com/docs](https://supabase.com/docs)
For GitHub Pages questions: [docs.github.com/pages](https://docs.github.com/en/pages)
