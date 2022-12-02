import { JobsModels } from "croker-job-base/JobsModels";
import { JobsRunner } from "croker-job-base/JobsRunner";
import { JobsInstaller } from 'croker-job-base/JobsInstaller';
import config from 'config';
global.InitializedCrokerJobs = [];

export class Loader {
    constructor(){
        
    }
    public async Load(){
        process.env.NODE_ENV = config.get("mode")
        process.stdin.resume();

    //do something when app is closing
        process.on('exit', this.exitHandler);



        //catches ctrl+c event
        process.on('SIGINT', this.exitHandler);

        // catches "kill pid" (for example: nodemon restart)
        process.on('SIGUSR1', this.exitHandler);
        process.on('SIGUSR2', this.exitHandler);

        //catches uncaught exceptions
        process.on('uncaughtException', async err => {
            console.log(err);
            for await (const job of global.InitializedCrokerJobs) {
                await job.Stop();
            };
            process.exit(0);
            
        });

        //base systemloaders
        let jobsModels = new JobsModels();
        await jobsModels.Sync();

    }
    async exitHandler() {
        for await (const job of global.InitializedCrokerJobs) {
            await job.Stop();
        };
        process.exit(0);
    }
    private async Install(): Promise<void> {
        let jobRunner = new JobsInstaller();
        await jobRunner.InstallAllJobs();

    }
    public async Start(): Promise<void> {
        let jobRunner = new JobsRunner();
        await this.Install();
        await jobRunner.LoadAllJobs();

    }
}
