import { DataTypes,Model,ModelCtor } from 'sequelize';
import { DBContext } from 'croker-base-db/DBContext';


export class JobsModels extends DBContext {

    public Jobs:ModelCtor<Model<any,any>>
    public JobLogs:ModelCtor<Model<any,any>>
    constructor(){
        super();
        this.Jobs = this.DefineJobs();
        this.JobLogs = this.DefineJobLogs();
    }
    public DefineJobs(){
        return this.context.define('Jobs',{
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
    }
    public DefineJobLogs(){
        return this.context.define('JobLogs',{
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
    }
}
