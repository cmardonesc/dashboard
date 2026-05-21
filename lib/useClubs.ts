
import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { FALLBACK_CLUB_NAMES } from '../constants';

export interface ClubDB {
  id_club: number;
  codigo: string;
  nombre: string;
  ciudad?: string;
  region?: string;
  activo: boolean;
  id_pais?: number;
  logo_url?: string;
}

export const useClubs = () => {
  const [clubs, setClubs] = useState<ClubDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClubs = async () => {
      try {
        const { data, error: err } = await supabase
          .from('clubes')
          .select('*')
          .order('nombre', { ascending: true });

        if (err) throw err;
        
        let finalClubs = data || [];
        if (finalClubs.length === 0) {
          console.warn("useClubs: 'clubes' returned empty. Using fallback clubs.");
          finalClubs = Object.entries(FALLBACK_CLUB_NAMES).map(([id, nombre]) => ({
            id_club: Number(id),
            codigo: nombre.toUpperCase().substring(0, 6),
            nombre: nombre,
            activo: true
          }));
        }
        
        setClubs(finalClubs);
      } catch (e: any) {
        console.error('Error fetching clubs inside useClubs, using fallbacks:', e);
        // Fallback robusto en caso de error de conexión o de tabla
        const fallbackClubs = Object.entries(FALLBACK_CLUB_NAMES).map(([id, nombre]) => ({
          id_club: Number(id),
          codigo: nombre.toUpperCase().substring(0, 6),
          nombre: nombre,
          activo: true
        }));
        setClubs(fallbackClubs);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchClubs();
  }, []);

  return { clubs, loading, error };
};
