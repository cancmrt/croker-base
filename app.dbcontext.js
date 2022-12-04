import { Sequelize } from 'sequelize';
import config from 'config';

let mode = process.env.NODE_ENV;
let dbConfig = config.get("db."+mode);
let Context = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password,dbConfig.configuration);

export default Context;
