/**
 * Servicio para interactuar con la API de Catapult a través de nuestro proxy local.
 */

export async function fetchCatapultActivities() {
  const response = await fetch('/api/catapult/activities');
  const contentType = response.headers.get("content-type");
  
  if (!response.ok) {
    if (contentType && contentType.includes("application/json")) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error en la API de Catapult');
    } else {
      const text = await response.text();
      console.error("Respuesta no-JSON recibida:", text.substring(0, 100));
      throw new Error('La API devolvió una respuesta inválida (HTML). Revisa la configuración del Token.');
    }
  }
  
  return response.json();
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
