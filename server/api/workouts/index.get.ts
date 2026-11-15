import { listWorkouts } from '../../services/workouts'

export default defineApiHandler(() => listWorkouts(useDb()))
