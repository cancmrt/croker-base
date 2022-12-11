import { CronJob } from 'cron'
import { Plugins, PluginLogs } from './app.base.context.js'

export class CrokerJobs {
  CrokerPlugin = undefined
  constructor (Plugin) {
    this.CrokerPlugin = Plugin
  }

  async GetJob () {
    return this.CrokerPlugin
  }

  async Start () {
    const findedJob = await this.GetJob()
    if (findedJob !== null) {
      await this.JobInfo('Job ' + findedJob.Name + ' Started...')
      if (this.CrokerCronJob === undefined) {
        if (findedJob.Config && !findedJob.Config.JobCronTime) {
          throw new Error('JobCronTime parametresi tanımlı değil, configde tanımlanmalı.')
        }
        this.CrokerCronJob = new CronJob(findedJob.Config.JobCronTime,
          async () => {
            let updatedJobs = await Plugins.update({ IsRunningNow: true }, {
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
              await this.JobInfo('Job ' + findedJob.Name + ' Run End...')
            } catch (ex) {
              await this.JobError(JSON.stringify(ex))
            }
            updatedJobs = await Plugins.update({ IsRunningNow: false }, {
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
        await Plugins.update({ IsRunningNow: false }, {
          where: {
            Id: findedJob.Id
          }
        })
        await this.JobInfo('Job ' + findedJob.Name + ' Stopped...')
      }
      this.CrokerCronJob.stop()
    } else {
      throw new Error('Bulunamayan job durdurulamaz')
    }
  }

  async JobInfo (Message) {
    const FindedJobs = await this.GetJob()

    const createdLog = await PluginLogs.create({
      Name: FindedJobs.Name,
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

    const createdLog = await PluginLogs.create({
      Name: FindedJobs.Name,
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

    const createdLog = await PluginLogs.create({
      Name: FindedJobs.Name,
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
