
import { createClient } from '@supabase/supabase-js'

// Try to get environment variables from standard Vite or Process sources
const getEnv = (name: string) => {
  // Fix: Use type assertion to safely access Vite-specific environment variables in TypeScript
  const meta = import.meta as any;
  if (typeof import.meta !== 'undefined' && meta.env && meta.env[name]) {
    return meta.env[name];
  }
  if (typeof process !== 'undefined' && process.env && process.env[name]) {
    return process.env[name];
  }
  return null;
}

const supabaseUrl = (() => {
  const envUrl = getEnv('VITE_SUPABASE_URL');
  const fallback = 'https://nqdbqqmjyygopjnpqyvm.supabase.co';
  
  if (!envUrl) return fallback;
  
  let cleaned = envUrl.trim().replace(/\/$/, "");
  
  // Seguridad: Si la URL contiene 'catapultsports', probablemente se equivocaron al configurar los secrets
  if (cleaned.includes('catapultsports')) {
    console.warn("ADVERTENCIA: VITE_SUPABASE_URL parece ser una URL de Catapult. Usando fallback de Supabase.");
    return fallback;
  }

  // Seguridad: Si la URL apunta a este mismo servidor (ais-dev o ais-pre), es un error de configuración
  if (typeof window !== 'undefined' && cleaned.includes(window.location.hostname)) {
    console.warn("ADVERTENCIA: VITE_SUPABASE_URL apunta al servidor actual. Esto es incorrecto. Usando fallback.");
    return fallback;
  }
  
  // Limpieza de rutas accidentales
  cleaned = cleaned.replace(/\/(rest|auth)\/v1$/, "");
  
  if (!cleaned.startsWith('http')) {
    return `https://${cleaned}`;
  }
  
  return cleaned;
})();

const supabaseAnonKey = (
  getEnv('VITE_SUPABASE_ANON_KEY') || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xZGJxcW1qeXlnb3BqbnBxeXZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMjU1MzMsImV4cCI6MjA4NTkwMTUzM30.5aYRn3fz6kc0BQSeeBKE5AAiGZNfMWQfcQPwEkNLQjk'
).trim()

console.log("Supabase URL en uso:", supabaseUrl.substring(0, 15) + "...");

// Detectar si estamos en un iframe (como en la vista previa de desarrollo)
let isIframe = false;
try {
  isIframe = typeof window !== 'undefined' && window.self !== window.top;
} catch (e) {
  isIframe = true; // Si no podemos acceder a window.top, asumimos que estamos en un entorno restringido
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // Desactivado permanentemente para evitar conflictos de bloqueo (Navigator LockManager)
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'lr-performance-auth-v1'
  }
})
