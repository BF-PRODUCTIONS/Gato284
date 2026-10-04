(() => {
  const root = document.documentElement;
  const body = document.body;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = document.getElementById('site-header');
  const backToTop = document.querySelector('.back-to-top');
  const menuToggle = document.querySelector('.menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileClose = document.querySelector('.mobile-close');
  let lastScrollY = window.scrollY;
  let scrollFrame = 0;
  let menuReturnFocus = null;

  // The hero uses the restaurant photo provided with the brief. Keep a local fallback
  // in case the original Google-hosted image is unavailable in a visitor's browser.
  document.querySelectorAll('img[data-fallback]').forEach((image) => {
    image.addEventListener('error', () => {
      if (image.dataset.didFallback) return;
      image.dataset.didFallback = 'true';
      image.src = image.dataset.fallback;
    });
  });

  requestAnimationFrame(() => body.classList.add('page-ready'));

  const updateScrollChrome = () => {
    const y = window.scrollY;
    header?.classList.toggle('is-scrolled', y > 28);
    backToTop?.classList.toggle('is-visible', y > 640);
    lastScrollY = y;
  };

  window.addEventListener('scroll', () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      updateScrollChrome();
      updateParallax();
      scrollFrame = 0;
    });
  }, { passive: true });
  updateScrollChrome();

  // Reveal content only when it approaches the viewport; no observer fallback keeps
  // every section readable on older browsers.
  const revealItems = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  // Subtle scroll depth on selected photographs. Transforms are written only while
  // the page is scrolling and only for elements near the viewport.
  const parallaxItems = [...document.querySelectorAll('[data-parallax]')];
  let parallaxAllowed = !reduceMotion && window.innerWidth > 680;
  function updateParallax() {
    if (!parallaxAllowed) return;
    const viewport = window.innerHeight || 1;
    parallaxItems.forEach((item) => {
      const rect = item.getBoundingClientRect();
      if (rect.bottom < -120 || rect.top > viewport + 120) return;
      const center = rect.top + rect.height * .5;
      const offset = Math.max(-17, Math.min(17, (viewport * .5 - center) * .035));
      item.style.setProperty('--parallax-y', `${offset.toFixed(1)}px`);
    });
  }
  window.addEventListener('resize', () => {
    parallaxAllowed = !reduceMotion && window.innerWidth > 680;
    if (!parallaxAllowed) parallaxItems.forEach((item) => item.style.removeProperty('--parallax-y'));
    updateParallax();
  }, { passive: true });
  updateParallax();

  // Mark the visible section in the desktop navigation.
  const navLinks = [...document.querySelectorAll('[data-nav-link]')];
  const navSections = ['inicio', 'cardapio', 'experiencia', 'avaliacoes', 'localizacao']
    .map((id) => document.getElementById(id)).filter(Boolean);
  if ('IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      navLinks.forEach((link) => {
        const active = link.getAttribute('href') === `#${visible.target.id}`;
        link.classList.toggle('is-active', active);
        if (active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }, { rootMargin: '-35% 0px -55% 0px', threshold: [0, .12, .35, .6] });
    navSections.forEach((section) => sectionObserver.observe(section));
  }

  // Count-up proof points, triggered once when seen.
  function formatCount(value, element) {
    const format = element.dataset.format;
    const prefix = element.dataset.prefix || '';
    const suffix = element.dataset.suffix || '';
    let formatted;
    if (format === 'decimal') formatted = Number(value).toFixed(1).replace('.', ',');
    else formatted = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(Math.round(value));
    return `${prefix}${formatted}${suffix}`;
  }
  function animateCount(element) {
    const target = Number(element.dataset.count);
    if (!Number.isFinite(target)) return;
    if (reduceMotion) {
      element.textContent = formatCount(target, element);
      return;
    }
    const duration = target > 1000 ? 1250 : 850;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = formatCount(target * eased, element);
      if (progress < 1) requestAnimationFrame(tick);
      else element.textContent = formatCount(target, element);
    };
    requestAnimationFrame(tick);
  }
  const counters = document.querySelectorAll('.number-value[data-count]');
  if ('IntersectionObserver' in window) {
    const countObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateCount(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: .45 });
    counters.forEach((counter) => countObserver.observe(counter));
  } else {
    counters.forEach(animateCount);
  }

  // Touch-friendly proof-point carousel: native horizontal scrolling and snap on mobile,
  // with accessible previous/next controls.
  const reviewRail = document.getElementById('review-cards');
  const reviewSlides = reviewRail ? [...reviewRail.querySelectorAll('.review-note')] : [];
  const reviewPrev = document.querySelector('[data-review-prev]');
  const reviewNext = document.querySelector('[data-review-next]');
  const reviewPage = document.querySelector('.review-page');
  let reviewScrollFrame = 0;
  function currentReviewIndex() {
    if (!reviewRail || !reviewSlides.length) return 0;
    const railLeft = reviewRail.getBoundingClientRect().left;
    return reviewSlides.reduce((closest, slide, index) => {
      const distance = Math.abs(slide.getBoundingClientRect().left - railLeft);
      const bestDistance = Math.abs(reviewSlides[closest].getBoundingClientRect().left - railLeft);
      return distance < bestDistance ? index : closest;
    }, 0);
  }
  function updateReviewControls() {
    if (!reviewSlides.length) return;
    const index = currentReviewIndex();
    if (reviewPage) reviewPage.textContent = `${String(index + 1).padStart(2, '0')} / ${String(reviewSlides.length).padStart(2, '0')}`;
    if (reviewPrev) reviewPrev.disabled = index === 0;
    if (reviewNext) reviewNext.disabled = index === reviewSlides.length - 1;
  }
  function moveReview(direction) {
    if (!reviewRail || !reviewSlides.length) return;
    const nextIndex = Math.max(0, Math.min(reviewSlides.length - 1, currentReviewIndex() + direction));
    const slide = reviewSlides[nextIndex];
    const left = reviewRail.scrollLeft + slide.getBoundingClientRect().left - reviewRail.getBoundingClientRect().left;
    reviewRail.scrollTo({ left, behavior: reduceMotion ? 'auto' : 'smooth' });
  }
  reviewPrev?.addEventListener('click', () => moveReview(-1));
  reviewNext?.addEventListener('click', () => moveReview(1));
  reviewRail?.addEventListener('scroll', () => {
    if (reviewScrollFrame) return;
    reviewScrollFrame = requestAnimationFrame(() => {
      updateReviewControls();
      reviewScrollFrame = 0;
    });
  }, { passive: true });
  window.addEventListener('resize', updateReviewControls, { passive: true });
  updateReviewControls();

  // Mobile navigation drawer, with a small focus trap and Escape support.
  function getMenuFocusables() {
    return [...mobileMenu.querySelectorAll('a[href], button:not([disabled])')]
      .filter((element) => element.offsetParent !== null);
  }
  function openMobileMenu() {
    if (!mobileMenu || !menuToggle) return;
    menuReturnFocus = document.activeElement;
    mobileMenu.inert = false;
    mobileMenu.removeAttribute('inert');
    mobileMenu.classList.add('is-open');
    mobileMenu.setAttribute('aria-hidden', 'false');
    menuToggle.setAttribute('aria-expanded', 'true');
    menuToggle.setAttribute('aria-label', 'Fechar menu');
    header.classList.add('menu-is-open');
    body.classList.add('menu-open');
    window.setTimeout(() => mobileClose?.focus(), reduceMotion ? 0 : 220);
  }
  function closeMobileMenu(restoreFocus = true) {
    if (!mobileMenu || !menuToggle) return;
    mobileMenu.classList.remove('is-open');
    mobileMenu.setAttribute('aria-hidden', 'true');
    mobileMenu.inert = true;
    mobileMenu.setAttribute('inert', '');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Abrir menu');
    header.classList.remove('menu-is-open');
    body.classList.remove('menu-open');
    if (restoreFocus && menuReturnFocus instanceof HTMLElement) menuReturnFocus.focus();
  }
  menuToggle?.addEventListener('click', () => {
    if (menuToggle.getAttribute('aria-expanded') === 'true') closeMobileMenu();
    else openMobileMenu();
  });
  mobileClose?.addEventListener('click', () => closeMobileMenu());
  mobileMenu?.addEventListener('click', (event) => {
    if (event.target.closest('a[href^="#"]')) closeMobileMenu(false);
  });
  mobileMenu?.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMobileMenu();
    }
    if (event.key !== 'Tab') return;
    const focusables = getMenuFocusables();
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 900 && menuToggle?.getAttribute('aria-expanded') === 'true') closeMobileMenu(false);
  }, { passive: true });

  // Native dialog helpers for dish details, menu contact, and the image lightbox.
  const dishDialog = document.getElementById('dish-dialog');
  const menuDialog = document.getElementById('menu-dialog');
  const lightboxDialog = document.getElementById('lightbox-dialog');
  const dishContent = {
    picanha: {
      title: 'Picanha Argentina',
      category: 'Mais pedido · Carnes',
      description: 'Um dos grandes favoritos da casa, servido para quem não abre mão de sabor e fartura.',
      image: 'assets/picanha-premium.webp',
      alt: 'Picanha grelhada sobre a brasa'
    },
    sobrecoxa: {
      title: 'Filé de Sobrecoxa',
      category: 'Aves · Destaques',
      description: 'Um dos sabores que aparecem entre os destaques dos clientes: comida brasileira, saborosa e feita para uma boa refeição.',
      image: 'assets/sobrecoxa-grelhada.webp',
      alt: 'Filés de sobrecoxa grelhados e dourados'
    },
    pirarucu: {
      title: 'Pirarucu',
      category: 'Peixes · Sabor brasileiro',
      description: 'Um dos destaques da casa para quem quer variar e aproveitar um sabor marcante da cozinha brasileira.',
      image: 'assets/pirarucu-na-brasa.webp',
      alt: 'Peixe amazônico preparado na brasa'
    }
  };
  const dishTitle = document.getElementById('dish-dialog-title');
  const dishCategory = document.getElementById('dish-dialog-category');
  const dishDescription = document.getElementById('dish-dialog-description');
  const dishImage = document.getElementById('dish-dialog-image');
  document.querySelectorAll('[data-dish]').forEach((button) => {
    button.addEventListener('click', () => {
      const item = dishContent[button.dataset.dish];
      if (!item || !dishDialog) return;
      dishTitle.textContent = item.title;
      dishCategory.textContent = item.category;
      dishDescription.textContent = item.description;
      dishImage.src = item.image;
      dishImage.alt = item.alt;
      dishDialog.showModal();
    });
  });

  document.querySelector('[data-open-menu]')?.addEventListener('click', () => menuDialog?.showModal());

  document.querySelectorAll('.dialog-close').forEach((button) => {
    button.addEventListener('click', () => button.closest('dialog')?.close());
  });
  [dishDialog, menuDialog, lightboxDialog].filter(Boolean).forEach((dialog) => {
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
  });

  // Filter controls also define the exact set used by the lightbox carousel.
  const galleryItems = [...document.querySelectorAll('[data-gallery-item]')];
  const filterButtons = [...document.querySelectorAll('[data-filter]')];
  const galleryCount = document.getElementById('gallery-visible-count');
  let visibleGalleryItems = galleryItems;
  function updateGalleryCount() {
    visibleGalleryItems = galleryItems.filter((item) => !item.hidden);
    if (galleryCount) galleryCount.textContent = String(visibleGalleryItems.length).padStart(2, '0');
  }
  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter;
      filterButtons.forEach((filterButton) => {
        const selected = filterButton === button;
        filterButton.classList.toggle('is-selected', selected);
        filterButton.setAttribute('aria-pressed', String(selected));
      });
      galleryItems.forEach((item) => {
        item.hidden = filter !== 'all' && item.dataset.category !== filter;
      });
      updateGalleryCount();
    });
  });
  updateGalleryCount();

  const lightboxImage = document.getElementById('lightbox-image');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const lightboxCount = document.getElementById('lightbox-count');
  let lightboxIndex = 0;
  function showLightboxImage(index) {
    if (!visibleGalleryItems.length) return;
    lightboxIndex = (index + visibleGalleryItems.length) % visibleGalleryItems.length;
    const item = visibleGalleryItems[lightboxIndex];
    const img = item.querySelector('img');
    lightboxImage.classList.remove('is-changing');
    lightboxImage.src = item.dataset.image || img.currentSrc || img.src;
    lightboxImage.alt = img.alt;
    lightboxCaption.textContent = item.dataset.title || img.alt;
    lightboxCount.textContent = `${String(lightboxIndex + 1).padStart(2, '0')} / ${String(visibleGalleryItems.length).padStart(2, '0')}`;
    requestAnimationFrame(() => lightboxImage.classList.add('is-changing'));
  }
  galleryItems.forEach((item) => {
    item.addEventListener('click', () => {
      updateGalleryCount();
      visibleGalleryItems = galleryItems.filter((galleryItem) => !galleryItem.hidden);
      const index = visibleGalleryItems.indexOf(item);
      showLightboxImage(index < 0 ? 0 : index);
      lightboxDialog.showModal();
    });
  });
  document.querySelector('.lightbox-prev')?.addEventListener('click', () => showLightboxImage(lightboxIndex - 1));
  document.querySelector('.lightbox-next')?.addEventListener('click', () => showLightboxImage(lightboxIndex + 1));
  document.querySelector('.lightbox-close')?.addEventListener('click', () => lightboxDialog.close());
  lightboxDialog?.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      showLightboxImage(lightboxIndex + 1);
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      showLightboxImage(lightboxIndex - 1);
    }
  });
  let touchStartX = 0;
  lightboxDialog?.addEventListener('touchstart', (event) => {
    touchStartX = event.changedTouches[0]?.clientX || 0;
  }, { passive: true });
  lightboxDialog?.addEventListener('touchend', (event) => {
    const touchEndX = event.changedTouches[0]?.clientX || 0;
    const delta = touchEndX - touchStartX;
    if (Math.abs(delta) < 55) return;
    showLightboxImage(lightboxIndex + (delta < 0 ? 1 : -1));
  }, { passive: true });

  backToTop?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  // A click on the brand/footer anchors closes the mobile drawer too.
  document.querySelectorAll('.brand[href="#inicio"]').forEach((brandLink) => {
    brandLink.addEventListener('click', () => {
      if (menuToggle?.getAttribute('aria-expanded') === 'true') closeMobileMenu(false);
    });
  });

  // Keep the last scroll value available for environments that use direction-aware
  // browser chrome; it also prevents stale state on initial paint.
  window.addEventListener('pageshow', () => {
    lastScrollY = window.scrollY;
    updateScrollChrome();
  });
  void lastScrollY;
})();
