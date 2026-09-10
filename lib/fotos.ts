import { supabase } from './supabase';

interface CacheItem {
  url: string;
  expiresAt: number;
}

// In-memory cache for player photo signed URLs
const fotoCache: Record<string, CacheItem> = {};

// TTL in milliseconds (6 hours)
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
// Supabase signed URL expiry in seconds (6 hours)
const SIGNED_URL_EXPIRY_SEC = 21600;

/**
 * Generates a cache key based on the photo path and its last update timestamp.
 */
function getCacheKey(fotoPath: string, fotoUpdatedAt?: string | null): string {
  return `${fotoPath}_${fotoUpdatedAt || 'no-ts'}`;
}

/**
 * Fetches a single signed URL for a player's photo, with caching.
 */
export async function getFotoUrl(
  fotoPath: string | null | undefined,
  fotoUpdatedAt?: string | null
): Promise<string | null> {
  if (!fotoPath) return null;

  const cacheKey = getCacheKey(fotoPath, fotoUpdatedAt);
  const now = Date.now();

  // Return from cache if valid
  if (fotoCache[cacheKey] && fotoCache[cacheKey].expiresAt > now) {
    return fotoCache[cacheKey].url;
  }

  try {
    const { data, error } = await supabase.storage
      .from('jugadores-fotos')
      .createSignedUrl(fotoPath, SIGNED_URL_EXPIRY_SEC);

    if (error || !data?.signedUrl) {
      console.error(`Error creating signed URL for ${fotoPath}:`, error);
      return null;
    }

    let url = data.signedUrl;
    // Append versioning query parameter to invalidate browser caching when replaced
    if (fotoUpdatedAt) {
      const separator = url.includes('?') ? '&' : '?';
      url = `${url}${separator}v=${encodeURIComponent(fotoUpdatedAt)}`;
    }

    // Save to cache
    fotoCache[cacheKey] = {
      url,
      expiresAt: now + CACHE_TTL_MS,
    };

    return url;
  } catch (err) {
    console.error('getFotoUrl exception:', err);
    return null;
  }
}

/**
 * Fetches multiple signed URLs in a single request, caching any new ones.
 * Returns a dictionary mapping fotoPath -> signedUrl.
 */
export async function getFotoUrls(
  items: { path: string; updated_at?: string | null }[]
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const toFetch: { path: string; updated_at?: string | null; cacheKey: string }[] = [];
  const now = Date.now();

  // Separate cached items from the ones that need fetching
  for (const item of items) {
    if (!item.path) continue;
    const cacheKey = getCacheKey(item.path, item.updated_at);
    if (fotoCache[cacheKey] && fotoCache[cacheKey].expiresAt > now) {
      result[item.path] = fotoCache[cacheKey].url;
    } else {
      toFetch.push({
        path: item.path,
        updated_at: item.updated_at,
        cacheKey,
      });
    }
  }

  if (toFetch.length === 0) {
    return result;
  }

  try {
    const pathsOnly = toFetch.map(item => item.path);
    const { data, error } = await supabase.storage
      .from('jugadores-fotos')
      .createSignedUrls(pathsOnly, SIGNED_URL_EXPIRY_SEC);

    if (error || !data) {
      console.error('Error in batch createSignedUrls:', error);
      return result;
    }

    // Populate cache and result dictionary
    for (const fetchItem of toFetch) {
      const match = data.find(d => d.path === fetchItem.path);
      if (match?.signedUrl) {
        let url = match.signedUrl;
        if (fetchItem.updated_at) {
          const separator = url.includes('?') ? '&' : '?';
          url = `${url}${separator}v=${encodeURIComponent(fetchItem.updated_at)}`;
        }

        // Cache the newly retrieved URL
        fotoCache[fetchItem.cacheKey] = {
          url,
          expiresAt: now + CACHE_TTL_MS,
        };

        result[fetchItem.path] = url;
      }
    }
  } catch (err) {
    console.error('getFotoUrls exception:', err);
  }

  return result;
}
