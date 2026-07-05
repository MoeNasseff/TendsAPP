import { Outlet } from 'react-router-dom'

export function MoodLayout({ mood }: { mood: string }) {
  return (
    <div data-mood={mood}>
      <Outlet />
    </div>
  )
}
