import { listExercises } from '../../services/exercises'

export default defineApiHandler(() => listExercises(useDb()))
