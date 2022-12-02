import { Sequelize } from 'sequelize';
import config from 'config';

export class DBContext {
    private dbConfig:any;
    public context:Sequelize
    constructor(){
        let mode = process.env.NODE_ENV;
        this.dbConfig = config.get("db."+mode)
        this.context = new Sequelize(this.dbConfig.database, this.dbConfig.username, this.dbConfig.password,this.dbConfig.configuration);
    }
    private async Authentication(){
        await this.context.authenticate();
    }
    public async Sync(){
        try {
            await this.Authentication();
            await this.context.sync();
          } catch (error) {
            throw (error);
          }
        
    }
}