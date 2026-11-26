import {
  Box,
  Button,
  Flex,
  Icon,
  IconButton,
  Input,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Portal,
  Text,
} from '@chakra-ui/react'
import { FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import { GlassSurface } from '~components/Layout/Glass/GlassSurface'
import { SaveIndicator } from '~components/Layout/SaveIndicator'
import { ROUTES } from '~src/router/routes'
import { icons } from '~theme/icons'

/** Current page; tap it to jump to another one */
const PageJump = ({ page, total, onGo }: { page: number; total: number; onGo: (page: number) => void }) => {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  return (
    <Popover placement='bottom' isLazy onOpen={() => setValue(String(page))}>
      {({ onClose }) => {
        const submit = (e: FormEvent) => {
          e.preventDefault()
          const n = Math.round(Number(value))
          if (n >= 1 && n <= total) {
            onGo(n)
            onClose()
          }
        }
        return (
          <>
            <PopoverTrigger>
              <Button
                variant='ghost'
                colorScheme='gray'
                size='sm'
                borderRadius='full'
                flexShrink={0}
                sx={{ fontVariantNumeric: 'tabular-nums' }}
                aria-label={t('anotacions.page_jump', {
                  defaultValue: 'Pàgina {{page}} de {{total}}. Vés a una altra pàgina',
                  page,
                  total,
                })}
              >
                {page} / {total}
              </Button>
            </PopoverTrigger>
            <Portal>
              <PopoverContent w='220px' borderRadius='md' boxShadow='floating' borderColor='border'>
                <PopoverArrow />
                <PopoverBody p={3}>
                  <form onSubmit={submit}>
                    <Flex gap={2}>
                      <Input
                        autoFocus
                        type='number'
                        inputMode='numeric'
                        min={1}
                        max={total}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        aria-label={t('anotacions.page_number', { defaultValue: 'Número de pàgina' })}
                        size='sm'
                        borderRadius='sm'
                      />
                      <Button type='submit' flexShrink={0}>
                        {t('anotacions.go', { defaultValue: 'Vés-hi' })}
                      </Button>
                    </Flex>
                  </form>
                </PopoverBody>
              </PopoverContent>
            </Portal>
          </>
        )
      }}
    </Popover>
  )
}

type VisorHeaderProps = {
  title: string
  subtitle: string | null
  page: number
  total: number
  onGoToPage: (page: number) => void
  hasAnnotations: boolean
  onExport: () => void
  exporting: boolean
  onDownloadOriginal: () => void
  onClear: () => void
}

/**
 * Floating bar over the pages: back to the Temari, title, current page and the PDF menu
 */
export const VisorHeader = (p: VisorHeaderProps) => {
  const { t } = useTranslation()
  return (
    <Flex
      position='absolute'
      top={3}
      left={{ base: 3, md: 4 }}
      right={{ base: 3, md: 4 }}
      zIndex={10}
      justify='space-between'
      align='flex-start'
      gap={2}
      pointerEvents='none'
    >
      <GlassSurface
        pointerEvents='auto'
        display='flex'
        alignItems='center'
        gap={1}
        minW={0}
        p={1}
        borderRadius='full'
        borderWidth='1px'
        borderColor='border'
        boxShadow='raised'
      >
        <IconButton
          as={RouterLink}
          to={ROUTES.TEMARI}
          aria-label={t('anotacions.back', { defaultValue: 'Torna al temari' })}
          icon={<Icon as={icons.back} />}
          variant='ghost'
          colorScheme='gray'
          borderRadius='full'
          fontSize='lg'
        />
        <Box minW={0} px={1}>
          <Text fontWeight={700} fontSize='sm' noOfLines={1}>
            {p.title}
          </Text>
          {p.subtitle && (
            <Text fontSize='xs' color='textMuted' noOfLines={1}>
              {p.subtitle}
            </Text>
          )}
        </Box>
        <PageJump page={p.page} total={p.total} onGo={p.onGoToPage} />
        <Menu placement='bottom-end' isLazy>
          <MenuButton
            as={IconButton}
            aria-label={t('anotacions.menu', { defaultValue: 'Opcions del PDF' })}
            icon={<Icon as={icons.more} />}
            variant='ghost'
            colorScheme='gray'
            borderRadius='full'
            fontSize='lg'
            flexShrink={0}
          />
          <Portal>
            <MenuList zIndex='popover'>
              <MenuItem
                icon={<Icon as={icons.export} />}
                onClick={p.onExport}
                isDisabled={!p.hasAnnotations || p.exporting}
              >
                {t('anotacions.export', { defaultValue: 'Exporta el PDF amb les anotacions' })}
              </MenuItem>
              <MenuItem icon={<Icon as={icons.download} />} onClick={p.onDownloadOriginal}>
                {t('anotacions.download_original', { defaultValue: 'Descarrega el PDF original' })}
              </MenuItem>
              <MenuDivider />
              <MenuItem
                icon={<Icon as={icons.delete} />}
                color='nb.fg'
                onClick={p.onClear}
                isDisabled={!p.hasAnnotations}
              >
                {t('anotacions.clear', { defaultValue: 'Esborra totes les anotacions' })}
              </MenuItem>
            </MenuList>
          </Portal>
        </Menu>
      </GlassSurface>

      <Box pointerEvents='auto' display={{ base: 'none', md: 'block' }} flexShrink={0}>
        <SaveIndicator />
      </Box>
    </Flex>
  )
}
