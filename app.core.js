import * as fs from 'fs'
import * as path from 'path'

export async function Start () {
  global.JobContainer = []
  global.__dirname = process.cwd()

  const reqPath = path.join(global.__dirname, 'config')
  if (!fs.existsSync(reqPath)) {
    fs.mkdirSync(reqPath, { recursive: true })
  }

  let configFile = path.join(global.__dirname, 'config', 'config.js')
  if (!fs.existsSync(configFile)) {
    fs.writeFileSync(configFile, `export default {
            mode:"development",
            db:{
                development:{
                    database:"",
                    username:"",
                    password:"",
                    configuration:{
                        dialect: "sqlite",
                        storage: "dev-db/croker.db"
                    }
                 }
            }
        }`)
  }
  configFile = path.join('file:///', configFile)
  const config = await import(configFile)

  process.env.NODE_ENV = config.default.mode

  process.stdin.resume()

  // do something when app is closing
  process.on('exit', exitHandler)

  // catches ctrl+c event
  process.on('SIGINT', exitHandler)

  // catches "kill pid" (for example: nodemon restart)
  process.on('SIGUSR1', exitHandler)
  process.on('SIGUSR2', exitHandler)

  // catches uncaught exceptions
  process.on('uncaughtException', async (err) => {
    console.log(err)
    for await (const job of global.JobContainer) {
      await job.Stop()
    }
    process.exit(-1)
  })

  const appLoader = await import('./app.loader.js')
  await appLoader.Load()

  const appStarter = await import('./app.starter.js')
  await appStarter.Start()
}
async function exitHandler () {
  for await (const job of global.JobContainer) {
    await job.Stop()
  }
  process.exit(0)
}
