import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative asset paths, so the site works from any sub-path such as
  // https://<user>.github.io/<repo>/ on GitHub Pages.
  base: './',
})
