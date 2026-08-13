import { defineConfig } from 'vite'
import { resolve } from 'path'
import { readdirSync, readFileSync } from 'fs'

const ROOT = new URL('.', import.meta.url).pathname

const pageFiles = readdirSync(ROOT)
  .filter(file => file.endsWith('.html'))
  .reduce((pages, file) => {
    const name = file === 'index.html' ? 'index' : file.replace('.html', '')
    pages[name] = resolve(ROOT, file)
    return pages
  }, {})

const PLAIN_JS_FILES = [
  'biu-design.js',
  'brain.js',
  'universities.js',
  'lazy-loader-init.js',
  'skeleton-loader.js',
  'sw.js',
]

const copyPlainScriptsPlugin = {
  name: 'copy-plain-scripts',
  apply: 'build',
  generateBundle() {
    PLAIN_JS_FILES.forEach(file => {
      const filePath = resolve(ROOT, file)
      try {
        const source = readFileSync(filePath, 'utf-8')
        this.emitFile({ type: 'asset', fileName: file, source })
      } catch (_) {
        // file doesn't exist, skip
      }
    })
  }
}

const injectEnvPlugin = {
  name: 'inject-env',
  apply: 'build',
  generateBundle() {
    const configPath = resolve(ROOT, 'config.js')
    let configContent = readFileSync(configPath, 'utf-8')

    configContent = configContent
      .replace(/__VITE_FIREBASE_API_KEY__/g, process.env.VITE_FIREBASE_API_KEY || '')
      .replace(/__VITE_FIREBASE_AUTH_DOMAIN__/g, process.env.VITE_FIREBASE_AUTH_DOMAIN || '')
      .replace(/__VITE_FIREBASE_DATABASE_URL__/g, process.env.VITE_FIREBASE_DATABASE_URL || '')
      .replace(/__VITE_FIREBASE_PROJECT_ID__/g, process.env.VITE_FIREBASE_PROJECT_ID || '')
      .replace(/__VITE_FIREBASE_STORAGE_BUCKET__/g, process.env.VITE_FIREBASE_STORAGE_BUCKET || '')
      .replace(/__VITE_FIREBASE_MESSAGING_SENDER_ID__/g, process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '')
      .replace(/__VITE_FIREBASE_APP_ID__/g, process.env.VITE_FIREBASE_APP_ID || '')
      .replace(/__VITE_FIREBASE_MEASUREMENT_ID__/g, process.env.VITE_FIREBASE_MEASUREMENT_ID || '')
      .replace(/__VITE_GEMINI_API_KEY__/g, process.env.VITE_GEMINI_API_KEY || '')

    this.emitFile({ type: 'asset', fileName: 'config.js', source: configContent })
  }
}

export default defineConfig({
  root: '.',
  base: './',
  plugins: [copyPlainScriptsPlugin, injectEnvPlugin],
  server: {
    port: 5000,
    host: '0.0.0.0',
    allowedHosts: true,
    strictPort: false
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: pageFiles
    }
  }
})
