import { createWorkout } from '../../services/workouts'

export default defineApiHandler(async (event) => {
  const workout = createWorkout(useDb(), await readJsonBody(event))
  setResponseStatus(event, 201)
  return workout
})
