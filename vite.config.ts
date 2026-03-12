import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carga las variables de entorno (incluyendo las de Hostinger)
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // 1. SOLUCIÓN A PANTALLA EN BLANCO: Define la ruta base relativa
    base: './', 

    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    
    // 2. SOLUCIÓN A ERROR DE API KEY: 
    // Mapeamos lo que viene de Hostinger hacia lo que espera tu código
    define: {
      'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY),
      // Añadimos Supabase por si acaso
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});