(function () {
  document.addEventListener('DOMContentLoaded', function () {
    const grid = document.getElementById('code-agent-task-grid');
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll('.code-agent-task-card'));
    const repoFilter = document.getElementById('code-agent-task-repo-filter');
    const searchInput = document.getElementById('code-agent-task-search-input');

    function applyFilters() {
      const repoValue = repoFilter ? repoFilter.value : 'all';
      const searchValue = searchInput ? searchInput.value.trim().toLowerCase() : '';

      cards.forEach(function (card) {
        const matchesRepo = repoValue === 'all' || card.dataset.repo === repoValue;
        const matchesSearch = !searchValue || (card.dataset.search || '').toLowerCase().includes(searchValue);
        card.style.display = matchesRepo && matchesSearch ? '' : 'none';
      });
    }

    if (repoFilter) {
      repoFilter.addEventListener('input', applyFilters);
      repoFilter.addEventListener('change', applyFilters);
    }
    if (searchInput) {
      searchInput.addEventListener('input', applyFilters);
      searchInput.addEventListener('search', applyFilters);
    }

    grid.addEventListener('click', function (event) {
      const button = event.target.closest('.code-agent-task-toggle');
      if (!button) return;

      const card = button.closest('.code-agent-task-card');
      if (!card) return;

      const expanded = card.classList.toggle('is-expanded');
      button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    });

    applyFilters();
  });
})();
