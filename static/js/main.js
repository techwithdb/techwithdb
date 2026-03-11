/* ================================================================
   CloudOps Hub — main.js
   Search · TOC · Q&A accordion · Copy code · Mobile nav · Misc
   ================================================================ */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    mobileMenu();
    searchInit();
    readingBar();
    backToTop();
    tocBuild();
    qaAccordion();
    qaFilter();
    copyButtons();
    navActiveLinks();
    breadcrumbLastItem();
  });

  /* ── Mobile Menu ─────────────────────────────────────────── */
  function mobileMenu() {
    const burger = document.getElementById('burger');
    const drawer = document.getElementById('mobileDrawer');
    const close  = document.getElementById('drawerClose');
    if (!burger || !drawer) return;

    const toggle = (open) => {
      drawer.classList.toggle('open', open);
      document.body.style.overflow = open ? 'hidden' : '';
      burger.setAttribute('aria-expanded', String(open));
    };

    burger.addEventListener('click', () => toggle(!drawer.classList.contains('open')));
    close?.addEventListener('click', () => toggle(false));

    document.addEventListener('click', (e) => {
      if (drawer.classList.contains('open') && !drawer.contains(e.target) && !burger.contains(e.target))
        toggle(false);
    });

    // Close on nav link click
    drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', () => toggle(false)));
  }

  /* ── Search ──────────────────────────────────────────────── */
  function searchInit() {
    const openBtns = document.querySelectorAll('[data-search-open]');
    const overlay  = document.getElementById('searchOverlay');
    const input    = document.getElementById('searchInput');
    const results  = document.getElementById('searchResults');
    if (!overlay) return;

    let index = [];

    // Try to load search index
    const base = document.querySelector('meta[name="base-url"]')?.content || '';
    fetch(base + '/index.json')
      .then(r => r.json())
      .then(d => { index = Array.isArray(d) ? d : []; })
      .catch(() => {});

    const openSearch = () => {
      overlay.classList.add('open');
      setTimeout(() => input?.focus(), 80);
    };
    const closeSearch = () => {
      overlay.classList.remove('open');
      if (input) input.value = '';
      if (results) results.innerHTML = '';
    };

    openBtns.forEach(b => b.addEventListener('click', openSearch));
    overlay.addEventListener('click', e => { if (e.target === overlay) closeSearch(); });
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openSearch(); }
      if (e.key === 'Escape') closeSearch();
    });

    if (!input) return;
    input.addEventListener('input', debounce(function () {
      const q = this.value.trim().toLowerCase();
      if (!q || q.length < 2) { results.innerHTML = renderEmpty('Start typing to search…'); return; }

      const hits = index
        .filter(p =>
          p.title?.toLowerCase().includes(q) ||
          p.content?.toLowerCase().includes(q) ||
          (p.tags || []).some(t => t.toLowerCase().includes(q))
        )
        .slice(0, 9);

      results.innerHTML = hits.length
        ? hits.map(p => `
            <a class="search-item" href="${p.permalink}">
              <div class="search-item-icon"><i class="fas fa-file-alt"></i></div>
              <div>
                <div class="search-item-title">${hl(p.title || '', q)}</div>
                <div class="search-item-cat">${p.section || 'Article'}</div>
              </div>
            </a>`)
          .join('')
        : renderEmpty('No results found for <strong>' + esc(q) + '</strong>');
    }, 240));
  }

  function hl(text, q) {
    const re = new RegExp('(' + esc(q).replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + ')', 'gi');
    return text.replace(re, '<mark style="background:var(--aws-bg);color:var(--aws-dk);border-radius:3px;padding:0 2px">$1</mark>');
  }
  function renderEmpty(msg) {
    return `<div class="search-empty">${msg}</div>`;
  }
  function esc(s) { return s.replace(/[<>&"]/g, c => ({ '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;' }[c])); }

  /* ── Reading Progress Bar ────────────────────────────────── */
  function readingBar() {
    const bar = document.querySelector('.reading-bar-fill');
    if (!bar) return;
    window.addEventListener('scroll', () => {
      const h = document.documentElement;
      bar.style.width = Math.min((h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100, 100) + '%';
    }, { passive: true });
  }

  /* ── Back to Top ─────────────────────────────────────────── */
  function backToTop() {
    const btn = document.getElementById('btt');
    if (!btn) return;
    window.addEventListener('scroll', () => btn.classList.toggle('show', window.scrollY > 380), { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  /* ── Table of Contents ───────────────────────────────────── */
  function tocBuild() {
    const toc     = document.getElementById('toc');
    const article = document.querySelector('.prose');
    if (!toc || !article) return;

    const hs = article.querySelectorAll('h2, h3');
    if (hs.length < 2) { toc.closest('.toc-box')?.remove(); return; }

    let html = '<ul>', inH3 = false;
    hs.forEach((h, i) => {
      if (!h.id) h.id = 'h' + i;
      if (h.tagName === 'H2') {
        if (inH3) { html += '</ul></li>'; inH3 = false; }
        html += `<li><a href="#${h.id}">${h.textContent}</a>`;
      } else {
        if (!inH3) { html += '<ul>'; inH3 = true; }
        html += `<li><a href="#${h.id}">${h.textContent}</a></li>`;
      }
    });
    if (inH3) html += '</ul></li>';
    toc.innerHTML = html + '</ul>';

    // Active state
    const links = toc.querySelectorAll('a');
    const setActive = () => {
      let cur = '';
      hs.forEach(h => { if (window.scrollY >= h.offsetTop - 110) cur = h.id; });
      links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + cur));
    };
    window.addEventListener('scroll', setActive, { passive: true });
    setActive();
  }

  /* ── Q&A Accordion ───────────────────────────────────────── */
  function qaAccordion() {
    document.querySelectorAll('.qa-q').forEach(q => {
      q.addEventListener('click', function () {
        const item = this.closest('.qa-item');
        const was  = item.classList.contains('open');
        document.querySelectorAll('.qa-item.open').forEach(el => el.classList.remove('open'));
        if (!was) item.classList.add('open');
      });
      q.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') q.click(); });
    });

    document.getElementById('expandAll')  ?.addEventListener('click', () => document.querySelectorAll('.qa-item').forEach(el => el.classList.add('open')));
    document.getElementById('collapseAll')?.addEventListener('click', () => document.querySelectorAll('.qa-item').forEach(el => el.classList.remove('open')));
  }

  /* ── Q&A Level Filter ────────────────────────────────────── */
  function qaFilter() {
    document.querySelectorAll('.pill[data-level]').forEach(pill => {
      pill.addEventListener('click', function () {
        this.closest('.filter-pills').querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
        this.classList.add('active');
        const lvl = this.dataset.level;
        document.querySelectorAll('.qa-item').forEach(item => {
          item.style.display = (lvl === 'all' || item.dataset.level === lvl) ? '' : 'none';
        });
      });
    });
  }

  /* ── Copy Code Buttons ───────────────────────────────────── */
  function copyButtons() {
    const svgCopy  = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
    const svgCheck = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';

    setTimeout(() => {
      document.querySelectorAll('pre').forEach(pre => {
        if (pre.querySelector('.copy-btn')) return;
        const codeEl = pre.querySelector('code');
        if (!codeEl) return;

        const btn = document.createElement('button');
        btn.className = 'copy-btn';
        btn.setAttribute('aria-label', 'Copy code');
        btn.innerHTML = svgCopy + ' Copy';
        pre.appendChild(btn);

        btn.addEventListener('click', () => {
          navigator.clipboard.writeText(codeEl.innerText).then(() => {
            btn.innerHTML = svgCheck + ' Copied!';
            btn.classList.add('copied');
            setTimeout(() => {
              btn.innerHTML = svgCopy + ' Copy';
              btn.classList.remove('copied');
            }, 2200);
          });
        });
      });
    }, 0);
  }

  /* ── Active Nav Links ────────────────────────────────────── */
  function navActiveLinks() {
    const path = window.location.pathname;
    document.querySelectorAll('.nav-menu > li > a').forEach(a => {
      const href = a.getAttribute('href');
      if (href && href !== '/' && path.startsWith(href)) a.classList.add('active');
    });
  }

  /* ── Breadcrumb last item (non-link) ─────────────────────── */
  function breadcrumbLastItem() {
    const last = document.querySelector('.breadcrumb span:last-child');
    if (last) last.setAttribute('aria-current', 'page');
  }

  /* ── Helpers ─────────────────────────────────────────────── */
  function debounce(fn, ms) {
    let t;
    return function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms); };
  }

})();
