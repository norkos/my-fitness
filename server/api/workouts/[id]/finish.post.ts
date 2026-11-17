import { parseId } from '../../../lib/errors'
import { finishWorkout } from '../../../services/workouts'

export default defineApiHandler((event) => {
  const id = parseId(getRouterParam(event, 'id'), 'Workout')
  return finishWorkout(useDb(), id)
})
