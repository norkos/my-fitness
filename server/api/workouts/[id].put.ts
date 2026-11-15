import { parseId } from '../../lib/errors'
import { replaceWorkout } from '../../services/workouts'

export default defineApiHandler(async (event) => {
  const id = parseId(getRouterParam(event, 'id'), 'Workout')
  return replaceWorkout(useDb(), id, await readJsonBody(event))
})
