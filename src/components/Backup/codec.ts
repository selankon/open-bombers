import { BACKUP_CODE_PREFIX } from '~utils/constants'
import { decodeText, encodeText } from '~utils/codec'
import { BackupFile } from './types'

/**
 * Backup → compact text code to paste on another device.
 * The PDF annotations are left out: pasted pictures can make the code huge. Without the field,
 * importing the code keeps the annotations of the other device (see api.backup.import).
 */
export const backupToCode = async ({ anotacions: _anotacions, ...file }: BackupFile) =>
  BACKUP_CODE_PREFIX + (await encodeText(JSON.stringify(file)))

/**
 * Parses a transfer code or a raw JSON backup
 */
export const parseBackupText = async (text: string): Promise<BackupFile> => {
  const trimmed = text.trim()
  if (trimmed.startsWith(BACKUP_CODE_PREFIX)) {
    return JSON.parse(await decodeText(trimmed.slice(BACKUP_CODE_PREFIX.length)))
  }
  return JSON.parse(trimmed)
}
