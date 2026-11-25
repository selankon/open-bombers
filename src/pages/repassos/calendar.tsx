import { useOutletContext } from 'react-router-dom'
import { CalendarView } from '~components/Repassos/CalendarView'
import { RepassosLayoutContext } from './RepassosLayout'

export const Calendar = () => {
  const { openRegister } = useOutletContext<RepassosLayoutContext>()
  return <CalendarView onRegister={openRegister} />
}
