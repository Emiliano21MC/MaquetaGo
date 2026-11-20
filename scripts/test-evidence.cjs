const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const Module=require('node:module');
const path=require('node:path');
async function scenario(camera,granted,canceled=false){
 let launched=0,alerted=0,released=0,requested=[];
 const image={saveAsync:async options=>{assert.equal(options.compress,0.7);return {base64:'aGVsbG8='};},release:()=>released++};
 const context={resize:()=>{},renderAsync:async()=>image,release:()=>released++};
 const picker={requestCameraPermissionsAsync:async()=>{requested.push('camera');return {status:granted?'granted':'denied'};},requestMediaLibraryPermissionsAsync:async()=>{requested.push('gallery');return {status:granted?'granted':'denied'};}};
 for(const name of ['launchCameraAsync','launchImageLibraryAsync'])picker[name]=async options=>{launched++;assert.equal(options.quality,0.7);assert.equal(options.base64,true);assert.deepEqual(options.mediaTypes,['images']);assert.equal(name,camera?'launchCameraAsync':'launchImageLibraryAsync');return {canceled,assets:[{uri:'file://test.jpg',width:2400,height:1800}]};};
 const filename=path.resolve('src/services/photo-picker.ts');const mod=new Module(filename,module);
 mod.require=id=>({'react-native':{Alert:{alert:()=>alerted++}},'expo-image-picker':picker,'expo-image-manipulator':{ImageManipulator:{manipulate:()=>context},SaveFormat:{JPEG:'jpeg'}}}[id]);
 mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
 if(!granted){await assert.rejects(mod.exports.pickPhoto(camera),/permiso/i);assert.equal(launched,0);assert.equal(alerted,1);}
 else{const result=await mod.exports.pickPhoto(camera);assert.equal(result,canceled?null:'data:image/jpeg;base64,aGVsbG8=');assert.equal(released,canceled?0:2);}
 assert.deepEqual(requested,[camera?'camera':'gallery']);
}
(async()=>{for(const camera of [true,false]){await scenario(camera,false);await scenario(camera,true);await scenario(camera,true,true);}console.log('PASS permisos explícitos cámara/galería, captura, cancelación y compresión');})().catch(error=>{console.error(error);process.exitCode=1;});
