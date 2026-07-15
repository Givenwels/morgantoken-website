(function (global) {
  'use strict';

  const CATEGORY_ORDER = [
    '东方人物', '东方场景', '写实人像', '自然与城市', '年代记忆',
    '国漫动画', '日系动画', '宠物写真', '科幻宇宙', '科幻机甲',
    '电商广告', '人物互动', '数字人与播报', '游戏与 CG', '宠物与动物',
    '运动', '音乐', '教学演示', '生活记录',
  ];

  function filterMedia(items, mediaType, category, query) {
    const q = (query || '').trim().toLowerCase();
    return items.filter((item) => (mediaType === 'all' || item.type === mediaType)
      && (category === 'all' || item.category === category)
      && (!q || item.title.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)));
  }

  function nextIndex(current, length, direction) {
    if (!length) return -1;
    return (current + direction + length) % length;
  }

  function formatDuration(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return 'VIDEO';
    const minutes = Math.floor(seconds / 60);
    const remainder = Math.round(seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${remainder}`;
  }

  function resolveMediaPath(item) {
    return item.type === 'image' ? item.src.replace(/^文生图\//, '') : item.src;
  }

  const api = { filterMedia, nextIndex, formatDuration, resolveMediaPath };
  global.Portfolio = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  if (typeof document === 'undefined') return;

  const state = {
    items: Array.isArray(global.PORTFOLIO_MEDIA) ? global.PORTFOLIO_MEDIA : [],
    type: 'all',
    category: 'all',
    query: '',
    visible: [],
    lightboxItems: [],
    lightboxIndex: -1,
    lastFocus: null,
  };

  const dom = {};

  function makeMedia(item, className) {
    if (item.type === 'video') {
      const video = document.createElement('video');
      video.src = item.src;
      video.muted = true;
      video.preload = 'metadata';
      video.playsInline = true;
      video.className = className || '';
      video.setAttribute('aria-label', item.title);
      video.addEventListener('error', () => {
        const fallback = document.createElement('div');
        fallback.className = 'media-error';
        fallback.textContent = `视频无法载入：${item.title}`;
        if (video.parentNode) video.replaceWith(fallback);
      }, { once: true });
      return video;
    }
    const image = document.createElement('img');
    image.src = resolveMediaPath(item);
    image.alt = item.title;
    image.loading = 'lazy';
    image.decoding = 'async';
    if (className) image.className = className;
    image.addEventListener('error', () => {
      const fallback = document.createElement('div');
      fallback.className = 'media-error';
      fallback.textContent = `无法载入：${item.title}`;
      if (image.parentNode) image.replaceWith(fallback);
    }, { once: true });
    return image;
  }

  function makeOverlay(item) {
    const overlay = document.createElement('figcaption');
    overlay.className = 'media-overlay';
    const meta = document.createElement('span');
    meta.className = 'media-overlay-cat';
    meta.textContent = `${item.type === 'video' ? '文生视频' : '文生图'} · ${item.category}`;
    const title = document.createElement('span');
    title.className = 'media-overlay-title';
    title.textContent = item.title;
    overlay.append(meta, title);
    return overlay;
  }

  function makeCatTag(item) {
    const tag = document.createElement('span');
    tag.className = 'media-cat-tag';
    tag.textContent = item.category;
    return tag;
  }

  function makeCaption(item) {
    const caption = document.createElement('figcaption');
    caption.className = 'media-caption';
    const title = document.createElement('span');
    title.textContent = item.title;
    const category = document.createElement('span');
    category.textContent = item.category;
    caption.append(title, category);
    return caption;
  }

  function openLightbox(itemId, sourceItems, trigger) {
    state.lightboxItems = sourceItems.length ? sourceItems : state.items;
    state.lightboxIndex = state.lightboxItems.findIndex((item) => item.id === itemId);
    if (state.lightboxIndex < 0) return;
    state.lastFocus = trigger || document.activeElement;
    renderLightbox();
    dom.lightbox.hidden = false;
    document.body.classList.add('lightbox-open');
    dom.closeLightbox.focus();
  }

  function closeLightbox() {
    const video = dom.lightboxStage.querySelector('video');
    if (video) video.pause();
    dom.lightbox.hidden = true;
    dom.lightboxStage.replaceChildren();
    document.body.classList.remove('lightbox-open');
    if (state.lastFocus && typeof state.lastFocus.focus === 'function') state.lastFocus.focus();
  }

  function renderLightbox() {
    const item = state.lightboxItems[state.lightboxIndex];
    if (!item) return;
    dom.lightboxCategory.textContent = `${item.type === 'video' ? '文生视频' : '文生图'} · ${item.category}`;
    dom.lightboxTitle.textContent = item.title;
    dom.lightboxCounter.textContent = `${state.lightboxIndex + 1} / ${state.lightboxItems.length}`;
    dom.lightboxStage.replaceChildren();

    if (item.type === 'video') {
      const video = document.createElement('video');
      video.src = item.src;
      video.controls = true;
      video.preload = 'metadata';
      video.playsInline = true;
      video.setAttribute('aria-label', item.title);
      video.addEventListener('error', () => {
        const fallback = document.createElement('div');
        fallback.className = 'media-error';
        fallback.textContent = `视频无法播放：${item.title}`;
        if (video.parentNode) video.replaceWith(fallback);
      }, { once: true });
      dom.lightboxStage.append(video);
    } else {
      const image = new Image();
      image.src = resolveMediaPath(item);
      image.alt = item.title;
      image.addEventListener('error', () => {
        const fallback = document.createElement('div');
        fallback.className = 'media-error';
        fallback.textContent = `图片无法载入：${item.title}`;
        if (image.parentNode) image.replaceWith(fallback);
      }, { once: true });
      dom.lightboxStage.append(image);
    }
  }

  function moveLightbox(direction) {
    const video = dom.lightboxStage.querySelector('video');
    if (video) video.pause();
    state.lightboxIndex = nextIndex(state.lightboxIndex, state.lightboxItems.length, direction);
    renderLightbox();
  }

  function mediaButton(item, sourceItems) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'media-button';
    button.dataset.mediaId = item.id;
    button.setAttribute('aria-label', `查看作品：${item.title}`);
    button.addEventListener('click', () => openLightbox(item.id, sourceItems, button));
    return button;
  }

  function renderHero() {
    const wanted = ['东方人物', '年代记忆', '科幻宇宙'];
    const chosen = wanted.map((category) => state.items.find((item) => item.type === 'image' && item.category === category)).filter(Boolean);
    if (chosen.length < 3) chosen.push(...state.items.filter((item) => item.type === 'image' && !chosen.includes(item)).slice(0, 3 - chosen.length));
    dom.heroCollage.replaceChildren();
    for (const item of chosen.slice(0, 3)) {
      const frame = document.createElement('div');
      frame.className = 'hero-media';
      const button = mediaButton(item, state.items);
      button.append(makeMedia(item));
      const label = document.createElement('span');
      label.className = 'hero-label';
      label.textContent = item.category;
      button.append(label);
      frame.append(button);
      dom.heroCollage.append(frame);
    }
  }

  function curatedSelection() {
    const sequence = ['东方人物', '年代记忆', '自然与城市', '电商广告', '人物互动', '科幻宇宙', '宠物写真', '国漫动画', '数字人与播报', '游戏与 CG', '运动', '音乐'];
    return sequence.map((category) => state.items.find((item) => item.category === category)).filter(Boolean);
  }

  function renderFeatured() {
    const selected = curatedSelection();
    dom.featuredGrid.replaceChildren();
    for (const item of selected) {
      const figure = document.createElement('figure');
      figure.className = 'featured-card';
      const button = mediaButton(item, state.items);
      const frame = document.createElement('div');
      frame.className = 'featured-image';
      frame.append(makeMedia(item));
      if (item.type === 'video') {
        const badge = document.createElement('span');
        badge.className = 'video-badge';
        badge.textContent = formatDuration(item.duration);
        frame.append(badge);
      }
      button.append(frame, makeCaption(item));
      figure.append(button);
      dom.featuredGrid.append(figure);
    }
  }

  function countByCategory(mediaType) {
    const counts = {};
    for (const item of state.items) {
      if (mediaType === 'all' || item.type === mediaType) counts[item.category] = (counts[item.category] || 0) + 1;
    }
    return counts;
  }

  function availableCategories() {
    const subset = state.type === 'all' ? state.items : state.items.filter((item) => item.type === state.type);
    const found = new Set(subset.map((item) => item.category));
    const ordered = CATEGORY_ORDER.filter((category) => found.has(category));
    const extra = [...found].filter((category) => !CATEGORY_ORDER.includes(category)).sort((a, b) => a.localeCompare(b, 'zh-CN'));
    return [...ordered, ...extra];
  }

  function setActiveButton(container, activeButton) {
    for (const button of container.querySelectorAll('button')) {
      const isActive = button === activeButton;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    }
  }

  function renderCategoryFilters() {
    dom.categoryFilters.replaceChildren();
    const counts = countByCategory(state.type);
    const choices = ['all', ...availableCategories()];
    for (const category of choices) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `filter-button${category === state.category ? ' is-active' : ''}`;
      button.dataset.category = category;
      button.setAttribute('aria-pressed', String(category === state.category));
      const label = document.createElement('span');
      label.textContent = category === 'all' ? '全部分类' : category;
      button.append(label);
      if (category !== 'all' && counts[category]) {
        const count = document.createElement('span');
        count.className = 'chip-count';
        count.textContent = counts[category];
        button.append(count);
      }
      button.addEventListener('click', () => {
        state.category = category;
        state.query = '';
        if (dom.searchInput) dom.searchInput.value = '';
        setActiveButton(dom.categoryFilters, button);
        renderGallery();
      });
      dom.categoryFilters.append(button);
    }
  }

  function renderGallery() {
    state.visible = filterMedia(state.items, state.type, state.category, state.query);
    dom.gallery.replaceChildren();
    dom.gallery.setAttribute('aria-busy', 'false');
    const total = state.items.length;
    const tag = state.query ? `匹配「${state.query}」` : (state.category === 'all' ? '全部分类' : state.category);
    dom.resultCount.textContent = `${tag} · 当前 ${state.visible.length} 件 / 共 ${total} 件`;
    dom.emptyState.hidden = state.visible.length !== 0;
    dom.gallery.hidden = state.visible.length === 0;

    state.visible.forEach((item, index) => {
      const article = document.createElement('article');
      article.className = 'gallery-item';
      article.style.setProperty('--index', index);
      const button = mediaButton(item, state.visible);
      const figure = document.createElement('figure');
      figure.style.margin = '0';
      const frame = document.createElement('div');
      frame.className = 'media-frame';
      frame.append(makeMedia(item));
      frame.append(makeCatTag(item));
      if (item.type === 'video') {
        const badge = document.createElement('span');
        badge.className = 'video-badge';
        badge.textContent = formatDuration(item.duration);
        frame.append(badge);
      }
      frame.append(makeOverlay(item));
      figure.append(frame);
      button.append(figure);
      article.append(button);
      dom.gallery.append(article);
    });
  }

  function bindEvents() {
    dom.primaryFilters.addEventListener('click', (event) => {
      const button = event.target.closest('[data-type]');
      if (!button) return;
      state.type = button.dataset.type;
      state.category = 'all';
      setActiveButton(dom.primaryFilters, button);
      renderCategoryFilters();
      renderGallery();
    });
    if (dom.searchInput) {
      dom.searchInput.addEventListener('input', () => {
        state.query = dom.searchInput.value;
        renderGallery();
      });
    }
    dom.closeLightbox.addEventListener('click', closeLightbox);
    dom.lightbox.querySelector('[data-close-lightbox]').addEventListener('click', closeLightbox);
    dom.previousItem.addEventListener('click', () => moveLightbox(-1));
    dom.nextItem.addEventListener('click', () => moveLightbox(1));
    document.addEventListener('keydown', (event) => {
      if (dom.lightbox.hidden) return;
      if (event.key === 'Escape') closeLightbox();
      else if (event.key === 'ArrowLeft') moveLightbox(-1);
      else if (event.key === 'ArrowRight') moveLightbox(1);
      else if (event.key === 'Tab') {
        const controls = [...dom.lightbox.querySelectorAll('button, video[controls]')].filter((el) => !el.disabled);
        if (!controls.length) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
  }

  function cacheDom() {
    Object.assign(dom, {
      navCount: document.getElementById('navCount'),
      imageCount: document.getElementById('imageCount'),
      videoCount: document.getElementById('videoCount'),
      heroCollage: document.getElementById('heroCollage'),
      featuredGrid: document.getElementById('featuredGrid'),
      gallery: document.getElementById('gallery'),
      resultCount: document.getElementById('resultCount'),
      primaryFilters: document.getElementById('primaryFilters'),
      categoryFilters: document.getElementById('categoryFilters'),
      searchInput: document.getElementById('searchInput'),
      emptyState: document.getElementById('emptyState'),
      lightbox: document.getElementById('lightbox'),
      lightboxStage: document.getElementById('lightboxStage'),
      lightboxTitle: document.getElementById('lightboxTitle'),
      lightboxCategory: document.getElementById('lightboxCategory'),
      lightboxCounter: document.getElementById('lightboxCounter'),
      closeLightbox: document.getElementById('closeLightbox'),
      previousItem: document.getElementById('previousItem'),
      nextItem: document.getElementById('nextItem'),
    });
  }

  function init() {
    cacheDom();
    if (!state.items.length) {
      dom.gallery.replaceChildren();
      dom.gallery.setAttribute('aria-busy', 'false');
      dom.resultCount.textContent = '没有读取到媒体清单，请重新运行生成工具。';
      dom.emptyState.hidden = false;
      return;
    }
    const images = state.items.filter((item) => item.type === 'image').length;
    const videos = state.items.filter((item) => item.type === 'video').length;
    dom.imageCount.textContent = images;
    dom.videoCount.textContent = videos;
    dom.navCount.textContent = `${state.items.length} ITEMS`;
    renderHero();
    renderFeatured();
    renderCategoryFilters();
    renderGallery();
    bindEvents();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}(typeof globalThis !== 'undefined' ? globalThis : this));
