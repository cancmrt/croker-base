
import { CronJob } from 'cron';
import * as fs from 'fs';
import * as path from 'path'
import {Jobs} from './models/Jobs';
import {JobLogs} from './models/JobLogs';

export abstract class CrokerJobs {

    public abstract Name:string
    public abstract ExecuterClass:string
    public abstract ExecuteCronTime:string
    public abstract Version:string


    private CrokerCronJob:CronJob | undefined;

    constructor(){
    }

    private async Init() {
        this.Job = await this.Client?.jobs.findFirstOrThrow({
            where:{
                AND:{
                    Name:{
                        equals: this.Name
                    },
                    IsDeleted:{
                        equals:false
                    }
                }
                
            },
            include:{
                Params:true
            }
        });
        await this.Client?.$disconnect();
    }

    public async SystemInstaller(){
        await this.Client?.$connect();
        let jobFinded = await this.Client?.jobs.findFirst({
            where:{
                AND:{
                    Name:{
                        equals: this.Name
                    },
                    IsDeleted:{
                        equals: false
                    }
                } 
            }
        });
        await this.Client?.$disconnect();
        if(jobFinded == undefined){
            
            try{
                await this.Client?.$connect();
                let createdJob = await this.Client?.jobs.create({
                    data:{
                        Name: this.Name,
                        ExecuterClass: this.ExecuterClass,
                        ExecuteCronTime: this.ExecuteCronTime,
                        Version: this.Version,
                        IsActive:true,
                        IsRunningNow:false,
                        IsDeleted:false
                    }
                });
                await this.Client?.$disconnect();
                if(createdJob === undefined){
                    throw Error("Job database seviyesinde yaratılamadı...");
                }
                this.SqlFileRunner("install");
                await JobsLogger.Info(this.Name,"Job "+this.Name+" Version: "+this.Version+" pre-installation successfully");
                await this.Install(createdJob);
                await JobsLogger.Info(this.Name,"Job "+this.Name+" Version: "+this.Version+" installed greacfully");
            }
            catch(ex){
                throw Error("Job yaratılırken bir sorun oluştu"+JSON.stringify(ex));
            }
            
        }
        else{
            if(jobFinded.Version !== this.Version || jobFinded.ExecuterClass !== this.ExecuterClass || jobFinded.ExecuteCronTime !== this.ExecuteCronTime){
                await JobsLogger.Info(this.Name,"Job "+this.Name+" old version detected");
                try{
                    await this.Install(jobFinded);
                    await this.Client?.$connect();
                    await this.Client?.jobs.update({
                        where: {
                            Id: jobFinded?.Id
                        },
                        data: {
                            ExecuterClass: this.ExecuterClass,
                            ExecuteCronTime: this.ExecuteCronTime,
                            Version: this.Version

                        },
                    });
                    await this.Client?.$disconnect();
                    await this.SqlFileRunner("update");
                    await JobsLogger.Info(this.Name,"Job "+this.Name+" new version installed greacfully");
                }
                catch(ex){
                    await JobsLogger.Error(this.Name,JSON.stringify(ex));
                }

            }

        }
        
    }
    private async SqlFileRunner(FileName:string){
        try{
            let sqlPath = path.join(__dirname, '../jobs/' + this.ExecuterClass + "/sql");
            let directoryExist = fs.existsSync(sqlPath);
            if (directoryExist) {
                let rawSql = await import(path.join(__dirname, '../jobs/'+this.ExecuterClass+"/sql/"+FileName));
                rawSql = rawSql[FileName]
                const sqlReducedToStatements = rawSql
                    .split('\n')
                    .filter((line: string) => !line.startsWith('--')) // remove comments-only lines
                    .join('\n')
                    .replace(/\r\n|\n|\r/g, ' ') // remove newlines
                    .replace(/\s+/g, ' '); // excess white space
                const sqlStatements = this.splitStringByNotQuotedSemicolon(sqlReducedToStatements);
                this.Client?.$connect();
                for (const sql of sqlStatements) {
                    await this.Client?.$executeRawUnsafe(sql);
                }
            }
            
        }
        catch(ex){
            console.error(ex);
            process.exit(1);
        }
        finally{
            this.Client?.$disconnect();
        }
        
    }

    private splitStringByNotQuotedSemicolon(input: string): string[] {
        const result = [];
      
        let currentSplitIndex = 0;
        let isInString = false;
        for (let i = 0; i < input.length; i++) {
          if (input[i] === "'") {
            // toggle isInString
            isInString = !isInString;
          }
          if (input[i] === ';' && !isInString) {
            result.push(input.substring(currentSplitIndex, i + 1));
            currentSplitIndex = i + 2;
          }
        }
      
        return result;
      }
      

    public async AddValue(Name:string, Value:string, Date:Date){
        await this.Client?.$connect();
        let findedJob = await this.Client?.jobs.findFirstOrThrow({
            where:{
                AND:{
                    Name:{
                        equals: this.Name
                    },
                    IsDeleted:{
                        equals:false
                    }
                }
            },
            include:{
                Params:true
            }
        });
        await this.Client?.jobValues.create({
            data:{
                Name:Name,
                Value:Value,
                DateOfValue:Date,
                JobId:findedJob?.Id || 0,

            }
        });
        await this.Client?.$disconnect();
    }
    public async RemoveValue(ValueId:number){
        await this.Client?.$connect();
        
        await this.Client?.jobValues.update({
            where:{
                Id:ValueId
            },
            data:{
                IsDeleted:true
            }
        });
        await this.Client?.$disconnect();
    }
    public async GetParam(Name:string):Promise<JobParams | undefined>{
        await this.Client?.$connect();
        let findedParam = await this.Client?.jobParams.findFirstOrThrow({
            where:{
                AND:{
                    Name:{
                        equals:Name
                    },
                    JobId:{
                        equals:this.Job?.Id
                    },
                    IsDeleted:{
                        equals:false
                    }
                }
            }
        });
        await this.Client?.$disconnect();
        return findedParam;
    }

    public async AddParam(Name:string,Value:string){
        await this.Client?.$connect();
        let findedJob = await this.Client?.jobs.findFirstOrThrow({
            where:{
                AND:{
                    Name:{
                        equals: this.Name
                    },
                    IsDeleted:{
                        equals:false
                    }
                }
            }
        });
        let findedParam = await this.Client?.jobParams.findFirst({
            where:{
                AND:{
                    Name:{
                        equals: Name
                    },
                    JobId:{
                        equals:findedJob?.Id
                    }
                }
                
            }
        });
        if(findedParam != undefined){
            await this.Client?.jobParams.update({
                where:{
                    Id:findedParam.Id
                },
                data:{
                    Name:Name,
                    Value:Value
                }
            })
        }
        else{
            await this.Client?.jobParams.create({
                data:{
                    Name:Name,
                    Value:Value,
                    IsDeleted: false,
                    JobId:findedJob?.Id || 0
                }
            });
        }
        await this.Client?.$disconnect();
        
    }
    public async RemoveParam(Name:string){
        await this.Client?.$connect();
        let findedJob = await this.Client?.jobs.findFirstOrThrow({
            where:{
                AND:{
                    Name:{
                        equals: this.Name
                    },
                    IsDeleted:{
                        equals:false
                    }
                }
            }
        });
        let findedParam = await this.Client?.jobParams.findFirstOrThrow({
            where:{
                AND:{
                    Name:{
                        equals: Name
                    },
                    JobId:{
                        equals:findedJob?.Id
                    }
                }
                
            }
        });
        await this.Client?.jobParams.update({
            where: {
              Id: findedParam?.Id
            },
            data: {
              IsDeleted:true
            },
        });
        await this.Client?.$disconnect();
    }

    public async Start(){

        await this.Init();
        if(this.Job !== undefined){
            await JobsLogger.Info(this.Job.Name,"Job " + this.Job?.Name + " Started...")
            if(this.CrokerCronJob === undefined){
                this.CrokerCronJob = new CronJob(this.Job.ExecuteCronTime,
                async () => {

                    await this.Client?.$connect();
                    await this.Client?.jobs.update({
                        where: {
                          Id: this.Job?.Id
                        },
                        data: {
                          IsRunningNow:true
                        },
                    });
                    await this.Client?.$disconnect();
                    await JobsLogger.Info(this.Job?.Name || "","Job " + this.Job?.Name + " Run Start...")
                    
                    try{
                        await this.Run(this);
                        await JobsLogger.Info(this.Job?.Name || "","Job " + this.Job?.Name + " Run End...")
                        
                    }
                    catch(ex){
                        await JobsLogger.Error(this.Job?.Name || "",JSON.stringify(ex))
                    }
                    
                    await this.Client?.$connect();
                    await this.Client?.jobs.update({
                        where: {
                          Id: this.Job?.Id
                        },
                        data: {
                          IsRunningNow:false
                        },
                    });
                    await this.Client?.$disconnect();
                },async () => {
                    await this.Completed(this);
                    await JobsLogger.Info(this.Job?.Name || "","Job " + this.Job?.Name + " End Greacfully")
                });
            }
            this.CrokerCronJob.start();
        }
        else{
            throw Error("Bulunamayan job başlatılamaz");
        }
        
    }

    public async Stop(){
        if(this.CrokerCronJob !== undefined){
            if(this.Job !== undefined){
                await this.Client?.$connect();
                await this.Client?.jobs.update({
                    where: {
                      Id: this.Job?.Id
                    },
                    data: {
                      IsRunningNow:false
                    },
                });
                await this.Client?.$disconnect();
                await JobsLogger.Info(this.Job?.Name || "","Job " + this.Job?.Name + " Stopped...")
            }
            this.CrokerCronJob?.stop();
        }
        else{
            throw Error("Bulunamayan job durdurulamaz");
        }
    }

    public async Info(Message:string) {
        
        this.Models.JobLogs.create({
            JobId:
        });
        await client.$connect();
        let jobFinded = await client.jobs.findFirstOrThrow({
            where:{
                OR:{
                    Name:{
                        equals: JobName
                    }
                }
                
            },
            include:{
                Params:true
            }
        });
        await client.jobLogs.create({
            data:{
                ExecuteTime: new Date(),
                IsError: false,
                IsWarning: false,
                Message: Message,
                JobId : jobFinded.Id || 0
    
            }
        });
        await client.$disconnect();
        
    }
    public static async Error(JobName:string, Message:string) {
        
        let client = new PrismaClient
        await client.$connect();
        let jobFinded =  await client.jobs.findFirstOrThrow({
            where:{
                OR:{
                    Name:{
                        equals: JobName
                    }
                }
                
            },
            include:{
                Params:true
            }
        });
        await client.jobLogs.create({
            data:{
                ExecuteTime: new Date(),
                IsError: true,
                IsWarning: false,
                Message: Message,
                JobId : jobFinded.Id || 0
    
            }
        });
        await client.$disconnect();
        
    }
    public static async Warning(JobName:string, Message:string) {
        
        let client = new PrismaClient
        await client.$connect();
        let jobFinded =  await client.jobs.findFirstOrThrow({
            where:{
                OR:{
                    Name:{
                        equals: JobName
                    }
                }
                
            },
            include:{
                Params:true
            }
        });
        await client.jobLogs.create({
            data:{
                ExecuteTime: new Date(),
                IsError: false,
                IsWarning: true,
                Message: Message,
                JobId : jobFinded.Id || 0
    
            }
        });
        await client.$disconnect();
        
    }

    public abstract Install(Job:Jobs): Promise<void>;
    public abstract Run(BaseJob:CrokerJobs): Promise<void>;
    public abstract Completed(BaseJob:CrokerJobs): Promise<void>;


}