// This small, dependency-free script keeps password visibility controls working
// even when the Supabase client is not configured yet.
document.addEventListener('click', event => {
  const button = event.target.closest('[data-toggle-password]');
  if (!button) return;

  const input = document.getElementById(button.dataset.togglePassword);
  if (!input) return;

  const showPassword = input.type === 'password';
  input.type = showPassword ? 'text' : 'password';
  button.textContent = showPassword ? 'Hide' : 'Show';
  button.setAttribute('aria-label', showPassword ? 'Hide password' : 'Show password');
  button.setAttribute('aria-pressed', String(showPassword));
});
