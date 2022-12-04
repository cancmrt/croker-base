import config from 'config';
import {InitJobPlugin,JobsBaseInstaller,LoadAllJobs} from './app.jobs.context';

export class Loader {
    constructor(){
        
    }
    async Load(){

        global.JobContainer = [];

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
            for await (const job of global.JobContainer) {
                await job.Stop();
            };
            process.exit(0);
            
        });

        await InitJobPlugin();

    }
    async exitHandler() {
        for await (const job of global.JobContainer) {
            await job.Stop();
        };
        process.exit(0);
    }
    async Start(){
        
        await InstallAllJobs();
        await LoadAllJobs();

    }
}
