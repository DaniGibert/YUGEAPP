import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Erlaubt einen zugewiesenen Port (z. B. Preview-Tooling), sonst Vite-Standard 5173
    port: Number(process.env.PORT) || 5173,
  },
});
