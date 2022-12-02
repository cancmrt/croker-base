import { JobsModels } from './JobsModels';

export abstract class JobsLogger{

    private Models:JobsModels;
    private JobName:string;

    constructor(JobName:string){
        this.JobName = JobName;
        this.Models = new JobsModels();
    }

}