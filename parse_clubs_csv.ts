const csvContent = `id_club,codigo,nombre,nombre_corto,ciudad,region,id_pais,activo,logo_url,created_at,updated_at,pais
30,INDAVALLANEDA,Independiente de Avellaneda,IndA,Avellaneda,Buenos Aires,51,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Argentina
61,ATLETICOMINEIRO,Atlético Mineiro,CAM,Belo Horizonte,Minas Gerais,3,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Brasil
62,FLAMENGO,Flamengo,Flamengo,Río de Janeiro,Río de Janeiro,3,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Brasil
63,VASCO,Vasco da Gama,Vasco,Río de Janeiro,Río de Janeiro,3,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Brasil
64,FLUMINENSE,Fluminense,Flu,Río de Janeiro,Río de Janeiro,3,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Brasil
65,CORINTHIANS,Corinthians,SCCP,São Paulo,São Paulo,3,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Brasil
66,SAOPAULO,São Paulo FC,SPFC,São Paulo,São Paulo,3,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Brasil
67,PALMEIRAS,Palmeiras,Pal,São Paulo,São Paulo,3,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Brasil
68,SANTOS,Santos FC,SFC,Santos,São Paulo,3,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Brasil
69,GREMIO,Grêmio,Gre,Porto Alegre,Río Grande del Sur,3,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Brasil
70,INTERNACIONAL,Internacional,SCI,Porto Alegre,Río Grande del Sur,3,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Brasil
1,COLCOLO,Colo-Colo,CC,Santiago,Metropolitana,1,true,https://drive.google.com/file/d/1co-5tVYtqe52Nn10kkGTBTKzEsYlApNw/view?usp=drive_link,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Chile
2,UDE,Universidad de Chile,UDeCh,Santiago,Metropolitana,1,true,https://drive.google.com/file/d/1Eqp8Cf4p--CcAZ43fFFnOfB06ztDPk_X/view?usp=drive_link,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Chile
3,UC,Universidad Católica,UC,Santiago,Metropolitana,1,true,https://drive.google.com/file/d/1z5OO2cabtRy6qHigXumVJH_PCO7TMwTt/view?usp=drive_link,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Chile
4,PALESTINO,Palestino,Pal,Santiago,Metropolitana,1,true,https://drive.google.com/file/d/1OfGcu7KgdtCOSSOhifvZQjOhCyZutAUQ/view?usp=drive_link,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Chile
5,WANDERERS,Santiago Wanderers,Wan,Valparaíso,Valparaíso,1,true,https://drive.google.com/file/d/1xVST7LALS5exStbFDDH9gPGloLIVwGwK/view?usp=drive_link,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Chile
6,OHIGGINS,O'Higgins,OH,Rancagua,Del Libertador,1,true,https://drive.google.com/file/d/1fJejc6VEH_AQoKDGb6p4cG2-g72KBIka/view?usp=drive_link,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Chile
7,HUACHIPATO,Huachipato,Huach,Talcahuano,Bío Bío,1,true,https://drive.google.com/file/d/1htmaRYkpwbVsKn2Lsq91AQKD70q7oKns/view?usp=drive_link,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Chile
8,AUDAX,Audax Italiano,Aud,Santiago,Metropolitana,1,true,https://drive.google.com/file/d/1IkIO3ncMNX7m_EtENvRl_rhfXik05Gv4/view?usp=drive_link,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Chile
9,UNESPANOLA,Unión Española,UE,Santiago,Metropolitana,1,true,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Chile
10,COQUIMBO,Coquimbo Unido,CU,Coquimbo,Coquimbo,1,true,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Chile
11,RANGERS,Rangers de Talca,Ran,Talca,Maule,1,true,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Chile
12,SMORNING,Santiago Morning,SM,Santiago,Metropolitana,1,true,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Chile
13,MAGALLANES,Magallanes,Mag,Punta Arenas,Magallanes,1,true,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Chile
14,ANTOFAGASTA,Antofagasta,Anf,Antofagasta,Antofagasta,1,true,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Chile
15,IQUIQUE,Deportes Iquique,IQ,Iquique,Tarapacá,1,true,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Chile
17,DEPORTESSERENA,Deportes La Serena,LS,La Serena,Coquimbo,1,true,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Chile
18,PUERTOMONTT,Deportes Puerto Montt,PM,Puerto Montt,Los Lagos,1,true,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Chile
19,SANTACRUZ,Deportes Santa Cruz,SC,Santa Cruz,Maule,1,true,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Chile
20,COPIAPO,Deportes Copiapó,Cop,Copiapó,Atacama,1,true,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Chile
22,CALERA,Unión La Calera,Calera,La Calera,Valparaíso,1,true,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Chile
23,SANLUISQUILLOTA,San Luis de Quillota,SLQ,Quillota,Valparaíso,1,true,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Chile
24,TRASANDINO,Trasandino,Tras,Los Andes,Valparaíso,1,true,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Chile
25,PROVOSORNO,Provincial Osorno,PO,Osorno,Los Lagos,1,true,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Chile
26,SANMARCOSARICA,San Marcos de Arica,SMA,Arica,Arica y Parinacota,1,true,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Chile
27,ATLETICOCOLINA,Atlético Colina,AC,Colina,Metropolitana,1,true,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Chile
28,CONCEPCION,Deportes Concepción,Conc,Concepción,Bío Bío,1,true,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Chile
29,UNVERSIDADCONCEPCION,Universidad de Concepción,UdeC,Concepción,Bío Bío,1,true,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Chile
31,SANMARCOSQUILLOTA,San Marcos de Quillota,SMQ,Quillota,Valparaíso,1,true,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Chile
32,DEPORTESVALDIVIA,Deportes Valdivia,DV,Valdivia,Los Ríos,1,true,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Chile
89,EVERTON,Everton,Ev,Viña del Mar,Valparaíso,1,true,,2026-05-21 02:44:23.903063,2026-05-21 02:44:23.903063,Chile
90,COBRELOA,Cobreloa,Cob,Concepción,Bío Bío,1,true,,2026-05-21 02:44:23.903063,2026-05-21 02:44:23.903063,Chile
92,NUNBLENSE,Ñublense,Ñub,Chillán,Bío Bío,1,true,,2026-05-21 02:44:23.903063,2026-05-21 02:44:23.903063,Chile
93,COBRESAL,Cobresal,Cob,El Salvador,O'Higgins,1,true,,2026-05-21 03:12:12.686852,2026-05-21 03:12:12.686852,Chile
94,DEPORTESLIMACHE,Deportes Limache,DL,Limache,Valparaíso,1,true,,2026-05-21 03:12:12.686852,2026-05-21 03:12:12.686852,Chile
95,CURIOUNIDO,Curicó Unido,CU,Curicó,Maule,1,true,,2026-05-21 03:12:12.686852,2026-05-21 03:12:12.686852,Chile
96,DEPANTOF,Deportes Antofagasta,DA,Antofagasta,Antofagasta,1,true,,2026-05-21 03:12:12.686852,2026-05-21 03:12:12.686852,Chile
97,DEPRECOLETA,Deportes Recoleta,DR,Recoleta,Metropolitana,1,true,,2026-05-21 03:12:12.686852,2026-05-21 03:12:12.686852,Chile
98,DEPTEMUCO,Deportes Temuco,DT,Temuco,La Araucanía,1,true,,2026-05-21 03:12:12.686852,2026-05-21 03:12:12.686852,Chile
99,UNIONSANFELIPE,Unión San Felipe,USF,San Felipe,Valparaíso,1,true,,2026-05-21 03:12:12.686852,2026-05-21 03:12:12.686852,Chile
101,BRUJASAL,Brujas de Salamanca,BS,Lo Barnechea,Metropolitana,1,true,,2026-05-21 03:12:12.686852,2026-05-21 03:12:12.686852,Chile
102,CONCEONNACIONAL,Concón National,CN,Concón,Valparaíso,1,true,,2026-05-21 03:12:12.686852,2026-05-21 03:12:12.686852,Chile
103,PROVOVALLE,Provincial Ovalle,PO,Ovalle,Coquimbo,1,true,,2026-05-21 03:12:12.686852,2026-05-21 03:12:12.686852,Chile
104,REALSANJOAQUIN,Real San Joaquín,RSJ,San Joaquín,Metropolitana,1,true,,2026-05-21 03:12:12.686852,2026-05-21 03:12:12.686852,Chile
105,SANTIAGOCITY,Santiago City,SC,Lo Barnechea,Metropolitana,1,true,,2026-05-21 03:12:12.686852,2026-05-21 03:12:12.686852,Chile
107,COLCHAGUA,Colchagua,Col,Santa Cruz,Libertador,1,true,,2026-05-21 03:12:12.686852,2026-05-21 03:12:12.686852,Chile
108,DEPLINARES,Deportes Linares,DL,Linares,Maule,1,true,,2026-05-21 03:12:12.686852,2026-05-21 03:12:12.686852,Chile
109,DEPRENGO,Deportes Rengo,DR,Rengo,Libertador,1,true,,2026-05-21 03:12:12.686852,2026-05-21 03:12:12.686852,Chile
110,GENVELASQUEZ,General Velásquez,GV,Huachipato,Bío Bío,1,true,,2026-05-21 03:12:12.686852,2026-05-21 03:12:12.686852,Chile
111,LOTASCHWAGER,Lota Schwager,LS,Lota,Bío Bío,1,true,,2026-05-21 03:12:12.686852,2026-05-21 03:12:12.686852,Chile
91,DESCONOCIDO,S/C o Desconocido,S/C,Desconocido,Desconocido,,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Desconocido
81,COPENHAGUE,Copenhague,FCK,Copenhague,Región de Hovedstaden,57,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Dinamarca
82,AALBORG,Aalborg BK,AaB,Aalborg,Jutlandia del Norte,57,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Dinamarca
77,ESPANYOL,RCD Espanyol,RCDE,Barcelona,Cataluña,55,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,España
78,ALCORCON,Alcorcón,Alc,Alcorcón,Madrid,55,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,España
79,BARCELONA,FC Barcelona,FCB,Barcelona,Cataluña,55,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,España
80,REALMADRID,Real Madrid,RM,Madrid,Madrid,55,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,España
52,REALSALTLAKE,Real Salt Lake,RSL,Sandy,Utah,53,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Estados Unidos
53,NEWYORKCITY,New York City FC,NYCFC,New York,New York,53,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Estados Unidos
54,NEWYORKRB,New York Red Bulls,NYRB,Harrison,New Jersey,53,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Estados Unidos
55,LOSANGELESC,Los Angeles FC,LAFC,Los Angeles,California,53,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Estados Unidos
56,LOSANGELESGA,LA Galaxy,LAG,Carson,California,53,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Estados Unidos
57,SANJOSE,San Jose Earthquakes,SJE,San Jose,California,53,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Estados Unidos
58,SEATTLE,Seattle Sounders,SEA,Seattle,Washington,53,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Estados Unidos
59,PORTLAND,Portland Timbers,POR,Portland,Oregon,53,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Estados Unidos
60,DENVER,Colorado Rapids,DEN,Commerce City,Colorado,53,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Estados Unidos
74,LECCE,Lecce,US,Lecce,Apulia,54,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Italia
75,UDINESE,Udinese,Udi,Udine,Friuli-Venezia Giulia,54,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Italia
41,BADODEQUERETARO,Bado de Querétaro,BQ,Querétaro,Querétaro,52,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,México
42,PACHUCAFC,Pachuca FC,Pach,Pachuca,Hidalgo,52,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,México
43,MONTERREYFC,Monterrey FC,MTY,Monterrey,Nuevo León,52,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,México
44,ATLETICOSANLUISPOTOSI,Atlético San Luis Potosí,ASLP,San Luis Potosí,San Luis Potosí,52,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,México
45,CLUBAMERICA,Club América,CA,Ciudad de México,CDMX,52,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,México
46,LEON,León FC,León,León,Guanajuato,52,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,México
47,JUAREZ,FC Juárez,FJ,Ciudad Juárez,Chihuahua,52,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,México
48,TOLUCA,Toluca,Tol,Toluca,Estado de México,52,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,México
49,GUADALAJARA,Guadalajara,Gdl,Guadalajara,Jalisco,52,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,México
50,SANLUISPOTOSI,San Luis Potosí,SLP,San Luis Potosí,San Luis Potosí,52,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,México
51,TIGRESUNIVERSIDAD,Tigres UANL,Tig,Monterrey,Nuevo León,52,false,,2026-05-22 02:41:03.491666,2026-05-22 02:41:03.491666,México
83,MOLDE,Molde FK,MFK,Molde,Møre og Romsdal,58,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Noruega
84,STROMSGODSET,Strømsgodset IF,SIF,Drammen,Buskerud,58,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Noruega
85,STAVANGER,Viking FK,VFK,Stavanger,Rogaland,58,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Noruega
37,SPORTING_PE,Sporting Cristal,SC,Lima,Lima,50,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Perú
38,ALIANZA,Alianza Lima,AL,Lima,Lima,50,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Perú
39,UNIVERSITARIO,Universitario,U,Lima,Lima,50,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Perú
71,BENFICA,Benfica,SLB,Lisboa,Lisboa,56,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Portugal
72,SPORTING_PT,Sporting CP,SCP,Lisboa,Lisboa,56,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Portugal
73,PORTO,Porto,FCP,Porto,Porto,56,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Portugal
76,BRAGA,SC Braga,SCB,Braga,Braga,56,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,Portugal
87,DINAMOPRAGA,Dynamo Ceské Budějovice,DCP,Ceské Budějovice,Bohemia Meridional,60,false,,2026-05-15 02:41:03.491666,2026-05-15 02:41:03.491666,República Checa`;

import fs from 'fs';
import path from 'path';

function run() {
  const lines = csvContent.trim().split(/\r?\n/);
  const parsed = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Simple CSV parser that handles commas
    const cols = [];
    let cur = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cols.push(cur);
        cur = '';
      } else {
        cur += char;
      }
    }
    cols.push(cur);
    
    // Map columns
    const id_club = Number(cols[0]);
    const codigo = cols[1];
    const nombre = cols[2];
    const nombre_corto = cols[3] || null;
    const ciudad = cols[4] || null;
    const region = cols[5] || null;
    const id_pais = cols[6] ? Number(cols[6]) : null;
    const activo = cols[7] === 'true';
    const logo_url = cols[8] || null;
    const pais = cols[11] || null;
    
    parsed.push({
      id_club,
      codigo,
      nombre,
      nombre_corto,
      ciudad,
      region,
      id_pais,
      activo,
      logo_url,
      pais
    });
  }

  const outPath = path.join(process.cwd(), 'lib_clubs_parsed.json');
  fs.writeFileSync(outPath, JSON.stringify(parsed, null, 2));
  console.log('Successfully wrote', parsed.length, 'clubes to lib_clubs_parsed.json');
}

run();
