// Image reveal on load
document.querySelectorAll('img').forEach(function(img) {
  if (img.complete && img.naturalWidth > 0) {
    img.classList.add('loaded');
  } else {
    img.addEventListener('load', function() { img.classList.add('loaded'); });
  }
});

// Slideshow
(function() {
  var slides = document.querySelectorAll('.slide');
  if (!slides.length) return;
  var idx = 0;
  slides[idx].classList.add('active');
  setInterval(function() {
    slides[idx].classList.remove('active');
    idx = (idx + 1) % slides.length;
    slides[idx].classList.add('active');
  }, 4000);
})();

// Gallery viewer (thumbnail strip + large image, no popup)
(function() {
  var items = Array.from(document.querySelectorAll('.stack-item'));
  var gridView = document.querySelector('.gallery-stack');
  var detailView = document.getElementById('gallery-detail');
  if (!items.length || !gridView || !detailView) return;

  var thumbCol    = detailView.querySelector('.thumb-col');
  var detailImg   = detailView.querySelector('.detail-img');
  var titleEl     = detailView.querySelector('.detail-title');
  var yearEl      = detailView.querySelector('.detail-year');
  var mediumEl    = detailView.querySelector('.detail-medium');
  var dimsEl      = detailView.querySelector('.detail-dimensions');
  var btnPrev     = detailView.querySelector('.nav-prev');
  var btnNext     = detailView.querySelector('.nav-next');
  var btnClose    = detailView.querySelector('.nav-close');

  var currentIdx = 0;

  var works = items.map(function(item) {
    return {
      src:        item.dataset.src        || '',
      title:      item.dataset.title      || '',
      year:       item.dataset.year       || '',
      medium:     item.dataset.medium     || '',
      dimensions: item.dataset.dimensions || ''
    };
  });

  // Build thumbnail strip from data
  var thumbEls = works.map(function(work, i) {
    var wrap = document.createElement('div');
    wrap.className = 'thumb-item';
    var img = document.createElement('img');
    img.src = work.src;
    img.alt = work.title;
    wrap.appendChild(img);
    thumbCol.appendChild(wrap);
    wrap.addEventListener('click', function() { showWork(i); });
    return wrap;
  });

  // Click grid image → open detail view
  items.forEach(function(item, i) {
    item.addEventListener('click', function() {
      // Reset scroll to the top first: .detail-left is position:sticky, so
      // opening while the page is scrolled down (grid clicked further down)
      // would make it stick at the wrong vertical offset.
      window.scrollTo(0, 0);
      gridView.style.display = 'none';
      detailView.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      showWork(i);
      updateSb(); // layout is now visible — compute scrollbar dimensions
    });
  });

  function showWork(index) {
    currentIdx = index;
    var work = works[index];

    detailImg.classList.remove('loaded');
    detailImg.src = '';
    detailImg.src = work.src;
    detailImg.addEventListener('load', function() {
      detailImg.classList.add('loaded');
    }, { once: true });

    titleEl.textContent  = work.title;
    yearEl.textContent   = work.year;
    mediumEl.textContent = work.medium;
    dimsEl.textContent   = work.dimensions;

    thumbEls.forEach(function(t, i) {
      t.classList.toggle('active', i === index);
    });

    // Scroll active thumb into view (mobile horizontal strip)
    thumbEls[index].scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  // Custom scrollbar: short fixed-height thumb, auto-hide, drag support
  var sbTrack = document.createElement('div');
  sbTrack.className = 'thumb-sb-track';
  var sbThumb = document.createElement('div');
  sbThumb.className = 'thumb-sb-thumb';
  sbTrack.appendChild(sbThumb);
  thumbCol.parentNode.insertBefore(sbTrack, thumbCol.nextSibling);

  function updateSb() {
    var sh = thumbCol.scrollHeight, ch = thumbCol.clientHeight;
    if (sh <= ch) { sbTrack.style.display = 'none'; return; }
    sbTrack.style.display = '';
    var th = sbTrack.offsetHeight;
    var thumbH = Math.max(20, Math.round(th * 0.1));
    var top = Math.round((thumbCol.scrollTop / (sh - ch)) * (th - thumbH));
    sbThumb.style.height = thumbH + 'px';
    sbThumb.style.top = top + 'px';
  }

  // Track background fades in only during active scroll or drag; thumb is always visible
  // NOTE: opacity cannot be used on the track — it would make the child thumb invisible too.
  // Instead we toggle background-color: transparent ↔ #e0e0e0 (CSS transition handles the fade).
  var sbFade;
  function sbShow() { clearTimeout(sbFade); sbTrack.style.background = '#e0e0e0'; }
  function sbHide(ms) { clearTimeout(sbFade); sbFade = setTimeout(function() { sbTrack.style.background = 'transparent'; }, ms); }

  thumbCol.addEventListener('scroll', function() { updateSb(); sbShow(); sbHide(1000); });

  var drag = false, dragY0, scrollTop0;
  sbThumb.addEventListener('mousedown', function(e) {
    drag = true; dragY0 = e.clientY; scrollTop0 = thumbCol.scrollTop;
    sbShow();
    e.preventDefault();
  });
  document.addEventListener('mousemove', function(e) {
    if (!drag) return;
    var sh = thumbCol.scrollHeight, ch = thumbCol.clientHeight;
    var th = sbTrack.offsetHeight, tH = sbThumb.offsetHeight;
    thumbCol.scrollTop = scrollTop0 + (e.clientY - dragY0) * (sh - ch) / (th - tH);
  });
  document.addEventListener('mouseup', function() {
    if (drag) { drag = false; sbHide(600); }
  });

  setTimeout(updateSb, 0);
  window.addEventListener('resize', updateSb);

  btnPrev.addEventListener('click', function() {
    showWork((currentIdx - 1 + works.length) % works.length);
  });

  btnNext.addEventListener('click', function() {
    showWork((currentIdx + 1) % works.length);
  });

  btnClose.addEventListener('click', function() {
    detailView.style.display = 'none';
    gridView.style.display = '';
    document.body.style.overflow = '';
  });

  document.addEventListener('keydown', function(e) {
    if (!detailView.style.display || detailView.style.display === 'none') return;
    if (e.key === 'ArrowLeft')  showWork((currentIdx - 1 + works.length) % works.length);
    if (e.key === 'ArrowRight') showWork((currentIdx + 1) % works.length);
    if (e.key === 'Escape')     btnClose.click();
  });
})();

// Series-scoped gallery viewer (painting.html: multiple series sections,
// one shared viewer whose thumbnail strip is rebuilt per series so it
// never mixes works from different series).
(function() {
  var landing = document.querySelector('.series-landing');
  var detailView = document.getElementById('gallery-detail');
  if (!landing || !detailView) return;

  var sections = Array.from(landing.querySelectorAll('.series-section'));
  if (!sections.length) return;

  var thumbCol  = detailView.querySelector('.thumb-col');
  var detailImg = detailView.querySelector('.detail-img');
  var titleEl   = detailView.querySelector('.detail-title');
  var yearEl    = detailView.querySelector('.detail-year');
  var mediumEl  = detailView.querySelector('.detail-medium');
  var dimsEl    = detailView.querySelector('.detail-dimensions');
  var btnPrev   = detailView.querySelector('.nav-prev');
  var btnNext   = detailView.querySelector('.nav-next');
  var btnClose  = detailView.querySelector('.nav-close');

  var works = [];
  var thumbEls = [];
  var currentIdx = 0;

  function showWork(index) {
    currentIdx = index;
    var work = works[index];

    detailImg.classList.remove('loaded');
    detailImg.src = '';
    detailImg.src = work.detailSrc;
    detailImg.addEventListener('load', function() {
      detailImg.classList.add('loaded');
    }, { once: true });

    titleEl.textContent  = work.title;
    yearEl.textContent   = work.year;
    mediumEl.textContent = work.medium;
    dimsEl.textContent   = work.dimensions;

    thumbEls.forEach(function(t, i) {
      t.classList.toggle('active', i === index);
    });

    thumbEls[index].scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  // Rebuild the shared thumbnail strip for just one series, then open it
  function openSeries(seriesItems, startIndex) {
    // seriesItems arrives in DOM order, which for "Eternal Sunshine" is
    // its two-column grid's left-column-then-right-column order (01,03,
    // 05,07,09,02,04,06,08,10) — not the numbered 1-10 sequence. data-order
    // (set only on that section's items) restores the intended viewing
    // order for the thumbnail strip and prev/next, independent of which
    // visual column each image happens to land in. Items without
    // data-order (every other section) fall back to their original index,
    // so this is a no-op there — already-correct DOM order stays correct.
    var startItem = seriesItems[startIndex];
    seriesItems = seriesItems
      .map(function(item, i) {
        return { item: item, order: item.dataset.order ? parseInt(item.dataset.order, 10) : i };
      })
      .sort(function(a, b) { return a.order - b.order; })
      .map(function(entry) { return entry.item; });
    startIndex = seriesItems.indexOf(startItem);

    works = seriesItems.map(function(item) {
      return {
        src:        item.dataset.src        || '',
        // data-detail-src is optional — only set it on a thumbnail when
        // that image needs a different crop/version in the detail viewer
        // than what's shown in the grid. Absent on every other item, so
        // they keep opening the same file as their thumbnail (unchanged).
        detailSrc:  item.dataset.detailSrc  || item.dataset.src || '',
        title:      item.dataset.title      || '',
        year:       item.dataset.year       || '',
        medium:     item.dataset.medium     || '',
        dimensions: item.dataset.dimensions || ''
      };
    });

    thumbCol.innerHTML = '';
    thumbEls = works.map(function(work, i) {
      var wrap = document.createElement('div');
      wrap.className = 'thumb-item';
      var img = document.createElement('img');
      img.src = work.src;
      img.alt = work.title;
      wrap.appendChild(img);
      thumbCol.appendChild(wrap);
      wrap.addEventListener('click', function() { showWork(i); });
      return wrap;
    });

    // Reset scroll to the top first: .detail-left is position:sticky, so
    // opening while the page is scrolled down (e.g. the second series,
    // further down the landing page) would make it stick at the wrong
    // vertical offset instead of aligning under the top bar.
    window.scrollTo(0, 0);
    landing.style.display = 'none';
    detailView.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    showWork(startIndex);
    setTimeout(updateSb, 0);
  }

  sections.forEach(function(section) {
    var sectionItems = Array.from(section.querySelectorAll('.series-item'));
    sectionItems.forEach(function(item, i) {
      item.addEventListener('click', function() { openSeries(sectionItems, i); });
    });
  });

  // Custom scrollbar: identical behavior to the single-grid viewer
  var sbTrack = document.createElement('div');
  sbTrack.className = 'thumb-sb-track';
  var sbThumb = document.createElement('div');
  sbThumb.className = 'thumb-sb-thumb';
  sbTrack.appendChild(sbThumb);
  thumbCol.parentNode.insertBefore(sbTrack, thumbCol.nextSibling);

  function updateSb() {
    var sh = thumbCol.scrollHeight, ch = thumbCol.clientHeight;
    if (sh <= ch) { sbTrack.style.display = 'none'; return; }
    sbTrack.style.display = '';
    var th = sbTrack.offsetHeight;
    var thumbH = Math.max(20, Math.round(th * 0.1));
    var top = Math.round((thumbCol.scrollTop / (sh - ch)) * (th - thumbH));
    sbThumb.style.height = thumbH + 'px';
    sbThumb.style.top = top + 'px';
  }

  var sbFade;
  function sbShow() { clearTimeout(sbFade); sbTrack.style.background = '#e0e0e0'; }
  function sbHide(ms) { clearTimeout(sbFade); sbFade = setTimeout(function() { sbTrack.style.background = 'transparent'; }, ms); }

  thumbCol.addEventListener('scroll', function() { updateSb(); sbShow(); sbHide(1000); });

  var drag = false, dragY0, scrollTop0;
  sbThumb.addEventListener('mousedown', function(e) {
    drag = true; dragY0 = e.clientY; scrollTop0 = thumbCol.scrollTop;
    sbShow();
    e.preventDefault();
  });
  document.addEventListener('mousemove', function(e) {
    if (!drag) return;
    var sh = thumbCol.scrollHeight, ch = thumbCol.clientHeight;
    var th = sbTrack.offsetHeight, tH = sbThumb.offsetHeight;
    thumbCol.scrollTop = scrollTop0 + (e.clientY - dragY0) * (sh - ch) / (th - tH);
  });
  document.addEventListener('mouseup', function() {
    if (drag) { drag = false; sbHide(600); }
  });

  window.addEventListener('resize', updateSb);

  btnPrev.addEventListener('click', function() {
    showWork((currentIdx - 1 + works.length) % works.length);
  });

  btnNext.addEventListener('click', function() {
    showWork((currentIdx + 1) % works.length);
  });

  btnClose.addEventListener('click', function() {
    detailView.style.display = 'none';
    landing.style.display = '';
    document.body.style.overflow = '';
  });

  document.addEventListener('keydown', function(e) {
    if (!detailView.style.display || detailView.style.display === 'none') return;
    if (e.key === 'ArrowLeft')  showWork((currentIdx - 1 + works.length) % works.length);
    if (e.key === 'ArrowRight') showWork((currentIdx + 1) % works.length);
    if (e.key === 'Escape')     btnClose.click();
  });
})();

// Mobile fullscreen image view — tap any image in Eternal Sunshine or
// Beginning of the End's single-column mobile stacks (painting.html), or
// the Furniture single-column stack (furniture-design.html), to open it
// topbar-free and full-screen, with a back arrow that returns to the same
// scroll position in the page (no scrolling/grid-hiding happens on open,
// so there's nothing to restore on close). One shared overlay, reused
// across both pages (each has its own #mobileImageView markup — same
// id/classes, populated identically), populated per tap from whichever
// item was clicked, using the same data-src/data-detail-src/title/year/
// medium/dimensions attributes the shared #gallery-detail viewer below
// reads (furniture items have no data-dimensions — falls back to '', and
// .detail-meta:empty hides that line, same as the shared viewer already
// does for them). Fully separate from #gallery-detail itself (desktop's
// lightbox/viewer code, untouched, and never runs this) — see each page's
// #mobileImageView markup and css/style.css's mobile-only
// #mobileImageView.open rules (neither page-scoped, so no CSS changes
// were needed to extend this to Furniture).
(function() {
  var view = document.getElementById('mobileImageView');
  if (!view) return; // only present on painting.html / furniture-design.html

  var backBtn = view.querySelector('.mobile-image-view-back');
  var imgEl   = view.querySelector('.mobile-image-view-img');
  var titleEl = view.querySelector('.detail-title');
  var metaEls = view.querySelectorAll('.detail-meta');
  if (!backBtn || !imgEl || metaEls.length < 3) return;

  var yearEl = metaEls[0], mediumEl = metaEls[1], dimsEl = metaEls[2];

  var ITEM_SELECTOR =
    '.series-section[data-series="eternal-sunshine"] .series-item, ' +
    '.series-section[data-series="beginning-of-the-end"] .series-item, ' +
    '#furniture-grid .furniture-item';

  function isMobile() {
    return window.matchMedia('(max-width: 700px)').matches;
  }

  function openFor(item) {
    imgEl.src = item.dataset.detailSrc || item.dataset.src || '';
    imgEl.alt = item.dataset.title || '';
    titleEl.textContent  = item.dataset.title      || '';
    yearEl.textContent   = item.dataset.year       || '';
    mediumEl.textContent = item.dataset.medium     || '';
    dimsEl.textContent   = item.dataset.dimensions || '';

    view.classList.add('open');
    view.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    view.classList.remove('open');
    view.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // Capture-phase listener on document, not on the items themselves: the
  // "Series-scoped gallery viewer" IIFE above (painting.html) and the
  // "Group-scoped gallery viewer" IIFE below (furniture-design.html) each
  // already attach their own bubble-phase click listener directly to
  // every item to open the shared #gallery-detail viewer. A same-element
  // listener can't out-race that regardless of capture flag (per spec,
  // listeners on the event's own target fire in registration order,
  // capture or not) — but a capturing listener on an ancestor fires
  // during the capture phase, strictly before the event ever reaches the
  // target, so stopPropagation() here reliably keeps those handlers from
  // running at all for these items. Only intercepts when both hold: the
  // click landed on an item matching ITEM_SELECTOR, and mobile width is
  // active at click time — desktop (at any width match, matchMedia
  // already gates that) falls through untouched to the existing
  // shared-viewer behavior in every case.
  document.addEventListener('click', function(e) {
    if (!isMobile()) return;
    var item = e.target.closest ? e.target.closest(ITEM_SELECTOR) : null;
    if (!item) return;
    e.stopPropagation();
    e.preventDefault();
    openFor(item);
  }, true);

  backBtn.addEventListener('click', close);
})();

// Group-scoped gallery viewer (furniture-design.html: grid frames tagged
// with data-group, one shared viewer whose thumbnail strip is rebuilt
// per group so it never mixes frames from different groups).
(function() {
  var grid = document.getElementById('furniture-grid');
  var detailView = document.getElementById('gallery-detail');
  if (!grid || !detailView) return;

  // Every item tagged with a group, including hidden "extra" ones not
  // shown as their own grid frame but still part of that group's set.
  var allItems = Array.from(document.querySelectorAll('.furniture-item[data-group]'));
  if (!allItems.length) return;

  var thumbCol  = detailView.querySelector('.thumb-col');
  var detailImg = detailView.querySelector('.detail-img');
  var titleEl   = detailView.querySelector('.detail-title');
  var yearEl    = detailView.querySelector('.detail-year');
  var mediumEl  = detailView.querySelector('.detail-medium');
  var dimsEl    = detailView.querySelector('.detail-dimensions');
  var btnPrev   = detailView.querySelector('.nav-prev');
  var btnNext   = detailView.querySelector('.nav-next');
  var btnClose  = detailView.querySelector('.nav-close');

  var works = [];
  var thumbEls = [];
  var currentIdx = 0;

  function showWork(index) {
    currentIdx = index;
    var work = works[index];

    detailImg.classList.remove('loaded');
    detailImg.src = '';
    detailImg.src = work.detailSrc;
    detailImg.addEventListener('load', function() {
      detailImg.classList.add('loaded');
    }, { once: true });

    titleEl.textContent  = work.title;
    yearEl.textContent   = work.year;
    mediumEl.textContent = work.medium;
    dimsEl.textContent   = work.dimensions;

    thumbEls.forEach(function(t, i) {
      t.classList.toggle('active', i === index);
    });

    thumbEls[index].scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  // Rebuild the shared thumbnail strip for just one group, then open it
  function openGroup(groupName, startItem) {
    var groupItems = allItems.filter(function(item) {
      return item.dataset.group === groupName;
    });

    works = groupItems.map(function(item) {
      return {
        src:        item.dataset.src        || '',
        // data-detail-src is optional — only set it on a thumbnail when
        // that image needs a different crop/version in the detail viewer
        // than what's shown in the grid. Absent on every other item, so
        // they keep opening the same file as their thumbnail (unchanged).
        detailSrc:  item.dataset.detailSrc  || item.dataset.src || '',
        title:      item.dataset.title      || '',
        year:       item.dataset.year       || '',
        medium:     item.dataset.medium     || '',
        dimensions: item.dataset.dimensions || ''
      };
    });

    thumbCol.innerHTML = '';
    thumbEls = works.map(function(work, i) {
      var wrap = document.createElement('div');
      wrap.className = 'thumb-item';
      var img = document.createElement('img');
      img.src = work.src;
      img.alt = work.title;
      wrap.appendChild(img);
      thumbCol.appendChild(wrap);
      wrap.addEventListener('click', function() { showWork(i); });
      return wrap;
    });

    var startIndex = groupItems.indexOf(startItem);
    // Reset scroll to the top first: .detail-left is position:sticky, so
    // opening while the page is scrolled down (e.g. one of the later
    // frames, further down the grid) would make it stick at the wrong
    // vertical offset instead of aligning under the top bar.
    window.scrollTo(0, 0);
    grid.style.display = 'none';
    detailView.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    showWork(startIndex < 0 ? 0 : startIndex);
    setTimeout(updateSb, 0);
  }

  // Only the visible grid frames are clickable triggers; hidden "extra"
  // items are data-only and never opened directly.
  var gridItems = Array.from(grid.querySelectorAll('.furniture-item[data-group]'));
  gridItems.forEach(function(item) {
    item.addEventListener('click', function() {
      openGroup(item.dataset.group, item);
    });
  });

  // Custom scrollbar: identical behavior to the other viewer instances
  var sbTrack = document.createElement('div');
  sbTrack.className = 'thumb-sb-track';
  var sbThumb = document.createElement('div');
  sbThumb.className = 'thumb-sb-thumb';
  sbTrack.appendChild(sbThumb);
  thumbCol.parentNode.insertBefore(sbTrack, thumbCol.nextSibling);

  function updateSb() {
    var sh = thumbCol.scrollHeight, ch = thumbCol.clientHeight;
    if (sh <= ch) { sbTrack.style.display = 'none'; return; }
    sbTrack.style.display = '';
    var th = sbTrack.offsetHeight;
    var thumbH = Math.max(20, Math.round(th * 0.1));
    var top = Math.round((thumbCol.scrollTop / (sh - ch)) * (th - thumbH));
    sbThumb.style.height = thumbH + 'px';
    sbThumb.style.top = top + 'px';
  }

  var sbFade;
  function sbShow() { clearTimeout(sbFade); sbTrack.style.background = '#e0e0e0'; }
  function sbHide(ms) { clearTimeout(sbFade); sbFade = setTimeout(function() { sbTrack.style.background = 'transparent'; }, ms); }

  thumbCol.addEventListener('scroll', function() { updateSb(); sbShow(); sbHide(1000); });

  var drag = false, dragY0, scrollTop0;
  sbThumb.addEventListener('mousedown', function(e) {
    drag = true; dragY0 = e.clientY; scrollTop0 = thumbCol.scrollTop;
    sbShow();
    e.preventDefault();
  });
  document.addEventListener('mousemove', function(e) {
    if (!drag) return;
    var sh = thumbCol.scrollHeight, ch = thumbCol.clientHeight;
    var th = sbTrack.offsetHeight, tH = sbThumb.offsetHeight;
    thumbCol.scrollTop = scrollTop0 + (e.clientY - dragY0) * (sh - ch) / (th - tH);
  });
  document.addEventListener('mouseup', function() {
    if (drag) { drag = false; sbHide(600); }
  });

  window.addEventListener('resize', updateSb);

  btnPrev.addEventListener('click', function() {
    showWork((currentIdx - 1 + works.length) % works.length);
  });

  btnNext.addEventListener('click', function() {
    showWork((currentIdx + 1) % works.length);
  });

  btnClose.addEventListener('click', function() {
    detailView.style.display = 'none';
    grid.style.display = '';
    document.body.style.overflow = '';
  });

  document.addEventListener('keydown', function(e) {
    if (!detailView.style.display || detailView.style.display === 'none') return;
    if (e.key === 'ArrowLeft')  showWork((currentIdx - 1 + works.length) % works.length);
    if (e.key === 'ArrowRight') showWork((currentIdx + 1) % works.length);
    if (e.key === 'Escape')     btnClose.click();
  });
})();

// Nav toggle (hamburger) — opens #mobileMenuOverlay (mobile only; see
// css/style.css's max-width: 700px #mobileMenuOverlay rules), a
// near-full-screen white panel + dimmed-page-content strip that sits
// ABOVE .topbar and fully covers the logo/instagram/hamburger underneath.
// Because the hamburger itself becomes physically covered and unreachable
// once the overlay is open, closing is handled by a dedicated button
// (.mobile-menu-close, a plain X) inside the overlay instead of the same
// button toggling back — a different close affordance than the old
// dropdown this replaced, which just faded the hamburger into an X in
// place. Uses closest('.topbar') rather than parentElement: on every
// page the toggle is nested inside a .topbar-actions wrapper (added to
// group it with the mobile-only instagram icon), so parentElement would
// resolve to that wrapper instead of .topbar — and .topbar itself is
// still what gets the 'open' class (kept for anything else keyed off it,
// even though the old .topbar.open .topbar-menu dropdown rule is gone).
(function() {
  var toggle = document.querySelector('.nav-toggle');
  var container = toggle ? (toggle.closest('.topbar') || toggle.parentElement) : null;
  if (!toggle || !container) return;

  var overlay = document.getElementById('mobileMenuOverlay');
  var closeBtn = overlay ? overlay.querySelector('.mobile-menu-close') : null;

  function setOpen(open) {
    container.classList.toggle('open', open);
    toggle.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (overlay) {
      overlay.classList.toggle('open', open);
      overlay.setAttribute('aria-hidden', open ? 'false' : 'true');
    }
    document.body.style.overflow = open ? 'hidden' : '';
  }

  toggle.addEventListener('click', function(e) {
    e.stopPropagation();
    setOpen(!container.classList.contains('open'));
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      setOpen(false);
    });
  }

  // Excludes clicks inside the overlay: it covers the entire viewport
  // while open, so without this exclusion EVERY tap anywhere on screen
  // (blank panel space, the dim strip, even the nav links) would trigger
  // this generic "clicked outside" close — the close X is meant to be
  // the only way to close, per spec.
  document.addEventListener('click', function(e) {
    if (container.classList.contains('open') && !container.contains(e.target) && (!overlay || !overlay.contains(e.target))) {
      setOpen(false);
    }
  });
})();

// Fullscreen lightbox (desktop only). Click the currently-shown image in
// the shared #gallery-detail viewer — on painting.html (Eternal Sunshine
// or Beginning of the End) or furniture-design.html (any furniture group,
// including the Jewelry Box's 5-image set) — to open it fullscreen, with
// prev/next cycling within that same series/group only, never crossing
// into another one. Self-contained: builds its own #lightbox overlay via
// JS (so the same script works unmodified on both pages, no markup
// duplication) and resolves which series/group the shown image belongs
// to by reading the same data-order/data-src/data-detail-src/data-group
// attributes the existing series- and group-scoped viewers already use.
// Those viewers' own closures (works/showWork/currentIdx) are never
// touched — this is a fully separate, additive listener on the shared
// .detail-img element.
(function() {
  var sharedDetailImg = document.querySelector('.detail-img');
  if (!sharedDetailImg) return;

  function isDesktop() { return window.matchMedia('(min-width: 701px)').matches; }

  var lightbox = document.createElement('div');
  lightbox.className = 'lightbox';
  lightbox.id = 'lightbox';

  var btnClose = document.createElement('button');
  btnClose.className = 'lightbox-close';
  btnClose.setAttribute('aria-label', 'Close');
  btnClose.innerHTML = '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="0.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  var btnPrev = document.createElement('button');
  btnPrev.className = 'lightbox-prev';
  btnPrev.setAttribute('aria-label', 'Previous');
  btnPrev.innerHTML = '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="0.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>';

  var lbImg = document.createElement('img');
  lbImg.className = 'lightbox-img';
  lbImg.alt = '';

  var btnNext = document.createElement('button');
  btnNext.className = 'lightbox-next';
  btnNext.setAttribute('aria-label', 'Next');
  btnNext.innerHTML = '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="0.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>';

  lightbox.appendChild(btnClose);
  lightbox.appendChild(btnPrev);
  lightbox.appendChild(lbImg);
  lightbox.appendChild(btnNext);
  document.body.appendChild(lightbox);

  var works = [];
  var currentIdx = 0;

  function show(index) {
    currentIdx = index;
    lbImg.src = works[currentIdx].detailSrc;
  }

  // Find the source .series-item / .furniture-item matching the
  // currently-shown image, then scope prev/next to just its own
  // series/group — series-scoped by data-order (matching the
  // series-scoped viewer above), furniture groups by DOM order
  // (matching the group-scoped viewer's own allItems.filter()).
  function resolveScope(currentSrc) {
    var candidates = Array.from(document.querySelectorAll('.series-item, .furniture-item[data-group]'));
    var match = candidates.find(function(item) {
      var raw = item.dataset.detailSrc || item.dataset.src || '';
      return raw && new URL(raw, location.href).href === currentSrc;
    });
    if (!match) return null;

    var list;
    var section = match.closest('.series-section');
    if (section) {
      list = Array.from(section.querySelectorAll('.series-item'))
        .map(function(item, i) {
          return {
            item: item,
            detailSrc: item.dataset.detailSrc || item.dataset.src || '',
            order: item.dataset.order ? parseInt(item.dataset.order, 10) : i
          };
        })
        .sort(function(a, b) { return a.order - b.order; });
    } else {
      list = Array.from(document.querySelectorAll('.furniture-item[data-group="' + match.dataset.group + '"]'))
        .map(function(item) {
          return { item: item, detailSrc: item.dataset.detailSrc || item.dataset.src || '' };
        });
    }

    var index = list.findIndex(function(w) { return w.item === match; });
    return { list: list, index: index < 0 ? 0 : index };
  }

  sharedDetailImg.addEventListener('click', function() {
    if (!isDesktop()) return;
    var scope = resolveScope(sharedDetailImg.src);
    if (!scope) return;
    works = scope.list;
    show(scope.index);
    lightbox.classList.add('active');
  });

  btnPrev.addEventListener('click', function() {
    show((currentIdx - 1 + works.length) % works.length);
  });

  btnNext.addEventListener('click', function() {
    show((currentIdx + 1) % works.length);
  });

  btnClose.addEventListener('click', function() {
    lightbox.classList.remove('active');
  });
})();

// Subscribe form (contact.html) — client-side email validation only.
// TODO: connect to a real mailing service (Mailchimp/Buttondown/etc).
// This does not store or send the submitted address anywhere yet — it
// just checks the format and shows a confirmation message in its place.
(function() {
  var form = document.getElementById('subscribeForm');
  if (!form) return;

  var input   = document.getElementById('subscribeEmail');
  var success = document.getElementById('subscribeSuccess');
  // Standard-enough pattern for client-side format checking (not full
  // RFC 5322): something@something.something, no whitespace.
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  form.addEventListener('submit', function(e) {
    e.preventDefault();

    if (!EMAIL_RE.test(input.value.trim())) {
      alert('Please enter a valid email address!');
      return;
    }

    form.hidden = true;
    success.hidden = false;
  });
})();
