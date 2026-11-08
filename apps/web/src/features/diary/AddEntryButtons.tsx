import { Activity, Apple, Dumbbell, StickyNote } from 'lucide-react'
import { Button } from '../../components/ui/button'
import type { EntryKind } from './AddEntryDialogs'

/** Food, Note, Exercise and Biometric buttons that open the matching add dialog. */
export function AddEntryButtons({ onAdd }: { onAdd: (kind: EntryKind) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => onAdd('food')}>
        <Apple size={16} /> Food
      </Button>
      <Button variant="secondary" onClick={() => onAdd('note')}>
        <StickyNote size={16} /> Note
      </Button>
      <Button variant="secondary" onClick={() => onAdd('exercise')}>
        <Dumbbell size={16} /> Exercise
      </Button>
      <Button variant="secondary" onClick={() => onAdd('biometric')}>
        <Activity size={16} /> Biometric
      </Button>
    </div>
  )
}
