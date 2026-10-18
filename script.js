import { FINDORA_PRODUCTS } from './products.js';

(() => {
  const products = FINDORA_PRODUCTS;
  const categories = [
    ['Electronics & tech','⌘'],['Phone accessories','▱'],['Gaming','◈'],['Clothes & fashion','✳'],['Shoes','⌁'],
    ['Home & living','⌂'],['School supplies','▤'],['Fitness & sports','↗'],['Everyday essentials','✦'],['Other interesting finds','✿']
  ];
  const grid = document.querySelector('#product-grid');
  const search = document.querySelector('#search-input');
  const sort = document.querySelector('#sort-select');
  const empty = document.querySelector('#empty-state');
  const active = document.querySelector('#active-filters');
  const summary = document.querySelector('#result-summary');
  let chosenCategory = '', collection = 'all', query = '';
  const categoryList = document.querySelector('#category-list');
  categories.forEach(([name, icon]) => {
    const button = document.createElement('button');
    button.className = 'category-card'; button.type = 'button'; button.dataset.category = name;
    button.innerHTML = `<span class="category-icon" aria-hidden="true">${icon}</span><span class="category-name">${name}<span class="category-arrow">↗</span></span>`;
    button.addEventListener('click', () => { chosenCategory = chosenCategory === name ? '' : name; updateCategoryState(); render(); document.querySelector('#discover').scrollIntoView({behavior:'smooth'}); });
    categoryList.append(button);
  });
  function safeUrl(url) {
    try { const parsed = new URL(url); return ['http:','https:'].includes(parsed.protocol) ? parsed.href : '#'; }
    catch (_) { return '#'; }
  }
  function currentItems() {
    let items = products.filter(p => {
      const matchesQuery = !query || `${p.name} ${p.description} ${p.category} ${p.store} ${p.brand || ''}`.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = !chosenCategory || p.category === chosenCategory;
      const matchesCollection = collection === 'all' || (collection === 'featured' ? p.featured : collection === 'trending' ? p.trending : collection === 'new' ? p.created <= 4 : p.recommended);
      return matchesQuery && matchesCategory && matchesCollection;
    });
    if (sort.value === 'name-asc') items.sort((a,b) => a.name.localeCompare(b.name));
    if (sort.value === 'name-desc') items.sort((a,b) => b.name.localeCompare(a.name));
    if (sort.value === 'price-asc') items.sort((a,b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    if (sort.value === 'price-desc') items.sort((a,b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
    return items;
  }
  function productCard(p, index) {
    const badge = p.featured ? 'Editor’s pick' : p.trending ? 'Trending' : p.created <= 4 ? 'Just found' : '';
    const media = p.image ? `<a class="product-image-link" href="${safeUrl(p.affiliateUrl || p.productUrl)}" target="_blank" rel="noopener noreferrer" aria-label="View ${p.name}"><img src="${p.image}" alt="${p.name}" loading="lazy"></a>` : `<a class="product-image-link placeholder-image-link" href="${safeUrl(p.affiliateUrl || p.productUrl)}" target="_blank" rel="noopener noreferrer" aria-label="View ${p.name}"><span class="placeholder-art" aria-hidden="true">${p.emoji || '✳'}</span></a>`;
    const price = Number.isFinite(p.price) ? `<span class="product-price">${new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(p.price)}</span>` : '';
    return `<article class="product-card" style="animation-delay:${Math.min(index*35,210)}ms">
      <div class="product-image" data-tone="${p.tone || 'sage'}">${media}${badge ? `<span class="product-badge">${badge}</span>` : ''}<button class="favorite-button" type="button" data-favorite="${p.id}" aria-label="Add to profile" aria-pressed="false">♡</button></div>
      <div class="product-info"><div class="product-kicker"><span>${p.category}</span><a class="store-link" href="${safeUrl(p.affiliateUrl || p.productUrl)}" target="_blank" rel="noopener noreferrer">${p.store} ↗</a></div><button class="product-name detail-trigger" type="button" data-details="${p.id}">${p.name}</button><p class="product-description">${p.description}</p><div class="product-foot">${price}<a class="product-link" href="${safeUrl(p.affiliateUrl || p.productUrl)}" target="_blank" rel="noopener noreferrer">View Product <span>↗</span></a></div></div>
    </article>`;
  }
  function render() {
    const items = currentItems().slice(0, 5);
    grid.innerHTML = items.map(productCard).join('');
    empty.hidden = items.length > 0; grid.hidden = items.length === 0;
    active.hidden = !(query || chosenCategory || collection !== 'all');
    if (!active.hidden) summary.textContent = `${items.length} ${items.length === 1 ? 'find' : 'finds'}${chosenCategory ? ` in ${chosenCategory}` : ''}${query ? ` matching “${query}”` : ''}`;
    grid.querySelectorAll('[data-details]').forEach(btn => btn.addEventListener('click', () => openDetails(products.find(p => p.id === btn.dataset.details))));
  }
  function openDetails(p) {
    if (!p) return;
    const dialog = document.querySelector('#product-detail'), image = document.querySelector('#detail-image');
    image.dataset.tone = p.tone || 'sage'; image.innerHTML = p.image ? `<img src="${p.image}" alt="">` : `<span aria-hidden="true">${p.emoji || '✳'}</span>`;
    document.querySelector('#detail-category').textContent = p.category; document.querySelector('#detail-name').textContent = p.name;
    document.querySelector('#detail-description').textContent = p.description; document.querySelector('#detail-store').textContent = `${p.store}${Number.isFinite(p.price) ? ` · $${p.price.toFixed(2)}` : ''}`;
    const link = document.querySelector('#detail-link'); link.href = safeUrl(p.affiliateUrl || p.productUrl); link.onclick = e => { if (link.href.includes('example.com')) { e.preventDefault(); showNotice('This is a demonstration product link.'); } };
    dialog.classList.add('open'); document.querySelector('.detail-close').focus();
  }
  function closeDetails() { document.querySelector('#product-detail').classList.remove('open'); }
  function updateCategoryState() {
    categoryList.querySelectorAll('.category-card').forEach(btn => { const selected = btn.dataset.category === chosenCategory; btn.classList.toggle('selected', selected); btn.setAttribute('aria-pressed', String(selected)); });
  }
  function clearFilters() { query = ''; chosenCategory = ''; collection = 'all'; search.value = ''; document.querySelectorAll('.filter-tab').forEach(t => t.classList.toggle('selected', t.dataset.collection === 'all')); updateCategoryState(); render(); }
  function showNotice(message, error = false) { const note = document.querySelector('#site-notice'); note.textContent = message; note.classList.toggle('error', error); note.hidden = false; }
  document.querySelector('#search-form').addEventListener('submit', e => { e.preventDefault(); query = search.value.trim(); render(); document.querySelector('#discover').scrollIntoView({behavior:'smooth'}); });
  search.addEventListener('input', () => { query = search.value.trim(); render(); });
  document.querySelectorAll('.filter-tab').forEach(tab => tab.addEventListener('click', () => { collection = tab.dataset.collection; document.querySelectorAll('.filter-tab').forEach(t => t.classList.toggle('selected', t === tab)); render(); }));
  sort.addEventListener('change', render); document.querySelector('#clear-filters').addEventListener('click', clearFilters); document.querySelector('#empty-clear').addEventListener('click', clearFilters);
  document.querySelector('.menu-toggle').addEventListener('click', e => { const button = e.currentTarget, nav = document.querySelector('.main-nav'), open = button.getAttribute('aria-expanded') !== 'true'; button.setAttribute('aria-expanded', String(open)); button.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); nav.classList.toggle('open', open); });
  document.querySelectorAll('.main-nav a').forEach(a => a.addEventListener('click', () => { document.querySelector('.main-nav').classList.remove('open'); document.querySelector('.menu-toggle').setAttribute('aria-expanded','false'); }));
  document.querySelector('#newsletter-form').addEventListener('submit', e => { e.preventDefault(); document.querySelector('#newsletter-message').textContent = 'Thanks for trying the demo! No email was saved or sent.'; e.currentTarget.reset(); });
  document.querySelector('.detail-close').addEventListener('click', closeDetails); document.querySelector('#product-detail').addEventListener('click', e => { if (e.target.id === 'product-detail') closeDetails(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDetails(); });
  document.addEventListener('click', e => { const a = e.target.closest('[data-demo-link]'); if (a && a.href.includes('example.com')) { e.preventDefault(); showNotice('This is a demonstration product link.'); } });
  render();
})();
