import { parseId } from '../../lib/errors'
import { getWorkout } from '../../services/workouts'

export default defineApiHandler((event) => {
  return getWorkout(useDb(), parseId(getRouterParam(event, 'id'), 'Workout'))
})
