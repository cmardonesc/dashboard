
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

const supabaseUrl = (
  getEnv('VITE_SUPABASE_URL') || 
  'https://nqdbqqmjyygopjnpqyvm.supabase.co'
).trim()

const supabaseAnonKey = (
  getEnv('VITE_SUPABASE_ANON_KEY') || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xZGJxcW1qeXlnb3BqbnBxeXZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMjU1MzMsImV4cCI6MjA4NTkwMTUzM30.5aYRn3fz6kc0BQSeeBKE5AAiGZNfMWQfcQPwEkNLQjk'
).trim()

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
