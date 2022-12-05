import * as fs from 'fs';
import * as path from 'path'
import { DataTypes } from 'sequelize';
import Context from './app.dbcontext';

export default {
    Jobs,
    JobLogs,
    InitJobPlugin,
    JobsBaseInstaller,
    LoadAllJobs,
    CrokerJobs
}

const Jobs = Context.define('Jobs',{
            Id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true
            },
            Name: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: ""
            },
            ExecuterClass: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: ""
            },
            ExecuterCronTime: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: "* * * * *"
            },
            Version:{
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: "1.0.0"
            },
            IsDeleted:{
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            IsActive:{
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true
            },
            IsRunningNow:{
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            }
});
const JobLogs = context.define('JobLogs',{
            Id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true
            },
            JobId: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            Message: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: ""
            },
            ExecuteTime: {
                type: DataTypes.DATE,
                allowNull: false
            },
            IsError:{
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            IsWarning:{
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            }
});

async function InitJobPlugin(){
    await context.sync();
}

async function JobsBaseInstaller(){
    let reqPath = path.join(__dirname, 'jobs');
    let getDirectories = fs.readdirSync(reqPath)
    for await (const dir of getDirectories) {
        if(path.extname(dir) == ""){
            let basePathName = path.basename(dir);
            let jobClass = await import("jobs/"+basePathName+"/"+basePathName);
            let createdClass = new jobClass[basePathName]();
            await createdClass.SystemInstaller();
        }
    };
}
async function LoadAllJobs(){
    let allJobs = await Jobs.findAll({
        where:{
            IsActive:false,
            IsDeleted:true
        }
    });

    for await (const job of allJobs) {
        let jobClass = await import("jobs/"+job.ExecuterClass+"/"+job.ExecuterClass);
        let createdClass = new jobClass[job.ExecuterClass]();
        await createdClass.Start();
        global.InitializedCrokerJobs.push(createdClass);
    };

}

class CrokerJobs {

     
    constructor(Name,ExecuterClass,ExecuteCronTime,Version){
        this.Name = Name;
        this.ExecuterClass = ExecuterClass;
        this.ExecuteCronTime = ExecuteCronTime;
        this.Version = Version;
    }

    async GetJob(){
        return await Jobs.findOne({
            where:{
                Name:this.Name,
                IsDeleted: this.IsDeleted
            }
        });
    }
    async SystemInstaller(){
        let jobFinded = await this.GetJob();

        if(jobFinded == undefined){
            
            try{
                let createdJob =  await Jobs.create({
                    Name: this.Name,
                    ExecuterClass: this.ExecuterClass,
                    ExecuteCronTime: this.ExecuteCronTime,
                    Version: this.Version,
                    IsActive:true,
                    IsRunningNow:false,
                    IsDeleted:false
                });
                if(createdJob === undefined){
                    throw new Error("Job database seviyesinde yaratılamadı...");
                }
                await this.ModelInstall(Context);
                await JobInfo("Job "+this.Name+" Version: "+this.Version+" pre-installation successfully");
                await this.Install(createdJob);
                await JobInfo("Job "+this.Name+" Version: "+this.Version+" installed greacfully");
            }
            catch(ex){
                throw Error("Job yaratılırken bir sorun oluştu"+JSON.stringify(ex));
            }
            
        }
        else{
            if(jobFinded.Version !== this.Version || jobFinded.ExecuterClass !== this.ExecuterClass || jobFinded.ExecuteCronTime !== this.ExecuteCronTime){
                await JobInfo("Job "+this.Name+" old version detected");
                try{
                    await this.Install(jobFinded);
                    let updatedJob = await Jobs.update({
                        ExecuterClass: this.ExecuterClass,
                        ExecuteCronTime: this.ExecuteCronTime,
                        Version: this.Version},{
                        where: {
                            Id: jobFinded.Id
                        }
                    });
                    if(updatedJob == undefined){
                        throw new Error("Job database seviyesinde güncellenemedi...")
                    }
                    await this.ModelInstall(Context);
                    await JobInfo("Job "+this.Name+" new version installed greacfully");
                }
                catch(ex){
                    await JobError("Job güncellenirken sorun oluştu"+JSON.stringify(ex));
                }

            }

        }
        
    }

    async Start(){

        let findedJob = await this.GetJob();
        if(findedJob !== undefined){
            await JobInfo("Job " + findedJob.Name + " Started...");
            if(this.CrokerCronJob === undefined){
                this.CrokerCronJob = new CronJob(findedJob.ExecuteCronTime,
                async () => {

                    let updatedJobs = await Jobs.update({IsRunningNow:true},{
                        where:{
                            Id: findedJob.Id
                        }
                    });
                    if(updatedJobs == undefined){
                        throw new Error("Job parametreleri update edilemiyor");
                    }

                    await JobInfo("Job " + findedJob.Name + " Run Start...");
                    
                    try{
                        await this.Run(this);
                        await JobInfo("Job " + this.Job?.Name + " Run End...");
                        
                    }
                    catch(ex){
                        await this.JobError(JSON.stringify(ex))
                    }
                    updatedJobs = await Jobs.update({IsRunningNow:false},{
                        where:{
                            Id: findedJob.Id
                        }
                    });
                    if(updatedJobs == undefined){
                        throw new Error("Job parametreleri çalıştıktan sonra update edilemiyor");
                    }
                },async () => {
                    await this.Completed(this);
                    await this.JobInfo("Job " + findedJob.Name + " End Greacfully")
                });
            }
            this.CrokerCronJob.start();
        }
        else{
            throw Error("Bulunamayan job başlatılamaz");
        }
        
    }

    async Stop(){
        if(this.CrokerCronJob != undefined){
            let findedJob = await this.GetJob();
            if(findedJob !== undefined){
                updatedJobs = await Jobs.update({IsRunningNow:false},{
                    where:{
                        Id: findedJob.Id
                    }
                });
                await JobInfo("Job " + this.Job?.Name + " Stopped...");
            }
            this.CrokerCronJob.stop();
        }
        else{
            throw new Error("Bulunamayan job durdurulamaz");
        }
    }

    async JobInfo(Message) {

        let FindedJobs = await this.GetJob();
        
        let createdLog = await JobLogs.create({
            JobId:FindedJobs.Id,
            Message:Message,
            ExecuteTime: new Date(),
            IsError:false,
            IsWarning:false

        });
        if(createdLog == undefined){
            throw new Error("Job Info logu yaratılamadı");
        }
        
    }
    async JobError(Message) {
        
        let FindedJobs = await this.GetJob();
        
        let createdLog  = await JobLogs.create({
            JobId:FindedJobs.Id,
            Message:Message,
            ExecuteTime: new Date(),
            IsError:true,
            IsWarning:false

        });
        if(createdLog == undefined){
            throw new Error("Job Error logu yaratılamadı");
        }
        
    }
    async JobWarning(Message) {
        
        let FindedJobs = await this.GetJob();
        
        let createdLog  = await JobLogs.create({
            JobId:FindedJobs.Id,
            Message:Message,
            ExecuteTime: new Date(),
            IsError:false,
            IsWarning:true

        });
        if(createdLog == undefined){
            throw new Error("Job Warning logu yaratılamadı");
        }
        
    }
    async ModelInstall(Context) {
        return;
    }
    async ModelUpdate(Context) {
        return;
    }
    async Install(Job) {
        throw new Error("Method Install() must be implemented");
    }
    async Run(BaseJob){
        throw new Error("Method Run() must be implemented");
    }
    async Completed(BaseJob){
        throw new Error("Method Run() must be implemented");
    }


}


