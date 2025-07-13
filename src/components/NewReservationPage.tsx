import React from 'react'
import ReservationForm from './ReservationForm'

interface NewReservationPageProps {
  n8nBaseUrl?: string
}

const NewReservationPage: React.FC<NewReservationPageProps> = ({ n8nBaseUrl }) => {
  return (
    <div className="space-y-6">
      <ReservationForm n8nBaseUrl={n8nBaseUrl} />
    </div>
  )
}

export default NewReservationPage