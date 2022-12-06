import * as fs from 'fs'
import * as path from 'path'
import { DataTypes } from 'sequelize'
import { Context } from './app.dbcontext.js'
import { CronJob } from 'cron'

export const Jobs = Context.define('Jobs', {
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
  ExecuterClass: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: ''
  },
  ExecuterCronTime: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '* * * * *'
  },
  Version: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '1.0.0'
  },
  IsDeleted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  IsActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  IsRunningNow: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
})
export const JobLogs = Context.define('JobLogs', {
  Id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  JobId: {
    type: DataTypes.INTEGER,
    allowNull: false
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

export async function InitJobPlugin () {
  await Context.sync()
  const reqPath = path.join(global.__dirname, 'jobs')
  if (!fs.existsSync(reqPath)) {
    fs.mkdirSync(reqPath, { recursive: true })
  }
}

export async function JobsBaseInstaller () {
  const reqPath = path.join(global.__dirname, 'jobs')
  const getDirectories = fs.readdirSync(reqPath)
  for await (const dir of getDirectories) {
    if (path.extname(dir) === '') {
      const basePathName = path.basename(dir)
      const jobClass = await import('./jobs/' + basePathName + '/' + basePathName + '.js')
      const createdClass = new jobClass[basePathName]()
      await createdClass.SystemInstaller()
    }
  };
}
export async function LoadAllJobs () {
  const allJobs = await Jobs.findAll({
    where: {
      IsActive: true,
      IsDeleted: false
    }
  })

  for await (const job of allJobs) {
    const jobClass = await import('./jobs/' + job.ExecuterClass + '/' + job.ExecuterClass + '.js')
    const createdClass = new jobClass[job.ExecuterClass]()
    await createdClass.Start()
    global.JobContainer.push(createdClass)
  };
}

export class CrokerJobs {
  Name = undefined
  ExecuterClass = undefined
  ExecuteCronTime = undefined
  Version = undefined
  constructor (Name, ExecuterClass, ExecuteCronTime, Version) {
    this.Name = Name
    this.ExecuterClass = ExecuterClass
    this.ExecuteCronTime = ExecuteCronTime
    this.Version = Version
  }

  async GetJob () {
    return await Jobs.findOne({
      where: {
        Name: this.Name,
        IsDeleted: false
      }
    })
  }

  async SystemInstaller () {
    const jobFinded = await this.GetJob()

    if (jobFinded === null) {
      try {
        const createdJob = await Jobs.create({
          Name: this.Name,
          ExecuterClass: this.ExecuterClass,
          ExecuteCronTime: this.ExecuteCronTime,
          Version: this.Version,
          IsActive: true,
          IsRunningNow: false,
          IsDeleted: false
        })
        if (createdJob === null) {
          throw new Error('Job database seviyesinde yaratılamadı...')
        }
        await this.JobInfo('Job ' + this.Name + ' Version: ' + this.Version + ' pre-installation successfully')
        await this.Install(createdJob)
        await this.JobInfo('Job ' + this.Name + ' Version: ' + this.Version + ' installed greacfully')
      } catch (ex) {
        throw Error('Job yaratılırken bir sorun oluştu' + JSON.stringify(ex))
      }
    } else {
      if (jobFinded.Version !== this.Version || jobFinded.ExecuterClass !== this.ExecuterClass || jobFinded.ExecuteCronTime !== this.ExecuteCronTime) {
        await this.JobInfo('Job ' + this.Name + ' old version detected')
        try {
          await this.Install(jobFinded)
          const updatedJob = await Jobs.update({
            ExecuterClass: this.ExecuterClass,
            ExecuteCronTime: this.ExecuteCronTime,
            Version: this.Version
          }, {
            where: {
              Id: jobFinded.Id
            }
          })
          if (updatedJob === null) {
            throw new Error('Job database seviyesinde güncellenemedi...')
          }
          await this.JobInfo('Job ' + this.Name + ' new version installed greacfully')
        } catch (ex) {
          await this.JobError('Job güncellenirken sorun oluştu' + JSON.stringify(ex))
        }
      }
    }
  }

  async Start () {
    const findedJob = await this.GetJob()
    if (findedJob !== null) {
      await this.JobInfo('Job ' + findedJob.Name + ' Started...')
      if (this.CrokerCronJob === undefined) {
        this.CrokerCronJob = new CronJob(findedJob.ExecuterCronTime,
          async () => {
            let updatedJobs = await Jobs.update({ IsRunningNow: true }, {
              where: {
                Id: findedJob.Id
              }
            })
            if (updatedJobs === null) {
              throw new Error('Job parametreleri update edilemiyor')
            }

            await this.JobInfo('Job ' + findedJob.Name + ' Run Start...')

            try {
              await this.Run(this)
              await this.JobInfo('Job ' + this.Job?.Name + ' Run End...')
            } catch (ex) {
              await this.JobError(JSON.stringify(ex))
            }
            updatedJobs = await Jobs.update({ IsRunningNow: false }, {
              where: {
                Id: findedJob.Id
              }
            })
            if (updatedJobs === null) {
              throw new Error('Job parametreleri çalıştıktan sonra update edilemiyor')
            }
          }, async () => {
            await this.Completed(this)
            await this.JobInfo('Job ' + findedJob.Name + ' End Greacfully')
          })
      }
      this.CrokerCronJob.start()
    } else {
      throw Error('Bulunamayan job başlatılamaz')
    }
  }

  async Stop () {
    if (this.CrokerCronJob !== undefined) {
      const findedJob = await this.GetJob()
      if (findedJob !== undefined) {
        await Jobs.update({ IsRunningNow: false }, {
          where: {
            Id: findedJob.Id
          }
        })
        await this.JobInfo('Job ' + this.Job?.Name + ' Stopped...')
      }
      this.CrokerCronJob.stop()
    } else {
      throw new Error('Bulunamayan job durdurulamaz')
    }
  }

  async JobInfo (Message) {
    const FindedJobs = await this.GetJob()

    const createdLog = await JobLogs.create({
      JobId: FindedJobs.Id,
      Message,
      ExecuteTime: new Date(),
      IsError: false,
      IsWarning: false

    })
    if (createdLog === undefined) {
      throw new Error('Job Info logu yaratılamadı')
    }
  }

  async JobError (Message) {
    const FindedJobs = await this.GetJob()

    const createdLog = await JobLogs.create({
      JobId: FindedJobs.Id,
      Message,
      ExecuteTime: new Date(),
      IsError: true,
      IsWarning: false

    })
    if (createdLog === undefined) {
      throw new Error('Job Error logu yaratılamadı')
    }
  }

  async JobWarning (Message) {
    const FindedJobs = await this.GetJob()

    const createdLog = await JobLogs.create({
      JobId: FindedJobs.Id,
      Message,
      ExecuteTime: new Date(),
      IsError: false,
      IsWarning: true

    })
    if (createdLog === undefined) {
      throw new Error('Job Warning logu yaratılamadı')
    }
  }

  async Install (Job) {
    throw new Error('Method Install() must be implemented')
  }

  async Run (BaseJob) {
    throw new Error('Method Run() must be implemented')
  }

  async Completed (BaseJob) {
    throw new Error('Method Run() must be implemented')
  }
}
