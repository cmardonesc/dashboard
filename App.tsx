
import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { supabase } from './lib/supabase'
import { normalizeClub, getDriveDirectLink } from './lib/utils'
import PlayerDashboard from './components/PlayerDashboard'
import StaffDashboard from './components/StaffDashboard'
import ClubHome from './components/ClubHome'
import Sidebar from './components/Sidebar'
import { AthletePerformanceRecord, User, UserRole, NutritionData } from './types'
import { MOCK_PLAYERS } from './mockData'
import { logActivity } from './lib/activityLogger'
import { FEDERATION_LOGO } from './constants'

type Role = 'player' | 'staff' | 'admin' | 'club' | null
type MenuId =
  | 'inicio'
  | 'planificacion_anual'
  | 'tecnica'
  | 'fisica_wellness'
  | 'fisica_pse'
  | 'fisica_carga_externa_total'
  | 'fisica_carga_externa_tareas'
  | 'fisica_reporte'
  | 'fisica_vo2max'
  | 'medica'
  | 'nutricion'
  | 'citaciones'
  | 'desconvocatoria'
  | 'logistica_jugadores'
  | 'usuarios'
  | 'logs'
  | 'importar_datos'
  | 'sports_science'

export default function App() {
  const [loading, setLoading] = useState(true)
  const [playersLoading, setPlayersLoading] = useState(true)
  const [role, setRole] = useState<Role>(null)
  const [userClub, setUserClub] = useState<string | null>(null)
  const [linkedPlayerId, setLinkedPlayerId] = useState<number | null>(null)
  const [sessionUser, setSessionUser] = useState<any>(null)
  const [activeMenu, setActiveMenu] = useState<MenuId>('inicio')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const [dbPlayers, setDbPlayers] = useState<User[]>([])
  const [dbClubs, setDbClubs] = useState<any[]>([])
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
      let gpsQuery = supabase.from('gps_tareas').select('*');
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
        // Intentamos usar checkin_date, si falla el backend lo reportará
        wellnessQuery = wellnessQuery.gte('checkin_date', dateStr);
        loadsQuery = loadsQuery.gte('session_date', dateStr);
        gpsQuery = gpsQuery.gte('fecha', dateStr);
        // Traer últimos registros nutricionales
        nutritionQuery = nutritionQuery.order('fecha_medicion', { ascending: false });
      }

      let [wellnessRes, loadsRes, gpsRes, nutritionRes] = await Promise.all([
        wellnessQuery.order('checkin_date', { ascending: true }),
        loadsQuery.order('session_date', { ascending: true }),
        gpsQuery.order('fecha', { ascending: true }),
        nutritionQuery
      ]);

      // Si falló por la columna checkin_date, reintentamos con checkin_dat
      if (wellnessRes.error && wellnessRes.error.message.includes('checkin_date')) {
        console.warn("Reintentando con checkin_dat...");
        wellnessRes = await supabase
          .from('wellness_checkin')
          .select('*')
          .gte('checkin_dat', dateStr)
          .order('checkin_dat', { ascending: true });
      }

      console.log("Supabase Data Counts:", {
        wellness: wellnessRes.data?.length || 0,
        loads: loadsRes.data?.length || 0,
        gps: gpsRes.data?.length || 0,
        nutrition: nutritionRes.data?.length || 0
      });

      if (nutritionRes.data && nutritionRes.data.length > 0) {
        console.log("Sample Nutrition Record:", nutritionRes.data[0]);
      }

      const mappedWellness = (wellnessRes.data || []).map((w: any) => {
        const rawDate = w.checkin_date || w.checkin_dat || w.fecha || '';
        const normalizedDate = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate.split(' ')[0];
        
        return {
          id: w.id?.toString() || Math.random().toString(),
          playerId: `player-${w.id_del_jugador || w.player_id || w.id_jugador}`,
          id_del_jugador: w.id_del_jugador || w.player_id || w.id_jugador,
          date: normalizedDate,
          fatigue: w.fatigue || w.fatiga || 0,
          sleep: w.sleep_quality || w.sleep_quali || w.sueno || 0,
          stress: w.stress || w.estres || 0,
          soreness: w.soreness || w.dolor || 0,
          mood: w.mood || w.animo || 0,
          soreness_areas: w.molestias ? w.molestias.split(', ') : (w.soreness_areas ? (Array.isArray(w.soreness_areas) ? w.soreness_areas : w.soreness_areas.split(',')) : []),
          illness_symptoms: w.enfermedad ? w.enfermedad.split(', ') : (w.illness_symptoms ? (Array.isArray(w.illness_symptoms) ? w.illness_symptoms : w.illness_symptoms.split(',')) : []),
          created_at: w.created_at
        };
      });

      const mappedLoads = (loadsRes.data || []).map((l: any) => {
        const rawDate = l.session_date || l.fecha || '';
        const normalizedDate = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate.split(' ')[0];
        const rpe = l.rpe || l.esfuerzo || 0;
        const duration = l.duration_min || l.duracion || l.minutos || 0;

        return {
          id: l.id?.toString() || Math.random().toString(),
          playerId: `player-${l.id_del_jugador || l.player_id || l.id_jugador}`,
          id_del_jugador: l.id_del_jugador || l.player_id || l.id_jugador,
          date: normalizedDate,
          duration: duration,
          rpe: rpe,
          load: l.srpe || l.carga || (rpe * duration), 
          type: l.type || 'FIELD',
          created_at: l.created_at
        };
      });

      const mappedGps = (gpsRes.data || []).map((g: any) => {
        const rawDate = g.fecha || g.session_date || '';
        const normalizedDate = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate.split(' ')[0];
        const duration = Number(g.minutos || g.duration || 0);
        return {
          id: g.id?.toString() || Math.random().toString(),
          playerId: `player-${g.id_del_jugador || g.player_id || g.id_jugador}`,
          id_del_jugador: g.id_del_jugador || g.player_id || g.id_jugador,
          jugador_nombre: g.jugador_nombre, // Guardamos el nombre para descubrimiento
          date: normalizedDate,
          duration: duration,
          totalDistance: Number(g.dist_total_m || g.totalDistance || 0),
          hsrDistance: Number(g.dist_mai_m_20_kmh || g.hsrDistance || 0), 
          sprintCount: Number(g.sprints_n || g.sprintCount || 0),
          maxSpeed: Number(g.vel_max_kmh || g.maxSpeed || 0),
          intensity: Number(g.m_por_min || g.intensity || 0),
          // Mapeo para IFR
          m_por_min: Number(g.m_por_min || 0),
          dist_ai_m_15_kmh: Number(g.dist_ai_m_15_kmh || 0),
          dist_mai_m_20_kmh: Number(g.dist_mai_m_20_kmh || 0),
          dist_sprint_m_25_kmh: Number(g.dist_sprint_m_25_kmh || 0),
          acc_decc_ai_n: Number(g.acc_decc_ai_n || 0)
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
      const [{ data: playersData, error: playersError }, { data: clubsData, error: clubsError }] = await Promise.all([
        supabase
          .from('players')
          .select('id_del_jugador, nombre, apellido1, apellido2, club, posicion, anio'),
        supabase
          .from('clubes')
          .select('*')
          .eq('activo', true)
      ])

      if (playersError) throw playersError
      if (clubsError) console.error('Error al cargar clubes:', clubsError)

      if (clubsData) setDbClubs(clubsData)

      const mappedPlayers: User[] = (playersData || []).map((p: any) => {
        const pid = p.id_del_jugador || p.id;
        
        // Inferir categoría si falta
        let category = '';
        if (p.anio) {
          const age = 2026 - p.anio;
          if (age <= 13) category = 'sub_13';
          else if (age === 14) category = 'sub_14';
          else if (age === 15) category = 'sub_15';
          else if (age === 16) category = 'sub_16';
          else if (age === 17) category = 'sub_17';
          else if (age === 18) category = 'sub_18';
          else if (age <= 20) category = 'sub_20';
          else if (age <= 21) category = 'sub_21';
          else if (age <= 23) category = 'sub_23';
          else category = 'adulta';
        } else if (!category) {
          category = 'sub_17';
        }

        return {
          id: `player-${pid}`,
          id_del_jugador: pid ? Number(pid) : undefined,
          name: `${p.nombre || ''} ${p.apellido1 || ''}`.trim() || `Atleta #${pid}`,
          nombre: p.nombre,
          apellido1: p.apellido1,
          apellido2: p.apellido2,
          role: UserRole.PLAYER,
          club: p.club,
          position: p.posicion,
          category: category,
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
  ): Promise<{ role: Role; id_del_jugador: number | null; club_name: string | null }> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, id_del_jugador, club_name')
        .eq('id', userId)
        .maybeSingle()

      if (error || !data) return { role: null, id_del_jugador: null, club_name: null }
      return {
        role: (data.role as Role) ?? null,
        id_del_jugador: data.id_del_jugador ? Number(data.id_del_jugador) : null,
        club_name: data.club_name || null
      }
    } catch (err) {
      return { role: null, id_del_jugador: null, club_name: null }
    }
  }

  useEffect(() => {
    // Suscribirse a cambios en tiempo real en múltiples tablas
    const appEventsSubscription = supabase
      .channel('app_events_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'medical_daily_reports' },
        async (payload) => {
          handleRealtimeNotification('Reporte Médico', payload.new);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'wellness_checkin' },
        async (payload) => {
          handleRealtimeNotification('Check-in Wellness', payload.new);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'internal_load' },
        async (payload) => {
          handleRealtimeNotification('Check-out (RPE)', payload.new);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'microcycles' },
        async (payload) => {
          new Notification('Nuevo Microciclo', {
            body: `Se ha creado un nuevo microciclo: ${payload.new.type}`,
            icon: '/icon-192x192.png'
          });
        }
      )
      .on(
        'broadcast',
        { event: 'notification' },
        (payload) => {
          if (Notification.permission === 'granted') {
            new Notification(payload.payload.title, {
              body: payload.payload.body,
              icon: '/icon-192x192.png'
            });
          }
        }
      )
      .subscribe();

    async function handleRealtimeNotification(type: string, record: any) {
      if (Notification.permission === 'granted') {
        const { data: player } = await supabase
          .from('players')
          .select('nombre, apellido1')
          .eq('id_del_jugador', record.id_del_jugador)
          .single();
        
        const playerName = player ? `${player.nombre} ${player.apellido1}` : 'Jugador';
        
        new Notification(`Nuevo ${type}`, {
          body: `${playerName}: ${record.diagnostico_medico || record.molestias || (record.rpe ? 'RPE ' + record.rpe : '') || 'Nueva actualización'}.`,
          icon: '/icon-192x192.png'
        });
      }
    }

    return () => {
      supabase.removeChannel(appEventsSubscription);
    };
  }, []);

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
            setUserClub(userData.club_name)
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

        // CLUB OVERRIDES
        const clubOverrides: Record<string, string> = {
          'ohiggins@anfp.cl': 'O\'Higgins',
          'colocolo@anfp.cl': 'Colo-Colo',
          'udechile@anfp.cl': 'Universidad de Chile',
          'ucatolica@anfp.cl': 'Universidad Católica'
        };

        if (emailLower && clubOverrides[emailLower]) {
          setRole('club');
          setUserClub(clubOverrides[emailLower]);
          setLinkedPlayerId(null);
          fetchPerformanceData('club', null).catch(e => console.error(e));
          return;
        }

        const userData = await fetchUserData(session.user.id)
        if (isMounted) {
          setRole(userData.role)
          setUserClub(userData.club_name)
          setLinkedPlayerId(userData.id_del_jugador)
          fetchPerformanceData(userData.role, userData.id_del_jugador).catch(e => console.error(e));
        }
      } else {
        setSessionUser(null)
        setRole(null)
        setUserClub(null)
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
      logActivity('Inicio de Sesión (Admin)', { email: emailLower });
      setLoading(false);
      return;
    }

    // MANUAL STAFF OVERRIDE (Bypass for email issues)
    if (emailLower === 'ifabres@anfpchile.cl') {
      console.log("Staff manual detectado. Forzando rol de STAFF.");
      setRole('staff');
      setLinkedPlayerId(null);
      fetchPerformanceData('staff', null).catch(console.error);
      logActivity('Inicio de Sesión (Staff)', { email: emailLower });
      setLoading(false);
      return;
    }

    // CLUB OVERRIDES (Bypass for demo/clubs)
    const clubOverrides: Record<string, string> = {
      'ohiggins@anfp.cl': 'O\'Higgins',
      'colocolo@anfp.cl': 'Colo-Colo',
      'udechile@anfp.cl': 'Universidad de Chile',
      'ucatolica@anfp.cl': 'Universidad Católica'
    };

    if (emailLower && clubOverrides[emailLower]) {
      console.log(`Club ${clubOverrides[emailLower]} detectado. Forzando rol de CLUB.`);
      setRole('club');
      setUserClub(clubOverrides[emailLower]);
      setLinkedPlayerId(null);
      fetchPerformanceData('club', null).catch(console.error);
      logActivity('Inicio de Sesión (Club)', { email: emailLower, club: clubOverrides[emailLower] });
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
        setUserClub(userData.club_name);
        setLinkedPlayerId(userData.id_del_jugador);
        // Cargar datos iniciales
        fetchPerformanceData(userData.role, userData.id_del_jugador).catch(console.error);
        logActivity(`Inicio de Sesión (${userData.role})`, { email: emailLower, playerId: userData.id_del_jugador });
      } else {
        console.warn("Usuario sin rol en tabla profiles. Asignando rol 'player' por defecto.");
        // Fallback: si no tiene perfil, lo tratamos como jugador nuevo
        setRole('player'); 
        logActivity('Inicio de Sesión (Nuevo Jugador)', { email: emailLower });
      }
    } catch (error) {
      console.error("Error en handleLoginSuccess:", error);
      setRole('player'); // Fallback de seguridad
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const seedIfrReferences = async () => {
      try {
        const { count } = await supabase
          .from('referencias_gps')
          .select('*', { count: 'exact', head: true });

        if (count === 0) {
          console.log("Seeding referencias_gps table...");
          const defaultRefs = [
            { Tipo: 'PROMEDIO', Categoria: 'SUB_13', Posicion: 'DELANTERO', dist_total_m: 3800, m_por_min: 60, dist_ai_m_15_kmh: 350, dist_mai_m_20_kmh: 60, dist_sprint_m_25_kmh: 5, acc_decc_ai_n: 70 },
            { Tipo: 'PROMEDIO', Categoria: 'SUB_13', Posicion: 'MEDIO', dist_total_m: 4200, m_por_min: 65, dist_ai_m_15_kmh: 400, dist_mai_m_20_kmh: 70, dist_sprint_m_25_kmh: 3, acc_decc_ai_n: 85 },
            { Tipo: 'PROMEDIO', Categoria: 'SUB_13', Posicion: 'DEFENSA', dist_total_m: 3500, m_por_min: 55, dist_ai_m_15_kmh: 300, dist_mai_m_20_kmh: 50, dist_sprint_m_25_kmh: 4, acc_decc_ai_n: 65 },
            { Tipo: 'PROMEDIO', Categoria: 'SUB_13', Posicion: 'PORTERO', dist_total_m: 1200, m_por_min: 20, dist_ai_m_15_kmh: 30, dist_mai_m_20_kmh: 5, dist_sprint_m_25_kmh: 1, acc_decc_ai_n: 20 },
            { Tipo: 'PROMEDIO', Categoria: 'SUB_14', Posicion: 'DELANTERO', dist_total_m: 4000, m_por_min: 62, dist_ai_m_15_kmh: 380, dist_mai_m_20_kmh: 70, dist_sprint_m_25_kmh: 6, acc_decc_ai_n: 80 },
            { Tipo: 'PROMEDIO', Categoria: 'SUB_14', Posicion: 'MEDIO', dist_total_m: 4400, m_por_min: 68, dist_ai_m_15_kmh: 450, dist_mai_m_20_kmh: 80, dist_sprint_m_25_kmh: 4, acc_decc_ai_n: 95 },
            { Tipo: 'PROMEDIO', Categoria: 'SUB_14', Posicion: 'DEFENSA', dist_total_m: 3800, m_por_min: 58, dist_ai_m_15_kmh: 330, dist_mai_m_20_kmh: 60, dist_sprint_m_25_kmh: 5, acc_decc_ai_n: 75 },
            { Tipo: 'PROMEDIO', Categoria: 'SUB_14', Posicion: 'PORTERO', dist_total_m: 1300, m_por_min: 22, dist_ai_m_15_kmh: 40, dist_mai_m_20_kmh: 8, dist_sprint_m_25_kmh: 1, acc_decc_ai_n: 25 },
            { Tipo: 'PROMEDIO', Categoria: 'SUB_15', Posicion: 'DELANTERO', dist_total_m: 4200, m_por_min: 65, dist_ai_m_15_kmh: 420, dist_mai_m_20_kmh: 80, dist_sprint_m_25_kmh: 8, acc_decc_ai_n: 90 },
            { Tipo: 'PROMEDIO', Categoria: 'SUB_15', Posicion: 'MEDIO', dist_total_m: 4600, m_por_min: 70, dist_ai_m_15_kmh: 500, dist_mai_m_20_kmh: 90, dist_sprint_m_25_kmh: 5, acc_decc_ai_n: 105 },
            { Tipo: 'PROMEDIO', Categoria: 'SUB_15', Posicion: 'DEFENSA', dist_total_m: 4000, m_por_min: 62, dist_ai_m_15_kmh: 360, dist_mai_m_20_kmh: 70, dist_sprint_m_25_kmh: 6, acc_decc_ai_n: 85 },
            { Tipo: 'PROMEDIO', Categoria: 'SUB_15', Posicion: 'PORTERO', dist_total_m: 1400, m_por_min: 24, dist_ai_m_15_kmh: 45, dist_mai_m_20_kmh: 10, dist_sprint_m_25_kmh: 2, acc_decc_ai_n: 28 },
            { Tipo: 'PROMEDIO', Categoria: 'SUB_16', Posicion: 'DELANTERO', dist_total_m: 4400, m_por_min: 68, dist_ai_m_15_kmh: 460, dist_mai_m_20_kmh: 90, dist_sprint_m_25_kmh: 9, acc_decc_ai_n: 95 },
            { Tipo: 'PROMEDIO', Categoria: 'SUB_16', Posicion: 'MEDIO', dist_total_m: 4800, m_por_min: 72, dist_ai_m_15_kmh: 550, dist_mai_m_20_kmh: 110, dist_sprint_m_25_kmh: 5, acc_decc_ai_n: 115 },
            { Tipo: 'PROMEDIO', Categoria: 'SUB_16', Posicion: 'DEFENSA', dist_total_m: 4100, m_por_min: 64, dist_ai_m_15_kmh: 380, dist_mai_m_20_kmh: 75, dist_sprint_m_25_kmh: 7, acc_decc_ai_n: 88 },
            { Tipo: 'PROMEDIO', Categoria: 'SUB_16', Posicion: 'PORTERO', dist_total_m: 1450, m_por_min: 24, dist_ai_m_15_kmh: 48, dist_mai_m_20_kmh: 10, dist_sprint_m_25_kmh: 2, acc_decc_ai_n: 29 },
            { Tipo: 'PROMEDIO', Categoria: 'SUB_17', Posicion: 'DELANTERO', dist_total_m: 4500, m_por_min: 70, dist_ai_m_15_kmh: 500, dist_mai_m_20_kmh: 100, dist_sprint_m_25_kmh: 10, acc_decc_ai_n: 100 },
            { Tipo: 'PROMEDIO', Categoria: 'SUB_17', Posicion: 'MEDIO', dist_total_m: 5000, m_por_min: 75, dist_ai_m_15_kmh: 600, dist_mai_m_20_kmh: 120, dist_sprint_m_25_kmh: 5, acc_decc_ai_n: 120 },
            { Tipo: 'PROMEDIO', Categoria: 'SUB_17', Posicion: 'DEFENSA', dist_total_m: 4200, m_por_min: 65, dist_ai_m_15_kmh: 400, dist_mai_m_20_kmh: 80, dist_sprint_m_25_kmh: 8, acc_decc_ai_n: 90 },
            { Tipo: 'PROMEDIO', Categoria: 'SUB_17', Posicion: 'PORTERO', dist_total_m: 1500, m_por_min: 25, dist_ai_m_15_kmh: 50, dist_mai_m_20_kmh: 10, dist_sprint_m_25_kmh: 2, acc_decc_ai_n: 30 },
            { Tipo: 'PROMEDIO', Categoria: 'SUB_20', Posicion: 'DELANTERO', dist_total_m: 4800, m_por_min: 75, dist_ai_m_15_kmh: 550, dist_mai_m_20_kmh: 110, dist_sprint_m_25_kmh: 12, acc_decc_ai_n: 110 },
            { Tipo: 'PROMEDIO', Categoria: 'SUB_20', Posicion: 'MEDIO', dist_total_m: 5300, m_por_min: 80, dist_ai_m_15_kmh: 650, dist_mai_m_20_kmh: 130, dist_sprint_m_25_kmh: 6, acc_decc_ai_n: 130 },
            { Tipo: 'PROMEDIO', Categoria: 'SUB_20', Posicion: 'DEFENSA', dist_total_m: 4500, m_por_min: 70, dist_ai_m_15_kmh: 450, dist_mai_m_20_kmh: 90, dist_sprint_m_25_kmh: 10, acc_decc_ai_n: 100 },
            { Tipo: 'PROMEDIO', Categoria: 'ADULTA', Posicion: 'DELANTERO', dist_total_m: 5000, m_por_min: 80, dist_ai_m_15_kmh: 600, dist_mai_m_20_kmh: 120, dist_sprint_m_25_kmh: 15, acc_decc_ai_n: 120 },
            { Tipo: 'PROMEDIO', Categoria: 'ADULTA', Posicion: 'MEDIO', dist_total_m: 5500, m_por_min: 85, dist_ai_m_15_kmh: 700, dist_mai_m_20_kmh: 140, dist_sprint_m_25_kmh: 8, acc_decc_ai_n: 140 },
            { Tipo: 'PROMEDIO', Categoria: 'ADULTA', Posicion: 'DEFENSA', dist_total_m: 4800, m_por_min: 75, dist_ai_m_15_kmh: 500, dist_mai_m_20_kmh: 100, dist_sprint_m_25_kmh: 12, acc_decc_ai_n: 110 }
          ];
          await supabase.from('referencias_gps').insert(defaultRefs);
        }
      } catch (err) {
        console.error("Error seeding references:", err);
      }
    };

    if (role === 'admin') {
      seedIfrReferences();
    }
  }, [role]);

  const performanceRecords: AthletePerformanceRecord[] = useMemo(() => {
    // 1. Empezamos con los jugadores reales de la tabla 'players'
    let playersToUse = [...dbPlayers];
    
    // 2. "Descubrimiento" de jugadores: Si hay datos en nutrición, wellness o loads para un ID que no está en 'players',
    // lo agregamos como un jugador virtual para que no se pierdan sus registros.
    const discoverFrom = [
      ...allData.nutrition.map(n => ({ id: n.id_del_jugador || n.id_jugador || n.player_id, name: n.nombre_raw })),
      ...allData.wellness.map(w => ({ id: w.id_del_jugador || w.player_id || w.playerId, name: null })),
      ...allData.loads.map(l => ({ id: l.id_del_jugador || l.player_id || l.id_jugador, name: null })),
      ...allData.gps.map((g: any) => ({ id: g.id_del_jugador, name: g.jugador_nombre }))
    ];

    discoverFrom.forEach((item: any) => {
      const rawId = item.id?.toString().replace('player-', '');
      if (!rawId) return;
      
      const exists = playersToUse.some(p => p.id_del_jugador?.toString() === rawId);
      if (!exists) {
        playersToUse.push({
          id: `player-v-${rawId}`,
          id_del_jugador: isNaN(Number(rawId)) ? undefined : Number(rawId),
          name: item.name || `Atleta #${rawId}`,
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

    console.log(`PerformanceRecords: ${playersToUse.length} jugadores`);

    return (playersToUse as User[]).map((player) => {
      const pId = player.id_del_jugador?.toString();

      // Lógica de anonimización para perfil de clubes
      let finalPlayer = { ...player };
      if (role === 'club' && userClub) {
        const pClub = player.club || player.club_name || '';
        const uClubNorm = normalizeClub(userClub);
        const pClubNorm = normalizeClub(pClub);

        if (pClubNorm !== uClubNorm) {
          finalPlayer.name = `Jugador [${player.id_del_jugador || 'EXT'}]`;
          finalPlayer.nombre = 'Jugador';
          finalPlayer.apellido1 = `[${player.id_del_jugador || 'EXT'}]`;
          finalPlayer.apellido2 = '';
          finalPlayer.club = 'OTRO CLUB';
          finalPlayer.club_name = 'OTRO CLUB';
        }
      }

      return {
        player: finalPlayer,
        wellness: allData.wellness.filter((w: any) => {
          const wId = (w.id_del_jugador || w.player_id || w.playerId)?.toString().replace('player-', '');
          return wId && pId && String(wId) === String(pId);
        }),
        loads: allData.loads.filter((l: any) => {
          const lId = (l.id_del_jugador || l.player_id || l.playerId)?.toString().replace('player-', '');
          return lId && pId && String(lId) === String(pId);
        }),
        gps: allData.gps.filter((g: any) => {
          const gId = (g.id_del_jugador || g.player_id || g.playerId)?.toString().replace('player-', '');
          return gId && pId && String(gId) === String(pId);
        }),
        nutrition: allData.nutrition.filter((n: any) => {
          const nId = (n.id_del_jugador || n.id_jugador || n.player_id)?.toString();
          return nId && pId && String(nId) === String(pId);
        })
      };
    })
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
        {/* Watermark */}
        <div className="fixed bottom-4 left-4 z-[9999] pointer-events-none select-none opacity-20">
          <span className="text-[10px] font-black tracking-widest text-white uppercase">CMSPORTECH</span>
        </div>
      </div>
    )
  }

  if (!role) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b1220] px-6 relative">
      <LoginCard onLoginSuccess={handleLoginSuccess} />
      {/* Watermark */}
      <div className="fixed bottom-4 left-4 z-[9999] pointer-events-none select-none opacity-20">
        <span className="text-[10px] font-black tracking-widest text-white uppercase">CMSPORTECH</span>
      </div>
    </div>
  )

  const menuTitle = role === 'club' 
    ? `${userClub || 'CLUB'} - PERFIL DE CLUB`
    : (activeMenu === 'citaciones' ? 'CITAS' : activeMenu === 'fisica_tareas' ? 'CARGA TAREAS' : activeMenu.toUpperCase().replace('_', ' '))

  if (role === 'staff' || role === 'admin' || role === 'club') {
    return (
      <div className="flex min-h-screen bg-[#f1f5f9] relative">
        {/* Watermark */}
        <div className="fixed bottom-4 left-4 z-[9999] pointer-events-none select-none opacity-20">
          <span className="text-[10px] font-black tracking-widest text-slate-900 uppercase">CMSPORTECH</span>
        </div>
        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
        
        <div className={`${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 transition-transform duration-300`}>
          <Sidebar 
            activeMenu={activeMenu} 
            onMenuChange={(id) => {
              setActiveMenu(id);
              setIsMobileMenuOpen(false);
            }} 
            userRole={role} 
            userEmail={sessionUser?.email}
            userClub={userClub}
            clubs={dbClubs}
          />
        </div>

        <main className="flex-1 h-screen overflow-y-auto bg-slate-50 w-full">
          <div className="bg-white px-4 md:px-8 py-4 border-b border-slate-200 flex justify-between items-center sticky top-0 z-40 shadow-sm">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden w-10 h-10 flex items-center justify-center text-slate-500 hover:bg-slate-50 rounded-xl transition-all"
              >
                <i className="fa-solid fa-bars"></i>
              </button>
              <h2 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-widest truncate max-w-[150px] md:max-w-none">
                {menuTitle}
              </h2>
            </div>
            <div className="flex items-center gap-3 md:gap-6">
              <button onClick={async () => { await supabase.auth.signOut() }} className="text-slate-500 hover:text-red-500 transition-colors p-2">
                <i className="fa-solid fa-arrow-right-from-bracket"></i>
              </button>
            </div>
          </div>
          <div className="p-4 md:p-8">
            {role === 'club' && activeMenu === 'inicio' ? (
              <ClubHome 
                performanceRecords={performanceRecords} 
                userClub={userClub || undefined} 
                clubs={dbClubs}
              />
            ) : (
              <StaffDashboard 
                performanceRecords={performanceRecords} 
                activeMenu={activeMenu} 
                onMenuChange={setActiveMenu} 
                userClub={userClub || undefined}
                userRole={role}
                userId_del_jugador={linkedPlayerId}
              />
            )}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Watermark */}
      <div className="fixed bottom-4 left-4 z-[9999] pointer-events-none select-none opacity-20">
        <span className="text-[10px] font-black tracking-widest text-slate-900 uppercase">CMSPORTECH</span>
      </div>
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
  const [signupRole, setSignupRole] = useState<'player' | 'staff' | 'club' | ''>('')
  const [playerId, setPlayerId] = useState('')
  const [selectedClub, setSelectedClub] = useState('')
  const [clubs, setClubs] = useState<{id_club: number, nombre: string}[]>([])
  const [loadingClubs, setLoadingClubs] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (mode === 'signup' && signupRole === 'club') {
      const fetchClubs = async () => {
        setLoadingClubs(true);
        try {
          console.log("Fetching clubs from Supabase...");
          const { data, error } = await supabase
            .from('clubes')
            .select('id_club, nombre')
            .eq('activo', true)
            .order('nombre');
          
          if (error) {
            console.error("Error fetching clubs:", error);
            setMsg(`Error al cargar clubes: ${error.message}`);
          } else {
            console.log("Clubs fetched successfully:", data);
            if (data && data.length > 0) {
              setClubs(data);
            } else {
              setMsg("No se encontraron clubes activos en la base de datos.");
            }
          }
        } catch (err: any) {
          console.error("Unexpected error fetching clubs:", err);
          setMsg(`Error inesperado: ${err.message}`);
        } finally {
          setLoadingClubs(false);
        }
      };
      fetchClubs();
    }
  }, [mode, signupRole]);

  const handleLogin = async () => {
    if (submitting) return
    setMsg(null)
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) { setMsg('Completa todos los campos.'); return; }
    setSubmitting(true)
    console.log("Iniciando login para:", trimmedEmail);

    // BACKDOOR FOR STAFF (Bypass Supabase Auth if needed)
    const emailLower = trimmedEmail.toLowerCase();
    
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
      
      const authPromise = supabase.auth.signInWithPassword({ email: trimmedEmail, password });
      
      const result = await Promise.race([authPromise, timeoutPromise]) as any;
      const { data, error } = result;

      if (error) { 
        console.error("Error login:", error);
        if (error.message?.toLowerCase().includes('confirm')) {
          setMsg('Tu cuenta requiere confirmación. Como eres usuario del equipo, puedes entrar con la contraseña de respaldo: laroja2026');
        } else if (error.message?.toLowerCase().includes('invalid login credentials')) {
          setMsg('Credenciales inválidas. Si eres del Staff o no tienes cuenta aún, usa la contraseña de respaldo: laroja2026');
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

      if (signupRole === 'club' && !selectedClub) {
        setMsg('Debes seleccionar un club.');
        setSubmitting(false);
        return;
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
            id_del_jugador: verifiedPlayerId,
            club_name: signupRole === 'club' ? selectedClub : null
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
              id_del_jugador: verifiedPlayerId,
              club_name: signupRole === 'club' ? selectedClub : null
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
    <div className="w-full max-w-[440px] px-4 animate-in fade-in zoom-in-95 duration-500">
      <div className="bg-white rounded-[32px] md:rounded-[40px] overflow-hidden shadow-2xl border border-slate-100">
        <div className="bg-[#CF1B2B] py-8 md:py-12 px-6 md:px-8 flex items-center justify-center gap-4 md:gap-6">
          {FEDERATION_LOGO && (
            <div className="w-16 h-16 md:w-20 md:h-20 overflow-hidden shrink-0">
              <img 
                src={getDriveDirectLink(FEDERATION_LOGO)} 
                alt="Federación Logo" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          )}
          <div className="text-white font-black text-3xl md:text-4xl tracking-tighter uppercase italic leading-none">La Roja</div>
        </div>
        <div className="p-6 md:p-10 space-y-4 md:space-y-6">
          <div className="flex gap-2 p-1 bg-slate-50 rounded-2xl">
            <button onClick={() => setMode('login')} className={`flex-1 py-3 rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all ${mode === 'login' ? 'bg-[#0b1220] text-white' : 'text-slate-400'}`}>Acceso</button>
            <button onClick={() => setMode('signup')} className={`flex-1 py-3 rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all ${mode === 'signup' ? 'bg-[#0b1220] text-white' : 'text-slate-400'}`}>Registro</button>
          </div>
          <div className="space-y-3">
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="w-full px-5 md:px-6 py-3.5 md:py-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none" placeholder="Email" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" onKeyDown={(e) => e.key === 'Enter' && handleLogin()} className="w-full px-5 md:px-6 py-3.5 md:py-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none" placeholder="Contraseña" />
            {mode === 'signup' && (
              <>
                <select value={signupRole} onChange={(e) => setSignupRole(e.target.value as any)} className="w-full px-5 md:px-6 py-3.5 md:py-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none">
                  <option value="">¿Quién eres?</option>
                  <option value="player">Jugador</option>
                  <option value="staff">Staff Técnico</option>
                  <option value="club">Club</option>
                </select>
                {signupRole === 'player' && (
                  <input 
                    value={playerId} 
                    onChange={(e) => setPlayerId(e.target.value)} 
                    type="text" 
                    className="w-full px-5 md:px-6 py-3.5 md:py-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none animate-in slide-in-from-top-2 duration-300" 
                    placeholder="ID de Jugador (Asignado por Staff)" 
                  />
                )}
                {signupRole === 'club' && (
                  <div className="space-y-1">
                    <select 
                      value={selectedClub} 
                      onChange={(e) => setSelectedClub(e.target.value)} 
                      disabled={loadingClubs}
                      className="w-full px-5 md:px-6 py-3.5 md:py-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none animate-in slide-in-from-top-2 duration-300 disabled:opacity-50"
                    >
                      <option value="">{loadingClubs ? 'Cargando clubes...' : 'Selecciona tu Club'}</option>
                      {clubs.map(c => (
                        <option key={c.id_club} value={c.nombre}>{c.nombre}</option>
                      ))}
                    </select>
                    {clubs.length === 0 && !loadingClubs && (
                      <p className="text-[8px] text-red-500 font-bold uppercase px-2">No hay clubes disponibles. Contacta a soporte.</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          <button onClick={mode === 'login' ? handleLogin : handleSignUp} disabled={submitting} className="w-full py-4 md:py-5 rounded-2xl bg-[#0b1220] text-white font-black uppercase tracking-widest text-[10px] md:text-xs">{submitting ? 'VERIFICANDO...' : 'ENTRAR'}</button>
          {msg && <div className="text-red-600 text-[9px] md:text-[10px] font-black uppercase text-center leading-tight">{msg}</div>}
        </div>
      </div>
    </div>
  )
}
