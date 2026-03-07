
import { User, UserRole, Category, WellnessData, TrainingLoadData, GPSData, NutritionData } from './types';

const PLAYER_NAMES = [
  "Julian Alvarez", "Enzo Fernandez", "Lionel Messi", "Cristian Romero", 
  "Lisandro Martinez", "Nahuel Molina", "Rodrigo De Paul", "Alexis Mac Allister",
  "Eduardo Vargas", "Ben Brereton", "Gary Medel", "Arturo Vidal", "Marcelino Nuñez", "Darío Osorio"
];

const POSITIONS = ['DEL', 'VOL', 'DEF', 'ARQ'];

export const MOCK_PLAYERS: User[] = PLAYER_NAMES.map((name, idx) => ({
  id: `p-${idx + 1}`,
  id_del_jugador: idx + 1, // ID numérico para pruebas
  name,
  role: UserRole.PLAYER,
  category: idx < 4 ? Category.SUB_20 : idx < 9 ? Category.SUB_17 : Category.SUB_15,
  position: POSITIONS[idx % 4]
}));

export const MOCK_STAFF: User = {
  id: 's-1',
  name: 'Head Performance Coach',
  role: UserRole.STAFF
};

const generatePastDays = (days: number) => {
  const dates = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
};

export const generateMockData = () => {
  const dates = generatePastDays(14);
  const wellness: WellnessData[] = [];
  const loads: TrainingLoadData[] = [];
  const gps: GPSData[] = [];
  const nutrition: NutritionData[] = [];

  MOCK_PLAYERS.forEach(player => {
    // Nutrition (One record per player for current state)
    // Fix: Updated NutritionData mock generation to match the interface in types.ts and use correct property names
    nutrition.push({
      id: `n-${player.id}`,
      id_del_jugador: player.id_del_jugador || 0,
      fecha_medicion: dates[0],
      edad_cronologica: 16 + Math.floor(Math.random() * 8),
      masa_corporal_kg: 65 + Math.random() * 20,
      talla_cm: 165 + Math.random() * 25,
      talla_sentada_cm: 85 + Math.random() * 10,
      masa_muscular_kg: 30 + Math.random() * 15,
      masa_muscular_pct: 40 + Math.random() * 15,
      masa_adiposa_kg: 6 + Math.random() * 10,
      masa_adiposa_pct: 7 + Math.random() * 8,
      indice_imo: 4.0 + Math.random() * 1.5,
      indice_imc: 20 + Math.random() * 10,
      sum_pliegues_6_mm: 40 + Math.random() * 30,
      sum_pliegues_8_mm: 55 + Math.random() * 40
    });

    dates.forEach(date => {
      // Wellness
      wellness.push({
        id: `w-${player.id}-${date}`,
        playerId: player.id,
        date,
        fatigue: Math.floor(Math.random() * 3) + 3,
        sleep: Math.floor(Math.random() * 3) + 3,
        stress: Math.floor(Math.random() * 2) + 4,
        soreness: Math.floor(Math.random() * 3) + 2,
        mood: Math.floor(Math.random() * 2) + 4,
      });

      // Loads
      const duration = 60 + Math.floor(Math.random() * 60);
      const rpe = Math.floor(Math.random() * 6) + 4;
      loads.push({
        id: `l-${player.id}-${date}`,
        playerId: player.id,
        date,
        duration,
        rpe,
        load: duration * rpe,
        type: Math.random() > 0.8 ? 'MATCH' : 'FIELD'
      });

      // GPS
      // Fix: Added missing duration property to match GPSData interface
      gps.push({
        id: `g-${player.id}-${date}`,
        playerId: player.id,
        date,
        duration,
        totalDistance: 6000 + Math.floor(Math.random() * 4000),
        hsrDistance: 400 + Math.floor(Math.random() * 600),
        sprintCount: 5 + Math.floor(Math.random() * 15),
        maxSpeed: 8 + Math.random() * 2
      });
    });
  });

  return { wellness, loads, gps, nutrition };
};
