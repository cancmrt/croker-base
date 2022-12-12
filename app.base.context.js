import * as fs from 'fs'
import * as path from 'path'
import * as cp from 'child_process'
import * as os from 'os'
import * as tar from 'tar'
import { DataTypes } from 'sequelize'
import { Context } from './app.dbcontext.js'
import { PluginTypes } from './app.plugins.type.js'

export const Plugins = Context.define('Plugins', {
  Id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  Name: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: ''
  },
  PackageName: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: ''
  },
  Type: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: ''
  },
  Filename: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: ''
  },
  Config: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '* * * * *'
  },
  IsActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  IsRunning: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
})
export const PluginLogs = Context.define('PluginLogs', {
  Id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  Name: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: ''
  },
  Message: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: ''
  },
  ExecuteTime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  IsError: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  IsWarning: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
})

export async function InitPluginBaseSystem () {
  await Context.sync()
  const reqPath = path.join(global.__dirname, 'plugins')
  if (!fs.existsSync(reqPath)) {
    fs.mkdirSync(reqPath, { recursive: true })
  }
}
export async function InitPluginBaseSystemDEV () {
  await Context.sync()
  const reqPath = path.join(global.__dirname, 'plugins-dev')
  if (!fs.existsSync(reqPath)) {
    fs.mkdirSync(reqPath, { recursive: true })
  }
}

export async function PluginBaseInstaller () {
  let restartRequired = false
  const pluginsPath = path.join(global.__dirname, 'plugins')
  const tgzFiles = fs.readdirSync(pluginsPath).filter(file => path.extname(file) === '.tgz')
  for await (const plugin of tgzFiles) {
    const pluginPath = path.join(pluginsPath, plugin)
    const pluginExtractedTempPath = path.join(pluginsPath, plugin + '-temp')
    // ensure path has package.json
    if (!fs.existsSync(pluginExtractedTempPath)) {
      fs.mkdirSync(pluginExtractedTempPath, { recursive: true })
    }
    await tar.x({
      file: pluginPath,
      cwd: pluginExtractedTempPath
    })
    const pluginJSONPath = path.join(pluginExtractedTempPath, 'package', 'plugin.json')
    const pluginPackageJSONPath = path.join(pluginExtractedTempPath, 'package', 'package.json')
    const pluginJSON = JSON.parse(fs.readFileSync(pluginJSONPath))
    const pluginPackageJSON = JSON.parse(fs.readFileSync(pluginPackageJSONPath))
    let countOfDep = 0
    let countOfDepSatisfy = 0
    if (pluginJSON.Config.Depent) {
      countOfDep = pluginJSON.Config.Depent.length
    }

    const baseAppPackageJSON = JSON.parse(fs.readFileSync(path.join(global.__dirname, 'package.json')))

    for await (const baseDep of Object.keys(baseAppPackageJSON.dependencies)) {
      if (pluginJSON.Config.Depent) {
        pluginJSON.forEach(dep => {
          if (dep === baseDep) {
            countOfDepSatisfy = countOfDepSatisfy + 1
          }
        })
      }
    }
    fs.rmSync(pluginExtractedTempPath, { recursive: true })
    if (countOfDepSatisfy !== countOfDep) {
      await PluginLogs.create({
        Name: pluginJSON.Name,
        Message: 'Plugin dependencies not installed on system. Plugin depent: ' + JSON.stringify(pluginJSON.Config.Depent),
        ExecuteTime: new Date(),
        IsError: true,
        IsWarning: false
      })
    } else {
      const findedPlugin = await Plugins.findOne({
        where: {
          Name: pluginJSON.Name
        }
      })

      if (findedPlugin === null) {
        const isRequiredRestart = await NPMInstaller(pluginPath)
        if (isRequiredRestart === true) {
          restartRequired = true
        }
        await Plugins.create({
          Type: pluginJSON.Type,
          Name: pluginJSON.Name,
          PackageName: pluginPackageJSON.name,
          Filename: plugin,
          Config: JSON.stringify(pluginJSON.Config)
        })
        await PluginLogs.create({
          Name: pluginJSON.Name,
          Message: 'Plugin successfully installed',
          ExecuteTime: new Date(),
          IsError: true,
          IsWarning: false
        })
      } else {
        const isRequiredRestart = await NPMInstaller(pluginPath)
        if (isRequiredRestart === true) {
          restartRequired = true
          await Plugins.update({
            Type: pluginJSON.Type,
            Name: pluginJSON.Name,
            PackageName: pluginPackageJSON.name,
            Filename: plugin,
            Config: JSON.stringify(pluginJSON.Config)
          }, {
            where: {
              Name: findedPlugin.Name
            }
          })
        }
      }
    }
  }
  if (restartRequired === true) {
    console.log('restart')
  }
}

export async function PluginBaseInstallerDEV () {
  const pluginsPath = path.join(global.__dirname, 'plugins-dev')
  const pluginFolders = fs.readdirSync(pluginsPath).filter(file => path.extname(file) === '')
  for await (const plugin of pluginFolders) {
    const pluginPath = path.join(pluginsPath, plugin)

    const pluginJSONPath = path.join(pluginPath, 'plugin.json')
    const pluginPackageJSONPath = path.join(pluginPath, 'package.json')
    const pluginJSON = JSON.parse(fs.readFileSync(pluginJSONPath))
    const pluginPackageJSON = JSON.parse(fs.readFileSync(pluginPackageJSONPath))
    let countOfDep = 0
    let countOfDepSatisfy = 0
    if (pluginJSON.Config.Depent) {
      countOfDep = pluginJSON.Config.Depent.length
    }

    const baseAppPackageJSON = JSON.parse(fs.readFileSync(path.join(global.__dirname, 'package.json')))

    for await (const baseDep of Object.keys(baseAppPackageJSON.dependencies)) {
      if (pluginJSON.Config.Depent) {
        pluginJSON.forEach(dep => {
          if (dep === baseDep) {
            countOfDepSatisfy = countOfDepSatisfy + 1
          }
        })
      }
    }
    if (countOfDepSatisfy !== countOfDep) {
      await PluginLogs.create({
        Name: pluginJSON.Name,
        Message: 'Plugin dependencies not installed on system. Plugin depent: ' + JSON.stringify(pluginJSON.Config.Depent),
        ExecuteTime: new Date(),
        IsError: true,
        IsWarning: false
      })
    } else {
      const findedPlugin = await Plugins.findOne({
        where: {
          Name: pluginJSON.Name
        }
      })

      if (findedPlugin === null) {
        await Plugins.create({
          Type: pluginJSON.Type,
          Name: pluginJSON.Name,
          PackageName: pluginPackageJSON.name,
          Filename: plugin,
          Config: JSON.stringify(pluginJSON.Config)
        })
        await PluginLogs.create({
          Name: pluginJSON.Name,
          Message: 'Plugin successfully installed',
          ExecuteTime: new Date(),
          IsError: true,
          IsWarning: false
        })
      } else {
        await Plugins.update({
          Type: pluginJSON.Type,
          Name: pluginJSON.Name,
          PackageName: pluginPackageJSON.name,
          Filename: plugin,
          Config: JSON.stringify(pluginJSON.Config)
        }, {
          where: {
            Name: findedPlugin.Name
          }
        })
      }
    }
  }
}

export async function LoadPluginJobs () {
  const allJobs = await Plugins.findAll({
    where: {
      Type: PluginTypes.Job,
      IsActive: true
    }
  })

  for await (const job of allJobs) {
    const jobClass = await import(job.PackageName)
    job.Config = JSON.parse(job.Config)
    const createdClass = new jobClass[job.Config.SPointClass](job)
    await createdClass.Install()
    await createdClass.Start()
    global.JobContainer.push(createdClass)
  };
}
export async function LoadPluginJobsDEV () {
  const allJobs = await Plugins.findAll({
    where: {
      Type: PluginTypes.Job,
      IsActive: true
    }
  })

  for await (const job of allJobs) {
    job.Config = JSON.parse(job.Config)
    const devPath = path.join('file:///', global.__dirname, 'plugins-dev', job.Filename, job.Config.SPoint)
    const jobClass = await import(devPath)
    const createdClass = new jobClass[job.Config.SPointClass](job)
    await createdClass.Install()
    await createdClass.Start()
    global.JobContainer.push(createdClass)
  };
}
async function NPMInstaller (InstallPath) {
  const npmCmd = os.platform().startsWith('win') ? 'npm.cmd' : 'npm'
  const resultOfInstallation = cp.spawnSync(npmCmd, ['install', InstallPath], {
    env: process.env,
    cwd: global.__dirname,
    encoding: 'utf-8'
  })

  if (resultOfInstallation.status !== 0) {
    throw new Error(resultOfInstallation.stderr)
  } else {
    if (resultOfInstallation.stdout.includes('added')) {
      return true
    } else {
      return false
    }
  }
}
