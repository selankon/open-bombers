import { Box, BoxProps, Container, ContainerProps, Flex, Heading, Text } from '@chakra-ui/react'
import { ReactNode } from 'react'

/**
 * Container used on some layouts to wrap the content
 */
export const MainContainer = (props: ContainerProps) => (
  <Container maxW='container.xl' px={{ base: 4, md: 6 }} py={{ base: 4, md: 6 }} {...props} />
)

/**
 * Page header: title, subtitle and a right slot for actions
 */
export const PageHeader = ({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) => (
  <Flex
    direction={{ base: 'column', md: 'row' }}
    align={{ base: 'stretch', md: 'flex-end' }}
    justify='space-between'
    gap={4}
    mb={5}
  >
    <Box>
      <Heading size={{ base: 'md', md: 'lg' }}>{title}</Heading>
      {subtitle && (
        <Text color='textMuted' mt={1} fontSize={{ base: 'sm', md: 'md' }} maxW='2xl'>
          {subtitle}
        </Text>
      )}
    </Box>
    {right && (
      <Flex gap={2} wrap='wrap' align='center'>
        {right}
      </Flex>
    )}
  </Flex>
)

/**
 * Card surface
 */
export const Card = (props: BoxProps) => (
  <Box bg='surface' borderRadius='card' boxShadow='card' borderWidth='1px' borderColor='border' {...props} />
)
