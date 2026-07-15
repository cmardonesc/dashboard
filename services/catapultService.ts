import { supabase } from '../lib/supabase';

/**
 * Servicio para interactuar con la API de Catapult a través de nuestro proxy local o Edge Functions.
 */

export async function fetchCatapultActivities(sinceDays: number = 90): Promise<any> {
  const { data, error } = await supabase.functions.invoke('catapult-activities', {
    body: { days: sinceDays },
  });

  if (error) {
    let detail = '';
    if (error.context) {
      if (typeof error.context.text === 'function') {
        try {
          detail = await error.context.text();
        } catch (e) {}
      } else if (typeof error.context === 'object') {
        try {
          detail = JSON.stringify(error.context);
        } catch (e) {}
      } else {
        detail = String(error.context);
      }
    }
    const baseMessage = error.message || 'Error invocando la Edge Function';
    throw new Error(detail ? `${baseMessage}: ${detail}` : baseMessage);
  }

  if (data && data.error) {
    throw new Error(typeof data.error === 'string' ? data.error : (data.error.message || JSON.stringify(data.error)));
  }

  return {
    activities: data?.activities ?? [],
    metadata: data?.metadata ?? {}
  };
}

export async function fetchCatapultActivityDetail(activityId: string) {
  const response = await fetch(`/api/catapult/activities/${activityId}`);
  if (!response.ok) {
    throw new Error('Error fetching activity details');
  }
  return response.json();
}

export async function fetchCatapultActivityStats(activityId: string) {
  const response = await fetch(`/api/catapult/activities/${activityId}/stats`);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error fetching stats from Catapult');
  }
  return response.json();
}

export async function testCatapultConnection() {
  const response = await fetch('/api/catapult/test');
  return response.json();
}
