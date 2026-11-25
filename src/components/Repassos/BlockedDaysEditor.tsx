import {
  Button,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Tag,
  TagCloseButton,
  TagLabel,
  Text,
  Wrap,
  WrapItem,
} from '@chakra-ui/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useStudyData } from '~components/Layout/Contexts/StudyDataContext'
import { dayRange, formatShort } from '~utils/dates'
import { useUpdateRepasConfig } from './queries'

/**
 * Blocked days: add a single day or a range, remove them one by one
 */
export const BlockedDaysEditor = () => {
  const { t } = useTranslation()
  const { repassos, avui } = useStudyData()
  const { mutate } = useUpdateRepasConfig()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const list = repassos.config.dies_bloquejats

  const add = () => {
    const days = dayRange(from, to || from)
    mutate({ dies_bloquejats: [...new Set([...list, ...days])].sort() })
    setFrom('')
    setTo('')
  }

  const remove = (day: string) => mutate({ dies_bloquejats: list.filter((d) => d !== day) })
  const removePast = () => mutate({ dies_bloquejats: list.filter((d) => d >= avui) })

  return (
    <>
      <Flex gap={3} align='flex-end' wrap='wrap' mb={4}>
        <FormControl w='auto'>
          <FormLabel fontSize='sm'>{t('settings.blocked_from', { defaultValue: 'Dia (o inici del rang)' })}</FormLabel>
          <Input type='date' size='sm' borderRadius='md' value={from} onChange={(e) => setFrom(e.target.value)} />
        </FormControl>
        <FormControl w='auto'>
          <FormLabel fontSize='sm'>{t('settings.blocked_to', { defaultValue: 'Fins a (opcional)' })}</FormLabel>
          <Input
            type='date'
            size='sm'
            borderRadius='md'
            value={to}
            min={from}
            onChange={(e) => setTo(e.target.value)}
          />
        </FormControl>
        <Button onClick={add} isDisabled={!from || (to && to < from)}>
          {t('settings.blocked_add', { defaultValue: 'Afegir' })}
        </Button>
      </Flex>
      {list.length ? (
        <>
          <Wrap spacing={2}>
            {list.map((d) => (
              <WrapItem key={d}>
                <Tag size='md' borderRadius='full' variant='subtle' colorScheme={d < avui ? 'gray' : 'orange'}>
                  <TagLabel>
                    {formatShort(d)} {d.slice(0, 4)}
                  </TagLabel>
                  <TagCloseButton
                    aria-label={t('settings.blocked_remove', { defaultValue: 'Treure' })}
                    onClick={() => remove(d)}
                  />
                </Tag>
              </WrapItem>
            ))}
          </Wrap>
          {list.some((d) => d < avui) && (
            <Button size='xs' variant='ghost' colorScheme='gray' mt={3} onClick={removePast}>
              {t('settings.blocked_clear_past', { defaultValue: 'Treure els dies passats' })}
            </Button>
          )}
        </>
      ) : (
        <Text fontSize='sm' color='textMuted'>
          {t('settings.blocked_empty', {
            defaultValue: 'Cap dia bloquejat. Els repassos que cauen en un dia bloquejat passen al següent dia lliure.',
          })}
        </Text>
      )}
    </>
  )
}
