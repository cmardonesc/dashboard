
import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { supabase } from './lib/supabase'
import PlayerDashboard from './components/PlayerDashboard'
import StaffDashboard from './components/StaffDashboard'
import Sidebar from './components/Sidebar'
import { AthletePerformanceRecord, User, UserRole, NutritionData } from './types'
import { MOCK_PLAYERS } from './mockData'

type Role = 'player' | 'staff' | 'admin' | null
type MenuId =
  | 'inicio'
  | 'planificacion_anual'
  | 'tecnica'
  | 'fisica_wellness'
  | 'fisica_pse'
  | 'fisica_carga_externa_total'
  | 'fisica_carga_externa_tareas'
  | 'fisica_reporte'
  | 'medica'
  | 'nutricion'
  | 'citaciones'
  | 'desconvocatoria'
  | 'logistica_jugadores'
  | 'usuarios'

export default function App() {
  const [loading, setLoading] = useState(true)
  const [playersLoading, setPlayersLoading] = useState(true)
  const [role, setRole] = useState<Role>(null)
  const [linkedPlayerId, setLinkedPlayerId] = useState<number | null>(null)
  const [sessionUser, setSessionUser] = useState<any>(null)
  const [activeMenu, setActiveMenu] = useState<MenuId>('inicio')

  const [dbPlayers, setDbPlayers] = useState<User[]>([])
  const [allData, setAllData] = useState<{
    wellness: any[]
    loads: any[]
    gps: any[]
    nutrition: NutritionData[]
  }>({
    wellness: [],
    loads: [],
    gps: [],
    nutrition: []
  })

  const fetchPerformanceData = useCallback(async (userRole: Role, pId: number | null) => {
    try {
      let wellnessQuery = supabase.from('wellness_checkin').select('*');
      let loadsQuery = supabase.from('internal_load').select('*');
      let gpsQuery = supabase.from('gps_import').select('*');
      let nutritionQuery = supabase.from('antropometria').select('*');

      const rangeDate = new Date();
      rangeDate.setDate(rangeDate.getDate() - 90); // Nutrición suele ser trimestral
      const dateStr = rangeDate.toISOString().split('T')[0];

      if (userRole === 'player' && pId) {
        wellnessQuery = wellnessQuery.eq('id_del_jugador', pId);
        loadsQuery = loadsQuery.eq('id_del_jugador', pId);
        gpsQuery = gpsQuery.eq('id_del_jugador', pId);
        nutritionQuery = nutritionQuery.eq('id_del_jugador', pId);
      } else {
        wellnessQuery = wellnessQuery.gte('checkin_date', dateStr);
        loadsQuery = loadsQuery.gte('session_date', dateStr);
        gpsQuery = gpsQuery.gte('session_date', dateStr);
        // Traer últimos registros nutricionales
        nutritionQuery = nutritionQuery.order('fecha_medicion', { ascending: false });
      }

      const [wellnessRes, loadsRes, gpsRes, nutritionRes] = await Promise.all([
        wellnessQuery.order('checkin_date', { ascending: true }),
        loadsQuery.order('session_date', { ascending: true }),
        gpsQuery.order('session_date', { ascending: true }),
        nutritionQuery
      ]);

      console.log("Supabase Data Counts:", {
        wellness: wellnessRes.data?.length || 0,
        loads: loadsRes.data?.length || 0,
        gps: gpsRes.data?.length || 0,
        nutrition: nutritionRes.data?.length || 0
      });

      if (nutritionRes.data && nutritionRes.data.length > 0) {
        console.log("Sample Nutrition Record:", nutritionRes.data[0]);
      }

      const mappedWellness = (wellnessRes.data || []).map((w: any) => ({
        id: w.id.toString(),
        playerId: `player-${w.id_del_jugador}`,
        date: w.checkin_date,
        fatigue: w.fatigue,
        sleep: w.sleep_quality,
        stress: w.stress,
        soreness: w.soreness,
        mood: w.mood,
        soreness_areas: w.molestias ? w.molestias.split(', ') : [],
        illness_symptoms: w.enfermedad ? w.enfermedad.split(', ') : []
      }));

      const mappedLoads = (loadsRes.data || []).map((l: any) => ({
        id: l.id.toString(),
        playerId: `player-${l.id_del_jugador}`,
        date: l.session_date,
        duration: l.duration_min,
        rpe: l.rpe,
        load: l.srpe || (l.rpe * l.duration_min), 
        type: 'FIELD'
      }));

      const mappedGps = (gpsRes.data || []).map((g: any) => {
        const duration = Number(g['Min'] || g['Duration'] || g['Duration (min)'] || 0);
        return {
          id: g.id.toString(),
          playerId: `player-${g.id_del_jugador}`,
          date: g.session_date,
          duration: duration,
          totalDistance: Number(g['Total Distance (m)'] || 0),
          hsrDistance: Number(g['MAInt >20km/h'] || 0), 
          sprintCount: Number(g['# SP'] || g['Sprint >25 km/h'] || 0),
          maxSpeed: Number(g['Max Vel (km/h)'] || 0),
          intensity: Number(g['Metros/min'] || 0)
        };
      });

      setAllData(prev => ({
        ...prev,
        wellness: mappedWellness,
        loads: mappedLoads,
        gps: mappedGps,
        nutrition: nutritionRes.data || []
      }));
    } catch (err) {
      console.error("Error cargando datos de rendimiento:", err);
    }
  }, []);

  const fetchRealPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('id_del_jugador, nombre, apellido1, apellido2, club, posicion, anio')

      if (error) throw error

      const mappedPlayers: User[] = (data || []).map((p: any) => {
        const pid = p.id_del_jugador || p.id;
        return {
          id: `player-${pid}`,
          id_del_jugador: pid ? Number(pid) : undefined,
          name: `${p.nombre || ''} ${p.apellido1 || ''} ${p.apellido2 || ''}`.trim() || `Atleta #${pid}`,
          nombre: p.nombre,
          apellido1: p.apellido1,
          apellido2: p.apellido2,
          role: UserRole.PLAYER,
          club: p.club,
          position: p.posicion,
          anio: p.anio
        };
      })

      setDbPlayers(mappedPlayers)
    } catch (err) {
      console.error('Error al cargar jugadores:', err)
    } finally {
      setPlayersLoading(false)
    }
  }

  const fetchUserData = async (
    userId: string
  ): Promise<{ role: Role; id_del_jugador: number | null }> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, id_del_jugador')
        .eq('id', userId)
        .maybeSingle()

      if (error || !data) return { role: null, id_del_jugador: null }
      return {
        role: (data.role as Role) ?? null,
        id_del_jugador: data.id_del_jugador ? Number(data.id_del_jugador) : null
      }
    } catch (err) {
      return { role: null, id_del_jugador: null }
    }
  }

  useEffect(() => {
    let isMounted = true
    
    // Temporizador de seguridad: Si después de 10 segundos sigue cargando, forzamos la entrada
    const safetyTimer = setTimeout(() => {
      if (isMounted && loading) {
        console.warn("Tiempo de espera de carga excedido (10s), forzando visualización de la interfaz. Verifica tu conexión o credenciales.");
        setLoading(false);
      }
    }, 10000);

    const initialize = async () => {
      try {
        // Cargar jugadores en segundo plano
        fetchRealPlayers().catch(err => console.error("Error cargando jugadores:", err));
        
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          console.error("Error obteniendo sesión de Supabase:", error.message);
          throw error;
        }

        console.log("Sesión obtenida:", data?.session ? "Activa" : "Ninguna");

        if (!isMounted) return
        const session = data?.session
        if (session) {
          setSessionUser(session.user)
          let userData = await fetchUserData(session.user.id)
          
          // RECOVERY: Si el perfil no tiene ID pero el metadata sí (común si el upsert falló por RLS en el registro)
          if (userData.role === 'player' && !userData.id_del_jugador && session.user.user_metadata?.id_del_jugador) {
            const recoveredId = Number(session.user.user_metadata.id_del_jugador);
            console.log("Recuperando id_del_jugador desde metadata:", recoveredId);
            await supabase.from('profiles').update({ id_del_jugador: recoveredId }).eq('id', session.user.id);
            userData.id_del_jugador = recoveredId;
          }

          if (isMounted) {
            setRole(userData.role)
            setLinkedPlayerId(userData.id_del_jugador)
            fetchPerformanceData(userData.role, userData.id_del_jugador).catch(e => console.error("Error cargando datos de rendimiento:", e));
          }
        }
      } catch (err) {
        console.error("Error crítico durante la inicialización:", err)
      } finally {
        if (isMounted) {
          setLoading(false)
          clearTimeout(safetyTimer);
        }
      }
    }

    initialize()
    
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return
      if (session) {
        setSessionUser(session.user)

        // SUPERADMIN OVERRIDE
        const emailLower = session.user.email?.toLowerCase();
        if (emailLower === 'mardones.camilo@gmail.com' || emailLower === 'cmardones@anfpchile.cl') {
          setRole('admin');
          setLinkedPlayerId(null);
          fetchPerformanceData('admin', null).catch(e => console.error(e));
          return;
        }

        const userData = await fetchUserData(session.user.id)
        if (isMounted) {
          setRole(userData.role)
          setLinkedPlayerId(userData.id_del_jugador)
          fetchPerformanceData(userData.role, userData.id_del_jugador).catch(e => console.error(e));
        }
      } else {
        setSessionUser(null)
        setRole(null)
        setLinkedPlayerId(null)
        setAllData({ wellness: [], loads: [], gps: [], nutrition: [] });
      }
    })

    return () => {
      isMounted = false
      clearTimeout(safetyTimer);
      authListener.subscription.unsubscribe()
    }
  }, [fetchPerformanceData])

  const handleLoginSuccess = async (session: any) => {
    console.log("Manejando éxito de login...", session.user.email);
    setSessionUser(session.user);
    
    // Mostrar loading mientras buscamos el rol para dar feedback visual
    setLoading(true);

    const emailLower = session.user.email?.toLowerCase();
    // SUPERADMIN / ADMIN OVERRIDE
    if (emailLower === 'mardones.camilo@gmail.com' || emailLower === 'cmardones@anfpchile.cl') {
      console.log("Admin detectado. Forzando rol de ADMIN.");
      setRole('admin');
      setLinkedPlayerId(null);
      fetchPerformanceData('admin', null).catch(console.error);
      setLoading(false);
      return;
    }

    // MANUAL STAFF OVERRIDE (Bypass for email issues)
    if (emailLower === 'ifabres@anfpchile.cl') {
      console.log("Staff manual detectado. Forzando rol de STAFF.");
      setRole('staff');
      setLinkedPlayerId(null);
      fetchPerformanceData('staff', null).catch(console.error);
      setLoading(false);
      return;
    }
    
    try {
      let userData = await fetchUserData(session.user.id);
      console.log("Datos de usuario obtenidos:", userData);
      
      // RECOVERY: Si el perfil no tiene ID pero el metadata sí
      if (userData.role === 'player' && !userData.id_del_jugador && session.user.user_metadata?.id_del_jugador) {
        const recoveredId = Number(session.user.user_metadata.id_del_jugador);
        console.log("Recuperando id_del_jugador desde metadata en login:", recoveredId);
        await supabase.from('profiles').update({ id_del_jugador: recoveredId }).eq('id', session.user.id);
        userData.id_del_jugador = recoveredId;
      }
      
      if (userData.role) {
        setRole(userData.role);
        setLinkedPlayerId(userData.id_del_jugador);
        // Cargar datos iniciales
        fetchPerformanceData(userData.role, userData.id_del_jugador).catch(console.error);
      } else {
        console.warn("Usuario sin rol en tabla profiles. Asignando rol 'player' por defecto.");
        // Fallback: si no tiene perfil, lo tratamos como jugador nuevo
        setRole('player'); 
      }
    } catch (error) {
      console.error("Error en handleLoginSuccess:", error);
      setRole('player'); // Fallback de seguridad
    } finally {
      setLoading(false);
    }
  };

  const performanceRecords: AthletePerformanceRecord[] = useMemo(() => {
    // 1. Empezamos con los jugadores reales de la tabla 'players'
    let playersToUse = [...dbPlayers];
    
    // 2. "Descubrimiento" de jugadores: Si hay datos en antropometría para un ID que no está en 'players',
    // lo agregamos como un jugador virtual para que no se pierdan sus registros.
    allData.nutrition.forEach((n: any) => {
      const nId = n.id_del_jugador || n.id_jugador || n.player_id;
      if (!nId) return;
      const nIdStr = nId.toString();
      const exists = playersToUse.some(p => p.id_del_jugador?.toString() === nIdStr);
      if (!exists) {
        playersToUse.push({
          id: `player-v-${nIdStr}`,
          id_del_jugador: isNaN(Number(nIdStr)) ? undefined : Number(nIdStr),
          name: n.nombre_raw || `Atleta #${nIdStr}`,
          role: UserRole.PLAYER,
          club: 'Registro Histórico',
          position: 'S/D'
        });
      }
    });

    // 3. Fallback a MOCK si no hay nada de nada (solo para staff/admin)
    if (playersToUse.length === 0 && role !== 'player') {
      playersToUse = MOCK_PLAYERS;
    }

    console.log(`PerformanceRecords: ${playersToUse.length} jugadores, ${allData.nutrition.length} registros nutrición`);

    return (playersToUse as User[]).map((player) => ({
      player,
      wellness: allData.wellness.filter((w: any) => {
        const wId = (w.id_del_jugador || w.player_id || w.playerId)?.toString().replace('player-', '');
        const pId = player.id_del_jugador?.toString();
        return wId && pId && wId === pId;
      }),
      loads: allData.loads.filter((l: any) => {
        const lId = (l.id_del_jugador || l.player_id || l.playerId)?.toString().replace('player-', '');
        const pId = player.id_del_jugador?.toString();
        return lId && pId && lId === pId;
      }),
      gps: allData.gps.filter((g: any) => {
        const gId = (g.id_del_jugador || g.player_id || g.playerId)?.toString().replace('player-', '');
        const pId = player.id_del_jugador?.toString();
        return gId && pId && gId === pId;
      }),
      nutrition: allData.nutrition.filter((n: any) => {
        const nId = (n.id_del_jugador || n.id_jugador || n.player_id)?.toString();
        const pId = player.id_del_jugador?.toString();
        return nId && pId && nId === pId;
      })
    }))
  }, [allData, dbPlayers, role])

  const currentPlayerRecord = useMemo(() => {
    if (!sessionUser) return null
    let found: AthletePerformanceRecord | null = null
    if (linkedPlayerId !== null) {
      found = performanceRecords.find(
          (r) => r.player.id_del_jugador !== undefined && Number(r.player.id_del_jugador) === Number(linkedPlayerId)
        ) || null
    }
    if (!found && role === 'player') {
      if (playersLoading) return null
      return {
        player: { id: sessionUser.id, name: sessionUser.email, role: UserRole.PLAYER, isUnlinked: true },
        wellness: [], loads: [], gps: [], nutrition: []
      } as AthletePerformanceRecord
    }
    return found
  }, [performanceRecords, sessionUser, linkedPlayerId, role, playersLoading])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b1220]">
        <div className="flex flex-col items-center space-y-6">
          <div className="w-16 h-16 border-4 border-slate-800 border-t-red-600 rounded-full animate-spin"></div>
          <p className="text-white/40 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Sincronizando con La Roja...</p>
        </div>
      </div>
    )
  }

  if (!role) return <div className="min-h-screen flex items-center justify-center bg-[#0b1220] px-6"><LoginCard onLoginSuccess={handleLoginSuccess} /></div>

  const menuTitle = activeMenu === 'citaciones' ? 'CITAS' : activeMenu === 'fisica_tareas' ? 'CARGA TAREAS' : activeMenu.toUpperCase().replace('_', ' ')

  if (role === 'staff' || role === 'admin') {
    return (
      <div className="flex min-h-screen bg-[#f1f5f9]">
        <Sidebar activeMenu={activeMenu} onMenuChange={setActiveMenu} userRole={role} />
        <main className="flex-1 h-screen overflow-y-auto bg-slate-50">
          <div className="bg-white px-8 py-4 border-b border-slate-200 flex justify-between items-center sticky top-0 z-40 shadow-sm">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">{menuTitle}</h2>
            <div className="flex items-center gap-6">
              <button onClick={async () => { await supabase.auth.signOut() }} className="text-slate-500 hover:text-red-500 transition-colors">
                <i className="fa-solid fa-arrow-right-from-bracket"></i>
              </button>
            </div>
          </div>
          <div className="p-8">
            <StaffDashboard performanceRecords={performanceRecords} activeMenu={activeMenu} onMenuChange={setActiveMenu} />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {currentPlayerRecord ? (
        <PlayerDashboard 
          player={currentPlayerRecord.player} 
          wellness={currentPlayerRecord.wellness} 
          loads={currentPlayerRecord.loads} 
          gps={currentPlayerRecord.gps} 
          nutrition={currentPlayerRecord.nutrition}
          onRefresh={() => fetchPerformanceData(role, linkedPlayerId)} 
        />
      ) : (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="text-center py-20 bg-white rounded-[40px] shadow-sm border border-slate-100 w-full max-w-xl">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fa-solid fa-circle-notch animate-spin text-red-600 text-2xl"></i>
            </div>
            <p className="text-slate-900 font-black uppercase tracking-widest text-xs mb-2">Buscando Ficha Técnica...</p>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-tighter">Sincronizando con el servidor central</p>
          </div>
        </div>
      )}
    </div>
  )
}

function LoginCard({ onLoginSuccess }: { onLoginSuccess: (session: any) => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [signupRole, setSignupRole] = useState<'player' | 'staff' | ''>('')
  const [playerId, setPlayerId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const handleLogin = async () => {
    if (submitting) return
    setMsg(null)
    if (!email || !password) { setMsg('Completa todos los campos.'); return; }
    setSubmitting(true)
    console.log("Iniciando login para:", email);

    // BACKDOOR FOR STAFF (Bypass Supabase Auth if needed)
    const emailLower = email.toLowerCase();
    const isSpecialUser = emailLower === 'ifabres@anfpchile.cl' || emailLower === 'cmardones@anfpchile.cl' || emailLower === 'mardones.camilo@gmail.com' || emailLower.includes('anfp');
    
    if (password === 'laroja2026' || password === 'anfp2026') {
      console.log("Master password bypass activado para:", emailLower);
      onLoginSuccess({
        user: {
          id: `mock-user-${emailLower.split('@')[0]}`,
          email: emailLower,
          role: 'authenticated'
        }
      });
      return;
    }

    try {
      // Race condition para evitar bloqueo infinito
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('El servidor tardó demasiado en responder (10s). Intenta de nuevo.')), 10000)
      );
      
      const authPromise = supabase.auth.signInWithPassword({ email, password });
      
      const result = await Promise.race([authPromise, timeoutPromise]) as any;
      const { data, error } = result;

      if (error) { 
        console.error("Error login:", error);
        if (error.message?.toLowerCase().includes('confirm')) {
          setMsg('Tu cuenta requiere confirmación. Como eres usuario del equipo, puedes entrar con la contraseña de respaldo: laroja2026');
        } else if (error.message?.toLowerCase().includes('invalid login credentials')) {
          setMsg('Credenciales inválidas. Si eres del Staff, recuerda que puedes usar la contraseña de respaldo: laroja2026');
        } else {
          setMsg(error.message); 
        }
        setSubmitting(false); 
        return; 
      }
      
      console.log("Login exitoso", data);
      
      if (data?.session) {
        // Llamamos al callback del padre para manejar la transición
        onLoginSuccess(data.session);
      } else {
        // Caso raro: no hay error pero no hay sesión
        setMsg("Login correcto pero no se recibió sesión.");
        setSubmitting(false);
      }
      
    } catch (err: any) { 
      console.error("Excepción login:", err);
      setMsg(err.message || 'Error de red.'); 
      setSubmitting(false); 
    }
  }

  const handleSignUp = async () => {
    if (!email || !password || !signupRole) { setMsg('Completa todos los campos.'); return; }
    setSubmitting(true)
    
    try {
      // VALIDACIÓN DE ID DE JUGADOR
      let verifiedPlayerId: number | null = null;
      if (signupRole === 'player') {
        if (!playerId) {
          setMsg('El ID de Jugador es obligatorio para registrarse como jugador.');
          setSubmitting(false);
          return;
        }
        
        const pid = parseInt(playerId);
        if (isNaN(pid)) {
          setMsg('El ID de Jugador debe ser un número.');
          setSubmitting(false);
          return;
        }

        // 1. Verificar existencia en tabla players
        const { data: pData, error: pErr } = await supabase
          .from('players')
          .select('id_del_jugador')
          .eq('id_del_jugador', pid)
          .maybeSingle();
        
        if (pErr || !pData) {
          setMsg('El ID de Jugador no existe en la base de datos de la selección.');
          setSubmitting(false);
          return;
        }

        // 2. Verificar si ya está en uso
        const { data: uData } = await supabase
          .from('profiles')
          .select('id')
          .eq('id_del_jugador', pid)
          .maybeSingle();
        
        if (uData) {
          setMsg('Este ID de Jugador ya está vinculado a otra cuenta.');
          setSubmitting(false);
          return;
        }
        
        verifiedPlayerId = pid;
      }

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('El servidor tardó demasiado en responder (10s).')), 10000)
      );

      const signUpPromise = supabase.auth.signUp({ 
        email, 
        password, 
        options: { 
          data: { 
            role: signupRole,
            id_del_jugador: verifiedPlayerId 
          } 
        } 
      });
      
      const result = await Promise.race([signUpPromise, timeoutPromise]) as any;
      const { data, error } = result;

      if (error) { 
        // Si el error es de confirmación de correo, sugerimos intentar login
        if (error.message?.toLowerCase().includes('confirm') || error.message?.toLowerCase().includes('correo')) {
           setMsg('Cuenta creada (pero el correo falló). Intenta entrar con la contraseña de respaldo: laroja2026');
        } else if (error.message?.toLowerCase().includes('already registered') || error.message?.toLowerCase().includes('existe')) {
           setMsg('Este correo ya está registrado. Intenta iniciar sesión.');
        } else {
           setMsg(error.message); 
        }
        setSubmitting(false); 
      } else { 
        // Intentar crear perfil si tenemos el user id
        if (data?.user) {
          try {
            await supabase.from('profiles').upsert({
              id: data.user.id,
              role: signupRole,
              id_del_jugador: verifiedPlayerId
            });
          } catch (e) {
            console.error("Error creando perfil:", e);
          }
        }
        setMsg('Registro exitoso. Revisa tu correo o intenta entrar directamente.'); 
        setSubmitting(false); 
      }
    } catch (err: any) { 
      setMsg(err.message || 'Error al intentar registrarse.'); 
      setSubmitting(false); 
    }
  }

  return (
    <div className="w-[440px] max-w-full animate-in fade-in zoom-in-95 duration-500">
      <div className="bg-white rounded-[40px] overflow-hidden shadow-2xl border border-slate-100">
        <div className="bg-[#CF1B2B] py-12 px-8 text-center">
          <div className="text-white font-black text-4xl tracking-tighter uppercase italic">La Roja</div>
        </div>
        <div className="p-10 space-y-6">
          <div className="flex gap-2 p-1 bg-slate-50 rounded-2xl">
            <button onClick={() => setMode('login')} className={`flex-1 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${mode === 'login' ? 'bg-[#0b1220] text-white' : 'text-slate-400'}`}>Acceso</button>
            <button onClick={() => setMode('signup')} className={`flex-1 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${mode === 'signup' ? 'bg-[#0b1220] text-white' : 'text-slate-400'}`}>Registro</button>
          </div>
          <div className="space-y-3">
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none" placeholder="Email" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" onKeyDown={(e) => e.key === 'Enter' && handleLogin()} className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none" placeholder="Contraseña" />
            {mode === 'signup' && (
              <>
                <select value={signupRole} onChange={(e) => setSignupRole(e.target.value as any)} className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none">
                  <option value="">¿Quién eres?</option>
                  <option value="player">Jugador</option>
                  <option value="staff">Staff Técnico</option>
                </select>
                {signupRole === 'player' && (
                  <input 
                    value={playerId} 
                    onChange={(e) => setPlayerId(e.target.value)} 
                    type="text" 
                    className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none animate-in slide-in-from-top-2 duration-300" 
                    placeholder="ID de Jugador (Asignado por Staff)" 
                  />
                )}
              </>
            )}
          </div>
          <button onClick={mode === 'login' ? handleLogin : handleSignUp} disabled={submitting} className="w-full py-5 rounded-2xl bg-[#0b1220] text-white font-black uppercase tracking-widest text-xs">{submitting ? 'VERIFICANDO...' : 'ENTRAR'}</button>
          {msg && <div className="text-red-600 text-[10px] font-black uppercase text-center">{msg}</div>}
        </div>
      </div>
    </div>
  )
}
