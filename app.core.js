import * as fs from 'fs'
import * as path from 'path'
import * as cp from 'child_process'
import * as os from 'os'

export async function Start () {
  global.JobContainer = []
  global.LoadJobContainer = []
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

  await NPMInstaller()

  // const appLoader = await import('./app.loader.js')
  // await appLoader.Load()

  // const appStarter = await import('./app.starter.js')
  // await appStarter.Start()
}

async function NPMInstaller () {
  let restartRequired = false
  const jobsPath = path.join(global.__dirname, 'jobs')
  fs.readdirSync(jobsPath).forEach(async function (job) {
    const jobPath = path.join(jobsPath, job)

    // ensure path has package.json
    if (!fs.existsSync(path.join(jobPath, 'package.json'))) {
      throw new Error('Job package.json dosyasına sahip değil.')
    }
    const jobPackageJSONPath = path.join(jobPath, 'package.json')
    const jobPackageJSON = JSON.parse(fs.readFileSync(jobPackageJSONPath))

    // npm binary based on OS
    const npmCmd = os.platform().startsWith('win') ? 'npm.cmd' : 'npm'
    const fileName = jobPackageJSON.name + '-' + jobPackageJSON.version + '.tgz'
    const npmJobPackagePathParam = 'jobs/' + job + '/' + fileName
    // install folder
    const resultOfInstallation = cp.spawnSync(npmCmd, ['install', npmJobPackagePathParam], {
      env: process.env,
      cwd: global.__dirname,
      encoding: 'utf-8'
    })

    if (resultOfInstallation.status !== 0) {
      throw new Error(resultOfInstallation.stderr)
    } else {
      global.LoadJobContainer.push(jobPackageJSON.name)
    }

    if (resultOfInstallation.stdout.includes('added')) {
      restartRequired = true
    }
  })
  if (restartRequired === true) {
    const subprocess = cp.spawnSync(process.argv[1], process.argv.slice(2), { detached: true })
    subprocess.unref()
  }
}

async function exitHandler () {
  for await (const job of global.JobContainer) {
    await job.Stop()
  }
  process.exit(0)
}
