import { parseId } from '../../../lib/errors'
import { getExerciseProgress } from '../../../services/progress'

export default defineApiHandler((event) => {
  return getExerciseProgress(useDb(), parseId(getRouterParam(event, 'id'), 'Exercise'))
})
