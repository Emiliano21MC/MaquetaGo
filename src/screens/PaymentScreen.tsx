import React,{useEffect,useRef,useState} from 'react';
import {Image,Platform,Pressable,StyleSheet,Switch,Text,View} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {router,useLocalSearchParams} from 'expo-router';
import {Button,Card,Field,Page,s} from '@/components/ui';
import {YapeQrCode} from '@/components/YapeQrCode';
import {SixDigitCode} from '@/components/SixDigitCode';
import {VirtualCard} from '@/components/VirtualCard';
import {useApp} from '@/context/AppContext';
import {money} from '@/utils/pricing';
import {dateLabel,isFutureSlot} from '@/utils/dates';
import {validCard,validExpiry,cardBrand,formatCardNumber,formatExpiry} from '@/utils/cards';
import {useQuote} from '@/hooks/use-quote';
import {api} from '@/services/api';
import type {NewPaymentMethod,PaymentConfig,PaymentMethod} from '@/types/models';
import {buildYapePayload} from '../../shared/yape';
export default function PaymentScreen(){
 const {planId}=useLocalSearchParams<{planId?:string}>();
 const {state,account,createTrip,subscribe,catalogPlans}=useApp();
 const [method,setMethod]=useState('Yape');
 const [methods,setMethods]=useState<PaymentMethod[]>([]);
 const [config,setConfig]=useState<PaymentConfig|null>(null);
 const [loadingMethods,setLoadingMethods]=useState(true);
 const [selectedId,setSelectedId]=useState<number|null>(null);
 const [number,setNumber]=useState('');
 const [holder,setHolder]=useState(account?.user.name||'');
 const [expiry,setExpiry]=useState('');
 const [cvv,setCvv]=useState('');
 const [saveLater,setSaveLater]=useState(false);
 const [operation,setOperation]=useState('');
 const [error,setError]=useState('');
 const [loadError,setLoadError]=useState('');
 const [busy,setBusy]=useState(false);
 const [saving,setSaving]=useState(false);
 const [notice,setNotice]=useState('');
 const [copied,setCopied]=useState(false);
 const submitted=useRef(false);
 const [transaction]=useState(()=>Date.now()+'-'+Math.random().toString(36).slice(2));
 const {fare,estimated,km,error:quoteError}=useQuote(state.draft);
 const studentId=account?.user.id;
 useEffect(()=>{let active=true;if(!studentId)return;
  void Promise.all([api.paymentMethods(studentId),api.paymentConfig()]).then(([cards,settings])=>{if(!active)return;setMethods(cards);setConfig(settings);setSelectedId(cards.find(c=>c.is_default)?.id??null);}).catch(e=>{if(active)setLoadError(e instanceof Error?e.message:'No se pudieron cargar tus métodos.');}).finally(()=>{if(active)setLoadingMethods(false);});
  return()=>{active=false;};
 },[studentId]);
 useEffect(()=>{if(!copied)return;const timer=setTimeout(()=>setCopied(false),2500);return()=>clearTimeout(timer);},[copied]);
 if(!account)return null;
 const plan=catalogPlans.find(p=>p.id===planId);
 const d=state.draft,amount=plan?plan.price:fare.total;
 const selected=methods.find(card=>card.id===selectedId);
 const brand=selected?.brand||cardBrand(number);
 const last4=selected?.last4||(number.replace(/\D/g,'').length>=4?number.replace(/\D/g,'').slice(-4):'');
 const shownExpiry=selected?String(selected.exp_month).padStart(2,'0')+'/'+String(selected.exp_year).slice(-2):expiry;
 const phone=config?.yapePhone||'';
 const formattedPhone=phone.replace(/(\d{3})(\d{3})(\d{3})/,'$1 $2 $3');
 const local=config?.mode==='local';
 let payload='',qrError='';
 if(config&&(plan||!estimated)){
  if(local)payload='MAQUETAGO|SIMULACION_SIN_COBRO|PEN:'+amount.toFixed(2)+'|YAPE:'+phone;
  else if(config.yapePayload){try{payload=buildYapePayload(config.yapePayload,amount);}catch(e){qrError=e instanceof Error?e.message:'QR no disponible.';}}
 }
 function metadata():NewPaymentMethod{
  const detected=cardBrand(number);
  if(!detected||!validCard(number)||holder.trim().length<3||!validExpiry(expiry))throw new Error('Revisa el número, titular y vencimiento de tu tarjeta.');
  const [month,year]=expiry.split('/').map(Number);
  return {brand:detected,last4:number.replace(/\D/g,'').slice(-4),holder_name:holder.trim(),exp_month:month,exp_year:2000+year};
 }
 async function persistCard(){
  const card=await api.savePaymentMethod(metadata());
  setMethods(current=>[card,...current.filter(c=>c.id!==card.id)]);setSelectedId(card.id);setNumber('');setCvv('');setSaveLater(false);setNotice('Tarjeta guardada. Conservamos únicamente sus datos seguros.');return card.id;
 }
 async function saveCard(){setError('');setNotice('');setSaving(true);try{await persistCard();}catch(e){setError(e instanceof Error?e.message:'No se pudo guardar la tarjeta.');}finally{setSaving(false);}}
 async function confirm(){
  if(submitted.current||busy||saving||!config||(!planId&&estimated))return;
  setError('');setNotice('');
  if(planId&&(!plan||!account?.plansUnlocked))return setError('Este plan no está disponible.');
  if(!planId&&!isFutureSlot(d.date,d.time))return setError('Elige un horario futuro antes de continuar.');
  try{
   if(method==='Yape'&&!/^\d{6}$/.test(operation))throw new Error('Completa los 6 dígitos del código de aprobación.');
   if(method==='Tarjeta'&&!selected){metadata();if(!(brand==='Amex'?/^\d{4}$/:/^\d{3}$/).test(cvv))throw new Error('Revisa el código de seguridad de tu tarjeta.');}
   if(method==='Tarjeta'&&selected&&!validExpiry(shownExpiry))throw new Error('Tu tarjeta ha vencido. Agrega otra tarjeta.');
   submitted.current=true;setBusy(true);
   const paymentId=method==='Tarjeta'?(selected?.id??(saveLater?await persistCard():undefined)):undefined;
   if(plan){await subscribe(plan.id,method,operation,transaction,paymentId);router.replace('/(tabs)');}
   else{const id=await createTrip(d,method,operation,transaction,paymentId);router.replace({pathname:'/trip',params:{id}});}
   setNumber('');setCvv('');
  }catch(e){submitted.current=false;setError(e instanceof Error?e.message:'No se pudo completar el pago.');}finally{setBusy(false);}
 }
 const encrypted=Platform.OS==='web'&&typeof window!=='undefined'&&window.location.protocol==='https:';
 return <Page title={plan?'Activa tu plan':'Finaliza tu reserva'} footer={<>
  {!!error&&<Text accessibilityRole="alert" style={x.error}>{error}</Text>}
  {!!notice&&<Text accessibilityLiveRegion="polite" style={s.link}>{notice}</Text>}
  <View style={s.row}><View><Text style={s.subtitle}>Total {local?'de la simulación':'a pagar'}</Text><Text style={x.total}>{!plan&&estimated?'Calculando…':money(amount)}</Text></View><Text style={x.currency}>PEN · SOLES</Text></View>
  <Button disabled={busy||saving||!config||(!planId&&estimated)||!!planId&&!plan} title={busy?'Confirmando…':local?'Confirmar simulación con '+method:'Confirmar pago con '+method} onPress={confirm}/>
  <Text style={x.security}>{local?'Modo demostración · No se realiza ningún cobro':encrypted?'Pago encriptado TLS':'Conexión local de desarrollo'}{fare.insuranceSelected?' • MaquetaSegura seleccionada':''}</Text>
 </>}>
  <View style={x.heading}><Text style={x.eyebrow}>CHECKOUT / MAQUETAGO</Text><Text style={x.title}>Todo listo para tu entrega.</Text><Text style={s.subtitle}>Elige cómo quieres completar tu reserva.</Text></View>
  {!!loadError&&<Text accessibilityRole="alert" style={x.error}>{loadError}</Text>}
  {!!quoteError&&!plan&&<Text accessibilityRole="alert" style={x.error}>{quoteError}</Text>}
  <Card><View style={s.row}><Text style={s.label}>{plan?'TU SUSCRIPCIÓN':'TU TRASLADO'}</Text><Text style={x.currency}>{plan?plan.discountPercent+'% dscto.':fare.discountPercent?fare.discountPercent+'% dscto.':'Tarifa estándar'}</Text></View>
   <Text style={s.bold}>{plan?plan.name:d.pickup.address}</Text>
   <Text style={s.subtitle}>{plan?plan.validityDays+' días · Alertas académicas incluidas':dateLabel(d.date)+' · '+d.time+' · '+km.toFixed(1)+' km → Arq. PUCP'}</Text>
   {!plan&&<><View style={s.divider}/><View style={s.row}><Text style={s.subtitle}>Traslado</Text><Text style={s.text}>{money(fare.subtotal)}</Text></View>{fare.discount>0&&<View style={s.row}><Text style={s.link}>Descuento aplicado</Text><Text style={s.link}>−{money(fare.discount)}</Text></View>}{fare.insuranceSelected&&<View style={s.row}><Text style={s.subtitle}>MaquetaSegura opcional</Text><Text style={s.text}>{money(fare.insuranceFee)}</Text></View>}</>}
  </Card>
  <View style={x.pills}>{['Yape','Tarjeta'].map(m=><Pressable key={m} accessibilityRole="tab" accessibilityState={{selected:method===m}} disabled={busy||saving} onPress={()=>{setMethod(m);setError('');setNotice('');}} style={[x.pill,method===m&&{backgroundColor:m==='Yape'?'#742284':'#0F2537'}]}>{m==='Yape'?<Image source={require('../../assets/images/yape-logo.png')} style={{height:23,width:23,borderRadius:6}}/>:<Text style={{color:method===m?'white':'#0F2537',fontSize:21}}>▱</Text>}<Text style={[x.pillText,method===m&&{color:'white'}]}>{m}</Text></Pressable>)}</View>
  {method==='Yape'?<View style={x.yapePanel}>
   <View style={x.yapeTag}><Text style={{color:'#742284',fontSize:11,fontWeight:'700'}}>{local?'SIMULACIÓN YAPE':'PAGO CON YAPE'}</Text></View>
   <Text style={x.paymentTitle}>{local?'Prueba el flujo de pago':'Escanea y confirma'}</Text>
   <Text style={[s.subtitle,{textAlign:'center'}]}>{config?.yapeMerchant||'MaquetaGo'} · {local?'Demostración sin transferencia':'Verifica el destinatario en tu app'}</Text>
   {payload?<YapeQrCode payload={payload}/>:<View style={x.qrPlaceholder}><Text style={s.subtitle}>{qrError||'Preparando el código QR…'}</Text></View>}
   <Text style={{fontSize:32,fontWeight:'800',color:'#742284',fontVariant:['tabular-nums']}}>{!plan&&estimated?'—':money(amount)}</Text>
   {!!phone&&<Pressable accessibilityRole="button" onPress={async()=>{try{await Clipboard.setStringAsync(phone);setCopied(true);}catch{setError('No se pudo copiar el número.');}}} style={x.copyButton}><Text style={{color:'#742284',fontWeight:'600',fontSize:12}}>{copied?'✓ Copiado':'Copiar número Yape: '+formattedPhone}</Text></Pressable>}
   <View style={{width:'100%',gap:16,marginTop:6}}><SixDigitCode value={operation} onChange={setOperation} disabled={busy}/>{local&&<Text style={x.security}>QR de demostración. Ingresa cualquier código de 6 dígitos para simular la confirmación.</Text>}</View>
  </View>:<View style={{gap:16}}>
   {loadingMethods?<Text style={s.subtitle}>Cargando tus tarjetas…</Text>:methods.length>0&&<View style={{gap:10}}><Text style={s.label}>TUS TARJETAS GUARDADAS</Text>{methods.map(card=><Pressable key={card.id} accessibilityRole="radio" accessibilityState={{checked:selectedId===card.id}} disabled={busy||saving} onPress={()=>{setSelectedId(card.id);setCvv('');setNumber('');setError('');}} style={[x.savedRow,selectedId===card.id&&{borderColor:'#00A896',backgroundColor:'#EFFBF8'}]}><Text style={s.bold}>{card.brand} •••• {card.last4}</Text><Text style={s.subtitle}>{selectedId===card.id?'●':'○'} {String(card.exp_month).padStart(2,'0')}/{String(card.exp_year).slice(-2)}</Text></Pressable>)}</View>}
   <Pressable accessibilityRole="button" disabled={busy||saving} onPress={()=>{setSelectedId(null);setNumber('');setExpiry('');setCvv('');setHolder(account.user.name);setError('');setNotice('');}} style={x.addCard}><Text style={{fontSize:23,color:'#00A896'}}>▱</Text><Text style={s.link}>+ Guardar tarjeta</Text></Pressable>
   <VirtualCard brand={brand} last4={last4} holder={selected?.holder_name||holder} expiry={shownExpiry}/>
   {!selected&&<View style={x.cardForm}>
    <Text style={x.eyebrow}>DATOS DE TU TARJETA</Text>
    <Field label="Número de tarjeta" placeholder="0000 0000 0000 0000" keyboardType="number-pad" value={number} onChangeText={value=>setNumber(formatCardNumber(value))} maxLength={23} editable={!busy&&!saving}/>
    <Field label="Titular" value={holder} onChangeText={setHolder} autoCapitalize="words" maxLength={120} editable={!busy&&!saving}/>
    <View style={s.row}><View style={{flex:1}}><Field label="Vencimiento" placeholder="MM/AA" value={expiry} onChangeText={value=>setExpiry(formatExpiry(value))} keyboardType="number-pad" maxLength={5} editable={!busy&&!saving}/></View><View style={{flex:1}}><Field label="CVV" placeholder="•••" value={cvv} onChangeText={value=>setCvv(value.replace(/\D/g,'').slice(0,brand==='Amex'?4:3))} keyboardType="number-pad" secureTextEntry maxLength={brand==='Amex'?4:3} editable={!busy&&!saving}/></View></View>
    <View style={s.row}><Text style={[s.subtitle,{flex:1}]}>Guardar tarjeta para próximos traslados</Text><Switch accessibilityLabel="Guardar tarjeta para próximos traslados" value={saveLater} onValueChange={setSaveLater} disabled={busy||saving} trackColor={{false:'#CBD5E1',true:'#00A896'}}/></View>
    <Button secondary title={saving?'Guardando…':'Guardar tarjeta'} disabled={busy||saving} onPress={saveCard}/>
    <Text style={x.security}>Solo guardamos marca, últimos 4 dígitos, titular y vencimiento. El número completo y CVV permanecen únicamente en este formulario.</Text>
   </View>}
   <View style={x.seal}><Text style={{fontSize:18,color:'#00A896'}}>◇</Text><View style={{flex:1}}><Text style={{fontSize:12,fontWeight:'700',color:'#0F2537'}}>{encrypted?'Pago encriptado TLS':'Checkout de demostración'}</Text><Text style={{fontSize:11,color:'#64748B',marginTop:3}}>Datos seguros · MaquetaGo{fare.insuranceSelected?' • MaquetaSegura':''}</Text></View></View>
  </View>}
 </Page>;
}
const x=StyleSheet.create({
 heading:{gap:8,paddingVertical:8},eyebrow:{fontSize:10,fontWeight:'700',letterSpacing:1.5,color:'#64748B'},title:{fontSize:26,fontWeight:'800',letterSpacing:-0.8,color:'#0F2537',lineHeight:32},total:{fontSize:28,fontWeight:'800',color:'#0F2537',fontVariant:['tabular-nums']},currency:{fontSize:10,fontWeight:'700',color:'#00A896',letterSpacing:0.6},error:{color:'#B91C1C',fontSize:12,lineHeight:18},security:{fontSize:10,color:'#64748B',textAlign:'center',lineHeight:16},
 pills:{flexDirection:'row',padding:5,borderRadius:18,backgroundColor:'#E9EEF2',gap:5},pill:{flex:1,flexDirection:'row',gap:8,alignItems:'center',justifyContent:'center',borderRadius:14,minHeight:49},pillText:{fontWeight:'700',fontSize:14,color:'#64748B'},
 yapePanel:{backgroundColor:'#FDFBFE',borderWidth:1,borderColor:'#EBE1F0',borderRadius:22,padding:20,gap:16,alignItems:'center'},yapeTag:{backgroundColor:'#F1E5F5',paddingHorizontal:12,paddingVertical:7,borderRadius:30},paymentTitle:{fontSize:21,fontWeight:'700',color:'#0F2537',letterSpacing:-0.4},qrPlaceholder:{height:244,width:244,alignItems:'center',justifyContent:'center',padding:20,backgroundColor:'white',borderRadius:16},copyButton:{paddingVertical:12,paddingHorizontal:16,backgroundColor:'#F3EAF7',borderRadius:12},
 savedRow:{borderWidth:1,borderColor:'#D9E2E8',padding:16,borderRadius:14,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},addCard:{borderWidth:1,borderStyle:'dashed',borderColor:'#93B6B6',borderRadius:14,minHeight:56,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:10},cardForm:{padding:18,gap:16,borderRadius:18,borderWidth:1,borderColor:'#E2E8F0',backgroundColor:'white'},seal:{flexDirection:'row',alignItems:'center',gap:10,padding:16,borderRadius:14,backgroundColor:'#EDF8F5'}
});
