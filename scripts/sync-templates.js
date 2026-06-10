const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

// HTML files to synchronize
const htmlFiles = [
  'index.html',
  'admin.html',
  'cart.html',
  'checkout.html',
  'custom-gifts.html',
  'gallery.html',
  'login.html',
  'logout.html',
  'product.html',
  'products.html',
  'profile.html',
  'prototyping.html',
  'track.html'
];

// ── EXTRACT TEMPLATES FROM INDEX.HTML ─────────────────────────
const indexFile = path.join(rootDir, 'index.html');
let indexContent = fs.readFileSync(indexFile, 'utf8');

// Helper to extract outer tags/blocks
function extractTag(html, startTag, endTag) {
  const startIdx = html.indexOf(startTag);
  if (startIdx === -1) return null;
  const endIdx = html.indexOf(endTag, startIdx);
  if (endIdx === -1) return null;
  return html.substring(startIdx, endIdx + endTag.length);
}

// Helper to extract by comments
function extractByComments(html, startComment, endComment) {
  const startIdx = html.indexOf(startComment);
  if (startIdx === -1) return null;
  const endIdx = html.indexOf(endComment, startIdx);
  if (endIdx === -1) return null;
  return html.substring(startIdx, endIdx + endComment.length);
}

// 1. Extract Topbar
const topbarSource = extractTag(indexContent, '<div class="topbar">', '</div>');
// 2. Extract Nav & Mobnav
const navSource = extractTag(indexContent, '<nav>', '</nav>');
const mobnavSource = extractTag(indexContent, '<div class="mobnav"', '</div>');
// 3. Extract Footer
const footerSource = extractTag(indexContent, '<footer>', '</footer>');
// 4. Extract Notification
const notifSource = extractTag(indexContent, '<div class="notif"', '</div>');

if (!topbarSource || !navSource || !mobnavSource || !footerSource) {
  console.error('Failed to extract templates from index.html!');
  process.exit(1);
}

console.log('Successfully extracted templates from index.html');

// ── SYNC TARGET FILES ──────────────────────────────────────────
htmlFiles.forEach(file => {
  if (file === 'index.html') return; // Skip source of truth

  const filePath = path.join(rootDir, file);
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping missing file: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Adapt links for non-index pages (e.g. href="#home" -> href="index.html#home")
  const adaptLinks = (blockText) => {
    return blockText
      .replace(/href="#home"/g, 'href="index.html#home"')
      .replace(/href="#how"/g, 'href="index.html#how"')
      .replace(/href="#services"/g, 'href="index.html#services"')
      .replace(/href="#contact"/g, 'href="index.html#contact"')
      .replace(/href="#about"/g, 'href="index.html#about"');
  };

  // Replace Topbar
  const targetTopbar = extractTag(content, '<div class="topbar">', '</div>');
  if (targetTopbar) {
    content = content.replace(targetTopbar, adaptLinks(topbarSource));
  }

  // Replace Nav
  const targetNav = extractTag(content, '<nav>', '</nav>');
  if (targetNav) {
    // Preserve custom cart-pill href on non-index pages if they already use a link instead of onclick
    let navBlock = adaptLinks(navSource);
    if (file !== 'index.html' && targetNav.includes('href="cart.html"')) {
      navBlock = navBlock.replace(/onclick="toggleCart\(\)"/g, 'href="cart.html" style="text-decoration: none;"');
    }
    content = content.replace(targetNav, navBlock);
  }

  // Replace Mobnav
  const targetMobnav = extractTag(content, '<div class="mobnav"', '</div>');
  if (targetMobnav) {
    content = content.replace(targetMobnav, adaptLinks(mobnavSource));
  }

  // Replace Footer
  const targetFooter = extractTag(content, '<footer>', '</footer>');
  if (targetFooter) {
    content = content.replace(targetFooter, adaptLinks(footerSource));
  }

  // Replace Notification
  const targetNotif = extractTag(content, '<div class="notif"', '</div>');
  if (targetNotif) {
    content = content.replace(targetNotif, notifSource);
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Synchronized components in: ${file}`);
  } else {
    console.log(`- Already up to date: ${file}`);
  }
});

console.log('Template synchronization complete.');
