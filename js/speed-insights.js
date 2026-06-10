// Vercel Speed Insights initialization
// This script dynamically injects Vercel Speed Insights for a vanilla HTML/JS website.
window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };

if (!document.querySelector('script[src="/_vercel/speed-insights/script.js"]')) {
  const script = document.createElement('script');
  script.src = '/_vercel/speed-insights/script.js';
  script.defer = true;
  document.head.appendChild(script);
}

