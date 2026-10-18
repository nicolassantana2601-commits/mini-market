(() => {
  const storageKey = 'mini-market-favorites';
  const grid = document.querySelector('#product-grid');

  function readFavorites() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return Array.isArray(saved) ? saved.filter(item => item && typeof item === 'object' && item.id) : [];
    } catch (_) {
      return [];
    }
  }

  function saveFavorites(favorites) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(favorites));
      return true;
    } catch (_) {
      const notice = document.querySelector('#site-notice');
      if (notice) {
        notice.textContent = 'Your browser could not save this favorite. Check its storage settings.';
        notice.classList.add('error');
        notice.hidden = false;
      }
      return false;
    }
  }

  function syncButtons() {
    if (!grid) return;
    const favorites = new Set(readFavorites().map(product => product.id));
    grid.querySelectorAll('[data-favorite]').forEach(button => {
      const saved = favorites.has(button.dataset.favorite);
      button.setAttribute('aria-pressed', String(saved));
      button.setAttribute('aria-label', saved ? 'Remove from profile' : 'Add to profile');
      button.textContent = saved ? '♥' : '♡';
    });
  }

  function getProduct(button) {
    const card = button.closest('.product-card');
    if (!card) return null;
    const imageArea = card.querySelector('.product-image');
    const name = card.querySelector('.product-name')?.textContent.trim();
    const priceText = card.querySelector('.product-price')?.textContent.trim() || '';
    const productLink = card.querySelector('.product-foot a.product-link');
    if (!name) return null;
    return {
      id: button.dataset.favorite,
      name,
      description: card.querySelector('.product-description')?.textContent.trim() || '',
      category: card.querySelector('.product-kicker > span')?.textContent.trim() || 'Find',
      store: card.querySelector('.product-kicker .store-link')?.textContent.trim() || 'Mini Market find',
      image: imageArea?.querySelector('img')?.src || '',
      emoji: imageArea?.querySelector('.placeholder-art')?.textContent.trim() || '✳',
      tone: imageArea?.dataset.tone || 'sage',
      price: priceText,
      productUrl: productLink?.href || ''
    };
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-favorite]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    const product = getProduct(button);
    if (!product) return;
    const favorites = readFavorites();
    const currentIndex = favorites.findIndex(item => item.id === product.id);
    if (currentIndex >= 0) favorites.splice(currentIndex, 1);
    else favorites.push(product);
    if (saveFavorites(favorites)) syncButtons();
  });

  syncButtons();
  if (grid) new MutationObserver(syncButtons).observe(grid, {childList:true, subtree:true});
})();
