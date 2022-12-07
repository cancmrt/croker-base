import { Sequelize, DataTypes } from 'sequelize'
import * as path from 'path'

const Config = await import(path.join('file:///', global.__dirname, 'config', 'config.js'))

const mode = process.env.NODE_ENV
const dbConfig = Config.default.db[mode]

export const Context = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, dbConfig.configuration)
export {
  DataTypes
}
