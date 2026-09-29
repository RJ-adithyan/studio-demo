// Shared navigation and motion. Content stays readable when a CDN is unavailable.
const WHATSAPP_NUMBER = "918921983002";
const WHATSAPP_TEXT = "Hi RJ, I saw the Studio Tharaavu sample. I'd like a site like this for my studio.";

(() => {
  document.documentElement.classList.add('js');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 900px) and (hover: hover) and (pointer: fine)');
  const wide = matchMedia('(min-width: 900px)');
  let lenis;
  let intro;
  let introStarted = -2000;
  let tickerAttached = false;
  const showAll = () => document.documentElement.classList.remove('motion-pending');
  const phone = innerWidth < 1200;
  const transitionKey = 'tharaavu-next-page';
  let entering = false;
  try {
    entering = !reduced.matches && sessionStorage.getItem(transitionKey) === location.pathname + location.search;
    sessionStorage.removeItem(transitionKey);
  } catch { /* Navigation still works without storage. */ }
  if (entering) {
    scrollTo(0, 0);
    document.documentElement.classList.add('page-entering');
    setTimeout(() => {
      document.documentElement.classList.remove('page-entering');
      window.ScrollTrigger?.refresh();
    }, phone ? 800 : 1450);
  }

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
  addEventListener('pageshow', event => {
    if (event.persisted) {
      leaving = false;
      showAll();
      intro?.remove();
      setMenu(false);
      document.documentElement.classList.remove('page-leaving', 'page-leave-active', 'page-entering');
      document.querySelector('.page-leave-overlay')?.remove();
      lenis?.start();
    }
  });

  let leaving = false;
  document.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
        !link || reduced.matches || leaving || link.target || link.hasAttribute('download') || link.hasAttribute('data-wa') ||
        link.hasAttribute('data-taxi-ignore')) return;
    const href = link.getAttribute('href');
    if (!href || href.includes('#') || /^(?:mailto:|tel:|javascript:)/i.test(href)) return;
    const target = new URL(href, location.href);
    const folder = location.pathname.slice(0, location.pathname.lastIndexOf('/') + 1);
    if (target.origin !== location.origin || !target.pathname.endsWith('.html') || !target.pathname.startsWith(folder) ||
        target.pathname.slice(folder.length).includes('/') || target.href === location.href) return;
    event.preventDefault();
    leaving = true;
    setMenu(false);
    lenis?.stop();
    const overlay = document.createElement('div');
    overlay.className = 'page-leave-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    document.body.append(overlay);
    document.documentElement.classList.add('page-leaving');
    requestAnimationFrame(() => document.documentElement.classList.add('page-leave-active'));
    setTimeout(() => {
      try { sessionStorage.setItem(transitionKey, target.pathname + target.search); } catch { /* Enter without animation. */ }
      location.assign(target.href);
    }, phone ? 300 : 500);
  });

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
  const GSAP = 'https:/' + '/cdn.jsdelivr.net/npm/gsap@3.13.0/dist/';
  const gsapReady = loadScript(GSAP + 'gsap.min.js')
    .then(() => Promise.all(['ScrollTrigger', 'SplitText', 'CustomEase'].map(name => loadScript(GSAP + name + '.min.js'))));
  gsapReady.catch(showAll);

  async function syncScrolling() {
    if (reduced.matches || !desktop.matches || navigator.maxTouchPoints > 0) {
      lenis?.destroy();
      lenis = undefined;
      return;
    }
    try {
      await Promise.all([gsapReady.catch(() => {}), loadScript('https://cdn.jsdelivr.net/npm/lenis@1.3.8/dist/lenis.min.js')]);
      if (!lenis && !reduced.matches && desktop.matches && navigator.maxTouchPoints === 0) {
        const ticker = window.gsap?.ticker;
        lenis = new window.Lenis({ duration: 1, easing: t => 1 - Math.pow(1 - t, 5), smoothWheel: true, syncTouch: false, autoRaf: !ticker });
        lenis.on('scroll', () => window.ScrollTrigger?.update());
        if (ticker && !tickerAttached) {
          ticker.add(time => lenis?.raf(time * 1000));
          ticker.lagSmoothing(0);
          tickerAttached = true;
        }
        if (entering) lenis.scrollTo(0, { immediate: true, force: true });
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

  function setupWalkVideo() {
    const walk = document.querySelector('.walk-section');
    if (!walk) return;
    const video = walk.querySelector('.walk-video');
    const portrait = matchMedia('(orientation: portrait), (max-width: 767px)');
    let nearby = false;
    let sourceKey;

    const syncVideo = () => {
      const key = portrait.matches ? 'm' : 'd';
      video.poster = `video/walk-${key}-poster.jpg`;
      video.autoplay = !reduced.matches;
      if (sourceKey !== key || reduced.matches) {
        video.pause();
        walk.classList.remove('walk-playing');
        if (video.hasAttribute('src')) {
          video.removeAttribute('src');
          video.load();
        }
        sourceKey = key;
      }
      if (!nearby || document.hidden || reduced.matches) {
        video.pause();
        return;
      }
      if (!video.hasAttribute('src')) {
        video.src = `video/walk-${key}.mp4`;
        video.load();
      }
      video.play().catch(() => { /* Poster remains visible when autoplay is blocked. */ });
    };
    video.addEventListener('playing', () => walk.classList.add('walk-playing'));
    portrait.addEventListener('change', syncVideo);
    reduced.addEventListener('change', syncVideo);
    document.addEventListener('visibilitychange', syncVideo);
    syncVideo();
    const observer = new IntersectionObserver(entries => {
      nearby = entries[0].isIntersecting;
      syncVideo();
    }, { rootMargin: '100% 0px' });
    observer.observe(walk);
  }
  setupWalkVideo();

  // Only a photo in the first screen gets the opening reveal; the rest reveal on scroll.
  const heroPhoto = () => {
    const first = [...document.querySelectorAll('[data-photo]')].find(frame => !frame.closest('.works-item'));
    return first && first.getBoundingClientRect().top < innerHeight ? first : null;
  };

  async function startMotion() {
    try {
      await Promise.all([document.fonts.ready, gsapReady]);
      const { gsap, ScrollTrigger, SplitText, CustomEase } = window;
      if (!gsap || !ScrollTrigger) return showAll();
      gsap.registerPlugin(ScrollTrigger);
      ScrollTrigger.config({ ignoreMobileResize: true });
      ScrollTrigger.normalizeScroll(false);
      if (SplitText) gsap.registerPlugin(SplitText);
      if (CustomEase) gsap.registerPlugin(CustomEase);
      const fastEase = CustomEase ? CustomEase.create('tharaavuFast', 'M0,0 C0.094,0.026 0.124,0.127 0.157,0.29 0.197,0.486 0.254,0.8 0.348,0.884 0.42,0.949 0.374,1 1,1') : 'power2.inOut';
      const media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        const textItems = [];
        let resizeTimer;
        let width = innerWidth;
        const makeSplit = item => {
          item.split = SplitText.create(item.el, { type: 'lines', mask: 'lines', linesClass: 'motion-line' });
          gsap.set(item.split.lines, { yPercent: 100 });
          item.trigger = ScrollTrigger.create({
            trigger: item.el, start: 'top 90%', once: true,
            onEnter: () => {
              item.revealed = true;
              item.tween = gsap.to(item.split.lines, {
                yPercent: 0, duration: phone ? 0.8 : 1.2, ease: 'expo.out',
                stagger: phone ? 0.05 : /^H[1-3]$/.test(item.el.tagName) ? 0.1 : 0.08,
                delay: entering && item.el.closest('.page-header, .home-hero') ? (phone ? 0.2 : 0.6) :
                  item.el.closest('.home-hero, .page-header') ? Math.max(0, (900 - (performance.now() - introStarted)) / 1000) : 0,
              });
            },
          });
        };
        if (SplitText) {
          const targets = [...document.querySelectorAll('main h1, main h2, main h3, main p')]
            .filter(el => !el.closest('a, button, .walk-captions, .works-item') && el.textContent.trim());
          for (const el of targets) {
            const item = { el, revealed: false, split: null, trigger: null, tween: null };
            makeSplit(item);
            textItems.push(item);
          }
        }
        const onResize = event => {
          if (event?.type === 'resize' && innerWidth === width) return;
          width = innerWidth;
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(() => {
            for (const item of textItems) {
              item.trigger?.kill();
              item.tween?.kill();
              item.split?.revert();
              if (item.revealed) {
                item.split = null;
                continue;
              }
              makeSplit(item);
            }
            ScrollTrigger.refresh();
          }, 100);
        };
        addEventListener('resize', onResize);
        // ponytail: a late web font changes line breaks, so re-split lines that have not revealed yet.
        document.fonts.addEventListener('loadingdone', onResize);

        const first = heroPhoto();
        if (first) {
          const image = first.querySelector('img');
          const mobile = phone;
          const delay = Math.max(entering ? (mobile ? 0.1 : 0.3) : mobile ? 0 : 0.2, (900 - (performance.now() - introStarted)) / 1000);
          gsap.timeline({ delay, defaults: { duration: 1.35, ease: fastEase } })
            .fromTo(first, { clipPath: `inset(${mobile ? 90 : 50}% 35% 0%)` },
              { clipPath: 'inset(0% 0% 0%)', clearProps: 'clipPath' })
            .fromTo(image, { scale: 0.95 }, { scale: 1 }, 0);
        }

        const walk = document.querySelector('.walk-section');
        if (walk) {
          const walkMedia = walk.querySelector('.walk-media');
          gsap.fromTo(walkMedia, { clipPath: 'inset(12% 8% round 4px)' }, {
            clipPath: 'inset(0% 0% round 0px)', ease: 'none',
            scrollTrigger: { trigger: walk, start: 'top bottom', end: 'top top', scrub: 0.5 },
          });
          gsap.fromTo(walk.querySelectorAll('.walk-poster, .walk-video'), { scale: 1.15 }, {
            scale: 1, ease: 'none',
            scrollTrigger: { trigger: walk, start: 'top bottom', end: 'top top', scrub: 0.5 },
          });
          gsap.from(walk.querySelectorAll('.walk-captions p'), {
            opacity: 0, y: 16, duration: 0.9, stagger: 0.22, ease: 'power2.out',
            scrollTrigger: { trigger: walk, start: 'top 70%', once: true },
          });
        }
        ScrollTrigger.refresh();
        showAll();
        return () => {
          clearTimeout(resizeTimer);
          removeEventListener('resize', onResize);
          document.fonts.removeEventListener('loadingdone', onResize);
          textItems.forEach(item => { item.trigger?.kill(); item.tween?.kill(); item.split?.revert(); });
        };
      });
      media.add({ motion: '(prefers-reduced-motion: no-preference)', compact: '(max-width: 1199px)' }, context => {
        if (!context.conditions.motion) return;
        const compact = context.conditions.compact;
        const vision = document.querySelector('.about-vision [data-vision-photo]');
        if (vision) {
          gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: { trigger: vision, start: 'top bottom', end: 'top top', scrub: .6 },
          })
            .fromTo(vision, { clipPath: compact ? 'inset(10% 12% 10% 12%)' : 'inset(18% 24% 18% 24%)' }, { clipPath: 'inset(0% 0% 0% 0%)' }, 0)
            .fromTo(vision.querySelector('img'), { scale: compact ? 1.1 : 1.2 }, { scale: 1 }, 0);
        }
        document.querySelectorAll(compact ? '.about-steps .service-heading' : '.about-steps .service-heading, .services-stack .service-heading').forEach(heading => {
          gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: { trigger: heading.closest('.service'), start: 'top bottom', end: 'top 30%', scrub: .1 },
          })
            .fromTo(heading.querySelector('.service-bracket--left'), { xPercent: 0 }, { xPercent: compact ? -55 : -90 }, 0)
            .fromTo(heading.querySelector('.service-bracket--right'), { xPercent: 0 }, { xPercent: compact ? 55 : 90 }, 0);
        });
        const stack = document.querySelector('.services-stack');
        if (stack) {
          document.documentElement.classList.add('motion-stack-ready');
          const cards = [...stack.querySelectorAll('.service')];
          let stackWidth = innerWidth;
          let stackTimer;
          const syncStackCards = () => {
            const viewportHeight = window.visualViewport?.height || innerHeight;
            cards.forEach((card, index) => {
              card.classList.remove('stack-scroll');
              if (compact && card.offsetHeight > viewportHeight - parseFloat(getComputedStyle(card).top)) {
                card.classList.add('stack-scroll');
              }
            });
          };
          cards.forEach((card, index) => {
            card.style.setProperty('--stack-index', index);
          });
          syncStackCards();
          cards.forEach((card, index) => {
            if (index === cards.length - 1) return;
            if (card.classList.contains('stack-scroll')) return;
            gsap.to(card, {
              scale: compact ? .98 : .95, y: compact ? 16 : 50, ease: 'none',
              scrollTrigger: { trigger: cards[index + 1], start: 'top bottom', end: 'top 60%', scrub: .2 },
            });
          });
          const onStackResize = () => {
            if (innerWidth === stackWidth) return;
            stackWidth = innerWidth;
            clearTimeout(stackTimer);
            stackTimer = setTimeout(() => { syncStackCards(); ScrollTrigger.refresh(); }, 120);
          };
          addEventListener('resize', onStackResize);
          sampleBar?.querySelector('.sample-bar-close').addEventListener('click', syncStackCards);
          stack.cleanup = () => {
            clearTimeout(stackTimer);
            removeEventListener('resize', onStackResize);
            sampleBar?.querySelector('.sample-bar-close').removeEventListener('click', syncStackCards);
            cards.forEach(card => card.classList.remove('stack-scroll'));
          };
          ScrollTrigger.refresh();
        }
        document.querySelectorAll('.works-item').forEach(item => {
          const heading = item.querySelector('.works-heading');
          const left = item.querySelector('.works-bracket--left');
          const right = item.querySelector('.works-bracket--right');
          const title = item.querySelector('.works-title');
          const frame = item.querySelector('.works-image-wrapper');
          const img = frame.querySelector('img');
          const edgeX = (bracket, fraction) => () => heading.clientWidth * fraction - bracket.offsetLeft - bracket.offsetWidth / 2;
          const leftX = edgeX(left, compact ? .04 : .1);
          const rightX = edgeX(right, compact ? .96 : .9);

          gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: { trigger: item, start: 'top bottom', end: 'top 10%', scrub: .1, invalidateOnRefresh: true },
          })
            .fromTo(left, { x: 0 }, { x: leftX }, 0)
            .fromTo(right, { x: 0 }, { x: rightX }, 0)
            .fromTo(title, { letterSpacing: '0em' }, { letterSpacing: '0.04em' }, 0)
            .fromTo(frame, { scale: compact ? .6 : .4, yPercent: 0 }, { scale: 1, yPercent: 0 }, 0)
            .fromTo(img, { scale: compact ? 1.3 : 1.75 }, { scale: 1 }, 0);

          gsap.timeline({
            defaults: { ease: 'none', immediateRender: false },
            scrollTrigger: { trigger: item, start: 'top top', end: 'bottom top', scrub: .1, invalidateOnRefresh: true },
          })
            .fromTo(left, { x: leftX }, { x: 0 }, 0)
            .fromTo(right, { x: rightX }, { x: 0 }, 0)
            .fromTo(title, { letterSpacing: '0.04em' }, { letterSpacing: '0em' }, 0)
            .fromTo(frame, { scale: 1, yPercent: 0 }, { scale: compact ? .6 : .2, yPercent: compact ? -12 : -40 }, 0)
            .fromTo(img, { scale: 1 }, { scale: compact ? 1.3 : 1.75 }, 0);
        });
        const first = heroPhoto();
        document.querySelectorAll('[data-photo]').forEach(frame => {
          if (frame === first || frame.closest('.works-item')) return;
          const img = frame.querySelector('img');
          if (!img) return;
          const tl = gsap.timeline({ scrollTrigger: { trigger: frame, start: 'clamp(top bottom)', end: 'bottom bottom', scrub: true } });
          tl.fromTo(frame, { clipPath: `inset(0% ${compact ? 10 : 20}px 0%)` }, { clipPath: 'inset(0% 0px 0%)', ease: 'none' })
            .fromTo(img, { scale: 1.015 }, { scale: 1, ease: 'none' }, 0);
        });
        document.querySelectorAll('[data-parallax]').forEach(frame => {
          gsap.fromTo(frame.querySelector('img'), { yPercent: compact ? -4.166 : -8.333 }, {
            yPercent: compact ? 4.166 : 8.333, ease: 'none',
            scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true },
          });
        });
        return () => {
          document.documentElement.classList.remove('motion-stack-ready');
          stack?.cleanup?.();
          stack?.querySelectorAll('.service').forEach(card => card.style.removeProperty('--stack-index'));
        };
      });
      ScrollTrigger.refresh();
      showAll();
    } catch {
      showAll();
      document.querySelectorAll('.motion-line').forEach(line => { line.style.transform = 'none'; });
      document.querySelectorAll('[data-photo]').forEach(frame => { frame.style.clipPath = 'none'; });
    }
  }
  startMotion();

})();
