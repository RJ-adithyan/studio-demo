// Shared navigation and motion. Content stays readable when a CDN is unavailable.
const WHATSAPP_NUMBER = '910000000000';
const WHATSAPP_TEXT = 'Hello, I saw your website and would like to talk about a project.';

(() => {
  document.documentElement.classList.add('js');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 900px) and (hover: hover) and (pointer: fine)');
  const wide = matchMedia('(min-width: 900px)');
  let lenis;
  let intro;
  let introStarted = -2000;

  document.querySelectorAll('[data-wa]').forEach(link => {
    link.href = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(WHATSAPP_TEXT);
    link.target = '_blank';
    link.rel = 'noopener';
  });
  const page = location.pathname.split('/').pop() || 'index.html';
  const current = /^project-\d+\.html$/.test(page) ? 'projects.html' : page;
  document.querySelectorAll('.nav-links a').forEach(link => {
    if (link.getAttribute('href') === current) link.setAttribute('aria-current', 'page');
  });
  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  const background = document.querySelectorAll('main, .site-footer, .wa-btn');
  const setMenu = open => {
    document.body.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Close' : 'Menu';
    background.forEach(el => { el.inert = open; });
    if (open) lenis?.stop();
    else lenis?.start();
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  links.addEventListener('click', event => {
    if (event.target.closest('a')) setMenu(false);
  });
  document.addEventListener('keydown', event => {
    if (toggle.getAttribute('aria-expanded') !== 'true') return;
    if (event.key === 'Escape') { setMenu(false); toggle.focus(); }
    if (event.key === 'Tab') {
      const last = links.querySelector('li:last-child a');
      if (event.shiftKey && document.activeElement === toggle) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); toggle.focus();
      }
    }
  });
  wide.addEventListener('change', () => { if (wide.matches) setMenu(false); });
  const header = document.querySelector('.site-header');
  const updateHeader = () => header.classList.toggle('is-scrolled', scrollY > 8);
  addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();

  // The curtain ends in 1.3s independently of fonts, WebGL or CDN loading.
  try {
    if (!reduced.matches && !sessionStorage.getItem('tharaavu-intro')) {
      sessionStorage.setItem('tharaavu-intro', 'seen');
      introStarted = performance.now();
      intro = document.createElement('div');
      intro.className = 'intro-screen';
      intro.setAttribute('aria-hidden', 'true');
      intro.innerHTML = '<span class="intro-wordmark">Studio Tharaavu</span>';
      document.body.append(intro);
      intro.addEventListener('animationend', event => {
        if (event.target === intro) intro.remove();
      });
      setTimeout(() => intro.remove(), 1400);
    }
  } catch { /* Unavailable session storage: skip the intro. */ }
  reduced.addEventListener('change', () => { if (reduced.matches) intro?.remove(); });
  addEventListener('pageshow', event => { if (event.persisted) { intro?.remove(); setMenu(false); } });

  const scripts = new Map();
  const loadScript = url => {
    if (!scripts.has(url)) scripts.set(url, new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = resolve;
      script.onerror = reject;
      document.head.append(script);
    }));
    return scripts.get(url);
  };

  async function syncScrolling() {
    if (reduced.matches || !desktop.matches) {
      lenis?.destroy();
      lenis = undefined;
      return;
    }
    try {
      await loadScript('https://cdn.jsdelivr.net/npm/lenis@1.3.11/dist/lenis.min.js');
      if (!lenis && !reduced.matches && desktop.matches) {
        lenis = new window.Lenis({ duration: 1.2, smoothWheel: true, syncTouch: false, autoRaf: true });
        lenis.on('scroll', () => window.ScrollTrigger?.update());
        if (document.body.classList.contains('nav-open')) lenis.stop();
      }
    } catch { /* Native scrolling is the fallback. */ }
  }
  desktop.addEventListener('change', syncScrolling);
  reduced.addEventListener('change', syncScrolling);
  syncScrolling();

  // Preserve native keyboard anchors and focus their real destination.
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', event => {
      const target = document.getElementById(link.hash.slice(1));
      if (!target || !lenis || event.detail === 0) return;
      event.preventDefault();
      lenis.scrollTo(target, { offset: -110, onComplete: () => {
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
        history.replaceState(null, '', link.hash);
      } });
    });
  });

  async function startMotion() {
    try {
      await loadScript('https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js');
      await Promise.all([
        loadScript('https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js'),
        loadScript('https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/SplitText.min.js'),
        document.fonts.ready,
      ]);
      const { gsap, ScrollTrigger, SplitText } = window;
      gsap.registerPlugin(ScrollTrigger, SplitText);
      const media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        const splits = [];
        document.querySelectorAll('[data-lines]').forEach(el => {
          const label = el.innerText.replace(/\s+/g, ' ').trim();
          splits.push(SplitText.create(el, {
            type: 'lines', mask: 'lines', linesClass: 'motion-line', autoSplit: true,
            onSplit(self) {
              el.setAttribute('aria-label', label);
              return gsap.from(self.lines, {
                yPercent: 100, duration: 1.2, ease: 'expo.out', stagger: 0.075,
                delay: el.closest('.home-hero') ? Math.max(0, (900 - (performance.now() - introStarted)) / 1000) : 0,
                scrollTrigger: { trigger: el, start: 'top 94%', once: true },
              });
            },
          }));
        });
        document.querySelectorAll('[data-photo]').forEach(frame => {
          const img = frame.querySelector('img');
          if (!img) return;
          const tl = gsap.timeline({ scrollTrigger: { trigger: frame, start: 'top 94%', once: true } });
          tl.fromTo(frame, { clipPath: 'inset(0 0 100% 0)' }, {
            clipPath: 'inset(0 0 0% 0)', duration: 1.65, ease: 'power3.inOut', clearProps: 'clipPath',
          }).fromTo(img, { scale: 1.08 }, { scale: 1, duration: 1.9, ease: 'power3.out' }, 0);
        });
        return () => splits.forEach(split => split.revert());
      });
      media.add('(min-width: 900px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)', () => {
        document.querySelectorAll('[data-parallax]').forEach(frame => {
          gsap.fromTo(frame.querySelector('img'), { yPercent: -2 }, {
            yPercent: 2, ease: 'none',
            scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: 0.8 },
          });
        });
      });
      ScrollTrigger.refresh();
    } catch { /* Optional animation failure leaves the original content readable. */ }
  }
  let motionStarted = false;
  const ensureMotion = () => {
    if (!reduced.matches && !motionStarted) { motionStarted = true; startMotion(); }
  };
  reduced.addEventListener('change', ensureMotion);
  ensureMotion();

  const stage = document.querySelector('#hero3d');
  if (stage) {
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      import('./hero3d.js?v=2.2').catch(() => { stage.dataset.state = 'fallback'; });
    }, { rootMargin: '500px' });
    observer.observe(stage);
  }
})();
