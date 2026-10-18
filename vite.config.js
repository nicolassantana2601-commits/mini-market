import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));
const pages = [
  'index.html',
  'login.html',
  'signup.html',
  'reset-password.html',
  'account.html',
  'favorites.html',
  'profile.html',
  'profile/index.html'
];

export default defineConfig({
  build: {
    rollupOptions: {
      input: Object.fromEntries(pages.map(page => [page.replace(/\.html$/, ''), resolve(root, page)]))
    }
  }
});
