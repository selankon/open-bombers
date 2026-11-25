import { Flex, FlexProps, Spinner } from '@chakra-ui/react'

export const LoadingSpinner = ({ fullScreen, ...props }: { fullScreen?: boolean } & FlexProps) => (
  <Flex w='full' minH={fullScreen ? '100dvh' : '40vh'} align='center' justify='center' {...props}>
    <Spinner color='accent' thickness='3px' />
  </Flex>
)
