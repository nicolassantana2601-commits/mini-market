(() => {
  const storageKey = 'mini-market-favorites';
  const savedList = document.querySelector('#saved-products');
  const emptyState = document.querySelector('#profile-empty-state');
  const countLabel = document.querySelector('#saved-count');

  function readFavorites() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return Array.isArray(saved) ? saved.filter(item => item && typeof item === 'object' && item.id) : [];
    } catch (_) {
      return [];
    }
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }

  function safeUrl(value) {
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '#';
    } catch (_) {
      return '#';
    }
  }

  function render() {
    const products = readFavorites();
    countLabel.textContent = `${products.length} ${products.length === 1 ? 'find' : 'finds'}`;
    emptyState.hidden = products.length > 0;
    savedList.hidden = products.length === 0;
    savedList.innerHTML = products.map(product => {
      const image = product.image
        ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy">`
        : `<span class="placeholder-art" aria-hidden="true">${escapeHtml(product.emoji || '✳')}</span>`;
      const price = product.price ? `<span class="product-price">${escapeHtml(product.price)}</span>` : '';
      const productUrl = safeUrl(product.productUrl);
      return `<article class="product-card"><div class="product-image" data-tone="${escapeHtml(product.tone || 'sage')}">${image}<button class="favorite-button" type="button" data-remove-favorite="${escapeHtml(product.id)}" aria-label="Remove ${escapeHtml(product.name)} from profile" aria-pressed="true">♥</button></div><div class="product-info"><div class="product-kicker"><span>${escapeHtml(product.category || 'Find')}</span><span class="store-link">${escapeHtml(product.store || 'Mini Market find')}</span></div><h3 class="product-name">${escapeHtml(product.name)}</h3><p class="product-description">${escapeHtml(product.description || '')}</p><div class="product-foot">${price}<a class="product-link" href="${escapeHtml(productUrl)}" target="_blank" rel="noopener noreferrer" data-demo-link>View product <span>↗</span></a></div></div></article>`;
    }).join('');
  }

  savedList.addEventListener('click', event => {
    const button = event.target.closest('[data-remove-favorite]');
    if (button) {
      const products = readFavorites().filter(product => product.id !== button.dataset.removeFavorite);
      try { localStorage.setItem(storageKey, JSON.stringify(products)); }
      catch (_) { /* Keep the current view usable if browser storage is unavailable. */ }
      render();
      return;
    }
    const link = event.target.closest('[data-demo-link]');
    if (link && link.href.includes('example.com')) event.preventDefault();
  });

  render();
})();
