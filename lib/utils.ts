
/**
 * Normaliza nombres de clubes para comparaciones robustas.
 * Quita acentos, puntos, guiones y espacios extras.
 */
export const normalizeClub = (name: string) => {
  if (!name) return "";
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.\-]/g, "")
    .trim();
};
