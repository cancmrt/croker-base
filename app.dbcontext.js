import { Sequelize } from 'sequelize';
import Config from './config/config.js';

let mode = process.env.NODE_ENV;
let dbConfig = Config.db[mode];

export const Context = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password,dbConfig.configuration);


