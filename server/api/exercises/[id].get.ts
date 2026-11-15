import { parseId } from '../../lib/errors'
import { getExercise } from '../../services/exercises'

export default defineApiHandler((event) => {
  return getExercise(useDb(), parseId(getRouterParam(event, 'id'), 'Exercise'))
})
