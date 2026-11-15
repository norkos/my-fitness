import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { EXERCISE_KINDS, SESSION_TYPES } from '../../shared/kinds'

export const exercises = sqliteTable('exercises', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  nameKey: text('name_key').notNull().unique(),
  kind: text('kind', { enum: EXERCISE_KINDS }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
})

export const workouts = sqliteTable('workouts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),
  sessionType: text('session_type', { enum: SESSION_TYPES }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, t => [index('workouts_date_idx').on(t.date)])

export const workoutExercises = sqliteTable('workout_exercises', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  workoutId: integer('workout_id').notNull().references(() => workouts.id, { onDelete: 'cascade' }),
  exerciseId: integer('exercise_id').notNull().references(() => exercises.id, { onDelete: 'restrict' }),
  position: integer('position').notNull(),
}, t => [
  index('workout_exercises_workout_idx').on(t.workoutId),
  index('workout_exercises_exercise_idx').on(t.exerciseId),
])

export const sets = sqliteTable('sets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  workoutExerciseId: integer('workout_exercise_id').notNull().references(() => workoutExercises.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  weightKg: real('weight_kg'),
  reps: integer('reps'),
  durationS: integer('duration_s'),
  distanceM: integer('distance_m'),
}, t => [index('sets_workout_exercise_idx').on(t.workoutExerciseId)])
