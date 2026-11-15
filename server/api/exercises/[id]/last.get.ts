import { parseId } from '../../../lib/errors'
import { getLastTime } from '../../../services/workouts'

export default defineApiHandler((event) => {
  const id = parseId(getRouterParam(event, 'id'), 'Exercise')
  const before = getQuery(event).before
  return getLastTime(useDb(), id, typeof before === 'string' && before ? before : undefined)
})
