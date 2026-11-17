import { importPlan } from '../../services/plan-imports'

export default defineApiHandler(async (event) => {
  const draft = importPlan(useDb(), await readJsonBody(event))
  setResponseStatus(event, 201)
  return draft
})
