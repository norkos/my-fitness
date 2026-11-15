import { findConfigProblems } from '../lib/config'

export default defineNitroPlugin(() => {
  const problems = findConfigProblems(process.env)
  if (problems.length) {
    console.error(`[my-fitness] Refusing to start: ${problems.join('; ')}.`)
    process.exit(1)
  }
})
