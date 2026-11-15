import { parseId } from '../../lib/errors'
import { updateExercise } from '../../services/exercises'

export default defineApiHandler(async (event) => {
  const id = parseId(getRouterParam(event, 'id'), 'Exercise')
  return updateExercise(useDb(), id, await readJsonBody(event))
})
