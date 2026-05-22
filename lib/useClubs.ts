
import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { FALLBACK_CLUB_NAMES } from '../constants';
import { FALLBACK_CLUBS } from './fallback_clubs';

export interface ClubDB {
  id_club: number;
  codigo: string;
  nombre: string;
  ciudad?: string;
  region?: string;
  activo: boolean;
  id_pais?: number;
  pais?: string;
  logo_url?: string;
}

export const useClubs = () => {
  const [clubs, setClubs] = useState<ClubDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClubs = async () => {
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('clubes')
        .select('*');

      if (err) throw err;
      
      let finalClubs = data || [];
      if (finalClubs.length === 0) {
        console.warn("useClubs: 'clubes' returned empty. Using robust fallback clubs.");
        finalClubs = [...FALLBACK_CLUBS];
      } else {
        // Merge: use database clubs, but if a fallback club is not in database, add it!
        // Also, fill in missing 'pais' or other details for clubs by matching id_club or name
        const dbNames = new Set(finalClubs.map(c => (c.nombre || '').toUpperCase().trim()));
        const dbIds = new Set(finalClubs.map(c => c.id_club));
        
        FALLBACK_CLUBS.forEach(fc => {
          if (!dbIds.has(fc.id_club) && !dbNames.has((fc.nombre || '').toUpperCase().trim())) {
            finalClubs.push(fc);
          }
        });
        
        finalClubs = finalClubs.map(c => {
          const fc = FALLBACK_CLUBS.find(f => 
            f.id_club === c.id_club || 
            (f.nombre && c.nombre && f.nombre.toUpperCase().trim() === c.nombre.toUpperCase().trim())
          );
          if (fc) {
            return {
              id_club: c.id_club,
              codigo: c.codigo || fc.codigo,
              nombre: c.nombre || fc.nombre,
              activo: c.activo !== undefined ? c.activo : fc.activo,
              pais: c.pais || fc.pais,
              logo_url: c.logo_url || fc.logo_url,
              nombre_corto: c.nombre_corto || fc.nombre_corto,
              ciudad: c.ciudad || fc.ciudad,
              region: c.region || fc.region,
              id_pais: c.id_pais !== undefined ? c.id_pais : fc.id_pais,
            };
          }
          return c;
        });
      }

      // Merge custom clubs from localStorage
      try {
        const stored = localStorage.getItem('lr-performance-custom-clubs');
        if (stored) {
          const customClubs: ClubDB[] = JSON.parse(stored);
          const currentNames = new Set(finalClubs.map(c => (c.nombre || '').toUpperCase().trim()));
          const currentIds = new Set(finalClubs.map(c => c.id_club));

          customClubs.forEach(cc => {
            if (!currentIds.has(cc.id_club) && !currentNames.has((cc.nombre || '').toUpperCase().trim())) {
              finalClubs.push(cc);
            }
          });
        }
      } catch (e) {
        console.error("Error loading custom clubs from localStorage:", e);
      }

      // Sort: Chile first, then alphabetical country, then alphabetical name
      finalClubs.sort((a: any, b: any) => {
        const countryA = (a.pais || '').toUpperCase().trim();
        const countryB = (b.pais || '').toUpperCase().trim();

        const isChileA = countryA === 'CHILE';
        const isChileB = countryB === 'CHILE';

        if (isChileA && !isChileB) return -1;
        if (!isChileA && isChileB) return 1;

        if (countryA !== countryB) {
          if (!countryA) return 1;
          if (!countryB) return -1;
          return countryA.localeCompare(countryB);
        }

        const nameA = (a.nombre || '').toUpperCase().trim();
        const nameB = (b.nombre || '').toUpperCase().trim();
        return nameA.localeCompare(nameB);
      });
      
      setClubs(finalClubs);
      setError(null);
    } catch (e: any) {
      console.error('Error fetching clubs inside useClubs, using robust fallbacks:', e);
      setClubs([...FALLBACK_CLUBS]);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClubs();
  }, []);

  return { clubs, loading, error, refetch: fetchClubs };
};
