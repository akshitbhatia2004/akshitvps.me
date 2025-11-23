import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// VERY IMPORTANT: project root must be the directory where index.html exists
export default defineConfig({
  plugins: [react()],
  root: '.',          // Make sure Vite looks here for index.html
  publicDir: 'public',
  build: {
    outDir: 'dist'
  }
})
