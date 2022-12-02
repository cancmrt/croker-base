import { DataTypes } from 'sequelize';
import { DBContext } from "../../db/DBContext";

export const DB = new DBContext();

export const JobLogs = DB.context.define('JobLogs',{
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