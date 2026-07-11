
import { createClient } from '@supabase/supabase-js'

// Try to get environment variables from standard Vite or Process sources
const getEnvUrl = () => {
  const meta = import.meta as any;
  if (typeof import.meta !== 'undefined' && meta.env && meta.env.VITE_SUPABASE_URL) {
    return meta.env.VITE_SUPABASE_URL;
  }
  if (typeof process !== 'undefined' && process.env && process.env.VITE_SUPABASE_URL) {
    return process.env.VITE_SUPABASE_URL;
  }
  return null;
}

const getEnvKey = () => {
  const meta = import.meta as any;
  if (typeof import.meta !== 'undefined' && meta.env && meta.env.VITE_SUPABASE_ANON_KEY) {
    return meta.env.VITE_SUPABASE_ANON_KEY;
  }
  if (typeof process !== 'undefined' && process.env && process.env.VITE_SUPABASE_ANON_KEY) {
    return process.env.VITE_SUPABASE_ANON_KEY;
  }
  return null;
}

const supabaseUrl = (() => {
  const envUrl = getEnvUrl();
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
  getEnvKey() || 
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

const shouldProxy = (): boolean => {
  if (typeof window === 'undefined') return true;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host.includes('.run.app') || host.includes('gitpod') || host.includes('codesandbox');
};

const customFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const urlStr = typeof input === 'string' 
    ? input 
    : (input as any).url || (input && typeof input.toString === 'function' ? input.toString() : '');
  
  if (urlStr && urlStr.includes('supabase.co')) {
    // Si no estamos en un entorno de desarrollo de AI Studio o local, conectarse DIRECTAMENTE a Supabase
    if (!shouldProxy()) {
      return await fetch(input, init);
    }

    try {
      const proxyUrl = typeof window !== 'undefined' 
        ? '/api/supabase-proxy' 
        : 'http://localhost:3000/api/supabase-proxy';
      
      const headers = new Headers(init?.headers || {});
      headers.set('x-target-url', urlStr);
      
      const proxyInit: RequestInit = {
        ...init,
        headers,
      };
      
      const response = await fetch(proxyUrl, proxyInit);
      
      // Si el proxy responde con un HTML (por ejemplo, el fallback del SPA en producción que es un 404)
      const contentType = response.headers.get('content-type') || '';
      if (!response.ok || contentType.includes('text/html')) {
        console.warn(`Supabase proxy returned non-JSON/error (${response.status}). Falling back to direct Supabase.`);
        return await fetch(input, init);
      }
      
      return response;
    } catch (err) {
      console.warn("Supabase customFetch proxy failed, falling back to direct:", err);
      return await fetch(input, init);
    }
  }
  
  return await fetch(input, init);
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // Desactivado permanentemente para evitar conflictos de bloqueo (Navigator LockManager)
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'lr-performance-auth-v1'
  },
  global: {
    fetch: customFetch
  }
})
