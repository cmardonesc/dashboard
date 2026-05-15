
import React, { useState } from 'react';
import { normalizeClub, getDriveDirectLink } from '../lib/utils';
import { CLUB_LOGOS } from '../constants';

interface ClubBadgeProps {
  clubName?: string;
  idClub?: number | null;
  clubs?: any[];
  className?: string;
  showName?: boolean;
  logoSize?: string;
}

const ClubBadge: React.FC<ClubBadgeProps> = ({ 
  clubName, 
  idClub,
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
  }, [clubName, idClub]);

  const hasNoClub = (!clubName || clubName === "Sin Club") && !idClub;

  if (hasNoClub) {
    return showName ? (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <div className={`${logoSize} flex items-center justify-center shrink-0`}>
          <div className="w-full h-full bg-slate-50 rounded flex items-center justify-center opacity-50">
            <i className="fa-solid fa-shield text-[10px] text-slate-300"></i>
          </div>
        </div>
        <span className="truncate text-slate-400 italic">Sin Club</span>
      </div>
    ) : null;
  }

  const getClubLogo = (name?: string, id?: number | null) => {
    // 1. Buscar por ID (máxima fiabilidad)
    if (id) {
      const clubById = clubs.find(c => Number(c.id_club) === Number(id));
      if (clubById?.logo_url) {
        return { url: getDriveDirectLink(clubById.logo_url), name: clubById.nombre };
      }
      if (clubById) return { url: null, name: clubById.nombre };
    }

    // 2. Buscar por nombre
    if (name) {
      const normName = normalizeClub(name);
      const clubByName = clubs.find(c => normalizeClub(c.nombre) === normName);
      if (clubByName?.logo_url) {
        return { url: getDriveDirectLink(clubByName.logo_url), name: clubByName.nombre };
      }
      
      const staticLogo = CLUB_LOGOS[normName];
      if (staticLogo) return { url: staticLogo, name: name };
    }

    return { url: null, name: name || 'Sin Club' };
  };

  const { url: logoUrl, name: displayName } = getClubLogo(clubName, idClub);

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
            alt={displayName} 
            className="w-full h-full object-contain" 
            referrerPolicy="no-referrer" 
            onError={handleImgError}
          />
        ) : (
          <div className="w-full h-full bg-slate-100 rounded flex items-center justify-center" title={displayName}>
            <i className="fa-solid fa-shield-halved text-[10px] text-slate-300"></i>
          </div>
        )}
      </div>
      {showName && (
        <span className="truncate">{displayName}</span>
      )}
    </div>
  );
};

export default ClubBadge;
