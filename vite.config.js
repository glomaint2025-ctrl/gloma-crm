import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Unique id for each production build. The app compares it with /version.json
// (written next to the build) to tell users when a newer version has been deployed.
const BUILD_ID = String(Date.now())

const emitVersionFile = () => ({
  name: 'emit-version-file',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'version.json',
      source: JSON.stringify({ buildId: BUILD_ID }),
    })
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), emitVersionFile()],
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
})
