
import { GoogleGenAI, Type } from "@google/genai";
import { AthletePerformanceRecord } from '../types';

export const getPerformanceInsights = async (data: AthletePerformanceRecord[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const summary = data.map(record => ({
      name: record.player.name,
      category: record.player.category,
      avgWellness: record.wellness.length > 0 ? record.wellness.reduce((acc, w) => acc + (w.fatigue + w.sleep + w.mood) / 3, 0) / record.wellness.length : 0,
      avgLoad: record.loads.length > 0 ? record.loads.reduce((acc, l) => acc + l.load, 0) / record.loads.length : 0,
      maxHSR: record.gps.length > 0 ? Math.max(...record.gps.map(g => g.hsrDistance)) : 0
    }));

    const prompt = `
      Actúa como un Analista de Rendimiento de Élite para la Selección Nacional de Fútbol.
      Analiza los siguientes datos de rendimiento de los últimos 14 días para el plantel:
      ${JSON.stringify(summary)}

      Por favor proporciona:
      1. Un resumen ejecutivo del estado de preparación (readiness) del grupo.
      2. Identifica 2-3 jugadores que podrían estar en riesgo de sobreentrenamiento o lesión (alta carga + bajo bienestar).
      3. Recomendaciones técnicas para el próximo microciclo.
      
      Formatea la respuesta en Markdown limpio con viñetas. Sé profesional, directo y utiliza terminología futbolística. RESPONDE SIEMPRE EN ESPAÑOL.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text || "No se pudieron generar los informes en este momento.";
  } catch (error) {
    console.error("Error de Gemini:", error);
    return "Error al conectar con el motor de IA de rendimiento.";
  }
};

export const queryCoachAssistant = async (query: string, data: AthletePerformanceRecord[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const context = data.map(r => ({
      name: r.player.name,
      wellness: r.wellness.slice(-3),
      loads: r.loads.slice(-3),
      position: r.player.position,
      category: r.player.category
    }));

    const prompt = `
      Eres el "Asistente de IA de La Roja", un experto en ciencias del deporte.
      Contexto del plantel actual: ${JSON.stringify(context)}
      
      Pregunta del Entrenador: "${query}"
      
      Responde de forma concisa, profesional y basada en los datos proporcionados. Si no tienes datos suficientes para responder algo específico, menciónalo.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text || "No tengo una respuesta clara basada en los datos actuales.";
  } catch (error) {
    return "Error al procesar la consulta del asistente.";
  }
};

export interface WeatherData {
  city: string;
  currentTemp: number;
  condition: string;
  precipitation: string;
  humidity: string;
  wind: string;
  hourly: { time: string, temp: number }[];
  daily: { day: string, icon: string, high: number, low: number, isToday?: boolean }[];
}

const weatherCache: Record<string, { data: WeatherData, timestamp: number }> = {};
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export const getWeatherForecast = async (city: string, country: string): Promise<{ data: WeatherData | null, sources: any[], error?: string }> => {
  const cacheKey = `${city}-${country}`;
  const now = Date.now();

  if (weatherCache[cacheKey] && (now - weatherCache[cacheKey].timestamp < CACHE_DURATION)) {
    return { data: weatherCache[cacheKey].data, sources: [] };
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const prompt = `
      Proporciona el pronóstico del tiempo detallado para ${city}, ${country}.
      Devuelve la información estrictamente en formato JSON con la siguiente estructura:
      {
        "city": "${city}",
        "currentTemp": número,
        "condition": "Descripción (ej: Despejado, Nublado)",
        "precipitation": "X%",
        "humidity": "X%",
        "wind": "X km/h",
        "hourly": [
          {"time": "1 a.m.", "temp": número},
          {"time": "4 a.m.", "temp": número},
          {"time": "7 a.m.", "temp": número},
          {"time": "10 a.m.", "temp": número},
          {"time": "1 p.m.", "temp": número},
          {"time": "4 p.m.", "temp": número},
          {"time": "7 p.m.", "temp": número},
          {"time": "10 p.m.", "temp": número}
        ],
        "daily": [
          {"day": "dom", "icon": "fa-sun", "high": 28, "low": 14, "isToday": true},
          ... (7 días en total)
        ]
      }
      Usa clases de FontAwesome para los iconos (fa-sun, fa-cloud, fa-cloud-rain, fa-moon, etc.).
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json"
      },
    });

    const jsonText = response.text || "{}";
    const data = JSON.parse(jsonText) as WeatherData;
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    // Cache the successful response
    weatherCache[cacheKey] = { data, timestamp: now };

    return {
      data,
      sources
    };
  } catch (error: any) {
    const errorMsg = error?.message || "";
    const errorStatus = error?.status || "";
    const errorJson = JSON.stringify(error);
    
    const isQuotaError = 
      errorMsg.includes("429") || 
      errorMsg.toLowerCase().includes("quota") || 
      errorStatus === "RESOURCE_EXHAUSTED" ||
      errorJson.includes("429") ||
      errorJson.includes("RESOURCE_EXHAUSTED");
    
    if (isQuotaError) {
      console.warn("Weather API quota exhausted. Using fallback logic.");
    } else {
      console.error("Error fetching weather:", error);
    }

    let errorMessage = "Error al obtener el clima";
    if (isQuotaError) {
      errorMessage = "QUOTA_EXHAUSTED";
      // Cache the exhausted state for 5 minutes to avoid spamming the API
      weatherCache[cacheKey] = { 
        data: null as any, 
        timestamp: now - (CACHE_DURATION - 5 * 60 * 1000) 
      };
    }
    return { data: null, sources: [], error: errorMessage };
  }
};

export const getChartSummary = async (chartTitle: string, data: any) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const prompt = `
      Actúa como un Científico del Deporte de élite.
      Analiza los siguientes datos estadísticos del gráfico titulado "${chartTitle}":
      ${JSON.stringify(data)}

      Por favor proporciona un resumen breve (máximo 3-4 líneas) que destaque:
      1. El hallazgo más significativo o tendencia clara.
      2. Una observación sobre la dispersión o valores atípicos si son relevantes.
      3. Una recomendación rápida o punto de atención para el cuerpo técnico.

      Sé directo, profesional y utiliza terminología técnica deportiva. RESPONDE SIEMPRE EN ESPAÑOL.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text || "No se pudo generar el resumen del gráfico.";
  } catch (error) {
    console.error("Error al generar resumen del gráfico:", error);
    return "Error al conectar con la IA para el resumen.";
  }
};

export const getAthleteFootprintSummary = async (player: any, metrics: any) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const prompt = `
      Actúa como un Director de Ciencias del Deporte de una Selección Nacional de Fútbol.
      Analiza el perfil completo de "Huella del Atleta" para el siguiente jugador:
      
      Jugador: ${player.nombre} ${player.apellido1}
      Posición: ${player.posicion}
      Categoría: ${player.category || 'N/A'}
      
      Métricas Recientes:
      ${JSON.stringify(metrics)}

      Por favor proporciona un "Perfil Ejecutivo del Jugador" que incluya:
      1. **Resumen de Capacidades**: Breve descripción de su perfil físico (ej: "Jugador explosivo con alta capacidad de aceleración pero resistencia aeróbica moderada").
      2. **Estado de Salud y Disponibilidad**: Basado en su historial reciente.
      3. **Puntos de Mejora**: 1-2 aspectos específicos a trabajar en el próximo microciclo.
      4. **Conclusión Técnica**: Una frase final sobre su proyección o estado actual para la competición.

      Formatea la respuesta en Markdown elegante. Sé muy profesional, directo y utiliza terminología de alto rendimiento. RESPONDE SIEMPRE EN ESPAÑOL.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text || "No se pudo generar el perfil ejecutivo en este momento.";
  } catch (error) {
    console.error("Error al generar perfil de huella:", error);
    return "Error al conectar con el motor de IA para el perfil del jugador.";
  }
};
