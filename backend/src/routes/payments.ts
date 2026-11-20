import {Router} from 'express';
import {z} from 'zod';
import {pool,rows,transaction,DB} from '../config/db';
import {student,HttpError} from '../http';
import {env} from '../config/env';
import {ResultSetHeader} from 'mysql2';
export const paymentRoutes=Router();
const columns='id,student_id,brand,last4,holder_name,exp_month,exp_year,is_default,created_at';
function validDate(month:number,year:number){return Date.UTC(year,month,1)>Date.now();}
export async function validateSavedCard(db:DB,studentId:number,id?:number){
 if(!id)return;
 const [card]=await rows(db,'SELECT '+columns+' FROM student_payment_methods WHERE id=? AND student_id=?',[id,studentId]);
 if(!card)throw new HttpError(403,'Esta tarjeta no pertenece a tu cuenta.');
 if(!validDate(card.exp_month,card.exp_year))throw new HttpError(400,'La tarjeta guardada ha vencido. Agrega otra tarjeta.');
}
paymentRoutes.get('/config',(_req,res)=>res.json({mode:env.production?'disabled':env.paymentMode,yapePhone:process.env.YAPE_PHONE||null,yapeMerchant:process.env.YAPE_MERCHANT_NAME||null,yapePayload:process.env.YAPE_EMV_PAYLOAD||null}));
paymentRoutes.get('/methods/:studentId',async(req,res)=>{
 if(Number(req.params.studentId)!==student(req))throw new HttpError(403,'Acceso denegado.');
 res.json(await rows(pool,'SELECT '+columns+' FROM student_payment_methods WHERE student_id=? ORDER BY is_default DESC,id DESC',[student(req)]));
});
paymentRoutes.post('/methods',async(req,res)=>{
 const body=z.strictObject({studentId:z.number().int().positive().optional(),brand:z.enum(['Visa','Mastercard','Amex']),last4:z.string().regex(/^\d{4}$/),holder_name:z.string().trim().min(3).max(120),exp_month:z.number().int().min(1).max(12),exp_year:z.number().int().min(2026).max(2100),is_default:z.boolean().default(false)}).parse(req.body);
 const id=student(req);
 if(body.studentId!==undefined&&body.studentId!==id)throw new HttpError(403,'Acceso denegado.');
 if(!validDate(body.exp_month,body.exp_year))throw new HttpError(400,'El vencimiento de la tarjeta no es válido.');
 const methodId=await transaction(async db=>{
  await rows(db,'SELECT id FROM students WHERE id=? FOR UPDATE',[id]);
  const existing=await rows(db,'SELECT id FROM student_payment_methods WHERE student_id=? AND brand=? AND last4=? AND holder_name=? AND exp_month=? AND exp_year=?',[id,body.brand,body.last4,body.holder_name,body.exp_month,body.exp_year]);
  const [count]=await rows(db,'SELECT COUNT(*) AS n FROM student_payment_methods WHERE student_id=?',[id]);
  const preferred=body.is_default||count.n===0;
  if(preferred)await db.execute('UPDATE student_payment_methods SET is_default=0 WHERE student_id=?',[id]);
  if(existing[0]){if(preferred)await db.execute('UPDATE student_payment_methods SET is_default=1 WHERE id=?',[existing[0].id]);return existing[0].id as number;}
  const [result]=await db.execute<ResultSetHeader>('INSERT INTO student_payment_methods(student_id,brand,last4,holder_name,exp_month,exp_year,is_default) VALUES(?,?,?,?,?,?,?)',[id,body.brand,body.last4,body.holder_name,body.exp_month,body.exp_year,preferred]);return result.insertId;
 });
 const [method]=await rows(pool,'SELECT '+columns+' FROM student_payment_methods WHERE id=? AND student_id=?',[methodId,id]);res.status(201).json(method);
});
