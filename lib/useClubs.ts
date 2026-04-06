
import { useState, useEffect } from 'react';
import { supabase } from './supabase';

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
          .eq('activo', true)
          .order('nombre', { ascending: true });

        if (err) throw err;
        setClubs(data || []);
      } catch (e: any) {
        console.error('Error fetching clubs:', e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchClubs();
  }, []);

  return { clubs, loading, error };
};
