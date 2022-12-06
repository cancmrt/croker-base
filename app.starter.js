import { LoadAllJobs } from './app.jobs.context.js'

export async function Start () {
  await LoadAllJobs()
}
