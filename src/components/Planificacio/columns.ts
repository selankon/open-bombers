import { Column, ColumnGroup, ColumnSubgroup, ColumnType } from './types'

/**
 * The 25 data columns of the original "Planificació de Temari", in display order.
 */
export const DEFAULT_COLUMNS: Column[] = [
  // Its value is the study day of the apartat (repassos.estudis), not a stored cell
  { col_id: 'data_classe', titol: 'Data classe', grup: 'info', subgrup: 'info', tipus: 'date', ambit: 'apartat' },
  {
    col_id: 'nivell_tema',
    titol: 'Nivell del tema',
    grup: 'info',
    subgrup: 'info',
    tipus: 'auto_nivell_tema',
    ambit: 'tema',
  },
  {
    col_id: 'nivell_apartat',
    titol: 'Nivell per apartat',
    grup: 'info',
    subgrup: 'info',
    tipus: 'select_nivell',
    ambit: 'apartat',
  },
  {
    col_id: 'lectura_tema',
    titol: 'Lectura del tema',
    grup: 'abans',
    subgrup: 'imprescindibles',
    tipus: 'check',
    ambit: 'apartat',
  },
  {
    col_id: 'preguntes_15_app',
    titol: "Resoldre 15 preguntes de l'APP",
    grup: 'abans',
    subgrup: 'imprescindibles',
    tipus: 'score',
    ambit: 'tema',
  },
  {
    col_id: 'subratllat_consciencia',
    titol: 'Subratllat a consciència del tema',
    grup: 'abans',
    subgrup: 'tasques2',
    tipus: 'check',
    ambit: 'apartat',
  },
  {
    col_id: 'preguntes_15_mes',
    titol: "Resoldre 15 preguntes més de l'app",
    grup: 'abans',
    subgrup: 'tasques2',
    tipus: 'score',
    ambit: 'tema',
  },
  {
    col_id: 'anotar_dubtes',
    titol: 'Anotar dubtes',
    grup: 'abans',
    subgrup: 'tasques2',
    tipus: 'check',
    ambit: 'apartat',
  },
  {
    col_id: 'repassar_fallades',
    titol: "Repassar les preguntes fallades a l'app",
    grup: 'abans',
    subgrup: 'tasques3',
    tipus: 'check',
    ambit: 'apartat',
  },
  {
    col_id: 'resoldre_dubtes',
    titol: 'Intentar resoldre els dubtes anotats',
    grup: 'abans',
    subgrup: 'tasques3',
    tipus: 'check',
    ambit: 'apartat',
  },
  {
    col_id: 'veure_classe',
    titol: 'Veure la classe',
    grup: 'despres',
    subgrup: 'imprescindibles',
    tipus: 'check',
    ambit: 'apartat',
  },
  {
    col_id: 'subratllar_repassar',
    titol: 'Subratllar o repassar el subratllat',
    grup: 'despres',
    subgrup: 'imprescindibles',
    tipus: 'check',
    ambit: 'apartat',
  },
  {
    col_id: 'memoritzar',
    titol: 'Memoritzar',
    grup: 'despres',
    subgrup: 'imprescindibles',
    tipus: 'check',
    ambit: 'apartat',
  },
  {
    col_id: 'preguntes_30_app_1',
    titol: "Resoldre 30 preguntes de l'APP",
    grup: 'despres',
    subgrup: 'imprescindibles',
    tipus: 'score',
    ambit: 'tema',
  },
  {
    col_id: 'mapa_mental',
    titol: 'Mapa mental, taula, resum (abans de memoritzar)',
    grup: 'despres',
    subgrup: 'tasques2',
    tipus: 'check',
    ambit: 'apartat',
  },
  {
    col_id: 'preguntes_30_app_2',
    titol: "Resoldre 30 preguntes de l'APP",
    grup: 'despres',
    subgrup: 'tasques2',
    tipus: 'score',
    ambit: 'tema',
  },
  {
    col_id: 'analisi_acces',
    titol: "Anàlisi Preguntes Oficials D'accés",
    grup: 'despres',
    subgrup: 'tasques2',
    tipus: 'check',
    ambit: 'tema',
  },
  {
    col_id: 'analisi_pi',
    titol: 'Anàlisi Preguntes Oficials Pi',
    grup: 'despres',
    subgrup: 'tasques3',
    tipus: 'check',
    ambit: 'tema',
  },
  {
    col_id: 'visualitzar_videos',
    titol: 'Visualitzar vídeos',
    grup: 'despres',
    subgrup: 'tasques3',
    tipus: 'check',
    ambit: 'apartat',
  },
  {
    col_id: 'preguntes_app_apartat',
    titol: '10-15 Preguntes app per apartat',
    grup: 'despres',
    subgrup: 'tasques3',
    tipus: 'score',
    ambit: 'apartat',
  },
  { col_id: 'repas_dia', titol: 'Dia', grup: 'repassos', subgrup: 'repassos', tipus: 'check', ambit: 'apartat' },
  {
    col_id: 'repas_setmana',
    titol: 'Setmana',
    grup: 'repassos',
    subgrup: 'repassos',
    tipus: 'check',
    ambit: 'apartat',
  },
  { col_id: 'repas_mes', titol: 'Mes', grup: 'repassos', subgrup: 'repassos', tipus: 'check', ambit: 'apartat' },
  {
    col_id: 'repas_examens_mes',
    titol: 'Exàmens mes',
    grup: 'repassos',
    subgrup: 'repassos',
    tipus: 'score',
    ambit: 'apartat',
  },
  {
    col_id: 'repas_seguent',
    titol: 'Data següent repàs (5-6 m)',
    grup: 'repassos',
    subgrup: 'repassos',
    tipus: 'date',
    ambit: 'apartat',
  },
]

// Column ids with a special meaning in the app logic
export const COL = {
  DATA_CLASSE: 'data_classe',
  NIVELL_TEMA: 'nivell_tema',
  NIVELL_APARTAT: 'nivell_apartat',
  VEURE_CLASSE: 'veure_classe',
  REPAS_DIA: 'repas_dia',
  REPAS_SETMANA: 'repas_setmana',
  REPAS_MES: 'repas_mes',
  REPAS_SEGUENT: 'repas_seguent',
} as const

export const FET = 'FET'

// Review columns whose cells show the calendar instance of the apartat
export const REVIEW_COLUMNS: Record<string, 'd1' | 'setmanal' | 'mensual'> = {
  [COL.REPAS_DIA]: 'd1',
  [COL.REPAS_SETMANA]: 'setmanal',
  [COL.REPAS_MES]: 'mensual',
}

// Display labels of the groups (header row 1), kept as in the original
export const GROUP_LABELS: Record<ColumnGroup, string> = {
  info: 'INFO GENÈRICA',
  abans: 'ABANS DE CLASSE',
  despres: 'DESPRÉS DE CLASSE',
  repassos: 'REPASSOS',
}

// Display labels of the subgroups (header row 2)
export const SUBGROUP_LABELS: Record<ColumnSubgroup, string> = {
  info: '',
  imprescindibles: 'T. IMPRESCINDIBLES',
  tasques2: 'TASQUES 2',
  tasques3: 'TASQUES 3',
  repassos: 'REPASSOS',
}

// Weight of each subgroup for the weighted progress metric
export const SUBGROUP_WEIGHTS: Record<ColumnSubgroup, number> = {
  info: 1,
  imprescindibles: 3,
  tasques2: 2,
  tasques3: 1,
  repassos: 1,
}

// Header tooltip description of each column type
export const TYPE_DESCRIPTIONS: Record<ColumnType, string> = {
  score: 'Nota (0 - 10)',
  check: 'Casella de selecció (FET)',
  date: 'Data',
  select_nivell: 'Nivell de domini (NA / NM / NB)',
  auto_nivell_tema: 'Nivell de domini (NA / NM / NB)',
  number: 'Valor numèric',
  text: 'Text',
}
