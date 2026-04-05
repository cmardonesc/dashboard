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
    // Nota: En producción necesitarás una VAPID PUBLIC KEY. 
    // Por ahora usamos una suscripción básica para preparar la estructura.
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: 'BEl62vp9IHZbtS9K8guS9WV76DB7En79S9S9S9S9S9S9S9S9S9S9S9S9S9S9S9S9S9S9S9S9S9S9S9S9S9S9S9A' // Clave de ejemplo
    });

    // 4. Guardar en Supabase
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('user_notifications')
      .upsert({
        user_id: user?.id,
        subscription: subscription.toJSON(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error al suscribirse:', error);
    return false;
  }
}

// Función para disparar la notificación vía Edge Function
export const triggerPushNotification = async (payload: { title: string, body: string, url: string }) => {
  try {
    // Invocamos la Edge Function de Supabase
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: payload
    });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error al invocar Edge Function:", error);
    // No lanzamos error para no bloquear el flujo principal de guardado
    return null;
  }
};
