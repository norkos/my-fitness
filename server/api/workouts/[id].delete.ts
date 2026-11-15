import { parseId } from '../../lib/errors'
import { deleteWorkout } from '../../services/workouts'

export default defineApiHandler((event) => {
  deleteWorkout(useDb(), parseId(getRouterParam(event, 'id'), 'Workout'))
  setResponseStatus(event, 204)
  return null
})
