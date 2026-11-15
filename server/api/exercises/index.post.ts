import { createExercise } from '../../services/exercises'

export default defineApiHandler(async (event) => {
  const exercise = createExercise(useDb(), await readJsonBody(event))
  setResponseStatus(event, 201)
  return exercise
})
