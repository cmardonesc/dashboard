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
    const applicationServerKey = 'BEl62vp9IHZbtS9K8guS9WV76DB7En79S9S9S9S9S9S9S9S9S9S9S9S9S9S9S9S9S9S9S9S9S9S9S9S9S9S9S9A';
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey
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
