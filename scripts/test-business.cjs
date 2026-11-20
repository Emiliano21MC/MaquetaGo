const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
// Compile only project TS business modules without loading a native runtime.
const cache = new Map();
function load(relative) {
  const file = path.resolve(root, relative);
  if (cache.has(file)) return cache.get(file).exports;
  const mod = new Module(file, module);
  cache.set(file, mod);
  mod.filename = file;
  mod.paths = Module._nodeModulePaths(path.dirname(file));
  mod.require = (id) => id.startsWith('@/') ? load(`src/${id.slice(2)}.ts`) : id.startsWith('.') ? load(path.relative(root,path.resolve(path.dirname(file),id+'.ts'))) : require(id);
  mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file);
  return mod.exports;
}

const {tariff,peakHour,time24,haversine}=load('shared/tariff.ts');
const {locations,plans}=load('src/data/limaLocations.ts');
const {appReducer,initial}=load('src/context/reducer.ts');
const {calculateFare,reverseGeocode}=load('src/utils/pricing.ts');
const {validCard,validExpiry}=load('src/utils/cards.ts');
const {isFutureSlot}=load('src/utils/dates.ts');
let count=0;function check(name,run){run();count++;console.log('PASS '+name);}
check('Nueve distritos y tres planes del nuevo catálogo',()=>{assert.equal(locations.length,9);assert.equal(plans[1].price,240);assert.equal(plans[1].rides,16);assert.equal(plans[2].price,432);assert.equal(plans[2].rides,32);});
check('Matriz de distrito, hora punta y tres tamaños',()=>{for(const p of locations)for(const size of ['SMALL','MEDIUM','LARGE'])for(const time of ['08:00 AM','10:00 AM']){const fare=tariff({km:p.km,baseMinutes:p.min,size,time,promoUsed:true,verified:true});const discount=tariff({km:p.km,baseMinutes:p.min,size,time,promoUsed:false,verified:true});assert.equal(fare.baseRate,8);assert.equal(discount.discountPercent,80);assert.equal(discount.total,Math.round(fare.subtotal*20)/100);assert.ok(discount.total<fare.total);assert.equal(fare.peak,peakHour(time));}});
check('Descuentos recurrentes, vigencia y seguro opcional',()=>{const input={km:19.6,baseMinutes:44,size:'LARGE',time:'08:00 AM',promoUsed:true,verified:true,now:1000};const regular=tariff(input);for(const percent of [15,25,30]){const subscription={remainingRides:0,status:'ACTIVE',startsAt:999,expiresAt:1001,discountPercent:percent,insuranceLimit:300};const fare=tariff({...input,subscription});assert.equal(fare.discountPercent,percent);assert.equal(fare.total,Math.round((regular.subtotal-fare.discount)*100)/100);assert.ok(fare.total>0);assert.equal(fare.insuranceFee,0);const insured=tariff({...input,subscription,insuranceSelected:true});assert.equal(insured.total,Math.round((fare.total+2)*100)/100);assert.equal(insured.insuranceLimit,300);for(const invalid of [{expiresAt:1000},{startsAt:1001},{status:'INACTIVE'}]){const expired=tariff({...input,subscription:{...subscription,...invalid}});assert.equal(expired.discountPercent,0);assert.equal(expired.total,regular.total);}}assert.equal(tariff({...input,insuranceSelected:true}).insuranceFee,2);});
check('Sin verificación no hay beneficio y una hora incompleta no rompe el formulario',()=>{assert.equal(tariff({km:2.4,baseMinutes:9,size:'SMALL',time:'08:00 AM',promoUsed:false,verified:false}).discount,0);assert.ok(calculateFare(2.4,'SMALL',false,null,Date.now(),9,'14:').total>0);assert.equal(time24('12:30 AM'),'00:30');assert.equal(time24('12:30 PM'),'12:30');assert.throws(()=>time24('25:00'));});
check('Caché y sesión se limpian al cerrar sesión',()=>{const account={user:{id:1,name:'Test',email:'test@pucp.edu.pe',verified:true},promoUsed:false,plansUnlocked:false,subscription:null,trips:[]};const loaded=appReducer(initial,{type:'LOAD',account});assert.equal(loaded.user.id,1);assert.equal(Object.keys(appReducer(loaded,{type:'LOGOUT'}).accounts).length,0);});
check('Mapa, horarios y tarjeta',()=>{assert.equal(reverseGeocode(154,46).district,'Comas');assert.ok(haversine(-12.0764,-77.0812)>0);assert.equal(validCard('4111111111111111'),true);assert.equal(validCard('0000000000000000'),false);assert.equal(validExpiry('10/26',new Date('2026-11-17')),false);assert.equal(isFutureSlot('2026-11-17','14:30',new Date('2026-11-17T12:00:00')),true);});
const {extractGoogleTokens}=load('src/utils/google-auth.ts');
check('Google reconoce access token, ID token y rechaza respuesta sin credenciales',()=>{assert.deepEqual(extractGoogleTokens({authentication:{accessToken:'access'},params:{}}),{access_token:'access'});assert.deepEqual(extractGoogleTokens({params:{id_token:'id',access_token:'access'}}),{id_token:'id',access_token:'access'});assert.deepEqual(extractGoogleTokens({authentication:{idToken:'native-id',accessToken:'native-access'}}),{id_token:'native-id',access_token:'native-access'});assert.throws(()=>extractGoogleTokens({params:{}}));});
console.log(count+' grupos de pruebas completados.');
