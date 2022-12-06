import { Sequelize, DataTypes } from 'sequelize'
import Config from './config/config.js'

const mode = process.env.NODE_ENV
const dbConfig = Config.db[mode]

export const Context = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, dbConfig.configuration)
export {
  DataTypes
}
