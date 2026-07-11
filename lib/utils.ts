
import { FALLBACK_CLUBS } from './fallback_clubs';

/**
 * Normaliza nombres de clubes para comparaciones robustas.
 * Quita acentos, puntos, guiones y espacios extras.
 */
export const normalizeClub = (name: string) => {
  if (!name) return "";
  const norm = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();

  // Mapeo robusto de sinónimos y abreviaciones comunes a su forma estándar normalizada
  const synonyms: Record<string, string> = {
    "udechile": "universidaddechile",
    "udech": "universidaddechile",
    "udevichile": "universidaddechile",
    "udechileperfildeclub": "universidaddechile",
    "ucatolica": "universidadcatolica",
    "uc": "universidadcatolica",
    "colocolo": "colocolo",
    "cc": "colocolo",
    "unionespanola": "unionespanola",
    "ue": "unionespanola",
    "santiagowanderers": "santiagowanderers",
    "wanderers": "santiagowanderers",
    "ohiggins": "ohiggins",
    "oh": "ohiggins",
    "huachipato": "huachipato",
    "huach": "huachipato",
    "audaxitaliano": "audaxitaliano",
    "audax": "audaxitaliano",
    "coquimbounido": "coquimbounido",
    "coquimbo": "coquimbounido",
  };

  return synonyms[norm] || norm;
};

/**
 * Convierte un enlace de visualización de Google Drive en un enlace directo de descarga/imagen.
 */
export const getDriveDirectLink = (url: string) => {
  if (!url) return "";
  const trimmedUrl = url.trim();
  if (!trimmedUrl.includes("drive.google.com")) return trimmedUrl;

  try {
    // Soporta formatos:
    // /file/d/ID/view
    // /d/ID/view
    // /open?id=ID
    // /file/d/ID/edit
    const match = trimmedUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || 
                  trimmedUrl.match(/id=([a-zA-Z0-9_-]+)/) ||
                  trimmedUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    
    const id = match ? match[1] : null;
    if (id) {
      // Intentamos usar el formato de googleusercontent que suele ser más directo para imágenes
      return `https://lh3.googleusercontent.com/d/${id}`;
    }
  } catch (e) {
    console.error("Error parsing Drive URL:", e);
  }
  return trimmedUrl;
};

/**
 * Obtiene el país de un club por su nombre buscando en la DB o fallback.
 */
export const getClubCountry = (clubName: string, dbClubs?: any[]): string => {
  if (!clubName) return "";
  const nameUpper = clubName.toUpperCase().trim();
  
  // Buscar en dbClubs si existe
  if (dbClubs && Array.isArray(dbClubs)) {
    const found = dbClubs.find(c => (c.nombre || '').toUpperCase().trim() === nameUpper);
    if (found && found.pais) {
      return found.pais.toUpperCase().trim();
    }
  }
  
  // Buscar en FALLBACK_CLUBS
  const foundFb = FALLBACK_CLUBS.find(c => (c.nombre || '').toUpperCase().trim() === nameUpper);
  if (foundFb && foundFb.pais) {
    return foundFb.pais.toUpperCase().trim();
  }
  
  // Predeterminados comunes chilenos
  const chileanKeywords = [
    'COLO-COLO', 'COLO COLO', 'UNIVERSIDAD DE CHILE', 'UNIVERSIDAD CATOLICA', 
    'UNION ESPANOLA', 'SANTIAGO WANDERERS', 'PALESTINO', 'AUDAX ITALIANO', 
    'COQUIMBO UNIDO', 'EVERTON', 'HUACHIPATO', 'O\'HIGGINS', 'OHIGGINS', 
    'COBRESAL', 'UNION LA CALERA', 'CURICO UNIDO', 'NUBLENSE', 'DEPORTES COPIAPO', 
    'MAGALLANES', 'CHILE', 'IQUIQUE', 'RANGERS', 'TEMUCO', 'ANTOFAGASTA',
    'SAN LUIS', 'ARICA', 'CONCEPCION', 'MELIPILLA', 'D. PUERTO MONTT',
    'PUERTO MONTT', 'SANTIAGO MORNING', 'RECOLETA', 'LIMACHE', 'LA SERENA'
  ];
  if (chileanKeywords.some(kw => nameUpper.includes(kw))) {
    return "CHILE";
  }
  
  return "";
};

/**
 * Ordena una lista de clubes (strings u objetos) dejando Chile primero,
 * y ordenando alfabéticamente dentro de cada grupo.
 */
export const sortClubsByChileFirst = (clubsList: any[], dbClubs?: any[]): any[] => {
  if (!Array.isArray(clubsList)) return [];
  
  return [...clubsList].sort((a, b) => {
    const isStringA = typeof a === 'string';
    const isStringB = typeof b === 'string';
    
    const nameA = isStringA ? a : (a.nombre || a.name || a.club_name || a.club || '');
    const nameB = isStringB ? b : (b.nombre || b.name || b.club_name || b.club || '');
    
    const countryA = isStringA ? getClubCountry(a, dbClubs) : (a.pais || getClubCountry(nameA, dbClubs)).toUpperCase().trim();
    const countryB = isStringB ? getClubCountry(b, dbClubs) : (b.pais || getClubCountry(nameB, dbClubs)).toUpperCase().trim();
    
    const isChileA = countryA === 'CHILE' || nameA.toUpperCase().trim() === 'CHILE';
    const isChileB = countryB === 'CHILE' || nameB.toUpperCase().trim() === 'CHILE';
    
    // Casos especiales al inicio
    const aUpper = nameA.toUpperCase().trim();
    const bUpper = nameB.toUpperCase().trim();
    const isSpecialA = aUpper === 'TODOS' || aUpper === 'TODAS' || aUpper === 'GENERAL' || aUpper === 'S/C' || aUpper === 'SIN CLUB';
    const isSpecialB = bUpper === 'TODOS' || bUpper === 'TODAS' || bUpper === 'GENERAL' || bUpper === 'S/C' || bUpper === 'SIN CLUB';
    
    if (isSpecialA && !isSpecialB) return -1;
    if (!isSpecialA && isSpecialB) return 1;
    if (isSpecialA && isSpecialB) return aUpper.localeCompare(bUpper);
    
    // Chile va primero
    if (isChileA && !isChileB) return -1;
    if (!isChileA && isChileB) return 1;
    
    // Si ambos son del mismo país, o de países no-Chile, ordenar por país y luego nombre
    if (countryA !== countryB) {
      if (!countryA) return 1;
      if (!countryB) return -1;
      return countryA.localeCompare(countryB);
    }
    
    return nameA.localeCompare(nameB);
  });
};

