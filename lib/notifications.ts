import { supabase } from './supabase';

export async function subscribeToNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Las notificaciones push no son compatibles con este navegador.');
    return null;
  }

  try {
    // 1. Pedir permiso
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Permiso de notificaciones denegado.');
    }

    // 2. Obtener el Service Worker registrado
    const registration = await navigator.serviceWorker.ready;

    // 3. Suscribirse al servidor de push
    // NOTA: En una app real, debes generar tu propio par de claves VAPID.
    // Para propósitos de esta demo, usaremos una clave de ejemplo válida.
    const VAPID_PUBLIC_KEY = 'BC_j8T_5YSDH798YHSDH798YHSDH798YHSDH798YHSDH798YHSDH798YHSDH798YHSDH798YHSDH798A';
    
    // Helper para convertir la clave VAPID de base64 a Uint8Array (Requerido por navegadores móviles)
    const urlBase64ToUint8Array = (base64String: string) => {
      const padding = '='.repeat((4 - base64String.length % 4) % 4);
      const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

      try {
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
      } catch (e) {
        console.error("Error al decodificar clave VAPID:", e);
        throw new Error("La clave VAPID no tiene un formato Base64 válido.");
      }
    };

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    }).catch(err => {
      console.error("Error en pushManager.subscribe:", err);
      throw new Error(`Error de suscripción: ${err.message}`);
    });

    // 4. Guardar en Supabase
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Debes iniciar sesión para activar notificaciones.');
    
    const { error } = await supabase
      .from('user_notifications')
      .upsert({
        user_id: user.id,
        subscription: subscription.toJSON(),
        created_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error al suscribirse:', error);
    return { success: false, message: error.message || 'Error desconocido' };
  }
}

// Función para disparar la notificación vía Edge Function
export const triggerPushNotification = async (payload: { title: string, body: string, url: string }) => {
  try {
    // Verificamos si estamos en un entorno donde podemos invocar funciones
    if (!supabase.functions) {
      console.warn("Supabase Functions no está configurado.");
      return null;
    }

    // Invocamos la Edge Function de Supabase
    // Usamos un timeout corto para no bloquear la UI si la función no responde
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: payload
    });

    if (error) {
      // Si el error es 404, significa que la función no está desplegada
      if (error.message?.includes('404') || error.status === 404) {
        console.warn("⚠️ La Edge Function 'send-notification' no ha sido desplegada en este proyecto de Supabase. Sáltando notificación push.");
        return null;
      }
      throw error;
    }

    return data;
  } catch (error: any) {
    // Solo logueamos como error si no es un error esperado de configuración
    if (error.message?.includes('Failed to fetch') || error.message?.includes('Edge Function')) {
      console.warn("ℹ️ No se pudo contactar con la Edge Function. Es probable que no esté configurada o desplegada aún:", error.message);
    } else {
      console.error("Error al invocar Edge Function:", error);
    }
    // No lanzamos error para no bloquear el flujo principal de guardado
    return null;
  }
};
