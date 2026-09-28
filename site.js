// Demo studio — shared script. Load on every page with: <script src="site.js" defer></script>

// RJ: put the real WhatsApp number here (country code, no + or spaces).
const WHATSAPP_NUMBER = '910000000000';
const WHATSAPP_TEXT = 'Hello, I saw your website and would like to talk about a project.';

document.documentElement.classList.add('js');

// WhatsApp links: any element with data-wa gets the wa.me link.
document.querySelectorAll('[data-wa]').forEach(a => {
  a.href = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(WHATSAPP_TEXT);
  a.target = '_blank';
  a.rel = 'noopener';
});

// Mark the current page in the nav.
const page = location.pathname.split('/').pop() || 'index.html';
const current = /^project-\d+\.html$/.test(page) ? 'projects.html' : page;
document.querySelectorAll('.nav-links a').forEach(a => {
  if (a.getAttribute('href') === current) a.setAttribute('aria-current', 'page');
});

// Phone menu.
const toggle = document.querySelector('.nav-toggle');
if (toggle) {
  toggle.addEventListener('click', () => {
    const open = document.body.classList.toggle('nav-open');
    toggle.setAttribute('aria-expanded', open);
    toggle.textContent = open ? 'Close' : 'Menu';
  });
}

// Hairline under the header once the page scrolls.
const header = document.querySelector('.site-header');
if (header) {
  const onScroll = () => header.classList.toggle('is-scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// Fade in on scroll. Reduced motion is handled in CSS (.fade shows at once).
const fades = document.querySelectorAll('.fade');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  fades.forEach(el => io.observe(el));
} else {
  fades.forEach(el => el.classList.add('is-visible'));
}

// Footer year.
document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
