import { JobsModels } from './JobsModels';

export abstract class JobsLogger{

    private Models:JobsModels;
    private JobName:string;

    constructor(JobName:string){
        this.JobName = JobName;
        this.Models = new JobsModels();
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
}