import React, { useState, useEffect } from 'react';
import { getFotoUrl } from '../lib/fotos';

interface AvatarJugadorProps {
  player: {
    nombre?: string;
    apellido1?: string;
    apellido2?: string;
    foto_path?: string | null;
    foto_updated_at?: string | null;
    signed_url?: string; // optional pre-fetched URL
  };
  size: number;
  className?: string;
}

export const AvatarJugador: React.FC<AvatarJugadorProps> = ({ player, size, className = '' }) => {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(player?.signed_url || null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(!player?.signed_url && !!player?.foto_path);

  // Sync with pre-fetched signedUrl if it changes
  useEffect(() => {
    if (player?.signed_url) {
      setResolvedUrl(player.signed_url);
      setHasError(false);
      setIsLoading(false);
    }
  }, [player?.signed_url]);

  // Resolve signed URL dynamically if not pre-fetched and path exists
  useEffect(() => {
    if (player?.signed_url) return;

    let isMounted = true;
    const fetchUrl = async () => {
      if (!player?.foto_path) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      const url = await getFotoUrl(player.foto_path, player.foto_updated_at);
      if (isMounted) {
        setResolvedUrl(url);
        setHasError(false);
        setIsLoading(false);
      }
    };

    fetchUrl();
    return () => {
      isMounted = false;
    };
  }, [player?.foto_path, player?.foto_updated_at, player?.signed_url]);

  // Generate initials (Nombre + Apellido1)
  const getInitials = () => {
    const firstLetter = player?.nombre?.trim()?.charAt(0) || '';
    const secondLetter = player?.apellido1?.trim()?.charAt(0) || '';
    return `${firstLetter}${secondLetter}`.toUpperCase();
  };

  const initials = getInitials() || '?';

  // Sizing styles
  const style = {
    width: `${size}px`,
    height: `${size}px`,
    minWidth: `${size}px`,
    minHeight: `${size}px`,
    fontSize: `${Math.max(10, size * 0.38)}px`,
  };

  // If there's no photo path, or loading has completed with error, show initials
  const showInitials = !player?.foto_path || hasError || !resolvedUrl;

  return (
    <div
      style={style}
      className={`relative rounded-full overflow-hidden flex items-center justify-center select-none shrink-0 ${
        showInitials
          ? 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 font-extrabold border border-slate-200'
          : 'bg-slate-100'
      } ${className}`}
    >
      {showInitials ? (
        <span className="leading-none tracking-tight font-sans select-none">{initials}</span>
      ) : (
        <>
          {isLoading && (
            <div className="absolute inset-0 bg-slate-100 animate-pulse flex items-center justify-center">
              <span className="text-[9px] text-slate-400 font-bold select-none">{initials}</span>
            </div>
          )}
          <img
            src={resolvedUrl}
            alt={`${player?.nombre || ''} ${player?.apellido1 || ''}`}
            loading="lazy"
            referrerPolicy="no-referrer"
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isLoading ? 'opacity-0' : 'opacity-100'
            }`}
            onError={() => {
              setHasError(true);
              setIsLoading(false);
            }}
          />
        </>
      )}
    </div>
  );
};
