import {initializeDatabase} from '../src/services/schemaService';
initializeDatabase().catch(error=>{console.error('No se pudo inicializar MySQL:',error.code||'',error.message);process.exitCode=1;});
