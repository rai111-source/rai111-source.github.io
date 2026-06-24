// Vercel Speed Insights initialization
// This script dynamically injects Vercel Speed Insights for a vanilla HTML/JS website.
window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

if (!isLocalhost && !document.querySelector('script[src="/_vercel/speed-insights/script.js"]')) {
  const script = document.createElement('script');
  script.src = '/_vercel/speed-insights/script.js';
  script.defer = true;
  document.head.appendChild(script);
}

