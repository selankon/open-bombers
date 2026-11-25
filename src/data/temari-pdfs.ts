import { TemariPdf } from '~components/Temari/types'

/**
 * Official study PDFs of the convocatòria ACCÉS 81/26 (temes 8-34). Temes 1-7 are legal texts
 * and have no PDF. Paths are relative to TEMARI_BASE_URL. Entries under ACTUALITZACIO-GUIA-ESTUDI
 * replace the manual of the original study guide.
 */
const doc = (tema: number, manual: string, path: string, actualitzat = false): TemariPdf => ({
  id: `tema-${tema}`,
  tema,
  manual,
  path,
  actualitzat,
})

const DOC = 'DOCUMENTACIO-ESTUDI'
const UPD = 'ACTUALITZACIO-GUIA-ESTUDI'

export const TEMARI_PDFS: TemariPdf[] = [
  doc(8, 'MAN.GRAL.008', `${DOC}/Tema-08-MAN.GRAL.008.pdf`),
  doc(9, 'MAN.GRAL.003', `${DOC}/Tema-09-MAN.GRAL.003.pdf`),
  doc(10, 'MAN.GRAL.004', `${DOC}/Tema-10-MAN.GRAL.004.pdf`),
  doc(11, 'MAN.GRAL.005', `${DOC}/Tema-11-MAN.GRAL.005.pdf`),
  doc(12, 'MAN.GRAL.007', `${UPD}/MAN.GRAL.007-Tema-12.-Installacions.pdf`, true),
  doc(13, 'MAN.GRAL.009', `${DOC}/Tema-13-MAN.GRAL.009.pdf`),
  doc(14, 'MAN.GRAL.002', `${DOC}/Tema-14-MAN.GRAL.002.pdf`),
  doc(15, 'MAN.GRAL.006', `${UPD}/MAN.GRAL.006-Tema-15.-Manual-Op.-basic-construccio.pdf`, true),
  doc(16, 'MAN.ATXX.000', `${DOC}/Tema-16-MAN.ATXX.000.pdf`),
  doc(17, 'MAN.COMU.000', `${DOC}/Tema-17-MAN.COMU.000.pdf`),
  doc(18, 'MAN.EQIP.000', `${DOC}/Tema-18-MAN.EQIP.000.pdf`),
  doc(19, 'MAN.EQIP.002', `${DOC}/Tema-19-MAN.EQIP.002.pdf`),
  doc(20, 'MAN.SEGU.000', `${DOC}/Tema-20-MAN.SEGU.000.pdf`),
  doc(21, 'MAN.GRAL.001', `${UPD}/MAN.GRAL.001-Tema-21-Intro.-gestio-emergencies-i-P.Civil.pdf`, true),
  doc(22, 'MAN.COMD.001', `${DOC}/Tema-22-MAN.COMD.001.pdf`),
  doc(23, 'MAN.SP.000', `${UPD}/MAN.SP.000-Tema-23.-Prevencio-basica-incendis.pdf`, true),
  doc(24, 'MAN.INES.000', `${DOC}/Tema-24-MAN.INES.000.pdf`),
  doc(25, 'MAN.INVE.000', `${DOC}/Tema-25-MAN.INVE.000.pdf`),
  doc(26, 'MAN.INXX.000', `${UPD}/MAN.INXX.000-Tema-26-Prevencio-incendis-varis.pdf`, true),
  doc(27, 'MAN.RRTT.000', `${UPD}/MAN.RRTT.000-Tema-27.-Intervencio-NRBQ.pdf`, true),
  doc(28, 'MAN.SANI.000', `${UPD}/MAN.SANI.000-Tema-28.-Assistencia-sanitaria.pdf`, true),
  doc(29, 'MAN.SANI.001', `${DOC}/Tema-29-MAN.SANI.001.pdf`),
  doc(30, 'MAN.SVES.000', `${DOC}/Tema-30-MAN.SVES.000.pdf`),
  doc(31, 'MAN.SVMN.000', `${DOC}/Tema-31-MAN.SVMN.000.pdf`),
  doc(32, 'MAN.SVVH.000', `${DOC}/Tema-32-MAN.SVVH.000.pdf`),
  doc(33, 'MAN.SVXX.000', `${DOC}/Tema-33-MAN.SVXX.000.pdf`),
  doc(34, 'MAN.SVMN.001', `${UPD}/MAN.SVMN.001-Tema-34.-Intervencio-en-inundacions.pdf`, true),
]

// Corrections to the whole study guide (not tied to one tema)
export const TEMARI_CORRECCIONS: TemariPdf = {
  id: 'correccions',
  tema: null,
  manual: null,
  path: 'CORRECCIONS-GUIA-ESTUDI/CORRECCIONS_GUIA_ORIENTATIVA_CONTINGUTS.pdf',
  actualitzat: false,
}

export const ALL_TEMARI_PDFS: TemariPdf[] = [TEMARI_CORRECCIONS, ...TEMARI_PDFS]
