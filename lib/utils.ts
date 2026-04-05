
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

/**
 * Convierte un enlace de visualización de Google Drive en un enlace directo de descarga/imagen.
 */
export const getDriveDirectLink = (url: string) => {
  if (!url) return "";
  const trimmedUrl = url.trim();
  if (!trimmedUrl.includes("drive.google.com")) return trimmedUrl;

  try {
    // Busca el ID del archivo (cadena de caracteres entre /d/ y el siguiente / o ?)
    const match = trimmedUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    const id = match ? match[1] : null;
    if (id) {
      // Usamos el formato de googleusercontent que es más estable para incrustar imágenes
      return `https://lh3.googleusercontent.com/d/${id}`;
    }
  } catch (e) {
    console.error("Error parsing Drive URL:", e);
  }
  return trimmedUrl;
};
