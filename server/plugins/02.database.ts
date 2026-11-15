export default defineNitroPlugin(() => {
  try {
    initDatabase()
  }
  catch (error) {
    // Keep serving so the health endpoint can report the problem.
    console.error('[my-fitness] Could not open or migrate the database:', (error as Error).message)
  }
})
