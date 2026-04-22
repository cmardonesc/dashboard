
import React, { useState } from 'react';
import { normalizeClub, getDriveDirectLink } from '../lib/utils';
import { CLUB_LOGOS } from '../constants';

interface ClubBadgeProps {
  clubName?: string;
  clubs?: any[];
  className?: string;
  showName?: boolean;
  logoSize?: string;
}

const ClubBadge: React.FC<ClubBadgeProps> = ({ 
  clubName, 
  clubs = [], 
  className = "", 
  showName = true,
  logoSize = "w-5 h-5"
}) => {
  const [imgError, setImgError] = useState(false);
  const [retryUrl, setRetryUrl] = useState<string | null>(null);

  // Resetear error cuando cambia el club o la URL
  React.useEffect(() => {
    setImgError(false);
    setRetryUrl(null);
  }, [clubName]);

  if (!clubName) return null;

  const getClubLogo = (name: string) => {
    const normName = normalizeClub(name);
    
    // 1. Buscar en la base de datos (prioridad)
    const club = clubs.find(c => normalizeClub(c.nombre) === normName);
    if (club?.logo_url) {
      return getDriveDirectLink(club.logo_url);
    }
    
    // 2. Buscar en la lista estática
    const staticLogo = CLUB_LOGOS[normName];
    if (staticLogo) return staticLogo;

    return null;
  };

  const logoUrl = getClubLogo(clubName);

  const handleImgError = () => {
    if (!retryUrl && logoUrl?.includes('lh3.googleusercontent.com')) {
      // Si falló el formato lh3, intentamos con el formato uc?id=
      const id = logoUrl.split('/').pop();
      if (id) {
        setRetryUrl(`https://drive.google.com/uc?export=view&id=${id}`);
        return;
      }
    }
    console.warn(`Error cargando logo para ${clubName}: ${retryUrl || logoUrl}`);
    setImgError(true);
  };

  const currentUrl = retryUrl || logoUrl;

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div className={`${logoSize} flex items-center justify-center shrink-0`}>
        {currentUrl && !imgError ? (
          <img 
            src={currentUrl} 
            alt={clubName} 
            className="w-full h-full object-contain" 
            referrerPolicy="no-referrer" 
            onError={handleImgError}
          />
        ) : (
          <div className="w-full h-full bg-slate-100 rounded flex items-center justify-center" title={clubName}>
            <i className="fa-solid fa-shield-halved text-[10px] text-slate-300"></i>
          </div>
        )}
      </div>
      {showName && (
        <span className="truncate">{clubName}</span>
      )}
    </div>
  );
};

export default ClubBadge;
