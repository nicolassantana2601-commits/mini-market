import { supabase, supabaseConfigured, configMessage } from './supabase.js';
import { FINDORA_PRODUCTS } from './products.js';

const page = document.body.dataset.page;
const messageNode = document.querySelector('#auth-message');
const configNode = document.querySelector('#auth-config');
const params = new URLSearchParams(location.search);
const safeNext = value => {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/index.html';
  const url = new URL(value, location.origin);
  return url.origin === location.origin ? `${url.pathname}${url.search}${url.hash}` : '/index.html';
};
function say(message, error = false) {
  if (!messageNode) return;
  messageNode.textContent = message; messageNode.classList.toggle('error', error);
}
function setBusy(button, busy, label) {
  if (busy) { button.dataset.label = button.textContent; button.textContent = label; button.disabled = true; }
  else { button.textContent = button.dataset.label || button.textContent; button.disabled = false; }
}
function passwordValid(password) { return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password); }
function withIntent(path) {
  const next = params.has('next') ? safeNext(params.get('next')) : '/profile.html';
  const query = new URLSearchParams({next});
  if (params.has('favorite')) query.set('favorite', params.get('favorite'));
  return `${path}?${query.toString()}`;
}
function redirectAfterAuth() {
  let next = params.has('next') ? safeNext(params.get('next')) : '/profile.html';
  const favorite = params.get('favorite');
  if (favorite) {
    const dest = new URL(next, location.origin); dest.searchParams.set('favorite', favorite); next = `${dest.pathname}${dest.search}${dest.hash}`;
  }
  location.replace(next);
}
function showConfiguration() {
  if (!supabaseConfigured) {
    if (configNode) { configNode.textContent = configMessage; configNode.hidden = false; }
    const profileEmptyState = document.querySelector('#profile-empty-state');
    if (profileEmptyState) profileEmptyState.hidden = false;
    document.querySelectorAll('.auth-submit, #google-login, #google-signup').forEach(button => { button.disabled = true; });
    return true;
  }
  return false;
}
function updateAuthLinks() {
  document.querySelectorAll('.auth-signup-link').forEach(a => a.href = withIntent('./signup.html'));
  document.querySelectorAll('.auth-login-link').forEach(a => a.href = withIntent('./login.html'));
}
async function initAuth() {
  updateAuthLinks();
  if (showConfiguration()) return;
  bindGoogleAuth();
  const {data, error} = await supabase.auth.getSession();
  if (error) say(error.message, true);
  if (page === 'login' && data.session?.user) redirectAfterAuth();
  supabase.auth.onAuthStateChange((event, session) => {
    if (page === 'login' && event === 'SIGNED_IN' && session?.user) redirectAfterAuth();
  });
  if (params.get('verified') === '1') say('Email verified. You can now log in.');
  const oauthError = new URLSearchParams(location.hash.slice(1));
  if (page === 'login' && oauthError.has('error_description')) {
    say(oauthError.get('error_description').replaceAll('+', ' '), true);
    history.replaceState(null, '', `${location.pathname}${location.search}`);
  }
  switch (page) {
    case 'login': bindLogin(); break;
    case 'signup': bindSignup(); break;
    case 'reset': bindReset(data.session); break;
    case 'account': await bindAccount(data.session); break;
    case 'favorites': await bindFavorites(data.session); break;
    case 'profile': await bindProfile(data.session); break;
  }
}
function bindLogin() {
  const form = document.querySelector('#login-form');
  form.addEventListener('submit', async event => {
    event.preventDefault(); const button = form.querySelector('[type="submit"]');
    const emailField = form.elements.namedItem('email'), passwordField = form.elements.namedItem('password');
    const email = emailField.value.trim(), password = passwordField.value;
    if (!email || !emailField.validity.valid || !password) { say('Enter a valid email address and password.', true); return; }
    setBusy(button, true, 'Logging in…'); say('');
    try {
      const {error} = await supabase.auth.signInWithPassword({email, password});
      if (error) { setBusy(button, false); say(error.message, true); }
      else redirectAfterAuth();
    } catch (error) {
      setBusy(button, false);
      say(error.message || 'Could not connect to the sign-in service. Please try again.', true);
    }
  });
  document.querySelector('#forgot-password').addEventListener('click', async event => {
    event.preventDefault(); const emailInput = document.querySelector('#email'), email = emailInput.value.trim();
    if (!email || !emailInput.validity.valid) { emailInput.focus(); say('Enter your email address above, then choose Forgot password.', true); return; }
    const link = event.currentTarget; setBusy(link, true, 'Sending…');
    const {error} = await supabase.auth.resetPasswordForEmail(email, {redirectTo:`${location.origin}/reset-password.html`});
    setBusy(link, false);
    say(error ? error.message : 'If an account uses that email, a password reset link is on its way. Check your inbox.');
  });
}
function bindGoogleAuth() {
  document.querySelectorAll('#google-login, #google-signup').forEach(button => {
    button.addEventListener('click', async () => {
      setBusy(button, true, 'Connecting to Google…');
      say('');
      try {
        const {error} = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {redirectTo: `${location.origin}${withIntent('/login.html')}`}
        });
        if (error) throw error;
      } catch (error) {
        setBusy(button, false);
        say(error.message || 'Could not connect to Google. Please try again.', true);
      }
    });
  });
}
function bindSignup() {
  const form = document.querySelector('#signup-form');
  form.addEventListener('submit', async event => {
    event.preventDefault(); const button = form.querySelector('[type="submit"]');
    const nameField = form.elements.namedItem('name'), emailField = form.elements.namedItem('email'), passwordField = form.elements.namedItem('password'), confirmField = form.elements.namedItem('confirm-password');
    const name = nameField.value.trim(), email = emailField.value.trim(), password = passwordField.value, confirmation = confirmField.value;
    if (name.length < 2 || !email || !emailField.validity.valid) { say('Enter your name and a valid email address.', true); return; }
    if (!passwordValid(password)) { say('Use at least 8 characters, including a letter and a number.', true); return; }
    if (password !== confirmation) { say('Your passwords do not match.', true); confirmField.focus(); return; }
    setBusy(button, true, 'Creating account…'); say('');
    try {
      const {data, error} = await supabase.auth.signUp({email,password,options:{data:{full_name:name},emailRedirectTo:`${location.origin}/login.html?next=%2Fprofile.html&verified=1`}});
      setBusy(button, false);
      if (error) { say(error.message, true); return; }
      if (data.session) redirectAfterAuth(); else say('Account created. Check your email for a verification link. After verification, you can log in to your profile.');
    } catch (error) {
      setBusy(button, false);
      say(error.message || 'Could not connect to the sign-up service. Please try again.', true);
    }
  });
}
function bindReset(session) {
  const form = document.querySelector('#reset-form');
  if (!session) { say('Open this page from the password reset email to continue.', true); form.querySelector('button').disabled = true; return; }
  form.addEventListener('submit', async event => {
    event.preventDefault(); const button = form.querySelector('[type="submit"]'), password = form.elements.namedItem('password').value, confirmation = form.elements.namedItem('confirm-password').value;
    if (!passwordValid(password)) { say('Use at least 8 characters, including a letter and a number.', true); return; }
    if (password !== confirmation) { say('Your passwords do not match.', true); return; }
    setBusy(button, true, 'Updating…'); const {error} = await supabase.auth.updateUser({password}); setBusy(button, false);
    if (error) say(error.message, true); else { say('Password updated. You can now log in with your new password.'); setTimeout(() => location.replace('/login.html'), 1300); }
  });
}
function requireSession(session) {
  if (session) return true;
  location.replace(`/login.html?next=${encodeURIComponent(location.pathname + location.hash)}`); return false;
}
async function bindAccount(session) {
  if (!requireSession(session)) return;
  const user = session.user, name = user.user_metadata?.full_name || user.user_metadata?.name || '';
  document.querySelector('#account-email').textContent = user.email || 'Email unavailable';
  document.querySelector('#full-name').value = name;
  document.querySelector('#account-reset').addEventListener('click', async event => {
    const button = event.currentTarget; setBusy(button,true,'Sending…');
    const {error} = await supabase.auth.resetPasswordForEmail(user.email,{redirectTo:`${location.origin}/reset-password.html`});
    setBusy(button,false); say(error ? error.message : 'If an account uses that email, a password reset link is on its way. Check your inbox.',Boolean(error));
  });
  document.querySelector('#profile-form').addEventListener('submit', async event => {
    event.preventDefault(); const form = event.currentTarget, button = form.querySelector('[type="submit"]'), fullName = form.elements.namedItem('name').value.trim();
    if (fullName.length < 2) { say('Name must be at least 2 characters.', true); return; }
    setBusy(button, true, 'Saving…'); const {error} = await supabase.auth.updateUser({data:{full_name:fullName}}); setBusy(button, false);
    say(error ? error.message : 'Profile saved.'); if (error) messageNode.classList.add('error');
  });
  document.querySelector('#account-logout').addEventListener('click', async event => { const button = event.currentTarget; setBusy(button,true,'Logging out…'); const {error} = await supabase.auth.signOut(); if (error) { setBusy(button,false); say(error.message,true); } else location.replace('/index.html'); });
}
async function bindProfile(session) {
  if (!requireSession(session)) return;
  let user = session.user;
  let draftUrl = '';
  let draftObjectUrl = '';
  let removeAvatar = false;
  const form = document.querySelector('#profile-form');
  const summary = document.querySelector('#profile-summary');
  const fileInput = document.querySelector('#avatar-file');
  const removeButton = document.querySelector('#remove-picture');
  const maxBytes = 3 * 1024 * 1024;
  const supportedTypes = new Set(['image/jpeg','image/png','image/webp']);
  const getDisplayName = value => value?.user_metadata?.full_name || value?.user_metadata?.name || value?.email?.split('@')[0] || 'Mini Market member';
  const getAvatarUrl = value => value?.user_metadata?.avatar_url || value?.user_metadata?.picture || '';
  const getInitials = value => getDisplayName(value).trim().split(/\s+/).slice(0,2).map(part => part[0]).join('').toUpperCase() || 'M';
  const paintImage = (image, url, initials) => {
    const text = image.parentElement.querySelector('span'); text.textContent = initials;
    if (url) { image.src = url; image.hidden = false; }
    else { image.removeAttribute('src'); image.hidden = true; }
  };
  const fillProfile = () => {
    const name = getDisplayName(user), url = getAvatarUrl(user), initials = getInitials(user);
    document.querySelector('#profile-display-name').textContent = name;
    document.querySelector('#profile-email').textContent = user.email || 'Email unavailable';
    paintImage(document.querySelector('#profile-picture'),url,initials);
    paintImage(document.querySelector('#edit-picture'),url,initials);
    document.querySelector('#display-name').value = user.user_metadata?.full_name || user.user_metadata?.name || '';
    document.querySelector('#profile-email-field').value = user.email || '';
    draftUrl = url; removeAvatar = false;
  };
  const revokePreview = () => { if (draftObjectUrl) URL.revokeObjectURL(draftObjectUrl); draftObjectUrl = ''; };
  const startEditing = () => { fillProfile(); summary.hidden = true; form.hidden = false; document.querySelector('#display-name').focus(); };
  const stopEditing = () => { revokePreview(); fileInput.value = ''; fillProfile(); form.hidden = true; summary.hidden = false; say(''); };
  fillProfile(); summary.hidden = false;
  document.querySelector('#edit-profile').addEventListener('click', startEditing);
  document.querySelector('#cancel-profile-edit').addEventListener('click', stopEditing);
  document.querySelector('#profile-logout').addEventListener('click', async event => {
    const button = event.currentTarget;
    setBusy(button, true, 'Logging out…');
    try {
      const {error} = await supabase.auth.signOut();
      if (error) throw error;
      location.replace('/index.html');
    } catch (error) {
      setBusy(button, false);
      say(error.message || 'Could not log out. Please try again.', true);
    }
  });
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    const validExtension = ['jpg','jpeg','png','webp'].includes(ext);
    if (!supportedTypes.has(file.type) || !validExtension) { fileInput.value = ''; revokePreview(); paintImage(document.querySelector('#edit-picture'),draftUrl,getInitials(user)); say('Choose a JPG, PNG, or WebP image.',true); return; }
    if (file.size > maxBytes) { fileInput.value = ''; revokePreview(); paintImage(document.querySelector('#edit-picture'),draftUrl,getInitials(user)); say('Choose an image that is 3 MB or smaller.',true); return; }
    revokePreview(); draftObjectUrl = URL.createObjectURL(file); removeAvatar = false;
    const preview = document.querySelector('#edit-picture'); preview.src = draftObjectUrl; preview.hidden = false; say('Preview ready. Save changes to upload it.');
  });
  removeButton.addEventListener('click', () => {
    revokePreview(); fileInput.value = ''; removeAvatar = true;
    const preview = document.querySelector('#edit-picture'); preview.removeAttribute('src'); preview.hidden = true;
    document.querySelector('#edit-initials').textContent = getInitials(user); say('Profile picture will be removed when you save.');
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = document.querySelector('#profile-save');
    const displayName = document.querySelector('#display-name').value.trim();
    const file = fileInput.files?.[0] || null;
    if (displayName.length < 2 || displayName.length > 80) { say('Display name must be between 2 and 80 characters.',true); return; }
    if (file && (!supportedTypes.has(file.type) || file.size > maxBytes)) { say('Choose a JPG, PNG, or WebP image that is 3 MB or smaller.',true); return; }
    setBusy(button,true,'Saving…'); say('');
    let uploadedPath = '';
    const oldPath = user.user_metadata?.avatar_path || '';
    try {
      let avatarUrl = getAvatarUrl(user), avatarPath = oldPath;
      if (file) {
        const extension = file.name.split('.').pop().toLowerCase().replace('jpeg','jpg');
        uploadedPath = `${user.id}/${crypto.randomUUID()}.${extension}`;
        const {error:uploadError} = await supabase.storage.from('avatars').upload(uploadedPath,file,{contentType:file.type,cacheControl:'3600',upsert:false});
        if (uploadError) throw uploadError;
        avatarUrl = supabase.storage.from('avatars').getPublicUrl(uploadedPath).data.publicUrl;
        avatarPath = uploadedPath;
      } else if (removeAvatar) { avatarUrl = null; avatarPath = null; }
      const metadata = {...(user.user_metadata || {}),full_name:displayName,avatar_url:avatarUrl,avatar_path:avatarPath};
      if (removeAvatar && !file) metadata.picture = null;
      const {data,error:updateError} = await supabase.auth.updateUser({data:metadata});
      if (updateError) {
        if (uploadedPath) await supabase.storage.from('avatars').remove([uploadedPath]);
        throw updateError;
      }
      user = data.user || {...user,user_metadata:metadata};
      if (oldPath && oldPath !== avatarPath) {
        const {error:deleteError} = await supabase.storage.from('avatars').remove([oldPath]);
        if (deleteError) say('Profile saved. The previous image could not be removed from storage.',true);
      }
      revokePreview(); fileInput.value = ''; fillProfile(); form.hidden = true; summary.hidden = false;
      if (!messageNode.textContent) say('Profile updated.');
    } catch (error) {
      say(error.message || 'Could not save your profile. Please try again.',true);
    } finally { setBusy(button,false); }
  });
}
function safeLink(url) { try { const parsed = new URL(url); return ['http:','https:'].includes(parsed.protocol) ? parsed.href : '#'; } catch (_) { return '#'; } }
async function bindFavorites(session) {
  if (!requireSession(session)) return;
  const list = document.querySelector('#favorites-list'), empty = document.querySelector('#favorites-empty');
  const {data:rows,error} = await supabase.from('favorites').select('product_id').eq('user_id',session.user.id).order('created_at',{ascending:false});
  if (error) { say(`Could not load favorites: ${error.message}`,true); return; }
  const byId = new Map(FINDORA_PRODUCTS.map(product => [product.id,product]));
  const products = rows.map(row => byId.get(row.product_id)).filter(Boolean);
  empty.hidden = products.length > 0;
  list.innerHTML = products.map(product => `<article class="product-card"><div class="product-image" data-tone="${product.tone || 'sage'}">${product.image ? `<img src="${product.image}" alt="${product.name}">` : `<span class="placeholder-art" aria-hidden="true">${product.emoji || '✳'}</span>`}<button class="favorite-button" type="button" data-remove="${product.id}" aria-label="Remove ${product.name} from favorites">♥</button></div><div class="product-info"><div class="product-kicker"><span>${product.category}</span><span>${product.store}</span></div><h2 class="product-name">${product.name}</h2><p class="product-description">${product.description}</p><div class="product-foot"><span class="product-price">${Number.isFinite(product.price) ? new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(product.price) : ''}</span><a class="product-link" href="${safeLink(product.productUrl)}" target="_blank" rel="noopener noreferrer" data-demo-link>View product ↗</a></div></div></article>`).join('');
  list.addEventListener('click', async event => {
    const demoLink = event.target.closest('[data-demo-link]');
    if (demoLink && demoLink.href.includes('example.com')) { event.preventDefault(); say('This is a demonstration product link.'); return; }
    const button = event.target.closest('[data-remove]'); if (!button) return;
    button.disabled = true;
    const {error:removeError} = await supabase.from('favorites').delete().eq('user_id',session.user.id).eq('product_id',button.dataset.remove);
    if (removeError) { button.disabled = false; say(`Could not remove favorite: ${removeError.message}`,true); return; }
    button.closest('.product-card').remove(); if (!list.children.length) empty.hidden = false;
  });
}

if (['login','signup','reset','account','favorites','profile'].includes(page)) initAuth();
