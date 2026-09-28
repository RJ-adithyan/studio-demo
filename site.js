// Shared navigation and motion. Content stays readable when a CDN is unavailable.
const WHATSAPP_NUMBER = "";
const WHATSAPP_TEXT = "Hi RJ, I saw the Studio Tharaavu sample. I'd like a site like this for my studio.";

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
  const sampleBar = document.querySelector('.sample-bar');
  try {
    if (sessionStorage.getItem('tharaavu-sample-bar-dismissed')) document.documentElement.classList.add('sample-bar-dismissed');
  } catch { /* Keep the bar visible when storage is unavailable. */ }
  sampleBar?.querySelector('.sample-bar-close').addEventListener('click', () => {
    document.documentElement.classList.add('sample-bar-dismissed');
    try { sessionStorage.setItem('tharaavu-sample-bar-dismissed', '1'); } catch { /* Dismiss for this page only. */ }
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

  function setupWalk(ScrollTrigger) {
    const walk = document.querySelector('.walk-section');
    if (!walk) return () => {};
    const canvas = walk.querySelector('.walk-canvas');
    const context = canvas.getContext('2d');
    if (!context) return () => {};
    const captions = [...walk.querySelectorAll('.walk-captions p')];
    const portrait = matchMedia('(orientation: portrait), (max-width: 767px)');
    let sourceKey, images, requested, wanted, next, inFlight, preloading, displayed = -1, generation = 0;
    let trigger, observer;

    const frameUrl = index => `images/walk-${sourceKey}/f${String(index + 1).padStart(3, '0')}.webp`;
    const draw = () => {
      if (!canvas.width || !images?.[0]) return;
      let closest = 0;
      for (let index = 1; index < images.length; index++) {
        if (images[index] && Math.abs(index - wanted) < Math.abs(closest - wanted)) closest = index;
      }
      if (closest === displayed) return;
      const image = images[closest];
      const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
      const width = canvas.width / scale;
      const height = canvas.height / scale;
      context.drawImage(image, (image.naturalWidth - width) / 2, (image.naturalHeight - height) / 2,
        width, height, 0, 0, canvas.width, canvas.height);
      displayed = closest;
    };
    const resizeCanvas = () => {
      if (!walk.classList.contains('walk-ready')) return;
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(devicePixelRatio || 1, 2);
      const width = Math.round(rect.width * ratio);
      const height = Math.round(rect.height * ratio);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        displayed = -1;
      }
      draw();
    };
    const showCaptions = progress => {
      captions.forEach((caption, index) => {
        const enter = index ? Math.min(1, Math.max(0, (progress - index / 3 + .025) / .05)) : 1;
        const leave = index < 2 ? Math.min(1, Math.max(0, ((index + 1) / 3 + .025 - progress) / .05)) : 1;
        caption.style.opacity = Math.min(enter, leave);
      });
    };
    const pump = () => {
      if (!preloading) return;
      while (inFlight < 4) {
        let index;
        if (!requested.has(wanted)) index = wanted;
        else {
          while (next < 96 && requested.has(next)) next++;
          if (next === 96) break;
          index = next++;
        }
        requested.add(index);
        const token = generation;
        const image = new Image();
        inFlight++;
        image.onload = () => {
          if (token !== generation) return;
          images[index] = image;
          inFlight--;
          draw();
          pump();
        };
        image.onerror = () => { if (token === generation) { inFlight--; pump(); } };
        image.src = frameUrl(index);
      }
    };
    const start = () => {
      generation++;
      trigger?.kill();
      observer?.disconnect();
      walk.classList.remove('walk-ready');
      sourceKey = portrait.matches ? 'm' : 'd';
      images = [];
      requested = new Set([0]);
      wanted = 0;
      next = 1;
      inFlight = 0;
      preloading = false;
      displayed = -1;
      const token = generation;
      const first = new Image();
      first.onload = () => {
        if (token !== generation) return;
        images[0] = first;
        walk.classList.add('walk-ready');
        resizeCanvas();
        trigger = ScrollTrigger.create({
          trigger: walk, start: 'top top',
          end: () => '+=' + Math.round(innerHeight * (portrait.matches ? 1.8 : 2.5)),
          pin: true, scrub: true,
          onUpdate(self) {
            wanted = Math.round(self.progress * 95);
            draw();
            if (self.isActive) { preloading = true; pump(); }
            showCaptions(self.progress);
          },
        });
        wanted = Math.round(trigger.progress * 95);
        draw();
        showCaptions(trigger.progress);
        observer = new IntersectionObserver(entries => {
          if (!entries.some(entry => entry.isIntersecting)) return;
          observer.disconnect();
          preloading = true;
          pump();
        }, { rootMargin: '100% 0px' });
        observer.observe(walk);
        ScrollTrigger.refresh();
      };
      first.src = frameUrl(0);
    };
    const onResize = () => {
      if (sourceKey !== (portrait.matches ? 'm' : 'd')) start();
      else resizeCanvas();
    };
    portrait.addEventListener('change', onResize);
    addEventListener('resize', onResize);
    addEventListener('orientationchange', onResize);
    start();
    return () => {
      generation++;
      portrait.removeEventListener('change', onResize);
      removeEventListener('resize', onResize);
      removeEventListener('orientationchange', onResize);
      observer?.disconnect();
      trigger?.kill();
      walk.classList.remove('walk-ready');
    };
  }

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
      const phone = matchMedia('(max-width: 767px)');
      media.add('(prefers-reduced-motion: no-preference)', () => {
        const splits = [];
        const stopWalk = setupWalk(ScrollTrigger);
        document.querySelectorAll('[data-lines]').forEach(el => {
          const label = el.innerText.replace(/\s+/g, ' ').trim();
          splits.push(SplitText.create(el, {
            type: 'lines', mask: 'lines', linesClass: 'motion-line', autoSplit: true,
            onSplit(self) {
              el.setAttribute('aria-label', label);
              return gsap.from(self.lines, {
                yPercent: 100, duration: phone.matches ? 0.55 : 1.2, ease: 'expo.out', stagger: phone.matches ? 0.025 : 0.075,
                delay: !phone.matches && el.closest('.home-hero') ? Math.max(0, (900 - (performance.now() - introStarted)) / 1000) : 0,
                scrollTrigger: { trigger: el, start: phone.matches ? 'top 90%' : 'top 94%', once: true, fastScrollEnd: true,
                  onEnter: self => { if (Math.abs(self.getVelocity()) > 1200) self.animation?.progress(1); } },
              });
            },
          }));
        });
        document.querySelectorAll('[data-photo]').forEach(frame => {
          const img = frame.querySelector('img');
          if (!img) return;
          const tl = gsap.timeline({ scrollTrigger: { trigger: frame, start: phone.matches ? 'top 90%' : 'top 94%', once: true, fastScrollEnd: true,
            onEnter: self => { if (Math.abs(self.getVelocity()) > 1200) self.animation?.progress(1); } } });
          tl.fromTo(frame, { clipPath: 'inset(0 0 100% 0)' }, {
            clipPath: 'inset(0 0 0% 0)', duration: phone.matches ? 0.55 : 1.65, ease: 'power3.inOut', clearProps: 'clipPath',
          }).fromTo(img, { scale: 1.08 }, { scale: 1, duration: phone.matches ? 0.6 : 1.9, ease: 'power3.out' }, 0);
        });
        return () => { stopWalk(); splits.forEach(split => split.revert()); };
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

})();
