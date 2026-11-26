import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { createHtmlPlugin } from 'vite-plugin-html'
import tsconfigPaths from 'vite-tsconfig-paths'
import { execSync } from 'child_process'
import { VitePWA, VitePWAOptions } from 'vite-plugin-pwa'

// Short commit sha, or 'dev' when the project is not (yet) a git repository
const getCommit = () => {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString()
  } catch {
    return 'dev'
  }
}

// https://vitejs.dev/config/
const viteconfig = ({ mode }) => {
  // load env variables from .env files
  process.env = { ...process.env, ...loadEnv(mode, process.cwd(), '') }

  const environment = process.env.ENVIRONMENT || 'dev'
  const outDir = process.env.BUILD_PATH
  const base = process.env.BASE_URL || '/'
  const commit = getCommit()
  const title = process.env.APP_TITLE || 'Open Bombers'

  return defineConfig({
    base,
    build: { outDir },
    define: {
      'import.meta.env.ENVIRONMENT': JSON.stringify(environment),
      'import.meta.env.title': JSON.stringify(title),
      'import.meta.env.COMMIT': JSON.stringify(commit.trim()),
    },
    plugins: [
      tsconfigPaths(),
      react(),
      VitePWA(pwaManifest(base)),
      createHtmlPlugin({
        template: `index.html`,
        minify: { removeComments: false, collapseWhitespace: true },
        inject: { data: { commit: commit.trim(), title } },
      }),
    ],
  })
}

const pwaManifest = (base: string): Partial<VitePWAOptions> => ({
  registerType: 'prompt', // we show our own "update available" banner
  includeAssets: ['assets/logos/*', 'assets/pwa/*'],
  manifest: {
    name: 'Open Bombers',
    short_name: 'Open Bombers',
    description: "Planificació del temari i calendari de repassos per a les oposicions de Bombers. Funciona sense connexió.",
    lang: 'ca',
    theme_color: '#0E7C86',
    background_color: '#F7F6F4',
    display: 'standalone',
    start_url: base,
    scope: base,
    icons: [
      { src: 'assets/pwa/manifest-icon-192.maskable.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'assets/pwa/manifest-icon-512.maskable.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'assets/pwa/manifest-icon-512.maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: 'assets/pwa/apple-icon-180.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
    ],
  },
  workbox: {
    // The whole app is local: precache everything so it works 100% offline after the first load
    globPatterns: ['**/*.{js,mjs,css,html,png,svg,ico,json,webmanifest}'],
    navigateFallback: 'index.html',
    maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
  },
})

export default viteconfig
