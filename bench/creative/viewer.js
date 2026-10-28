'use strict';

const taskLinks = [...document.querySelectorAll('[data-task-link]')];
function markTask(href) {
  const selected = taskLinks.find((link) => link.getAttribute('href') === href)?.getAttribute('href') || taskLinks[0]?.getAttribute('href');
  for (const link of taskLinks) {
    if (link.getAttribute('href') === selected) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
  for (const section of document.querySelectorAll('.task-section')) {
    section.hidden = '#' + section.id !== selected;
    if (section.hidden) for (const video of section.querySelectorAll('video')) video.pause();
  }
}

for (const button of document.querySelectorAll('[data-copy-prompt]')) button.addEventListener('click', async () => {
  const prompt = button.parentElement.querySelector('.prompt');
  const status = button.parentElement.querySelector('.copy-status');
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(prompt.textContent);
    else {
      const range = document.createRange(); range.selectNodeContents(prompt);
      const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
      if (!document.execCommand('copy')) throw new Error('clipboard');
      selection.removeAllRanges();
    }
    status.textContent = '已复制';
  } catch { status.textContent = '可选中上方提示词复制'; }
});
if (taskLinks.length) {
  markTask(location.hash || taskLinks[0].getAttribute('href'));
  window.addEventListener('hashchange', () => markTask(location.hash));
}

for (const panel of document.querySelectorAll('[data-compare]')) {
  const sides = [...panel.querySelectorAll('[data-compare-side]')].map((element) => ({
    select: element.querySelector('select'),
    video: element.querySelector('video'),
    source: element.querySelector('source'),
    meta: element.querySelector('.compare-meta')
  }));
  const videos = sides.map((side) => side.video);
  const status = panel.querySelector('[role="status"]');

  function pauseBoth() {
    for (const video of videos) video.pause();
  }

  function loadSelected(side) {
    const option = side.select.selectedOptions[0];
    side.video.pause();
    side.source.src = option.dataset.video;
    side.video.poster = option.dataset.poster || '';
    side.meta.textContent = option.dataset.meta || '';
    side.video.load();
  }

  for (const side of sides) side.select.addEventListener('change', () => {
    pauseBoth();
    const other = sides.find((candidate) => candidate !== side);
    if (other.select.value === side.select.value) {
      const alternative = [...other.select.options].find((option) => option.value !== side.select.value);
      if (alternative) {
        other.select.value = alternative.value;
        loadSelected(other);
      }
    }
    loadSelected(side);
    status.textContent = '已切换作品，可以同时播放。';
  });

  async function playBoth() {
    const time = Math.min(...videos.map((video) => video.currentTime || 0));
    for (const video of videos) {
      try { video.currentTime = time; } catch { /* Metadata may still be loading. */ }
    }
    const results = await Promise.allSettled(videos.map((video) => video.play()));
    status.textContent = results.some((result) => result.status === 'rejected') ?
      '有录屏未能自动播放，请点击各自的播放键。' : '正在同时播放。';
  }

  for (const button of panel.querySelectorAll('[data-compare-action]')) {
    button.addEventListener('click', () => {
      const action = button.dataset.compareAction;
      if (action === 'pause') {
        pauseBoth();
        status.textContent = '已暂停。';
      } else if (action === 'restart') {
        pauseBoth();
        for (const video of videos) {
          try { video.currentTime = 0; } catch { /* Metadata may still be loading. */ }
        }
        playBoth();
      } else if (action === 'play') {
        playBoth();
      }
    });
  }
}
