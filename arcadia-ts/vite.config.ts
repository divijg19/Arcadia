import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import * as path from 'path'

export default defineConfig({
  plugins: [solid()],
  server: {
    fs: {
      // Allow serving files from the monorepo root (so arcadia-rs/pkg is reachable)
      allow: [path.resolve(__dirname, '..')]
    }
  }
})
