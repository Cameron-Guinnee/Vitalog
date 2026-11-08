import { deleteMeal, listMeals, saveMeal } from '../../features/foods/api'
import { PortionListPage } from '../../features/foods/PortionListPage'

export function CustomMeals() {
  return (
    <PortionListPage
      kind="meal"
      list={listMeals}
      save={(userId, input, previous) => saveMeal(userId, input, previous)}
      remove={deleteMeal}
      intro="Foods you often eat together. Logging a meal adds each food to your diary at once."
      removeNote="Foods you’ve already logged from it stay in your diary."
    />
  )
}
