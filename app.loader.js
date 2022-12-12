/* import { InitJobPlugin, JobsBaseInstaller } from './app.jobs.context.js' */
import * as AppContext from './app.base.context.js'

export async function Load (Config) {
  if (Config.mode === 'live' || Config.mode === 'release') {
    await AppContext.InitPluginBaseSystem()
    await AppContext.PluginBaseInstaller()
    await AppContext.LoadPluginJobs()
  } else if (Config.mode === 'development' || Config.mode === 'garage') {
    await AppContext.InitPluginBaseSystemDEV()
    await AppContext.PluginBaseInstallerDEV()
    await AppContext.LoadPluginJobsDEV()
  } else {
    throw new Error('Config mode bulunamadı app yüklenemez')
  }
}
