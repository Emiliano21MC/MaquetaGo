import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {app} from '../src/server';
import {pool,rows} from '../src/config/db';
import {session} from '../src/http';
test('Tarjetas: cuenta vacía, metadatos seguros, persistencia, predeterminada y aislamiento',async()=>{
 const students:number[]=[];const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const address=server.address();if(!address||typeof address==='string')throw Error();const base='http://127.0.0.1:'+address.port+'/api/payments';
 try{
  for(let i=0;i<2;i++){const [r]:any=await pool.execute('INSERT INTO students(full_name,institutional_email,is_verified_pucp) VALUES(?,?,1)',['Prueba pagos','test.payments.'+randomUUID()+'@pucp.edu.pe']);students.push(r.insertId);}
  async function call(path:string,body?:unknown,id=students[0]){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session(id)},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};}
  assert.deepEqual((await call('/methods/'+students[0])).data,[]);
  assert.equal((await call('/methods/'+students[1])).status,403);
  const card={brand:'Visa',last4:'1111',holder_name:'Prueba pagos',exp_month:12,exp_year:2029};
  for(const forbidden of [{cvv:'123'},{number:'4111111111111111'},{studentId:students[1]}])assert.ok([400,403].includes((await call('/methods',{...card,...forbidden})).status));
  const saved=await call('/methods',card);assert.equal(saved.status,201);assert.equal(saved.data.last4,'1111');assert.equal(saved.data.is_default,1);assert.ok(!('cvv' in saved.data)&&!('number' in saved.data));
  assert.equal((await call('/methods',card)).data.id,saved.data.id);
  const second=await call('/methods',{...card,brand:'Mastercard',last4:'4444',is_default:true});assert.equal(second.status,201);
  const list=(await call('/methods/'+students[0])).data;assert.equal(list.length,2);assert.equal(list.filter((c:any)=>c.is_default).length,1);assert.equal(list[0].id,second.data.id);
  assert.deepEqual((await call('/methods/'+students[1],undefined,students[1])).data,[]);
  assert.equal((await call('/methods',{...card,exp_year:2020})).status,400);
  const columns=await rows(pool,'SHOW COLUMNS FROM student_payment_methods');assert.deepEqual(columns.map(c=>c.Field),['id','student_id','brand','last4','holder_name','exp_month','exp_year','is_default','created_at']);
 }finally{for(const id of students){await pool.execute('DELETE FROM student_payment_methods WHERE student_id=?',[id]);await pool.execute('DELETE FROM students WHERE id=?',[id]);}await new Promise<void>(r=>server.close(()=>r()));await pool.end();}
});
