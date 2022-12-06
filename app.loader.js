import { InitJobPlugin, JobsBaseInstaller } from './app.jobs.context.js'

export async function Load () {
  await InitJobPlugin()
  await JobsBaseInstaller()
}
