import { DataTypes } from 'sequelize';
import { DBContext } from "../../db/DBContext"

export const DB = new DBContext();

export const Jobs = DB.context.define('Jobs',{
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