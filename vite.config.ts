import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// Relative base keeps the build working from any subpath, e.g. GitHub Pages /graphics-lab/.
export default defineConfig({ base: './', plugins: [react()] });
