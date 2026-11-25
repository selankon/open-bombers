import { Flex, FlexProps, Heading, Icon, Text } from '@chakra-ui/react'
import { ReactNode } from 'react'
import { IconType } from 'react-icons'

type ElementNotFoundProps = {
  icon: IconType
  title: ReactNode
  desc?: ReactNode
  action?: ReactNode
} & Omit<FlexProps, 'title'>

/**
 * Empty / error state: icon, human title, helpful description and an optional way out
 */
export const ElementNotFound = ({ icon, title, desc, action, ...props }: ElementNotFoundProps) => (
  <Flex direction='column' align='center' textAlign='center' gap={3} py={12} px={6} {...props}>
    <Flex
      w={14}
      h={14}
      borderRadius='full'
      bg='primary.50'
      _dark={{ bg: 'whiteAlpha.100' }}
      align='center'
      justify='center'
    >
      <Icon as={icon} boxSize={7} color='accent' />
    </Flex>
    <Heading size='sm'>{title}</Heading>
    {desc && (
      <Text color='textMuted' fontSize='sm' maxW='md'>
        {desc}
      </Text>
    )}
    {action}
  </Flex>
)
