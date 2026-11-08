import { addDays, dayLabel, toDayKey } from '@vitalog/shared'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../../components/ui/button'

export function DateNavigator({ day, onChange }: { day: string; onChange: (day: string) => void }) {
  const today = toDayKey(new Date())
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" aria-label="Previous day" onClick={() => onChange(addDays(day, -1))}>
        <ChevronLeft size={18} />
      </Button>
      <span className="min-w-36 text-center font-medium" aria-live="polite">
        {dayLabel(day)}
      </span>
      <Button variant="ghost" aria-label="Next day" onClick={() => onChange(addDays(day, 1))}>
        <ChevronRight size={18} />
      </Button>
      {day !== today && (
        <Button variant="secondary" onClick={() => onChange(today)}>
          <CalendarDays size={16} /> Today
        </Button>
      )}
    </div>
  )
}
