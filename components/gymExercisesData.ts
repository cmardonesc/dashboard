export interface GymExerciseTemplate {
  grupo_muscular: string;
  ejercicio: string;
  equipamiento: string;
  tecnica_ejecucion: string;
  id?: number;
  target_group?: string;
}

export const GYM_EXERCISES_DATA: GymExerciseTemplate[] = [
  {
    "id": 34,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Espalda",
    "ejercicio": "Dominada agarre supino",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Colgado con agarre supino, subir el cuerpo hasta que el mentón pase la barra y bajar controlado."
  },
  {
    "id": 35,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Espalda",
    "ejercicio": "Dominadas",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Colgado de la barra con agarre prono, subir el cuerpo hasta que el mentón pase la barra y bajar controlado."
  },
  {
    "id": 36,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Espalda",
    "ejercicio": "Dominadas con agarre neutro",
    "equipamiento": "Peso corporal/Barra fija",
    "tecnica_ejecucion": "Agarre neutro (palmas enfrentadas), subir el cuerpo hasta mentón sobre barra y bajar controlado."
  },
  {
    "id": 37,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Espalda",
    "ejercicio": "Remo Landmine",
    "equipamiento": "Barra/Landmine",
    "tecnica_ejecucion": "Inclinado al frente sujetando el extremo de la barra anclada, remar hacia el abdomen y bajar controlado."
  },
  {
    "id": 38,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Espalda",
    "ejercicio": "Remo alternado con pesa rusa",
    "equipamiento": "Pesa rusa",
    "tecnica_ejecucion": "Inclinado al frente, alternar el remo de cada brazo hacia la cadera contrayendo dorsal."
  },
  {
    "id": 39,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Espalda",
    "ejercicio": "Remo barra T",
    "equipamiento": "Barra/T-bar",
    "tecnica_ejecucion": "De pie sobre la barra anclada, inclinado al frente, remar hacia el abdomen contrayendo dorsales."
  },
  {
    "id": 40,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Espalda",
    "ejercicio": "Remo con barra",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "Inclinado al frente con espalda neutra, llevar la barra hacia el abdomen y bajar controladamente."
  },
  {
    "id": 41,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Espalda",
    "ejercicio": "Remo con barra agarre supino",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "Inclinado al frente, agarre supino, llevar la barra hacia el abdomen contrayendo dorsales y retornar controlado."
  },
  {
    "id": 42,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Espalda",
    "ejercicio": "Remo con mancuerna",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Apoyo de una mano y rodilla en banco, remar la mancuerna con el otro brazo hacia la cadera."
  },
  {
    "id": 43,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Espalda",
    "ejercicio": "Remo con pesa rusa",
    "equipamiento": "Pesa rusa",
    "tecnica_ejecucion": "Inclinado al frente, remar la pesa rusa hacia la cadera contrayendo dorsal y bajar controlado."
  },
  {
    "id": 44,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Espalda",
    "ejercicio": "Remo en máquina Smith",
    "equipamiento": "Máquina Smith",
    "tecnica_ejecucion": "Inclinado al frente bajo la barra guiada, remar hacia el abdomen y bajar controlado."
  },
  {
    "id": 45,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Espalda",
    "ejercicio": "Remo inclinado con mancuerna",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Inclinado al frente, remar ambas mancuernas hacia la cadera contrayendo dorsales y bajar controlado."
  },
  {
    "id": 46,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Espalda",
    "ejercicio": "Remo meadows",
    "equipamiento": "Barra/Landmine",
    "tecnica_ejecucion": "Lateral a la barra anclada, remar con un brazo hacia la cadera en ángulo, contrayendo dorsal."
  },
  {
    "id": 47,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Espalda",
    "ejercicio": "Remo pendlay",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "Inclinado al frente con espalda paralela al suelo, remar la barra explosivamente hacia el abdomen desde el suelo."
  },
  {
    "id": 48,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Espalda",
    "ejercicio": "Remo renegado",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "En posición de plancha sobre mancuernas, remar un brazo hacia la cadera manteniendo cadera estable."
  },
  {
    "id": 49,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Glúteos",
    "ejercicio": "Empuje de cadera con barra",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "Espalda apoyada en banco, barra sobre la cadera, empujar hacia arriba contrayendo glúteos."
  },
  {
    "id": 50,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Glúteos",
    "ejercicio": "Empuje de cadera en Smith",
    "equipamiento": "Máquina Smith",
    "tecnica_ejecucion": "Espalda apoyada en banco bajo la barra guiada, empujar la cadera hacia arriba contrayendo glúteos."
  },
  {
    "id": 51,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Glúteos",
    "ejercicio": "Puente glúteo con barra",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "Acostado boca arriba, barra sobre la cadera, elevar la cadera contrayendo glúteos y bajar."
  },
  {
    "id": 52,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Press Arnold",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Sentado, mancuernas frente a los hombros con palmas hacia el cuerpo, rotar y empujar arriba extendiendo brazos."
  },
  {
    "id": 53,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Press de hombro con mancuerna",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Sentado o de pie, empujar las mancuernas desde los hombros hacia arriba hasta extender brazos."
  },
  {
    "id": 54,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Press de hombros con mancuernas (variante)",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Sentado o de pie, empujar mancuernas desde hombros hacia arriba extendiendo brazos."
  },
  {
    "id": 55,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Press de hombros en máquina Smith",
    "equipamiento": "Máquina Smith",
    "tecnica_ejecucion": "Sentado bajo la barra guiada, empujar hacia arriba extendiendo brazos siguiendo el riel."
  },
  {
    "id": 56,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Press militar con barra",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "De pie, empujar la barra desde los hombros hacia arriba hasta extender brazos por completo."
  },
  {
    "id": 57,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Press militar con barra sentado",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "Sentado, empujar la barra desde los hombros hacia arriba hasta extensión completa."
  },
  {
    "id": 58,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Press militar con kettlebell",
    "equipamiento": "Pesa rusa",
    "tecnica_ejecucion": "De pie, empujar la pesa rusa desde el hombro hacia arriba hasta extender el brazo."
  },
  {
    "id": 59,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Isquiotibiales",
    "ejercicio": "Buenos días",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "Barra en la espalda, inclinar el torso al frente con leve flexión de rodilla y volver extendiendo cadera."
  },
  {
    "id": 60,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Isquiotibiales",
    "ejercicio": "Buenos días con mancuernas",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Mancuernas en los hombros o colgando, inclinar el torso al frente y volver extendiendo cadera."
  },
  {
    "id": 61,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Isquiotibiales",
    "ejercicio": "Buenos días en máquina Smith",
    "equipamiento": "Máquina Smith",
    "tecnica_ejecucion": "Barra guiada en la espalda, inclinar el torso al frente con leve flexión de rodilla y volver."
  },
  {
    "id": 62,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Isquiotibiales",
    "ejercicio": "Levantamiento de peso muerto (variante)",
    "equipamiento": "Barra/Mancuerna",
    "tecnica_ejecucion": "Desde el suelo, extender cadera y rodillas elevando la carga hasta posición erguida."
  },
  {
    "id": 63,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Isquiotibiales",
    "ejercicio": "Peso muerto",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "Desde el suelo, extender cadera y rodillas simultáneamente elevando la barra hasta posición erguida."
  },
  {
    "id": 64,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Isquiotibiales",
    "ejercicio": "Peso muerto con barra hexagonal",
    "equipamiento": "Barra hexagonal",
    "tecnica_ejecucion": "De pie dentro de la barra hexagonal, extender cadera y rodillas elevando el peso."
  },
  {
    "id": 65,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Isquiotibiales",
    "ejercicio": "Peso muerto con piernas rígidas",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "Piernas casi extendidas, bajar la barra por delante de las piernas y subir extendiendo cadera."
  },
  {
    "id": 66,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Isquiotibiales",
    "ejercicio": "Peso muerto maleta con pesa rusa (variante 1)",
    "equipamiento": "Pesa rusa",
    "tecnica_ejecucion": "Pesa rusa a un lado del cuerpo como una maleta, bajar flexionando cadera y subir extendiendo."
  },
  {
    "id": 67,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Isquiotibiales",
    "ejercicio": "Peso muerto maleta con pesa rusa (variante 2)",
    "equipamiento": "Pesa rusa",
    "tecnica_ejecucion": "Variante del peso muerto maleta, ajustando posición de pies o carga."
  },
  {
    "id": 68,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Isquiotibiales",
    "ejercicio": "Peso muerto rumano a una pierna",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Apoyo en una pierna, bajar el torso extendiendo la pierna libre atrás y subir controlado."
  },
  {
    "id": 69,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Isquiotibiales",
    "ejercicio": "Peso muerto rumano con barra",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "De pie, bajar la barra deslizando por las piernas con leve flexión de rodilla, cadera hacia atrás, y subir extendiendo."
  },
  {
    "id": 70,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Isquiotibiales",
    "ejercicio": "Peso muerto rumano con mancuerna",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "De pie, bajar las mancuernas deslizando por las piernas con leve flexión de rodilla y subir."
  },
  {
    "id": 71,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Isquiotibiales",
    "ejercicio": "Peso muerto rumano con pesa rusa",
    "equipamiento": "Pesa rusa",
    "tecnica_ejecucion": "De pie, bajar la pesa rusa por delante de las piernas con leve flexión de rodilla y subir."
  },
  {
    "id": 72,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Isquiotibiales",
    "ejercicio": "Peso muerto rumano en máquina",
    "equipamiento": "Máquina Smith/Otra",
    "tecnica_ejecucion": "Bajo el riel guiado, bajar el torso con leve flexión de rodilla y subir extendiendo cadera."
  },
  {
    "id": 73,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Isquiotibiales",
    "ejercicio": "Sumo Deadlift",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "Pies muy separados, agarre estrecho dentro de las piernas, extender cadera y rodillas elevando la barra."
  },
  {
    "id": 74,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Press banca",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "Acostado en banco plano, bajar la barra al pecho controladamente y empujar hasta extensión completa."
  },
  {
    "id": 75,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Press banca con mancuerna",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Acostado en banco plano, bajar mancuernas a los lados del pecho y empujar hasta extender brazos."
  },
  {
    "id": 76,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Press banca con mancuerna a un brazo",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Acostado en banco, un brazo presiona la mancuerna mientras el otro estabiliza. Controlar el descenso y empujar sin rotar el torso."
  },
  {
    "id": 77,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Press banca declinado con barra",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "En banco declinado, bajar la barra al pecho bajo control y empujar hasta extensión completa de brazos."
  },
  {
    "id": 78,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Press banca en máquina Smith",
    "equipamiento": "Máquina Smith",
    "tecnica_ejecucion": "Acostado bajo la barra guiada, bajar al pecho y empujar hacia arriba siguiendo el riel fijo."
  },
  {
    "id": 79,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Press banca inclinado",
    "equipamiento": "Barra/Mancuerna",
    "tecnica_ejecucion": "En banco inclinado 30-45°, bajar la carga al pecho superior y extender brazos sin arquear excesivamente la espalda."
  },
  {
    "id": 80,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Press banca inclinado con mancuernas",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "En banco inclinado, bajar mancuernas a los lados del pecho superior y empujar hasta extender brazos."
  },
  {
    "id": 81,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Cossack Squat",
    "equipamiento": "Pesa rusa/Peso corporal",
    "tecnica_ejecucion": "Sentadilla lateral amplia, desplazando el peso a una pierna mientras la otra se extiende."
  },
  {
    "id": 82,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Dumbbell Sumo Squat",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Pies muy separados, mancuerna entre las piernas, bajar en sentadilla amplia y subir extendiendo cadera."
  },
  {
    "id": 83,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Estocada",
    "equipamiento": "Peso corporal/Mancuerna",
    "tecnica_ejecucion": "Paso al frente flexionando ambas rodillas hasta 90°, empujar de vuelta a posición inicial."
  },
  {
    "id": 84,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Estocada caminando",
    "equipamiento": "Peso corporal/Mancuerna",
    "tecnica_ejecucion": "Avanzar alternando estocadas hacia adelante con cada paso, sin retornar a posición inicial."
  },
  {
    "id": 85,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Estocada caminando con mancuerna",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Avanzar alternando estocadas con mancuernas a los lados, flexionando ambas rodillas."
  },
  {
    "id": 86,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Estocada con mancuerna encima de la cabeza (variante 1)",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Mancuerna extendida sobre la cabeza, dar un paso en estocada manteniendo estabilidad del brazo."
  },
  {
    "id": 87,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Estocada con mancuerna encima de la cabeza (variante 2)",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Variante de estocada con mancuerna overhead, enfatizando estabilidad de core y hombro."
  },
  {
    "id": 88,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Estocada con mancuernas",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Mancuernas a los lados, paso al frente flexionando ambas rodillas y volver a posición inicial."
  },
  {
    "id": 89,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Estocada con pesa rusa encima de la cabeza",
    "equipamiento": "Pesa rusa",
    "tecnica_ejecucion": "Pesa rusa extendida sobre la cabeza, dar un paso en estocada manteniendo estabilidad."
  },
  {
    "id": 90,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Estocada inversa",
    "equipamiento": "Peso corporal/Mancuerna",
    "tecnica_ejecucion": "Paso atrás flexionando ambas rodillas hasta 90° y volver a posición inicial."
  },
  {
    "id": 91,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Estocada inversa con mancuerna",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Mancuernas a los lados, paso atrás flexionando ambas rodillas y volver a posición inicial."
  },
  {
    "id": 92,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Estocada reversa con barra",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "Barra en la espalda, dar un paso atrás flexionando ambas rodillas y volver a posición inicial."
  },
  {
    "id": 93,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Estocada trasera con pesa rusa",
    "equipamiento": "Pesa rusa",
    "tecnica_ejecucion": "Sosteniendo la pesa rusa, dar un paso atrás flexionando ambas rodillas y volver."
  },
  {
    "id": 94,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Estocadas con barra",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "Barra en la espalda, paso al frente flexionando ambas rodillas y volver a posición inicial."
  },
  {
    "id": 95,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Estocadas con barra caminando",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "Barra en la espalda, avanzar alternando estocadas con cada paso sin retornar."
  },
  {
    "id": 96,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Estocadas con barra encima de la cabeza",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "Barra extendida sobre la cabeza, dar un paso en estocada manteniendo el brazo estable."
  },
  {
    "id": 97,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Máquina de sentadillas hack",
    "equipamiento": "Máquina hack",
    "tecnica_ejecucion": "Espalda apoyada en la máquina inclinada, bajar flexionando rodillas y empujar extendiendo."
  },
  {
    "id": 98,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Prensa a una pierna",
    "equipamiento": "Máquina de prensa",
    "tecnica_ejecucion": "Sentado en la prensa, empujar la plataforma con una pierna extendiendo la rodilla y bajar controlado."
  },
  {
    "id": 99,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Prensa de piernas",
    "equipamiento": "Máquina de prensa",
    "tecnica_ejecucion": "Sentado, empujar la plataforma con ambas piernas extendiendo rodillas y bajar controlado."
  },
  {
    "id": 100,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Prensa de piernas vertical",
    "equipamiento": "Máquina de prensa vertical",
    "tecnica_ejecucion": "Acostado boca arriba, empujar la plataforma hacia arriba extendiendo rodillas y bajar controlado."
  },
  {
    "id": 101,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Prensa horizontal a una pierna",
    "equipamiento": "Máquina de prensa",
    "tecnica_ejecucion": "Sentado, empujar la plataforma horizontal con una pierna extendiendo la rodilla."
  },
  {
    "id": 102,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Sentadilla Landmine",
    "equipamiento": "Barra/Landmine",
    "tecnica_ejecucion": "Sosteniendo el extremo de la barra anclada al pecho, bajar en sentadilla y subir."
  },
  {
    "id": 103,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Sentadilla a press Landmine",
    "equipamiento": "Barra/Landmine",
    "tecnica_ejecucion": "Sentadilla frontal sosteniendo el extremo de la barra anclada, subir y empujar arriba."
  },
  {
    "id": 104,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Sentadilla a press de hombro con mancuerna",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Bajar en sentadilla sosteniendo mancuernas en los hombros, subir y empujar overhead."
  },
  {
    "id": 105,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Sentadilla búlgara",
    "equipamiento": "Peso corporal/Mancuerna",
    "tecnica_ejecucion": "Pie trasero elevado en banco, bajar flexionando la pierna delantera y subir extendiendo."
  },
  {
    "id": 106,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Sentadilla búlgara con barra",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "Pie trasero elevado en banco, barra en la espalda, bajar flexionando la pierna delantera."
  },
  {
    "id": 107,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Sentadilla búlgara con mancuerna",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Pie trasero elevado en banco, mancuernas a los lados, bajar flexionando la pierna delantera."
  },
  {
    "id": 108,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Sentadilla búlgara en máquina",
    "equipamiento": "Máquina Smith/Otra",
    "tecnica_ejecucion": "Pie trasero elevado, bajo la máquina guiada, bajar flexionando la pierna delantera."
  },
  {
    "id": 109,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Sentadilla con barra",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "Barra en la espalda, bajar flexionando rodillas y cadera manteniendo espalda neutra, subir extendiendo."
  },
  {
    "id": 110,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Sentadilla con barra encima de la cabeza",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "Barra extendida sobre la cabeza, bajar en sentadilla manteniendo brazos estables."
  },
  {
    "id": 111,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Sentadilla con cinturón",
    "equipamiento": "Cinturón de sentadilla",
    "tecnica_ejecucion": "Peso suspendido del cinturón en la cadera, bajar en sentadilla y subir extendiendo rodillas."
  },
  {
    "id": 112,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Sentadilla con mancuerna",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Mancuernas a los lados o al frente, bajar en sentadilla y subir extendiendo rodillas."
  },
  {
    "id": 113,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Sentadilla con mancuerna encima de la cabeza",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Mancuerna extendida sobre la cabeza, bajar en sentadilla manteniendo el brazo estable."
  },
  {
    "id": 114,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Sentadilla con pesa rusa encima de la cabeza",
    "equipamiento": "Pesa rusa",
    "tecnica_ejecucion": "Pesa rusa extendida sobre la cabeza, bajar en sentadilla manteniendo el brazo estable."
  },
  {
    "id": 115,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Sentadilla dividida con pesa rusa",
    "equipamiento": "Pesa rusa",
    "tecnica_ejecucion": "Posición de piernas en tijera, bajar flexionando ambas rodillas sosteniendo la pesa rusa."
  },
  {
    "id": 116,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Sentadilla en caja",
    "equipamiento": "Barra/Peso corporal",
    "tecnica_ejecucion": "Bajar en sentadilla hasta tocar levemente una caja y subir extendiendo rodillas."
  },
  {
    "id": 117,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Sentadilla en máquina Smith",
    "equipamiento": "Máquina Smith",
    "tecnica_ejecucion": "Bajo la barra guiada, bajar en sentadilla siguiendo el riel y subir extendiendo rodillas."
  },
  {
    "id": 118,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Sentadilla frontal",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "Barra apoyada en los hombros al frente, bajar en sentadilla manteniendo codos altos y torso erguido."
  },
  {
    "id": 119,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Sentadilla frontal en caja",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "Barra al frente sobre los hombros, bajar hasta tocar una caja y subir extendiendo rodillas."
  },
  {
    "id": 120,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Sentadilla frontal en máquina Smith",
    "equipamiento": "Máquina Smith",
    "tecnica_ejecucion": "Barra al frente bajo el riel guiado, bajar en sentadilla y subir extendiendo rodillas."
  },
  {
    "id": 121,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Sentadilla góblet",
    "equipamiento": "Mancuerna/Pesa rusa",
    "tecnica_ejecucion": "Sosteniendo la carga frente al pecho con ambas manos, bajar en sentadilla profunda y subir."
  },
  {
    "id": 122,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Sentadilla góblet con mancuerna",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Mancuerna sostenida verticalmente frente al pecho, bajar en sentadilla y subir extendiendo."
  },
  {
    "id": 123,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Sentadilla hack",
    "equipamiento": "Máquina hack",
    "tecnica_ejecucion": "Espalda apoyada en la máquina inclinada, bajar flexionando rodillas y empujar extendiendo."
  },
  {
    "id": 124,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Sentadilla split con barra",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "Piernas en posición de tijera, barra en la espalda, bajar flexionando ambas rodillas."
  },
  {
    "id": 125,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Sentadilla split con mancuerna",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Piernas en posición de tijera, mancuernas a los lados, bajar flexionando ambas rodillas."
  },
  {
    "id": 126,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Sentadilla split en máquina Smith",
    "equipamiento": "Máquina Smith",
    "tecnica_ejecucion": "Piernas en tijera bajo la barra guiada, bajar flexionando ambas rodillas y subir."
  },
  {
    "id": 127,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Sentadilla sumo con pesa rusa",
    "equipamiento": "Pesa rusa",
    "tecnica_ejecucion": "Pies muy separados, pesa rusa entre las piernas, bajar en sentadilla amplia y subir."
  },
  {
    "id": 128,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Step up con barra",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "Barra en la espalda alta, subir a un cajón con una pierna y bajar controlado, alternando lados."
  },
  {
    "id": 129,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Step up con mancuerna",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Mancuernas a los lados, subir a un cajón con una pierna y bajar controlado, alternando lados."
  },
  {
    "id": 130,
    "target_group": "FUERZA_MAXIMA",
    "grupo_muscular": "Tríceps",
    "ejercicio": "Press banca cerrado",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "Acostado en banco, agarre estrecho, bajar la barra al pecho y empujar extendiendo brazos, codos cerca del cuerpo."
  },
  {
    "id": 131,
    "target_group": "FUERZA_EXPLOSIVA",
    "grupo_muscular": "Glúteos",
    "ejercicio": "Swing de pesa rusa",
    "equipamiento": "Pesa rusa",
    "tecnica_ejecucion": "Bisagra de cadera impulsando la pesa rusa hacia adelante hasta la altura del pecho, dejándola caer controlada."
  },
  {
    "id": 132,
    "target_group": "FUERZA_EXPLOSIVA",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Flexiones despegando manos",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Bajar en flexión estándar y al subir despegar manos del suelo con impulso explosivo, aterrizar con codos suaves."
  },
  {
    "id": 133,
    "target_group": "FUERZA_EXPLOSIVA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Empuje de trineo",
    "equipamiento": "Trineo",
    "tecnica_ejecucion": "Empujar el trineo cargado hacia adelante con pasos cortos y potentes, torso inclinado."
  },
  {
    "id": 134,
    "target_group": "FUERZA_EXPLOSIVA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Estocada con balón medicinal",
    "equipamiento": "Balón medicinal",
    "tecnica_ejecucion": "Estocada al frente sosteniendo el balón medicinal, manteniendo torso erguido."
  },
  {
    "id": 135,
    "target_group": "FUERZA_EXPLOSIVA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Volteo de rueda",
    "equipamiento": "Llanta/Neumático",
    "tecnica_ejecucion": "Flexionar cadera y rodillas para impulsar y volcar la llanta hacia adelante."
  },
  {
    "id": 136,
    "target_group": "FUERZA_EXPLOSIVA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Wall Ball",
    "equipamiento": "Balón medicinal",
    "tecnica_ejecucion": "Sentadilla seguida de lanzamiento del balón hacia una pared a la altura indicada, recibir y repetir."
  },
  {
    "id": 137,
    "target_group": "DERIVADOS_HALTEROFILIA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Barbell High Pull",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "Tirón explosivo de la barra desde la cadera hacia el pecho, codos altos liderando el movimiento."
  },
  {
    "id": 138,
    "target_group": "DERIVADOS_HALTEROFILIA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Clean and Press",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "Tirón de la barra desde el suelo hasta los hombros (clean) y luego press sobre la cabeza extendiendo brazos."
  },
  {
    "id": 139,
    "target_group": "DERIVADOS_HALTEROFILIA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Dumbbell Hang Clean",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Desde posición colgante, tirón explosivo de las mancuernas hacia los hombros recibiéndolas en semisentadilla."
  },
  {
    "id": 140,
    "target_group": "DERIVADOS_HALTEROFILIA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Dumbbell Power Clean and Jerk",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Tirón explosivo de las mancuernas a los hombros (clean) seguido de empuje overhead (jerk) con impulso de piernas."
  },
  {
    "id": 141,
    "target_group": "DERIVADOS_HALTEROFILIA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Kettlebell Clean and Jerk",
    "equipamiento": "Pesa rusa",
    "tecnica_ejecucion": "Tirón de la pesa rusa a posición de hombro (clean) y empuje overhead (jerk) con impulso de piernas."
  },
  {
    "id": 142,
    "target_group": "DERIVADOS_HALTEROFILIA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Push Jerk",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "Flexión rápida de piernas e impulso para empujar la barra sobre la cabeza, recibiendo con leve flexión."
  },
  {
    "id": 143,
    "target_group": "DERIVADOS_HALTEROFILIA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Single Dumbbell Power Clean",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Tirón explosivo de una mancuerna hacia el hombro recibiéndola en semisentadilla."
  },
  {
    "id": 144,
    "target_group": "DERIVADOS_HALTEROFILIA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Single Dumbbell Power Clean a... (variante)",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Tirón explosivo de una mancuerna al hombro seguido de press overhead o variante especificada."
  },
  {
    "id": 145,
    "target_group": "DERIVADOS_HALTEROFILIA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Snatch",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "Tirón explosivo de la barra desde el suelo directo hasta arriba de la cabeza en un solo movimiento."
  },
  {
    "id": 146,
    "target_group": "DERIVADOS_HALTEROFILIA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Split Jerk",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "Empuje explosivo de la barra desde los hombros hacia arriba con piernas en posición de tijera (split)."
  },
  {
    "id": 147,
    "target_group": "DERIVADOS_HALTEROFILIA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Thruster",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "Sentadilla frontal seguida de press overhead usando el impulso de las piernas para empujar la barra arriba."
  },
  {
    "id": 148,
    "target_group": "DERIVADOS_HALTEROFILIA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Clean",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "Tirón explosivo de la barra desde el suelo hasta recibirla en los hombros en posición de sentadilla."
  },
  {
    "id": 149,
    "target_group": "DERIVADOS_HALTEROFILIA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Clean and Jerk",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "Clean para llevar la barra a los hombros, seguido de jerk para empujarla sobre la cabeza."
  },
  {
    "id": 150,
    "target_group": "DERIVADOS_HALTEROFILIA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Hang Clean",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "Desde posición colgante por encima de la rodilla, tirón explosivo recibiendo la barra en los hombros."
  },
  {
    "id": 151,
    "target_group": "DERIVADOS_HALTEROFILIA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Hang Power Clean",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "Similar al Hang Clean, recibiendo la barra en posición de sentadilla parcial (power)."
  },
  {
    "id": 152,
    "target_group": "DERIVADOS_HALTEROFILIA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Power Clean",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "Tirón explosivo de la barra desde el suelo hasta los hombros, recibiendo en sentadilla parcial."
  },
  {
    "id": 153,
    "target_group": "DERIVADOS_HALTEROFILIA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Split Clean",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "Tirón explosivo de la barra recibiéndola en posición de tijera (split) a la altura de los hombros."
  },
  {
    "id": 154,
    "target_group": "DERIVADOS_HALTEROFILIA",
    "grupo_muscular": "Trapecio",
    "ejercicio": "Clean Pull",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "Tirón vertical de la barra desde el suelo extendiendo cadera y rodillas, sin recibir en los hombros."
  },
  {
    "id": 155,
    "target_group": "PLIOMETRIA_INTENSIVA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Estocada con salto (variante 1)",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Alternar estocadas con salto explosivo entre repeticiones, cambiando de pierna en el aire."
  },
  {
    "id": 156,
    "target_group": "PLIOMETRIA_INTENSIVA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Estocada con salto (variante 2)",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Variante de estocada con salto, ajustando ritmo o amplitud del salto."
  },
  {
    "id": 157,
    "target_group": "PLIOMETRIA_INTENSIVA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Salto al cajón",
    "equipamiento": "Peso corporal/Cajón",
    "tecnica_ejecucion": "Flexión rápida de rodillas e impulso para saltar sobre el cajón, aterrizando con rodillas suaves."
  },
  {
    "id": 158,
    "target_group": "PLIOMETRIA_INTENSIVA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Sentadilla con salto",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Bajar en sentadilla y subir con impulso explosivo hacia un salto vertical."
  },
  {
    "id": 159,
    "target_group": "PLIOMETRIA_EXTENSIVA",
    "grupo_muscular": "Gemelos",
    "ejercicio": "Saltar la cuerda",
    "equipamiento": "Cuerda",
    "tecnica_ejecucion": "Saltos continuos coordinando rotación de muñeca con el paso de la cuerda bajo los pies."
  },
  {
    "id": 160,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Antebrazos",
    "ejercicio": "Curl de antebrazo con barra en banco (variante 1)",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "Antebrazos apoyados en banco, flexionar muñecas elevando la barra y bajar controlado."
  },
  {
    "id": 161,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Antebrazos",
    "ejercicio": "Curl de antebrazo con barra en banco (variante 2)",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "Antebrazos apoyados en banco, agarre invertido, flexionar muñecas elevando la barra."
  },
  {
    "id": 162,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Antebrazos",
    "ejercicio": "Curl de antebrazo con mancuerna",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Antebrazo apoyado en banco, flexionar la muñeca elevando la mancuerna y bajar controlado."
  },
  {
    "id": 163,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Antebrazos",
    "ejercicio": "Curl de muñeca con mancuerna",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Antebrazo apoyado, flexionar la muñeca elevando la mancuerna en rango corto y bajar controlado."
  },
  {
    "id": 164,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Bíceps",
    "ejercicio": "Curl Zottman",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "De pie, subir con agarre supino y bajar rotando a agarre prono, trabajando bíceps y antebrazo."
  },
  {
    "id": 165,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Bíceps",
    "ejercicio": "Curl Zottman predicador",
    "equipamiento": "Mancuerna/Banco predicador",
    "tecnica_ejecucion": "Brazo apoyado en banco predicador, subir en supino y bajar rotando a prono."
  },
  {
    "id": 166,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Bíceps",
    "ejercicio": "Curl barra Z",
    "equipamiento": "Barra Z",
    "tecnica_ejecucion": "De pie, flexionar codos elevando la barra Z hacia el pecho y bajar controlado."
  },
  {
    "id": 167,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Bíceps",
    "ejercicio": "Curl barra Z agarre cerrado",
    "equipamiento": "Barra Z",
    "tecnica_ejecucion": "De pie con agarre estrecho, flexionar codos elevando la barra y bajar controlado."
  },
  {
    "id": 168,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Bíceps",
    "ejercicio": "Curl barra Z inclinado",
    "equipamiento": "Barra Z",
    "tecnica_ejecucion": "En banco inclinado hacia atrás, flexionar codos elevando la barra Z, enfatizando estiramiento del bíceps."
  },
  {
    "id": 169,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Bíceps",
    "ejercicio": "Curl bayesian con cable",
    "equipamiento": "Polea/Cable",
    "tecnica_ejecucion": "De espaldas a la polea baja, brazo extendido atrás, flexionar el codo llevando la mano al hombro."
  },
  {
    "id": 170,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Bíceps",
    "ejercicio": "Curl de bíceps araña",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Pecho apoyado en banco inclinado boca abajo, flexionar codos elevando mancuernas sin balanceo."
  },
  {
    "id": 171,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Bíceps",
    "ejercicio": "Curl de bíceps con banda elástica",
    "equipamiento": "Banda elástica",
    "tecnica_ejecucion": "De pie sobre la banda, flexionar codos elevando los agarres hacia los hombros."
  },
  {
    "id": 172,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Bíceps",
    "ejercicio": "Curl de bíceps con barra",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "De pie, agarre supino, flexionar codos elevando la barra hacia el pecho y bajar controlado."
  },
  {
    "id": 173,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Bíceps",
    "ejercicio": "Curl de bíceps con cable alto",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "De pie bajo polea alta, flexionar el codo llevando el cable hacia el hombro."
  },
  {
    "id": 174,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Bíceps",
    "ejercicio": "Curl de bíceps con mancuerna",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "De pie, flexionar el codo elevando la mancuerna hacia el hombro y bajar controlado, codo fijo."
  },
  {
    "id": 175,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Bíceps",
    "ejercicio": "Curl de bíceps con press de hombro",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "De pie, combinar flexión de codo (curl) seguida de press overhead en un movimiento continuo."
  },
  {
    "id": 176,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Bíceps",
    "ejercicio": "Curl de bíceps concentrado",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Sentado, codo apoyado en el muslo, flexionar elevando la mancuerna hacia el hombro de forma aislada."
  },
  {
    "id": 177,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Bíceps",
    "ejercicio": "Curl de bíceps en máquina",
    "equipamiento": "Máquina",
    "tecnica_ejecucion": "Sentado o de pie, flexionar codos elevando las manijas hacia los hombros."
  },
  {
    "id": 178,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Bíceps",
    "ejercicio": "Curl de bíceps en polea",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "De pie frente a la polea baja, flexionar codos elevando el agarre hacia el pecho."
  },
  {
    "id": 179,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Bíceps",
    "ejercicio": "Curl de bíceps en polea a un brazo",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "De pie, flexionar un codo elevando el agarre hacia el hombro, manteniendo codo fijo."
  },
  {
    "id": 180,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Bíceps",
    "ejercicio": "Curl de bíceps en polea alta",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "De pie bajo la polea alta, flexionar el codo llevando el agarre hacia el hombro."
  },
  {
    "id": 181,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Bíceps",
    "ejercicio": "Curl de bíceps en polea por detrás",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "De espaldas a la polea, brazo extendido atrás, flexionar codo llevando mano hacia el hombro."
  },
  {
    "id": 182,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Bíceps",
    "ejercicio": "Curl de bíceps inclinado",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "En banco inclinado hacia atrás, flexionar codos elevando mancuernas, enfatizando estiramiento."
  },
  {
    "id": 183,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Bíceps",
    "ejercicio": "Curl de bíceps sentado",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Sentado, flexionar el codo elevando la mancuerna hacia el hombro y bajar controlado."
  },
  {
    "id": 184,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Bíceps",
    "ejercicio": "Curl en polea cruzado a un brazo",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "De pie lateral a la polea baja, flexionar el codo cruzando el agarre hacia el hombro opuesto."
  },
  {
    "id": 185,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Bíceps",
    "ejercicio": "Curl inverso con barra",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "De pie, agarre prono, flexionar codos elevando la barra hacia el pecho, enfocando antebrazo y bíceps."
  },
  {
    "id": 186,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Bíceps",
    "ejercicio": "Curl inverso con mancuerna",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "De pie, agarre prono, flexionar codos elevando mancuernas hacia los hombros."
  },
  {
    "id": 187,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Bíceps",
    "ejercicio": "Curl martillo",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "De pie, agarre neutro, flexionar codos elevando mancuernas hacia los hombros sin rotar muñeca."
  },
  {
    "id": 188,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Bíceps",
    "ejercicio": "Curl martillo con banda elástica",
    "equipamiento": "Banda elástica",
    "tecnica_ejecucion": "De pie sobre la banda con agarre neutro, flexionar codos elevando hacia los hombros."
  },
  {
    "id": 189,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Bíceps",
    "ejercicio": "Curl martillo cruzado",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "De pie, agarre neutro, flexionar el codo cruzando la mancuerna hacia el hombro contrario."
  },
  {
    "id": 190,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Bíceps",
    "ejercicio": "Curl martillo en polea baja",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "De pie, agarre neutro en la cuerda, flexionar codo elevando hacia el hombro."
  },
  {
    "id": 191,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Bíceps",
    "ejercicio": "Curl martillo inclinado",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "En banco inclinado hacia atrás, agarre neutro, flexionar codos elevando mancuernas."
  },
  {
    "id": 192,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Bíceps",
    "ejercicio": "Curl predicador a una mano",
    "equipamiento": "Mancuerna/Banco predicador",
    "tecnica_ejecucion": "Brazo apoyado en banco predicador, flexionar el codo elevando la mancuerna y bajar controlado."
  },
  {
    "id": 193,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Bíceps",
    "ejercicio": "Curl predicador barra Z",
    "equipamiento": "Barra Z/Banco predicador",
    "tecnica_ejecucion": "Brazos apoyados en banco predicador, flexionar codos elevando la barra y bajar controlado."
  },
  {
    "id": 194,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Bíceps",
    "ejercicio": "Curl predicador en máquina",
    "equipamiento": "Máquina",
    "tecnica_ejecucion": "Brazos apoyados en el banco de la máquina, flexionar codos elevando las manijas."
  },
  {
    "id": 195,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Bíceps",
    "ejercicio": "Curl predicador en máquina de discos",
    "equipamiento": "Máquina de discos",
    "tecnica_ejecucion": "Brazos apoyados en banco predicador, flexionar codos elevando contra la resistencia del disco."
  },
  {
    "id": 196,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Bíceps",
    "ejercicio": "Curl waiter",
    "equipamiento": "Mancuerna/Disco",
    "tecnica_ejecucion": "De pie sosteniendo el disco como una bandeja, flexionar el codo elevando hacia el pecho."
  },
  {
    "id": 197,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Bíceps",
    "ejercicio": "Drag curl con mancuerna",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "De pie, elevar la mancuerna arrastrándola cerca del cuerpo, codos hacia atrás en lugar de adelante."
  },
  {
    "id": 198,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Bíceps",
    "ejercicio": "Potty Curls en polea",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "Sentado en posición baja, flexionar codos elevando el agarre hacia el pecho desde polea baja."
  },
  {
    "id": 199,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Espalda",
    "ejercicio": "Cruce en polea espalda",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "De pie entre poleas altas, llevar los cables hacia atrás abriendo brazos, enfocando deltoides posterior y espalda alta."
  },
  {
    "id": 200,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Espalda",
    "ejercicio": "Jalón al pecho",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "Sentado, agarre prono en la barra ancha, llevar hacia el pecho contrayendo dorsales y extender controlado."
  },
  {
    "id": 201,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Espalda",
    "ejercicio": "Jalón al pecho a un brazo",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "Sentado o de pie, un brazo lleva el agarre hacia el cuerpo contrayendo dorsal, extender controlado."
  },
  {
    "id": 202,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Espalda",
    "ejercicio": "Jalón al pecho agarre cerrado",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "Sentado con agarre cerrado, llevar la barra/cuerda hacia el pecho y extender brazos con control."
  },
  {
    "id": 203,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Espalda",
    "ejercicio": "Jalón al pecho agarre estrecho",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "Sentado con agarre estrecho en V o similar, llevar hacia el pecho y extender controlado."
  },
  {
    "id": 204,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Espalda",
    "ejercicio": "Jalón al pecho agarre supino",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "Sentado, agarre supino en la barra, llevar hacia el pecho contrayendo dorsales y extender controlado."
  },
  {
    "id": 205,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Espalda",
    "ejercicio": "Jalón al pecho con agarre neutro",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "Sentado con barra de agarre neutro, llevar hacia el pecho contrayendo dorsales y extender."
  },
  {
    "id": 206,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Espalda",
    "ejercicio": "Jalón al pecho con banda elástica",
    "equipamiento": "Banda elástica",
    "tecnica_ejecucion": "Banda anclada en alto, llevar el agarre hacia el pecho contrayendo dorsales y extender controlado."
  },
  {
    "id": 207,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Espalda",
    "ejercicio": "Jalón al pecho en máquina",
    "equipamiento": "Máquina",
    "tecnica_ejecucion": "Sentado en máquina, llevar las manijas hacia el pecho contrayendo dorsales y extender controlado."
  },
  {
    "id": 208,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Espalda",
    "ejercicio": "Jalón al pecho en máquina de discos",
    "equipamiento": "Máquina de discos",
    "tecnica_ejecucion": "Sentado, llevar las manijas hacia el pecho contrayendo dorsales y extender con control."
  },
  {
    "id": 209,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Espalda",
    "ejercicio": "Jalón cruzado en polea a un brazo",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "De pie lateral a la polea alta, llevar el agarre cruzando el cuerpo hacia la cadera opuesta."
  },
  {
    "id": 210,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Espalda",
    "ejercicio": "Pullover en máquina de discos",
    "equipamiento": "Máquina de discos",
    "tecnica_ejecucion": "Sentado, brazos extendidos sobre la cabeza, bajar las manijas hacia el cuerpo contrayendo dorsales."
  },
  {
    "id": 211,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Espalda",
    "ejercicio": "Pullover en polea alta",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "De pie frente a polea alta, brazos extendidos, bajar hacia los muslos contrayendo dorsales."
  },
  {
    "id": 212,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Espalda",
    "ejercicio": "Pullover en polea alta con cuerda",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "De pie con cuerda en polea alta, bajar los brazos extendidos hacia los muslos contrayendo dorsales."
  },
  {
    "id": 213,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Espalda",
    "ejercicio": "Remo a una mano en polea alta",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "De pie o sentado, remar un brazo desde polea alta hacia el cuerpo, contrayendo espalda."
  },
  {
    "id": 214,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Espalda",
    "ejercicio": "Remo alto a una mano en máquina",
    "equipamiento": "Máquina",
    "tecnica_ejecucion": "Sentado, remar un brazo en ángulo alto hacia el torso contrayendo dorsal."
  },
  {
    "id": 215,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Espalda",
    "ejercicio": "Remo alto en máquina de discos",
    "equipamiento": "Máquina de discos",
    "tecnica_ejecucion": "Sentado, remar las manijas en ángulo alto hacia el pecho contrayendo dorsales."
  },
  {
    "id": 216,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Espalda",
    "ejercicio": "Remo bajo en máquina de discos",
    "equipamiento": "Máquina de discos",
    "tecnica_ejecucion": "Sentado, remar las manijas en ángulo bajo hacia el abdomen contrayendo dorsales."
  },
  {
    "id": 217,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Espalda",
    "ejercicio": "Remo con polea agarre abierto",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "Sentado, agarre amplio en la barra, remar hacia el abdomen contrayendo espalda media."
  },
  {
    "id": 218,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Espalda",
    "ejercicio": "Remo con soporte de pecho en máquina",
    "equipamiento": "Máquina",
    "tecnica_ejecucion": "Pecho apoyado, remar las manijas hacia el torso contrayendo dorsales y extender controlado."
  },
  {
    "id": 219,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Espalda",
    "ejercicio": "Remo en T con soporte de pecho (variante 1)",
    "equipamiento": "Máquina T-bar",
    "tecnica_ejecucion": "Pecho apoyado en banco inclinado, remar la barra hacia el torso contrayendo dorsales."
  },
  {
    "id": 220,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Espalda",
    "ejercicio": "Remo en T con soporte de pecho (variante 2)",
    "equipamiento": "Máquina T-bar",
    "tecnica_ejecucion": "Pecho apoyado, remar la barra hacia el abdomen con agarre alterno y retornar controlado."
  },
  {
    "id": 221,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Espalda",
    "ejercicio": "Remo en máquina",
    "equipamiento": "Máquina",
    "tecnica_ejecucion": "Sentado, remar las manijas hacia el abdomen contrayendo dorsales y extender controlado."
  },
  {
    "id": 222,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Espalda",
    "ejercicio": "Remo en máquina de discos agarre...",
    "equipamiento": "Máquina de discos",
    "tecnica_ejecucion": "Sentado, remar las manijas con el agarre especificado hacia el torso y extender."
  },
  {
    "id": 223,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Espalda",
    "ejercicio": "Remo en polea",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "Sentado, remar el agarre hacia el abdomen contrayendo dorsales y extender controlado."
  },
  {
    "id": 224,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Espalda",
    "ejercicio": "Remo en polea a una mano",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "Sentado, remar un brazo hacia la cadera contrayendo dorsal y extender controlado."
  },
  {
    "id": 225,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Espalda",
    "ejercicio": "Remo en polea a una mano con soporte",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "Apoyo de pecho en banco inclinado, remar un brazo desde la polea hacia la cadera."
  },
  {
    "id": 226,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Espalda",
    "ejercicio": "Remo en polea baja a un brazo",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "Sentado o de pie, remar un brazo desde polea baja hacia la cadera contrayendo dorsal."
  },
  {
    "id": 227,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Gemelos",
    "ejercicio": "Elevación de talones a una pierna",
    "equipamiento": "Peso corporal/Mancuerna",
    "tecnica_ejecucion": "De pie en una pierna, elevar el talón contrayendo el gemelo y bajar controlado."
  },
  {
    "id": 228,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Gemelos",
    "ejercicio": "Elevación de talones con barra",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "Barra en la espalda, elevar los talones contrayendo gemelos y bajar controlado."
  },
  {
    "id": 229,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Gemelos",
    "ejercicio": "Elevación de talones con discos",
    "equipamiento": "Disco",
    "tecnica_ejecucion": "Sosteniendo discos, elevar los talones contrayendo gemelos y bajar controlado."
  },
  {
    "id": 230,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Gemelos",
    "ejercicio": "Elevación de talones con mancuerna",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Sosteniendo mancuernas, elevar los talones contrayendo gemelos y bajar controlado."
  },
  {
    "id": 231,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Gemelos",
    "ejercicio": "Elevación de talones con pesa rusa",
    "equipamiento": "Pesa rusa",
    "tecnica_ejecucion": "Sosteniendo la pesa rusa, elevar los talones contrayendo gemelos y bajar controlado."
  },
  {
    "id": 232,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Gemelos",
    "ejercicio": "Elevación de talones en máquina",
    "equipamiento": "Máquina",
    "tecnica_ejecucion": "De pie en la máquina, elevar los talones contrayendo gemelos y bajar controlado bajo el nivel del paso."
  },
  {
    "id": 233,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Gemelos",
    "ejercicio": "Elevación de talones en máquina (variante 2)",
    "equipamiento": "Máquina",
    "tecnica_ejecucion": "De pie en la máquina, elevar los talones contrayendo gemelos con variante de equipo."
  },
  {
    "id": 234,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Gemelos",
    "ejercicio": "Elevación de talones sentado con máquina",
    "equipamiento": "Máquina",
    "tecnica_ejecucion": "Sentado, elevar los talones empujando la plataforma con la punta del pie."
  },
  {
    "id": 235,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Gemelos",
    "ejercicio": "Elevación de talón con una pierna",
    "equipamiento": "Mancuerna/Peso corporal",
    "tecnica_ejecucion": "De pie en una pierna, elevar el talón contrayendo el gemelo y bajar controlado."
  },
  {
    "id": 236,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Gemelos",
    "ejercicio": "Elevación de talón en prensa",
    "equipamiento": "Máquina de prensa",
    "tecnica_ejecucion": "En la plataforma de la prensa, elevar los talones empujando con la punta del pie."
  },
  {
    "id": 237,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Gemelos",
    "ejercicio": "Elevación de talón inclinada en máquina",
    "equipamiento": "Máquina inclinada",
    "tecnica_ejecucion": "En la máquina inclinada, elevar los talones contrayendo gemelos y bajar controlado."
  },
  {
    "id": 238,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Gemelos",
    "ejercicio": "Extensión de gemelos en máquina",
    "equipamiento": "Máquina",
    "tecnica_ejecucion": "Sentado o de pie, extender el tobillo elevando la resistencia y bajar controlado."
  },
  {
    "id": 239,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Gemelos",
    "ejercicio": "Extensión de talones sentado",
    "equipamiento": "Máquina",
    "tecnica_ejecucion": "Sentado, extender los tobillos elevando la resistencia con la punta del pie."
  },
  {
    "id": 240,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Glúteos",
    "ejercicio": "Elevación de cadera con mancuerna",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Acostado, mancuerna sobre la cadera, elevar la cadera contrayendo glúteos y bajar controlado."
  },
  {
    "id": 241,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Glúteos",
    "ejercicio": "Empuje de cadera a una pierna",
    "equipamiento": "Máquina/Peso corporal",
    "tecnica_ejecucion": "Espalda apoyada en banco, una pierna en el suelo, empujar la cadera hacia arriba con la otra pierna."
  },
  {
    "id": 242,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Glúteos",
    "ejercicio": "Empuje de cadera en máquina (variante 1)",
    "equipamiento": "Máquina",
    "tecnica_ejecucion": "Sentado o apoyado en la máquina, empujar la cadera hacia adelante/arriba contrayendo glúteos."
  },
  {
    "id": 243,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Glúteos",
    "ejercicio": "Empuje de cadera en máquina de discos",
    "equipamiento": "Máquina de discos",
    "tecnica_ejecucion": "Apoyado en la máquina, empujar la cadera hacia arriba contra la resistencia del disco."
  },
  {
    "id": 244,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Glúteos",
    "ejercicio": "Empuje de cadera en polea baja",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "De pie inclinado, empujar la cadera hacia adelante contra la resistencia de la polea baja."
  },
  {
    "id": 245,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Glúteos",
    "ejercicio": "Extensión de cadera de pie en máquina",
    "equipamiento": "Máquina",
    "tecnica_ejecucion": "De pie, extender la cadera llevando la pierna hacia atrás contra la resistencia."
  },
  {
    "id": 246,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Glúteos",
    "ejercicio": "Extensión de cadera en Glute Ham",
    "equipamiento": "Máquina GHD",
    "tecnica_ejecucion": "Apoyo en la máquina, extender la cadera elevando el torso y contraer glúteos."
  },
  {
    "id": 247,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Glúteos",
    "ejercicio": "Patada de cable con soporte de pecho",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "Pecho apoyado en banco inclinado, extender la pierna hacia atrás desde la polea baja."
  },
  {
    "id": 248,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Glúteos",
    "ejercicio": "Patada de glúteo en máquina",
    "equipamiento": "Máquina",
    "tecnica_ejecucion": "De pie o apoyado, extender la pierna hacia atrás empujando la plataforma con el glúteo."
  },
  {
    "id": 249,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Glúteos",
    "ejercicio": "Patada de glúteo en polea",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "De pie frente a la polea baja, extender la pierna hacia atrás contrayendo el glúteo."
  },
  {
    "id": 250,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Glúteos",
    "ejercicio": "Patada en máquina de discos",
    "equipamiento": "Máquina de discos",
    "tecnica_ejecucion": "Apoyado en la máquina, extender la pierna hacia atrás contra la resistencia del disco."
  },
  {
    "id": 251,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Glúteos",
    "ejercicio": "Patada inversa a una pierna en máquina",
    "equipamiento": "Máquina",
    "tecnica_ejecucion": "Apoyo en la máquina, extender una pierna hacia atrás y arriba contrayendo el glúteo."
  },
  {
    "id": 252,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Glúteos",
    "ejercicio": "Patada inversa en máquina Smith",
    "equipamiento": "Máquina Smith",
    "tecnica_ejecucion": "Apoyo en banco bajo la barra guiada, extender la pierna hacia atrás contrayendo el glúteo."
  },
  {
    "id": 253,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Glúteos",
    "ejercicio": "Patadas con banda elástica",
    "equipamiento": "Banda elástica",
    "tecnica_ejecucion": "En cuadrupedia con banda en el pie, extender la pierna hacia atrás y arriba contrayendo el glúteo."
  },
  {
    "id": 254,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Glúteos",
    "ejercicio": "Puente de glúteo con mancuerna",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Acostado boca arriba, mancuerna sobre la cadera, elevar la cadera contrayendo glúteos y bajar."
  },
  {
    "id": 255,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Elevación Y con mancuerna",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Inclinado al frente, elevar los brazos en diagonal formando una Y, enfocando deltoides y trapecio."
  },
  {
    "id": 256,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Elevación Y en polea",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "De pie, elevar los cables en diagonal hacia arriba formando una Y."
  },
  {
    "id": 257,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Elevación de Y cruzada con polea",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "De pie, llevar el cable en diagonal hacia arriba cruzando el cuerpo en forma de Y."
  },
  {
    "id": 258,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Elevación frontal con barra",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "De pie, elevar la barra al frente hasta la altura de los hombros con brazos semi-extendidos."
  },
  {
    "id": 259,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Elevación frontal con cuerda",
    "equipamiento": "Polea/Cuerda",
    "tecnica_ejecucion": "De pie, elevar la cuerda al frente hasta altura de hombros controlando el descenso."
  },
  {
    "id": 260,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Elevación frontal con disco",
    "equipamiento": "Disco",
    "tecnica_ejecucion": "De pie sujetando el disco con ambas manos, elevar al frente hasta altura de hombros."
  },
  {
    "id": 261,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Elevación frontal con mancuerna",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "De pie, elevar una o ambas mancuernas al frente hasta altura de hombros y bajar controlado."
  },
  {
    "id": 262,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Elevación frontal en polea",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "De pie de espaldas a la polea baja, elevar el cable al frente hasta altura de hombros."
  },
  {
    "id": 263,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Elevación lateral con banda elástica",
    "equipamiento": "Banda elástica",
    "tecnica_ejecucion": "De pie sobre la banda, elevar los brazos lateralmente hasta altura de hombros."
  },
  {
    "id": 264,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Elevación lateral en polea por delante",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "De pie lateral a la polea baja, elevar el brazo cruzando ligeramente al frente del cuerpo."
  },
  {
    "id": 265,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Elevación lateral inclinado",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Inclinado lateralmente apoyado en banco, elevar la mancuerna lateralmente con brazo semi-extendido."
  },
  {
    "id": 266,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Face pull con banda elástica",
    "equipamiento": "Banda elástica",
    "tecnica_ejecucion": "De pie, tirar la banda hacia la cara separando los codos, contrayendo deltoides posterior."
  },
  {
    "id": 267,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Jalón a la cara en polea",
    "equipamiento": "Polea/Cuerda",
    "tecnica_ejecucion": "De pie, tirar la cuerda hacia la cara separando los codos hacia afuera, contrayendo deltoides posterior."
  },
  {
    "id": 268,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Press Landmine",
    "equipamiento": "Barra/Landmine",
    "tecnica_ejecucion": "De pie o de rodillas, empujar el extremo de la barra anclada hacia arriba y al frente."
  },
  {
    "id": 269,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Press Landmine a un brazo",
    "equipamiento": "Barra/Landmine",
    "tecnica_ejecucion": "De pie, empujar el extremo de la barra con un brazo hacia arriba y al frente."
  },
  {
    "id": 270,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Press de hombro en máquina",
    "equipamiento": "Máquina",
    "tecnica_ejecucion": "Sentado, empujar las manijas hacia arriba extendiendo brazos y bajar controlado."
  },
  {
    "id": 271,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Press de hombros en máquina de discos",
    "equipamiento": "Máquina de discos",
    "tecnica_ejecucion": "Sentado, empujar las manijas hacia arriba extendiendo brazos y bajar con control."
  },
  {
    "id": 272,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Vuelo lateral con mancuerna",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "De pie, elevar las mancuernas lateralmente hasta la altura de los hombros y bajar controlado."
  },
  {
    "id": 273,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Vuelo lateral en máquina",
    "equipamiento": "Máquina",
    "tecnica_ejecucion": "Sentado, elevar los brazos lateralmente empujando las almohadillas hasta altura de hombros."
  },
  {
    "id": 274,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Vuelo lateral en máquina de discos",
    "equipamiento": "Máquina de discos",
    "tecnica_ejecucion": "Sentado, elevar los brazos lateralmente contra la resistencia del disco hasta altura de hombros."
  },
  {
    "id": 275,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Vuelo lateral en polea",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "De pie lateral a la polea baja, elevar el brazo lateralmente hasta altura de hombro."
  },
  {
    "id": 276,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Vuelo lateral inclinado",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Inclinado lateralmente sobre banco, elevar la mancuerna lateralmente con brazo semi-extendido."
  },
  {
    "id": 277,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Vuelo lateral sentado",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Sentado, elevar las mancuernas lateralmente hasta altura de hombros y bajar controlado."
  },
  {
    "id": 278,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Vuelo posterior en máquina",
    "equipamiento": "Máquina",
    "tecnica_ejecucion": "Sentado de frente al respaldo, abrir los brazos lateralmente contrayendo deltoides posterior."
  },
  {
    "id": 279,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Vuelo posterior en polea",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "De pie inclinado, llevar los cables hacia atrás y afuera enfocando deltoides posterior."
  },
  {
    "id": 280,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Vuelo posterior en polea cruzada",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "De pie, cruzar los cables y abrir los brazos hacia atrás y afuera contrayendo deltoides posterior."
  },
  {
    "id": 281,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Vuelo posterior parado",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "De pie inclinado al frente, elevar las mancuernas lateralmente hacia atrás contrayendo deltoides posterior."
  },
  {
    "id": 282,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Hombros",
    "ejercicio": "Vuelo posterior sentado",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Sentado inclinado al frente, elevar las mancuernas lateralmente contrayendo deltoides posterior."
  },
  {
    "id": 283,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Isquiotibiales",
    "ejercicio": "Curl de isquiotibiales acostado",
    "equipamiento": "Máquina",
    "tecnica_ejecucion": "Acostado boca abajo, flexionar las rodillas elevando el rodillo hacia los glúteos y bajar controlado."
  },
  {
    "id": 284,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Isquiotibiales",
    "ejercicio": "Curl de pierna parado en máquina",
    "equipamiento": "Máquina",
    "tecnica_ejecucion": "De pie, flexionar la rodilla de una pierna elevando el rodillo hacia el glúteo."
  },
  {
    "id": 285,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Isquiotibiales",
    "ejercicio": "Curl de pierna sentado",
    "equipamiento": "Máquina",
    "tecnica_ejecucion": "Sentado, flexionar las rodillas llevando el rodillo hacia abajo/atrás y extender controlado."
  },
  {
    "id": 286,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Isquiotibiales",
    "ejercicio": "Curl sentado a una pierna",
    "equipamiento": "Máquina",
    "tecnica_ejecucion": "Sentado, flexionar la rodilla de una pierna llevando el rodillo hacia abajo y extender."
  },
  {
    "id": 287,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Isquiotibiales",
    "ejercicio": "Rizo de isquiotibiales con una pierna",
    "equipamiento": "Máquina",
    "tecnica_ejecucion": "Acostado o de pie, flexionar la rodilla de una pierna llevando el rodillo hacia el glúteo."
  },
  {
    "id": 288,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Apertura con mancuernas",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Acostado en banco, brazos extendidos hacia arriba con leve flexión de codo. Bajar en arco lateral y juntar arriba."
  },
  {
    "id": 289,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Apertura con polea baja",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "De pie frente a poleas bajas, llevar los agarres hacia arriba y al centro en arco, sintiendo estiramiento pectoral."
  },
  {
    "id": 290,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Apertura en cable sentado",
    "equipamiento": "Cable/Polea",
    "tecnica_ejecucion": "Sentado, llevar los cables desde posición abierta hacia el centro del pecho en movimiento de arco controlado."
  },
  {
    "id": 291,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Apertura en máquina",
    "equipamiento": "Máquina",
    "tecnica_ejecucion": "Sentado en máquina de aperturas, juntar los brazos al frente del pecho y retornar controladamente."
  },
  {
    "id": 292,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Apertura en máquina con brazos altos",
    "equipamiento": "Máquina",
    "tecnica_ejecucion": "Sentado, codos a la altura de hombros, juntar los brazos al frente enfatizando pectoral superior."
  },
  {
    "id": 293,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Apertura en polea media",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "De pie entre poleas a altura media, llevar manos al frente en arco y volver a la posición abierta."
  },
  {
    "id": 294,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Apertura inclinada",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "En banco inclinado, brazos extendidos hacia arriba, bajar en arco lateral y juntar mancuernas arriba."
  },
  {
    "id": 295,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Cruce en polea",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "De pie entre poleas altas, cruzar los cables hacia abajo y al frente del cuerpo, juntando manos."
  },
  {
    "id": 296,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Cruce en polea banco inclinado",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "Acostado en banco inclinado entre poleas bajas, cruzar los cables hacia arriba juntando manos sobre el pecho."
  },
  {
    "id": 297,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Cruce en polea banco plano",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "Acostado en banco plano entre poleas, cruzar los cables hacia el centro del pecho y retornar controlado."
  },
  {
    "id": 298,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Flexión de brazos con banda elástica",
    "equipamiento": "Peso corporal/Banda",
    "tecnica_ejecucion": "Banda cruzada en la espalda alta sujeta con manos. Bajar el pecho hacia el suelo manteniendo cuerpo recto, extender brazos con resistencia añadida."
  },
  {
    "id": 299,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Press Svend inclinado",
    "equipamiento": "Disco",
    "tecnica_ejecucion": "En banco inclinado, sujetar un disco entre las manos a la altura del pecho y empujar arriba presionando las palmas."
  },
  {
    "id": 300,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Press banca declinado en máquina",
    "equipamiento": "Máquina",
    "tecnica_ejecucion": "Sentado en máquina declinada, empujar las manijas hacia adelante/abajo extendiendo brazos y retornar controlado."
  },
  {
    "id": 301,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Press banca inclinado con polea",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "Banco inclinado bajo poleas, presionar los agarres hacia adelante y arriba juntando al final del recorrido."
  },
  {
    "id": 302,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Press banca inclinado en máquina",
    "equipamiento": "Máquina",
    "tecnica_ejecucion": "Sentado en máquina inclinada, empujar las manijas hacia arriba extendiendo brazos y volver con control."
  },
  {
    "id": 303,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Press de banca en polea",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "De pie o sentado frente a poleas bajas, empujar ambos agarres adelante extendiendo brazos a la altura del pecho."
  },
  {
    "id": 304,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Press de contracción",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Acostado, brazos extendidos sobre el pecho con mancuernas juntas, bajar en arco lateral y volver a juntar arriba."
  },
  {
    "id": 305,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Press de contracción inclinado",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "En banco inclinado, brazos extendidos arriba, bajar en arco lateral y juntar mancuernas en la parte alta."
  },
  {
    "id": 306,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Press de pecho en el suelo",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Acostado en el suelo, codos tocan el piso al bajar, empujar mancuernas hasta extender brazos."
  },
  {
    "id": 307,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Press de pecho en polea a un brazo",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "De pie lateral a la polea, empujar un brazo al frente extendiendo codo, rotar torso mínimamente."
  },
  {
    "id": 308,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Press declinado con mancuernas",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "En banco declinado, bajar mancuernas a los lados del pecho inferior y empujar hasta extensión completa."
  },
  {
    "id": 309,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Press declinado en máquina de discos",
    "equipamiento": "Máquina de discos",
    "tecnica_ejecucion": "Sentado en máquina declinada con disco, empujar las manijas hacia adelante y abajo, retornar controlado."
  },
  {
    "id": 310,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Press en máquina de discos",
    "equipamiento": "Máquina de discos",
    "tecnica_ejecucion": "Sentado, empujar las manijas hacia adelante extendiendo brazos a la altura del pecho, volver controlado."
  },
  {
    "id": 311,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Press horizontal en máquina de discos",
    "equipamiento": "Máquina de discos",
    "tecnica_ejecucion": "Sentado en máquina horizontal con disco, empujar manijas al frente extendiendo brazos y retornar."
  },
  {
    "id": 312,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Press inclinado en máquina de discos",
    "equipamiento": "Máquina de discos",
    "tecnica_ejecucion": "Sentado en máquina inclinada con disco, empujar manijas hacia arriba y adelante, volver con control."
  },
  {
    "id": 313,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Press pecho en máquina",
    "equipamiento": "Máquina",
    "tecnica_ejecucion": "Sentado, espalda apoyada, empujar las manijas al frente extendiendo brazos y retornar controlado."
  },
  {
    "id": 314,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Press pecho inclinado en máquina",
    "equipamiento": "Máquina",
    "tecnica_ejecucion": "Sentado en máquina inclinada, empujar manijas hacia arriba/adelante y volver con control."
  },
  {
    "id": 315,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Pullover con mancuerna",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Acostado en banco, mancuerna sobre el pecho con brazos extendidos, bajar detrás de la cabeza y volver."
  },
  {
    "id": 316,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Cluster",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "Serie de cleans individuales con descanso breve entre repeticiones, reseteando posición cada vez."
  },
  {
    "id": 317,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Extensión a una pierna con discos",
    "equipamiento": "Máquina de discos",
    "tecnica_ejecucion": "Sentado, extender la rodilla de una pierna elevando el disco y bajar controlado."
  },
  {
    "id": 318,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Extensión a una pierna en máquina",
    "equipamiento": "Máquina",
    "tecnica_ejecucion": "Sentado, extender la rodilla de una pierna elevando la resistencia y bajar controlado."
  },
  {
    "id": 319,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Extensión de piernas",
    "equipamiento": "Máquina de extensión",
    "tecnica_ejecucion": "Sentado, extender ambas rodillas elevando la resistencia y bajar controlado."
  },
  {
    "id": 320,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Extensión de piernas con discos",
    "equipamiento": "Máquina de discos",
    "tecnica_ejecucion": "Sentado, extender las rodillas elevando el peso y bajar controlado."
  },
  {
    "id": 321,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Press de pierna en máquina",
    "equipamiento": "Máquina de prensa",
    "tecnica_ejecucion": "Sentado, empujar la plataforma con ambas piernas extendiendo rodillas y bajar controlado."
  },
  {
    "id": 322,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Remo (ergómetro)",
    "equipamiento": "Máquina de remo",
    "tecnica_ejecucion": "Sentado, empujar con piernas, luego tirar con brazos hacia el abdomen en secuencia coordinada."
  },
  {
    "id": 323,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Step up con cable",
    "equipamiento": "Polea/Cable",
    "tecnica_ejecucion": "Resistencia desde la polea, subir a un cajón con una pierna y bajar controlado."
  },
  {
    "id": 324,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Trapecio",
    "ejercicio": "Caminata de granjero",
    "equipamiento": "Mancuerna/Pesa rusa",
    "tecnica_ejecucion": "Sujetar cargas pesadas a los lados y caminar manteniendo postura erguida y hombros estables."
  },
  {
    "id": 325,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Trapecio",
    "ejercicio": "Encogimiento de hombro en polea",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "De pie, elevar los hombros hacia las orejas sosteniendo el agarre de la polea y bajar controlado."
  },
  {
    "id": 326,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Trapecio",
    "ejercicio": "Encogimiento de hombro inclinado",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Inclinado al frente, elevar los hombros hacia arriba sosteniendo mancuernas y bajar controlado."
  },
  {
    "id": 327,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Trapecio",
    "ejercicio": "Encogimiento de hombros con barra (variante 1)",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "De pie, elevar los hombros hacia las orejas sosteniendo la barra y bajar controlado."
  },
  {
    "id": 328,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Trapecio",
    "ejercicio": "Encogimiento de hombros con mancuerna (variante 2)",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "De pie, elevar los hombros hacia las orejas sosteniendo mancuernas y bajar controlado."
  },
  {
    "id": 329,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Trapecio",
    "ejercicio": "Encogimiento de hombros con... (variante 3)",
    "equipamiento": "Pesa rusa/Equipo",
    "tecnica_ejecucion": "De pie, elevar los hombros hacia las orejas con la carga indicada y bajar controlado."
  },
  {
    "id": 330,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Trapecio",
    "ejercicio": "Encogimiento de hombros con... (variante 4)",
    "equipamiento": "Equipo variable",
    "tecnica_ejecucion": "De pie, elevar los hombros hacia las orejas con el equipo indicado y bajar controlado."
  },
  {
    "id": 331,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Trapecio",
    "ejercicio": "Encogimiento de hombros en máquina",
    "equipamiento": "Máquina",
    "tecnica_ejecucion": "Sentado o de pie en la máquina, elevar los hombros hacia las orejas y bajar controlado."
  },
  {
    "id": 332,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Trapecio",
    "ejercicio": "Jalón al cuello con barra",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "De pie, elevar la barra desde la cadera hasta la altura del cuello con codos altos."
  },
  {
    "id": 333,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Trapecio",
    "ejercicio": "Jalón al cuello con mancuerna",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "De pie, elevar las mancuernas desde la cadera hasta el cuello con codos liderando el movimiento."
  },
  {
    "id": 334,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Trapecio",
    "ejercicio": "Jalón al cuello en máquina Smith",
    "equipamiento": "Máquina Smith",
    "tecnica_ejecucion": "De pie bajo la barra guiada, elevar hasta el cuello con codos altos y bajar controlado."
  },
  {
    "id": 335,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Trapecio",
    "ejercicio": "Jalón al cuello en polea",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "De pie frente a la polea baja, elevar el agarre hasta el cuello con codos altos."
  },
  {
    "id": 336,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Trapecio",
    "ejercicio": "Tirón alto con banda elástica",
    "equipamiento": "Banda elástica",
    "tecnica_ejecucion": "De pie sobre la banda, tirar explosivamente hacia el cuello con codos altos."
  },
  {
    "id": 337,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Tríceps",
    "ejercicio": "Extension de triceps polea alta... (variante)",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "De pie frente a polea alta, extender los codos hacia abajo con variante de agarre o ángulo."
  },
  {
    "id": 338,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Tríceps",
    "ejercicio": "Extensión de tríceps a una mano",
    "equipamiento": "Mancuerna/Polea",
    "tecnica_ejecucion": "Brazo elevado o desde polea, extender el codo hacia arriba o abajo de forma unilateral."
  },
  {
    "id": 339,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Tríceps",
    "ejercicio": "Extensión de tríceps agarre supino",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "De pie frente a la polea, agarre supino, extender los codos hacia abajo."
  },
  {
    "id": 340,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Tríceps",
    "ejercicio": "Extensión de tríceps con banda elástica",
    "equipamiento": "Banda elástica",
    "tecnica_ejecucion": "De pie, banda anclada en alto, extender el codo hacia abajo o atrás."
  },
  {
    "id": 341,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Tríceps",
    "ejercicio": "Extensión de tríceps con barra",
    "equipamiento": "Barra/Polea",
    "tecnica_ejecucion": "De pie frente a la polea con barra recta, extender los codos hacia abajo."
  },
  {
    "id": 342,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Tríceps",
    "ejercicio": "Extensión de tríceps con cuerda",
    "equipamiento": "Polea/Cuerda",
    "tecnica_ejecucion": "De pie frente a polea alta, extender los codos hacia abajo separando la cuerda al final."
  },
  {
    "id": 343,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Tríceps",
    "ejercicio": "Extensión de tríceps con mancuerna",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "De pie o sentado, mancuerna detrás de la cabeza, extender el codo hacia arriba y bajar controlado."
  },
  {
    "id": 344,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Tríceps",
    "ejercicio": "Extensión de tríceps cruzada con cable",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "De pie lateral a la polea, extender el brazo cruzando el cuerpo hacia abajo."
  },
  {
    "id": 345,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Tríceps",
    "ejercicio": "Extensión de tríceps en máquina",
    "equipamiento": "Máquina",
    "tecnica_ejecucion": "Sentado, extender los codos empujando las manijas hacia abajo o adelante."
  },
  {
    "id": 346,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Tríceps",
    "ejercicio": "Extensión de tríceps en polea (variante 1)",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "De pie frente a la polea alta, extender los codos hacia abajo con el agarre indicado."
  },
  {
    "id": 347,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Tríceps",
    "ejercicio": "Extensión de tríceps en polea alta",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "De pie frente a polea alta, extender los codos hacia abajo manteniendo codos fijos al torso."
  },
  {
    "id": 348,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Tríceps",
    "ejercicio": "Extensión de tríceps polea alta (variante)",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "De pie frente a polea alta, extender codos hacia abajo con variante de agarre."
  },
  {
    "id": 349,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Tríceps",
    "ejercicio": "Extensión de tríceps tras nuca (variante 3)",
    "equipamiento": "Mancuerna/Barra",
    "tecnica_ejecucion": "Ambos brazos detrás de la cabeza, extender los codos hacia arriba y bajar controlado."
  },
  {
    "id": 350,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Tríceps",
    "ejercicio": "Extensión de tríceps tras nuca (variante)",
    "equipamiento": "Mancuerna/Barra",
    "tecnica_ejecucion": "Brazos detrás de la cabeza, extender los codos hacia arriba simultáneamente."
  },
  {
    "id": 351,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Tríceps",
    "ejercicio": "Extensión de tríceps tras nuca a un brazo (variante 1)",
    "equipamiento": "Mancuerna/Polea",
    "tecnica_ejecucion": "Brazo elevado, extender el codo detrás de la cabeza de forma unilateral y bajar controlado."
  },
  {
    "id": 352,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Tríceps",
    "ejercicio": "Extensión de tríceps tras nuca a un brazo (variante 2)",
    "equipamiento": "Mancuerna/Polea",
    "tecnica_ejecucion": "Brazo elevado, extender el codo detrás de la cabeza con variante de agarre o equipo."
  },
  {
    "id": 353,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Tríceps",
    "ejercicio": "Extensión de tríceps tras nuca a un brazo (variante)",
    "equipamiento": "Mancuerna/Polea",
    "tecnica_ejecucion": "Brazo elevado detrás de la cabeza, extender el codo de forma unilateral."
  },
  {
    "id": 354,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Tríceps",
    "ejercicio": "Extensión en polea con barra V",
    "equipamiento": "Polea/Barra V",
    "tecnica_ejecucion": "De pie frente a la polea con barra en V, extender los codos hacia abajo."
  },
  {
    "id": 355,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Tríceps",
    "ejercicio": "Extensión tríceps sobre cabeza (variante)",
    "equipamiento": "Mancuerna/Polea",
    "tecnica_ejecucion": "Brazos extendidos sobre la cabeza, flexionar codos bajando el peso atrás y extender de vuelta."
  },
  {
    "id": 356,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Tríceps",
    "ejercicio": "Fondo de tríceps en máquina",
    "equipamiento": "Máquina",
    "tecnica_ejecucion": "Sentado, empujar las manijas hacia abajo extendiendo los codos."
  },
  {
    "id": 357,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Tríceps",
    "ejercicio": "Fondo de tríceps en máquina (variante)",
    "equipamiento": "Máquina",
    "tecnica_ejecucion": "Sentado, empujar las manijas hacia abajo extendiendo los codos."
  },
  {
    "id": 358,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Tríceps",
    "ejercicio": "Fondo en máquina de discos",
    "equipamiento": "Máquina de discos",
    "tecnica_ejecucion": "Sentado, empujar las manijas hacia abajo extendiendo los codos contra la resistencia del disco."
  },
  {
    "id": 359,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Tríceps",
    "ejercicio": "Patada de tríceps con mancuerna",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Inclinado al frente, brazo paralelo al torso, extender el codo hacia atrás y flexionar de vuelta."
  },
  {
    "id": 360,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Tríceps",
    "ejercicio": "Patada de tríceps en polea",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "Inclinado al frente, brazo paralelo al torso, extender el codo hacia atrás desde la polea baja."
  },
  {
    "id": 361,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Tríceps",
    "ejercicio": "Press Tate con mancuernas",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Acostado, codos fijos a 90°, empujar las mancuernas extendiendo codos hacia arriba."
  },
  {
    "id": 362,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Tríceps",
    "ejercicio": "Press de banca cerrado en máquina",
    "equipamiento": "Máquina",
    "tecnica_ejecucion": "Sentado o acostado, agarre estrecho, empujar las manijas extendiendo brazos."
  },
  {
    "id": 363,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Tríceps",
    "ejercicio": "Skullcrusher con barra Z",
    "equipamiento": "Barra Z",
    "tecnica_ejecucion": "Acostado, brazos extendidos sobre el pecho, flexionar codos bajando la barra hacia la frente y extender."
  },
  {
    "id": 364,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Tríceps",
    "ejercicio": "Skullcrusher con mancuerna",
    "equipamiento": "Mancuerna",
    "tecnica_ejecucion": "Acostado, brazos extendidos, flexionar codos bajando las mancuernas hacia la frente y extender."
  },
  {
    "id": 365,
    "target_group": "HIPERTROFIA",
    "grupo_muscular": "Tríceps",
    "ejercicio": "Skullcrusher de cable",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "Acostado bajo la polea, flexionar codos bajando el agarre hacia la frente y extender."
  },
  {
    "id": 366,
    "target_group": "RESIST_MUSCULAR",
    "grupo_muscular": "Bíceps",
    "ejercicio": "Curl de bíceps con TRX",
    "equipamiento": "TRX",
    "tecnica_ejecucion": "Inclinado hacia atrás sujeto a las cintas, flexionar codos llevando el cuerpo hacia las manos."
  },
  {
    "id": 367,
    "target_group": "RESIST_MUSCULAR",
    "grupo_muscular": "Espalda",
    "ejercicio": "Dominada Asistida",
    "equipamiento": "Máquina asistida",
    "tecnica_ejecucion": "Apoyo de rodillas o pies en la plataforma asistida, subir hasta mentón sobre la barra y bajar controlado."
  },
  {
    "id": 368,
    "target_group": "RESIST_MUSCULAR",
    "grupo_muscular": "Espalda",
    "ejercicio": "Dominada agarre supino con banda",
    "equipamiento": "Banda/Barra fija",
    "tecnica_ejecucion": "Banda asiste el peso, agarre supino, subir hasta que el mentón pase la barra y bajar controlado."
  },
  {
    "id": 369,
    "target_group": "RESIST_MUSCULAR",
    "grupo_muscular": "Espalda",
    "ejercicio": "Dominada asistida agarre amplio",
    "equipamiento": "Máquina asistida",
    "tecnica_ejecucion": "Agarre amplio en la barra, asistencia de la máquina, subir hasta mentón sobre barra y bajar controlado."
  },
  {
    "id": 370,
    "target_group": "RESIST_MUSCULAR",
    "grupo_muscular": "Espalda",
    "ejercicio": "Dominada con banda elástica",
    "equipamiento": "Banda/Barra fija",
    "tecnica_ejecucion": "Banda anclada bajo el pie o rodilla para asistir, subir hasta mentón sobre barra y bajar controlado."
  },
  {
    "id": 371,
    "target_group": "RESIST_MUSCULAR",
    "grupo_muscular": "Espalda",
    "ejercicio": "Dominadas asistidas con agarre...",
    "equipamiento": "Máquina asistida",
    "tecnica_ejecucion": "Apoyo en plataforma asistida con agarre especificado, subir hasta mentón sobre barra y bajar controlado."
  },
  {
    "id": 372,
    "target_group": "RESIST_MUSCULAR",
    "grupo_muscular": "Espalda",
    "ejercicio": "Remo a un brazo de pie con banda",
    "equipamiento": "Banda elástica",
    "tecnica_ejecucion": "De pie, banda anclada al frente, remar un brazo hacia la cadera contrayendo dorsal y retornar."
  },
  {
    "id": 373,
    "target_group": "RESIST_MUSCULAR",
    "grupo_muscular": "Espalda",
    "ejercicio": "Remo inclinado con banda elástica",
    "equipamiento": "Banda elástica",
    "tecnica_ejecucion": "Inclinado al frente, banda bajo los pies, remar ambos brazos hacia la cadera y retornar."
  },
  {
    "id": 374,
    "target_group": "RESIST_MUSCULAR",
    "grupo_muscular": "Espalda",
    "ejercicio": "Remo invertido",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Colgado bajo una barra fija, cuerpo recto, llevar el pecho hacia la barra flexionando codos."
  },
  {
    "id": 375,
    "target_group": "RESIST_MUSCULAR",
    "grupo_muscular": "Espalda",
    "ejercicio": "Remo invertido agarre supino",
    "equipamiento": "Peso corporal/TRX",
    "tecnica_ejecucion": "Colgado con agarre supino, llevar el pecho hacia las manos flexionando codos."
  },
  {
    "id": 376,
    "target_group": "RESIST_MUSCULAR",
    "grupo_muscular": "Espalda",
    "ejercicio": "TRX Remo invertido",
    "equipamiento": "TRX",
    "tecnica_ejecucion": "Cuerpo inclinado sujeto a las cintas, llevar el pecho hacia las manos flexionando codos y bajar controlado."
  },
  {
    "id": 377,
    "target_group": "RESIST_MUSCULAR",
    "grupo_muscular": "Gemelos",
    "ejercicio": "Elevación de talones",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "De pie, elevar los talones contrayendo gemelos y bajar controlado bajo el nivel del suelo."
  },
  {
    "id": 378,
    "target_group": "RESIST_MUSCULAR",
    "grupo_muscular": "Glúteos",
    "ejercicio": "Puente de glúteos a una pierna",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Acostado boca arriba, una pierna extendida, elevar la cadera con la pierna de apoyo y bajar."
  },
  {
    "id": 379,
    "target_group": "RESIST_MUSCULAR",
    "grupo_muscular": "Glúteos",
    "ejercicio": "Puente de glúteos a una pierna (variante)",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Variante del puente a una pierna, ajustando posición de pies o rango de movimiento."
  },
  {
    "id": 380,
    "target_group": "RESIST_MUSCULAR",
    "grupo_muscular": "Hombros",
    "ejercicio": "Círculos con los brazos",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "De pie, brazos extendidos lateralmente, realizar círculos controlados en ambas direcciones."
  },
  {
    "id": 381,
    "target_group": "RESIST_MUSCULAR",
    "grupo_muscular": "Hombros",
    "ejercicio": "Flexión para hombros",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Posición de pike (cadera elevada), flexionar codos bajando la cabeza hacia el suelo y empujar arriba."
  },
  {
    "id": 382,
    "target_group": "RESIST_MUSCULAR",
    "grupo_muscular": "Hombros",
    "ejercicio": "Press militar con banda elástica",
    "equipamiento": "Banda elástica",
    "tecnica_ejecucion": "De pie sobre la banda, empujar los agarres desde los hombros hacia arriba extendiendo brazos."
  },
  {
    "id": 383,
    "target_group": "RESIST_MUSCULAR",
    "grupo_muscular": "Hombros",
    "ejercicio": "Vuelo posterior con TRX",
    "equipamiento": "TRX",
    "tecnica_ejecucion": "Sujeto a las cintas inclinado atrás, abrir los brazos lateralmente contrayendo deltoides posterior."
  },
  {
    "id": 384,
    "target_group": "RESIST_MUSCULAR",
    "grupo_muscular": "Isquiotibiales",
    "ejercicio": "Buenos días con banda elástica",
    "equipamiento": "Banda elástica",
    "tecnica_ejecucion": "Banda en la espalda alta, inclinar el torso al frente con leve flexión de rodilla y volver."
  },
  {
    "id": 385,
    "target_group": "RESIST_MUSCULAR",
    "grupo_muscular": "Isquiotibiales",
    "ejercicio": "Peso muerto con banda elástica",
    "equipamiento": "Banda elástica",
    "tecnica_ejecucion": "De pie sobre la banda, bajar inclinando el torso con leve flexión de rodilla y subir extendiendo cadera."
  },
  {
    "id": 386,
    "target_group": "RESIST_MUSCULAR",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Flexiones inclinado",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Manos sobre banco o superficie elevada, pies en el suelo. Bajar pecho hacia el banco y extender brazos."
  },
  {
    "id": 387,
    "target_group": "RESIST_MUSCULAR",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Flexión cerrada",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Manos juntas o muy cerca bajo el pecho, bajar el torso flexionando codos pegados al cuerpo."
  },
  {
    "id": 388,
    "target_group": "RESIST_MUSCULAR",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Flexión de brazos",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Manos a la altura de los hombros, cuerpo recto. Bajar el pecho hacia el suelo y empujar hasta extender brazos."
  },
  {
    "id": 389,
    "target_group": "RESIST_MUSCULAR",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Flexión de brazos de rodillas",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Apoyo en rodillas y manos, cuerpo alineado desde rodillas a cabeza. Bajar pecho hacia el suelo y empujar de vuelta sin perder la alineación."
  },
  {
    "id": 390,
    "target_group": "RESIST_MUSCULAR",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Flexión de brazos declinada",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Pies elevados sobre banco, manos en el suelo. Bajar el pecho controladamente y extender brazos enfatizando pectoral superior."
  },
  {
    "id": 391,
    "target_group": "RESIST_MUSCULAR",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Flexión diamante",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Manos juntas formando un diamante bajo el pecho. Bajar el torso y empujar, enfocando tríceps y pectoral interno."
  },
  {
    "id": 392,
    "target_group": "RESIST_MUSCULAR",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Fondo de pecho",
    "equipamiento": "Peso corporal/Paralelas",
    "tecnica_ejecucion": "Sujeto en paralelas, inclinar torso adelante. Bajar controladamente flexionando codos y empujar de vuelta arriba."
  },
  {
    "id": 393,
    "target_group": "RESIST_MUSCULAR",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Press de pecho con TRX",
    "equipamiento": "TRX",
    "tecnica_ejecucion": "Sujeto a las cintas inclinado hacia adelante, bajar el pecho entre las manos y empujar de vuelta extendiendo brazos."
  },
  {
    "id": 394,
    "target_group": "RESIST_MUSCULAR",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Press de pecho de pie con banda",
    "equipamiento": "Banda elástica",
    "tecnica_ejecucion": "De pie con banda anclada atrás, empujar ambos brazos al frente extendiendo codos y volver con control."
  },
  {
    "id": 395,
    "target_group": "RESIST_MUSCULAR",
    "grupo_muscular": "Pectorales",
    "ejercicio": "Press de pecho inclinado de pie",
    "equipamiento": "Banda elástica/Polea",
    "tecnica_ejecucion": "De pie con resistencia anclada baja, empujar diagonalmente hacia arriba extendiendo el brazo."
  },
  {
    "id": 396,
    "target_group": "RESIST_MUSCULAR",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Sentadilla Sissy",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Talones elevados o sujetos, inclinar el torso atrás flexionando rodillas hacia adelante."
  },
  {
    "id": 397,
    "target_group": "RESIST_MUSCULAR",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Sentadilla búlgara con banda elástica",
    "equipamiento": "Banda elástica/Peso corporal",
    "tecnica_ejecucion": "Pie trasero elevado, banda como resistencia, bajar flexionando la pierna delantera."
  },
  {
    "id": 398,
    "target_group": "RESIST_MUSCULAR",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Sentadilla con pausa (peso corporal)",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Bajar a sentadilla y mantener una pausa en el punto más bajo antes de subir."
  },
  {
    "id": 399,
    "target_group": "RESIST_MUSCULAR",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Sentadilla en la pared",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Espalda apoyada en la pared, bajar a posición de sentadilla isométrica y mantener."
  },
  {
    "id": 400,
    "target_group": "RESIST_MUSCULAR",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Sentadilla pistol con TRX",
    "equipamiento": "TRX/Peso corporal",
    "tecnica_ejecucion": "Sujeto a las cintas para asistencia, bajar en sentadilla a una pierna y subir extendiendo."
  },
  {
    "id": 401,
    "target_group": "RESIST_MUSCULAR",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Sentadilla sin peso",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Bajar en sentadilla controlando la profundidad y subir extendiendo rodillas sin carga externa."
  },
  {
    "id": 402,
    "target_group": "RESIST_MUSCULAR",
    "grupo_muscular": "Tríceps",
    "ejercicio": "Extensión de tríceps con TRX",
    "equipamiento": "TRX",
    "tecnica_ejecucion": "Inclinado hacia adelante sujeto a las cintas, extender los codos empujando el cuerpo hacia arriba."
  },
  {
    "id": 403,
    "target_group": "RESIST_MUSCULAR",
    "grupo_muscular": "Tríceps",
    "ejercicio": "Extensión de tríceps en el suelo",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Posición de plancha, bajar el cuerpo flexionando codos pegados y empujar extendiendo brazos."
  },
  {
    "id": 404,
    "target_group": "RESIST_MUSCULAR",
    "grupo_muscular": "Tríceps",
    "ejercicio": "Fondo asistido",
    "equipamiento": "Máquina asistida",
    "tecnica_ejecucion": "Apoyo en plataforma asistida, bajar el cuerpo flexionando codos y empujar hasta extender brazos."
  },
  {
    "id": 405,
    "target_group": "RESIST_MUSCULAR",
    "grupo_muscular": "Tríceps",
    "ejercicio": "Fondo asistido (variante)",
    "equipamiento": "Máquina asistida",
    "tecnica_ejecucion": "Apoyo asistido, bajar el cuerpo flexionando codos y empujar hasta extender brazos."
  },
  {
    "id": 406,
    "target_group": "RESIST_MUSCULAR",
    "grupo_muscular": "Tríceps",
    "ejercicio": "Fondo en banco",
    "equipamiento": "Peso corporal/Banco",
    "tecnica_ejecucion": "Manos en el borde del banco, piernas extendidas, bajar el cuerpo flexionando codos y empujar arriba."
  },
  {
    "id": 407,
    "target_group": "RESIST_MUSCULAR",
    "grupo_muscular": "Tríceps",
    "ejercicio": "Fondos de tríceps",
    "equipamiento": "Peso corporal/Paralelas",
    "tecnica_ejecucion": "En paralelas, bajar el cuerpo flexionando codos pegados al torso y empujar hasta extender brazos."
  },
  {
    "id": 408,
    "target_group": "CORE",
    "grupo_muscular": "Core/Abdomen",
    "ejercicio": "Crunch declinado oblicuo",
    "equipamiento": "Peso corporal/Banco declinado",
    "tecnica_ejecucion": "En banco declinado, flexionar el torso rotando hacia un lado en cada repetición."
  },
  {
    "id": 409,
    "target_group": "CORE",
    "grupo_muscular": "Core/Abdomen",
    "ejercicio": "Crunch en máquina",
    "equipamiento": "Máquina",
    "tecnica_ejecucion": "Sentado en la máquina, flexionar el torso contrayendo el abdomen y volver controlado."
  },
  {
    "id": 410,
    "target_group": "CORE",
    "grupo_muscular": "Core/Abdomen",
    "ejercicio": "Crunch en máquina de discos",
    "equipamiento": "Máquina de discos",
    "tecnica_ejecucion": "Sentado, flexionar el torso contra la resistencia del disco contrayendo el abdomen."
  },
  {
    "id": 411,
    "target_group": "CORE",
    "grupo_muscular": "Core/Abdomen",
    "ejercicio": "Crunch en polea alta",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "De rodillas frente a la polea alta, flexionar el torso hacia abajo contrayendo el abdomen."
  },
  {
    "id": 412,
    "target_group": "CORE",
    "grupo_muscular": "Core/Abdomen",
    "ejercicio": "Crunch inverso",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Acostado boca arriba, elevar la cadera flexionando las rodillas hacia el pecho."
  },
  {
    "id": 413,
    "target_group": "CORE",
    "grupo_muscular": "Core/Abdomen",
    "ejercicio": "Crunch oblicuo",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Acostado, flexionar el torso rotando hacia un lado contrayendo el oblicuo correspondiente."
  },
  {
    "id": 414,
    "target_group": "CORE",
    "grupo_muscular": "Core/Abdomen",
    "ejercicio": "Crunch pataleo",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Acostado, alternar movimiento de patada de piernas mientras se mantiene el torso elevado."
  },
  {
    "id": 415,
    "target_group": "CORE",
    "grupo_muscular": "Core/Abdomen",
    "ejercicio": "Crunch tuck",
    "equipamiento": "Peso corporal/Máquina",
    "tecnica_ejecucion": "Flexionar simultáneamente torso y rodillas hacia el centro del cuerpo."
  },
  {
    "id": 416,
    "target_group": "CORE",
    "grupo_muscular": "Core/Abdomen",
    "ejercicio": "Elevación de piernas",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Acostado boca arriba, elevar las piernas extendidas hasta 90° y bajar controlado."
  },
  {
    "id": 417,
    "target_group": "CORE",
    "grupo_muscular": "Core/Abdomen",
    "ejercicio": "Elevación de piernas colgado",
    "equipamiento": "Peso corporal/Barra fija",
    "tecnica_ejecucion": "Colgado de la barra, elevar las piernas extendidas hacia el frente y bajar controlado."
  },
  {
    "id": 418,
    "target_group": "CORE",
    "grupo_muscular": "Core/Abdomen",
    "ejercicio": "Elevación de piernas declinado",
    "equipamiento": "Peso corporal/Banco declinado",
    "tecnica_ejecucion": "En banco declinado, elevar las piernas extendidas y bajar controlado."
  },
  {
    "id": 419,
    "target_group": "CORE",
    "grupo_muscular": "Core/Abdomen",
    "ejercicio": "Elevación de piernas vertical",
    "equipamiento": "Máquina/Soporte",
    "tecnica_ejecucion": "Apoyo en soporte vertical, elevar las piernas extendidas hacia el frente."
  },
  {
    "id": 420,
    "target_group": "CORE",
    "grupo_muscular": "Core/Abdomen",
    "ejercicio": "Elevación de rodillas vertical",
    "equipamiento": "Máquina/Soporte",
    "tecnica_ejecucion": "Apoyo en soporte vertical, flexionar y elevar las rodillas hacia el pecho."
  },
  {
    "id": 421,
    "target_group": "CORE",
    "grupo_muscular": "Core/Abdomen",
    "ejercicio": "Escalada de montaña",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Posición de plancha alta, alternar la flexión de rodillas hacia el pecho a ritmo rápido."
  },
  {
    "id": 422,
    "target_group": "CORE",
    "grupo_muscular": "Core/Abdomen",
    "ejercicio": "Escalada de montaña cruzada",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Posición de plancha alta, llevar la rodilla hacia el codo opuesto alternando lados."
  },
  {
    "id": 423,
    "target_group": "CORE",
    "grupo_muscular": "Core/Abdomen",
    "ejercicio": "Giros rusos",
    "equipamiento": "Peso corporal/Disco",
    "tecnica_ejecucion": "Sentado con piernas elevadas, rotar el torso de lado a lado tocando el suelo con las manos."
  },
  {
    "id": 424,
    "target_group": "CORE",
    "grupo_muscular": "Core/Abdomen",
    "ejercicio": "Giros rusos declinado",
    "equipamiento": "Peso corporal/Disco",
    "tecnica_ejecucion": "En banco declinado, rotar el torso de lado a lado sosteniendo una carga opcional."
  },
  {
    "id": 425,
    "target_group": "CORE",
    "grupo_muscular": "Core/Abdomen",
    "ejercicio": "Leñador en polea alta",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "De pie lateral a la polea alta, tirar el cable en diagonal hacia la cadera opuesta rotando el torso."
  },
  {
    "id": 426,
    "target_group": "CORE",
    "grupo_muscular": "Core/Abdomen",
    "ejercicio": "Leñador en polea baja",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "De pie lateral a la polea baja, tirar el cable en diagonal hacia el hombro opuesto rotando el torso."
  },
  {
    "id": 427,
    "target_group": "CORE",
    "grupo_muscular": "Core/Abdomen",
    "ejercicio": "Plancha",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Apoyo en antebrazos y pies, cuerpo recto y alineado, mantener la posición isométrica."
  },
  {
    "id": 428,
    "target_group": "CORE",
    "grupo_muscular": "Core/Abdomen",
    "ejercicio": "Plancha Jack",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "En plancha alta, abrir y cerrar las piernas con salto manteniendo cadera estable."
  },
  {
    "id": 429,
    "target_group": "CORE",
    "grupo_muscular": "Core/Abdomen",
    "ejercicio": "Plancha con alcance",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "En plancha alta, alternar el alcance de un brazo hacia adelante manteniendo cadera estable."
  },
  {
    "id": 430,
    "target_group": "CORE",
    "grupo_muscular": "Core/Abdomen",
    "ejercicio": "Plancha con balón de estabilidad",
    "equipamiento": "Peso corporal/Balón",
    "tecnica_ejecucion": "Antebrazos o manos sobre el balón, mantener plancha controlando la inestabilidad."
  },
  {
    "id": 431,
    "target_group": "CORE",
    "grupo_muscular": "Core/Abdomen",
    "ejercicio": "Plancha con toque de hombro",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "En plancha alta, alternar el toque del hombro opuesto con cada mano sin rotar la cadera."
  },
  {
    "id": 432,
    "target_group": "CORE",
    "grupo_muscular": "Core/Abdomen",
    "ejercicio": "Plancha de oso",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Apoyo en manos y pies con rodillas levemente elevadas del suelo, mantener la posición estable."
  },
  {
    "id": 433,
    "target_group": "CORE",
    "grupo_muscular": "Core/Abdomen",
    "ejercicio": "Plancha surrender",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Desde plancha alta, bajar a antebrazos y subir de vuelta alternando manos, manteniendo estabilidad."
  },
  {
    "id": 434,
    "target_group": "CORE",
    "grupo_muscular": "Core/Abdomen",
    "ejercicio": "Rodillas al pecho colgado",
    "equipamiento": "Peso corporal/Barra fija",
    "tecnica_ejecucion": "Colgado de la barra, flexionar las rodillas elevándolas hacia el pecho y bajar controlado."
  },
  {
    "id": 435,
    "target_group": "CORE",
    "grupo_muscular": "Core/Abdomen",
    "ejercicio": "Rodillas al pecho colgado oblicuo",
    "equipamiento": "Peso corporal/Barra fija",
    "tecnica_ejecucion": "Colgado de la barra, elevar las rodillas en diagonal hacia un lado alternando direcciones."
  },
  {
    "id": 436,
    "target_group": "CORE",
    "grupo_muscular": "Core/Abdomen",
    "ejercicio": "Rodillas al pecho sobre balón",
    "equipamiento": "Peso corporal/Balón",
    "tecnica_ejecucion": "Apoyo de manos en el suelo y pies sobre el balón, flexionar rodillas hacia el pecho rodando el balón."
  },
  {
    "id": 437,
    "target_group": "CORE",
    "grupo_muscular": "Core/Abdomen",
    "ejercicio": "Rotación de torso",
    "equipamiento": "Máquina/Polea",
    "tecnica_ejecucion": "Sentado o de pie, rotar el torso de un lado a otro contra resistencia controlada."
  },
  {
    "id": 438,
    "target_group": "CORE",
    "grupo_muscular": "Core/Abdomen",
    "ejercicio": "Rotación de torso con polea",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "De pie, rotar el torso llevando el cable de un lado al otro de forma controlada."
  },
  {
    "id": 439,
    "target_group": "CORE",
    "grupo_muscular": "Core/Abdomen",
    "ejercicio": "Sentado en V",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Sentado en equilibrio sobre los isquiones, elevar piernas y torso formando una V."
  },
  {
    "id": 440,
    "target_group": "CORE",
    "grupo_muscular": "Core/Abdomen",
    "ejercicio": "Sit Up",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Acostado boca arriba, flexionar el torso completo hasta sentarse y bajar controlado."
  },
  {
    "id": 441,
    "target_group": "CORE",
    "grupo_muscular": "Core/Abdomen",
    "ejercicio": "Sit up declinado",
    "equipamiento": "Peso corporal/Banco declinado",
    "tecnica_ejecucion": "En banco declinado, flexionar el torso completo hasta sentarse y bajar controlado."
  },
  {
    "id": 442,
    "target_group": "CORE",
    "grupo_muscular": "Core/Abdomen",
    "ejercicio": "Sit up y press con pesa rusa",
    "equipamiento": "Pesa rusa",
    "tecnica_ejecucion": "Sit up sosteniendo la pesa rusa, al sentarse empujarla overhead y bajar controlado."
  },
  {
    "id": 443,
    "target_group": "CORE",
    "grupo_muscular": "Core/Abdomen",
    "ejercicio": "Toque de talones",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Acostado boca arriba con rodillas flexionadas, alcanzar lateralmente cada talón alternando lados."
  },
  {
    "id": 444,
    "target_group": "CORE",
    "grupo_muscular": "Core/Abdomen",
    "ejercicio": "Toque de tobillos",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Acostado boca arriba con piernas elevadas, elevar el torso para tocar los tobillos."
  },
  {
    "id": 445,
    "target_group": "CORE",
    "grupo_muscular": "Lumbares",
    "ejercicio": "Extensión en banco lumbar",
    "equipamiento": "Peso corporal/Disco",
    "tecnica_ejecucion": "Cadera apoyada en el banco, bajar el torso y extender hasta alinear con las piernas."
  },
  {
    "id": 446,
    "target_group": "CORE",
    "grupo_muscular": "Lumbares",
    "ejercicio": "Extensión lumbar en máquina",
    "equipamiento": "Máquina",
    "tecnica_ejecucion": "Sentado o apoyado en la máquina, extender el torso hacia atrás contrayendo la zona lumbar."
  },
  {
    "id": 447,
    "target_group": "CORE",
    "grupo_muscular": "Lumbares",
    "ejercicio": "Peso muerto parcial",
    "equipamiento": "Barra",
    "tecnica_ejecucion": "Desde altura de rodilla o superior, extender cadera elevando la barra en rango parcial."
  },
  {
    "id": 448,
    "target_group": "CORE",
    "grupo_muscular": "Lumbares",
    "ejercicio": "Superman",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Acostado boca abajo, elevar simultáneamente brazos y piernas contrayendo la zona lumbar."
  },
  {
    "id": 449,
    "target_group": "CORE",
    "grupo_muscular": "Lumbares",
    "ejercicio": "Superman alternado",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Acostado boca abajo, elevar alternadamente brazo y pierna opuestos."
  },
  {
    "id": 450,
    "target_group": "PREVENCION",
    "grupo_muscular": "Abductores",
    "ejercicio": "Abducción de cadera acostado (variante)",
    "equipamiento": "Peso corporal/Banda",
    "tecnica_ejecucion": "Acostado de lado, elevar la pierna superior lateralmente contrayendo el glúteo medio."
  },
  {
    "id": 451,
    "target_group": "PREVENCION",
    "grupo_muscular": "Abductores",
    "ejercicio": "Abducción de cadera en polea",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "De pie lateral a la polea baja, alejar la pierna del cuerpo lateralmente."
  },
  {
    "id": 452,
    "target_group": "PREVENCION",
    "grupo_muscular": "Abductores",
    "ejercicio": "Abducción de cadera máquina",
    "equipamiento": "Máquina",
    "tecnica_ejecucion": "Sentado, separar las piernas contra la resistencia de la máquina y volver controlado."
  },
  {
    "id": 453,
    "target_group": "PREVENCION",
    "grupo_muscular": "Abductores",
    "ejercicio": "Abducción en máquina multi-hip",
    "equipamiento": "Máquina multi-hip",
    "tecnica_ejecucion": "De pie en la máquina, alejar la pierna del cuerpo lateralmente contrayendo glúteo medio."
  },
  {
    "id": 454,
    "target_group": "PREVENCION",
    "grupo_muscular": "Abductores",
    "ejercicio": "Adbucción sentado con banda",
    "equipamiento": "Banda elástica",
    "tecnica_ejecucion": "Sentado con banda sobre las rodillas, separar las rodillas contra la resistencia."
  },
  {
    "id": 455,
    "target_group": "PREVENCION",
    "grupo_muscular": "Abductores",
    "ejercicio": "Clamshells",
    "equipamiento": "Banda elástica/Peso corporal",
    "tecnica_ejecucion": "Acostado de lado con rodillas flexionadas, abrir la rodilla superior manteniendo los pies juntos."
  },
  {
    "id": 456,
    "target_group": "PREVENCION",
    "grupo_muscular": "Aductores",
    "ejercicio": "Aducción de cadera con cable",
    "equipamiento": "Polea",
    "tecnica_ejecucion": "De pie lateral a la polea baja, llevar la pierna hacia el cuerpo cruzando la línea media."
  },
  {
    "id": 457,
    "target_group": "PREVENCION",
    "grupo_muscular": "Aductores",
    "ejercicio": "Aducción de cadera en máquina",
    "equipamiento": "Máquina",
    "tecnica_ejecucion": "Sentado, juntar las piernas contra la resistencia de la máquina y volver controlado."
  },
  {
    "id": 458,
    "target_group": "PREVENCION",
    "grupo_muscular": "Aductores",
    "ejercicio": "Aducción en máquina multi-hip",
    "equipamiento": "Máquina multi-hip",
    "tecnica_ejecucion": "De pie en la máquina, llevar la pierna hacia el cuerpo cruzando la línea media."
  },
  {
    "id": 459,
    "target_group": "PREVENCION",
    "grupo_muscular": "Glúteos",
    "ejercicio": "Puente de glúteos con banda mini (variante 1)",
    "equipamiento": "Banda mini",
    "tecnica_ejecucion": "Banda sobre las rodillas, elevar la cadera contrayendo glúteos y manteniendo tensión lateral."
  },
  {
    "id": 460,
    "target_group": "PREVENCION",
    "grupo_muscular": "Glúteos",
    "ejercicio": "Puente de glúteos con banda mini (variante 2)",
    "equipamiento": "Banda mini",
    "tecnica_ejecucion": "Variante del puente con banda, ajustando posición de pies o tensión."
  },
  {
    "id": 461,
    "target_group": "CONDICIONAMIENTO",
    "grupo_muscular": "Hombros",
    "ejercicio": "Cuerda de combate alternada",
    "equipamiento": "Cuerdas de batalla",
    "tecnica_ejecucion": "De pie con rodillas flexionadas, alternar golpes de ondulación con cada brazo sobre las cuerdas."
  },
  {
    "id": 462,
    "target_group": "CONDICIONAMIENTO",
    "grupo_muscular": "Hombros",
    "ejercicio": "Golpe de cuerda",
    "equipamiento": "Cuerdas de batalla",
    "tecnica_ejecucion": "De pie con rodillas flexionadas, golpear el suelo alternadamente con ambas cuerdas de forma explosiva."
  },
  {
    "id": 463,
    "target_group": "CONDICIONAMIENTO",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Burpee",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Sentadilla, plancha, flexión, salto a sentadilla y salto vertical en un movimiento continuo."
  },
  {
    "id": 464,
    "target_group": "CONDICIONAMIENTO",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Burpee con salto largo",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Burpee estándar seguido de un salto horizontal largo al finalizar."
  },
  {
    "id": 465,
    "target_group": "PLIOMETRIA_EXTENSIVA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Pogo jumps (saltos de tobillo)",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Saltos verticales cortos y continuos usando principalmente el tobillo, rodillas casi extendidas. Contacto breve y rígido, rebote elástico. Foco en rigidez del tobillo y ritmo, no en altura."
  },
  {
    "id": 466,
    "target_group": "PLIOMETRIA_EXTENSIVA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Skipping bajo (A-skip)",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Desplazamiento con elevación de rodilla y contacto activo de antepié, coordinando brazos. Énfasis en ciclo rápido y postura erguida. Intensidad submáxima, continuo."
  },
  {
    "id": 467,
    "target_group": "PLIOMETRIA_EXTENSIVA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Saltos a la comba",
    "equipamiento": "Cuerda",
    "tecnica_ejecucion": "Saltos continuos de bajo impacto sobre antepié, tobillo reactivo. Volumen alto, intensidad baja. Base de acondicionamiento del complejo pie-tobillo."
  },
  {
    "id": 468,
    "target_group": "PLIOMETRIA_EXTENSIVA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Saltos horizontales submáximos continuos",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Saltos hacia adelante encadenados a intensidad controlada (no máxima), aterrizaje suave y reamortiguación. Foco en técnica de aterrizaje y continuidad."
  },
  {
    "id": 469,
    "target_group": "PLIOMETRIA_EXTENSIVA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Bounding submáximo (multisaltos alternos)",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Zancadas amplias alternando piernas con fase de vuelo, a intensidad moderada. Énfasis en extensión de cadera y coordinación brazo-pierna. Progresión previa al bounding máximo."
  },
  {
    "id": 470,
    "target_group": "PLIOMETRIA_EXTENSIVA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Saltos laterales cono a cono (submáximos)",
    "equipamiento": "Peso corporal/Conos",
    "tecnica_ejecucion": "Saltos laterales de baja-media amplitud sobre un cono u obstáculo bajo, contacto y reamortiguación controlados. Trabaja plano frontal y estabilidad de tobillo/rodilla."
  },
  {
    "id": 471,
    "target_group": "PLIOMETRIA_EXTENSIVA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Saltos sobre vallas bajas (dos pies)",
    "equipamiento": "Peso corporal/Vallas bajas",
    "tecnica_ejecucion": "Saltos consecutivos bipodales sobre vallas bajas, contacto breve entre vallas. Altura de valla baja para mantener carácter extensivo. Foco en ritmo y aterrizaje."
  },
  {
    "id": 472,
    "target_group": "PLIOMETRIA_EXTENSIVA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Saltos en escalera de agilidad (dos pies)",
    "equipamiento": "Peso corporal/Escalera",
    "tecnica_ejecucion": "Entradas y salidas rápidas de casillas con ambos pies, contacto breve de antepié. Coordinación, frecuencia de contacto y rigidez de tobillo a baja carga."
  },
  {
    "id": 473,
    "target_group": "PLIOMETRIA_EXTENSIVA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Tuck jumps submáximos",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Saltos verticales con recogida moderada de rodillas, aterrizaje amortiguado y controlado, intensidad submáxima. Continuidad por sobre altura máxima."
  },
  {
    "id": 474,
    "target_group": "PLIOMETRIA_EXTENSIVA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Saltos con contramovimiento submáximos (repetidos)",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Serie de saltos verticales con contramovimiento a intensidad controlada, reamortiguando cada aterrizaje. Base técnica antes de progresar a saltos reactivos máximos."
  },
  {
    "id": 475,
    "target_group": "PLIOMETRIA_INTENSIVA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Drop jump (salto en profundidad)",
    "equipamiento": "Peso corporal/Cajón",
    "tecnica_ejecucion": "Caer desde un cajón de altura moderada y, al contactar, saltar verticalmente lo más rápido y alto posible minimizando el tiempo de contacto. Máxima intención reactiva, bajo volumen. Requiere competencia técnica previa."
  },
  {
    "id": 476,
    "target_group": "PLIOMETRIA_INTENSIVA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Depth jump a salto vertical",
    "equipamiento": "Peso corporal/Cajón",
    "tecnica_ejecucion": "Caída desde cajón seguida de salto vertical máximo inmediato buscando altura. CEA corto y explosivo. Progresión de mayor intensidad que el drop jump reactivo."
  },
  {
    "id": 477,
    "target_group": "PLIOMETRIA_INTENSIVA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Salto reactivo repetido máximo (rebound jumps)",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Saltos verticales consecutivos con máxima altura y mínimo tiempo de contacto, sin pausa entre repeticiones. Alta demanda del CEA rápido. Series cortas."
  },
  {
    "id": 478,
    "target_group": "PLIOMETRIA_INTENSIVA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Bounding máximo (multisaltos de máxima amplitud)",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Zancadas explosivas alternas buscando máxima distancia y tiempo de vuelo por contacto. Máxima extensión de cadera y potencia horizontal. Alta carga neuromuscular."
  },
  {
    "id": 479,
    "target_group": "PLIOMETRIA_INTENSIVA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Salto horizontal máximo con reamortiguación",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Salto horizontal a máxima distancia con aterrizaje estable y absorbido. Foco en producción de fuerza horizontal y control excéntrico del aterrizaje."
  },
  {
    "id": 480,
    "target_group": "PLIOMETRIA_INTENSIVA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Salto a una pierna reactivo (single-leg hop)",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Saltos unipodales reactivos, contacto breve y máxima intención. Alta demanda de rigidez y control unipodal. Relevante para acciones de sprint y COD, pero exige base previa."
  },
  {
    "id": 481,
    "target_group": "PLIOMETRIA_INTENSIVA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Saltos laterales máximos a una pierna",
    "equipamiento": "Peso corporal",
    "tecnica_ejecucion": "Saltos laterales unipodales explosivos con aterrizaje estabilizado en la pierna contraria. Plano frontal a alta intensidad, específico de cambios de dirección."
  },
  {
    "id": 482,
    "target_group": "PLIOMETRIA_INTENSIVA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Salto sobre vallas altas reactivo",
    "equipamiento": "Peso corporal/Vallas",
    "tecnica_ejecucion": "Saltos bipodales consecutivos sobre vallas altas con mínimo tiempo de contacto y máxima altura. CEA corto y alto impacto. Solo con técnica de aterrizaje consolidada."
  },
  {
    "id": 483,
    "target_group": "PLIOMETRIA_INTENSIVA",
    "grupo_muscular": "Piernas/General",
    "ejercicio": "Salto al cajón reactivo (contacto mínimo)",
    "equipamiento": "Peso corporal/Cajón",
    "tecnica_ejecucion": "Salto explosivo al cajón buscando el menor tiempo de contacto en el suelo antes del despegue. Énfasis en velocidad de producción de fuerza, no en altura del cajón."
  }
];
