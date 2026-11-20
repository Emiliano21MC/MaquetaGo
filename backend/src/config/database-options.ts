import fs from 'node:fs';
import path from 'node:path';
import type {ConnectionOptions} from 'mysql2/promise';
import {env,backendRoot} from './env';
if(/\.rds\.amazonaws\.com$/.test(env.dbHost)&&!env.dbSsl)throw new Error('La conexión RDS requiere DB_SSL=true.');
export const databaseOptions:ConnectionOptions={host:env.dbHost,port:env.dbPort,user:env.dbUser,password:env.dbPassword,connectTimeout:15000,enableKeepAlive:true,keepAliveInitialDelay:0,decimalNumbers:true,dateStrings:true,timezone:'Z',charset:'utf8mb4',...(env.dbSsl?{ssl:{ca:fs.readFileSync(path.resolve(backendRoot,env.dbSslCaFile)),rejectUnauthorized:true,verifyIdentity:true}}:{})};
