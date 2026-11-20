import fs from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';
import {databaseOptions} from '../config/database-options';
import {env,backendRoot} from '../config/env';
export const migrationFiles=['02_create.sql','04_discount_subscriptions.sql','05_payment_methods.sql','06_trip_evidence.sql','03_inserts.sql','07_schema_aliases.sql'];
export async function initializeDatabase(){
 if(!/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(env.dbName))throw new Error('DB_NAME no es un identificador válido.');
 const db=await mysql.createConnection({...databaseOptions,multipleStatements:true});let locked=false;
 try{
  const [lock]:any=await db.execute('SELECT GET_LOCK(?,30) AS acquired',[env.dbName+':schema-init']);if(lock[0].acquired!==1)throw new Error('Otra instancia está inicializando el esquema.');locked=true;
  await db.query('CREATE DATABASE IF NOT EXISTS \x60'+env.dbName+'\x60 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  await db.changeUser({database:env.dbName});
  await db.query('CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(120) PRIMARY KEY,applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)');
  for(const file of migrationFiles){const [existing]:any=await db.execute('SELECT name FROM schema_migrations WHERE name=?',[file]);if(existing.length)continue;const sql=(await fs.readFile(path.resolve(backendRoot,'../database/scripts',file),'utf8')).replace(/maquetago_db/g,env.dbName);await db.query(sql);await db.execute('INSERT INTO schema_migrations(name) VALUES(?)',[file]);console.log(file+': OK');}
  const [tables]:any=await db.query('SELECT TABLE_NAME AS name,TABLE_TYPE AS type FROM information_schema.tables WHERE table_schema=DATABASE() ORDER BY TABLE_NAME');
  const required=['students','trips','student_subscriptions','student_payment_methods','subscription_plans','academic_calendar_events','drivers','safety_photo_acts','student_academic_reminders','trip_ratings','lima_pickup_zones','app_settings','student_cards','plans','academic_alerts'];
  const missing=required.filter(name=>!tables.some((table:any)=>table.name===name));if(missing.length)throw new Error('Faltan objetos del esquema: '+missing.join(', '));
  // Validate every column defined in the baseline and card schema, plus later migrations.
  const definitions=(await Promise.all(['02_create.sql','05_payment_methods.sql'].map(file=>fs.readFile(path.resolve(backendRoot,'../database/scripts',file),'utf8')))).join('\n');
  const expected=new Map<string,Set<string>>();
  for(const table of definitions.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)\s*\(([\s\S]*?)\);/g)){const names=new Set<string>();for(const column of table[2].matchAll(/(?:^|,)\s*(\w+)\s+(?:INT|TINYINT|SMALLINT|VARCHAR|CHAR|BOOLEAN|TIMESTAMP|DATETIME|DECIMAL|DATE|TEXT|MEDIUMTEXT|JSON|ENUM)\b/g))names.add(column[1]);expected.set(table[1],names);}
  expected.get('trips')?.add('before_photo_url');expected.get('trips')?.add('after_photo_url');
  const [columns]:any=await db.query('SELECT TABLE_NAME AS table_name,COLUMN_NAME AS column_name FROM information_schema.columns WHERE table_schema=DATABASE()');
  for(const [table,names] of expected)for(const column of names)if(!columns.some((c:any)=>c.table_name===table&&c.column_name===column))throw new Error('Falta la columna '+table+'.'+column);
  const [foreignKeys]:any=await db.query('SELECT TABLE_NAME AS table_name,COLUMN_NAME AS column_name,REFERENCED_TABLE_NAME AS referenced_table,REFERENCED_COLUMN_NAME AS referenced_column FROM information_schema.key_column_usage WHERE table_schema=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL');
  for(const table of definitions.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)\s*\(([\s\S]*?)\);/g))for(const key of table[2].matchAll(/FOREIGN KEY\s*\((\w+)\)\s*REFERENCES\s+(\w+)\((\w+)\)/g))if(!foreignKeys.some((actual:any)=>actual.table_name===table[1]&&actual.column_name===key[1]&&actual.referenced_table===key[2]&&actual.referenced_column===key[3]))throw new Error('Falta la clave foránea '+table[1]+'.'+key[1]);
  const [engines]:any=await db.query("SELECT TABLE_NAME AS name FROM information_schema.tables WHERE table_schema=DATABASE() AND TABLE_TYPE='BASE TABLE' AND ENGINE<>'InnoDB'");if(engines.length)throw new Error('Se requiere InnoDB para transacciones y claves foráneas: '+engines.map((t:any)=>t.name).join(', '));
  const [plans]:any=await db.query('SELECT code,discount_percent FROM subscription_plans ORDER BY id');
  for(const [code,discount] of [['MONTHLY',15],['SEMESTER',25],['ANNUAL',30]])if(!plans.some((plan:any)=>plan.code===code&&Number(plan.discount_percent)===discount))throw new Error('Falta la configuración de descuentos del plan '+code);
  const [tls]:any=await db.query("SHOW SESSION STATUS LIKE 'Ssl_cipher'");
  console.log('Conexión exitosa a '+env.dbName+' en '+env.dbHost+' · TLS: '+(tls[0]?.Value||'local sin TLS'));
  console.log('Columnas e integridad transaccional verificadas para '+expected.size+' tablas de la aplicación.');
  console.log('Esquema verificado: '+tables.map((t:any)=>t.name+' ('+t.type+')').join(', '));
  return tables;
 }finally{if(locked)await db.execute('SELECT RELEASE_LOCK(?)',[env.dbName+':schema-init']).catch(()=>{});await db.end();}
}
