/* import { InitJobPlugin, JobsBaseInstaller } from './app.jobs.context.js' */
import { InitPluginBaseSystem, PluginBaseInstaller, LoadPluginJobs } from './app.base.context.js'

export async function Load () {
  /* await InitJobPlugin()
  await JobsBaseInstaller() */
  await InitPluginBaseSystem()
  await PluginBaseInstaller()
  await LoadPluginJobs()
}
