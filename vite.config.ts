import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'lucide-react'],
          'vendor-motion': ['motion', 'liquid-glass-web-react'],
          'archive-public': ['./src/data/qingheArchiveData.ts', './src/data/bbsData.ts'],
          'archive-gov': ['./src/data/chroniclesData.ts', './src/data/mailData.ts'],
          'encrypted-vault': ['./src/data/encryptedVault.ts', './src/data/oaData.ts', './src/data/zhixiaNotesData.ts'],
        },
      },
    },
  },
});
