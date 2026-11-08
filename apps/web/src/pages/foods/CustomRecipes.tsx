import { archiveRecipe, listRecipes, saveRecipe } from '../../features/foods/api'
import { PortionListPage } from '../../features/foods/PortionListPage'

export function CustomRecipes() {
  return (
    <PortionListPage
      kind="recipe"
      list={listRecipes}
      save={(userId, input, previous) => saveRecipe(userId, input, previous)}
      remove={archiveRecipe}
      intro="Dishes you cook, split into servings. Log however many servings you ate."
      removeNote="Days you’ve already logged it on keep it."
    />
  )
}
