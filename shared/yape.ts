// A QR image is not a payment authorization. Only use merchant-issued EMV data.
export function crc16(value:string){let crc=0xffff;for(let i=0;i<value.length;i++){crc^=value.charCodeAt(i)<<8;for(let j=0;j<8;j++)crc=((crc&0x8000)?(crc<<1)^0x1021:crc<<1)&0xffff;}return crc.toString(16).toUpperCase().padStart(4,'0');}
export function readEmvFields(payload:string){
 if(!/^[\x20-\x7E]+$/.test(payload))throw new Error('El QR del comercio no tiene un formato EMV compatible.');
 const fields=new Map<string,string>();let pos=0;
 while(pos<payload.length){const tag=payload.slice(pos,pos+2),size=payload.slice(pos+2,pos+4);if(!/^\d{2}$/.test(tag)||!/^\d{2}$/.test(size)||pos+4+Number(size)>payload.length||fields.has(tag))throw new Error('El contenido EMV del comercio no es válido.');fields.set(tag,payload.slice(pos+4,pos+4+Number(size)));pos+=4+Number(size);}
 if(fields.get('63')?.length!==4||payload.slice(-8,-4)!=='6304'||crc16(payload.slice(0,-4))!==fields.get('63')?.toUpperCase())throw new Error('El QR del comercio no supera la validación CRC.');
 return fields;
}
export function buildYapePayload(template:string,amount:number){
 if(!Number.isFinite(amount)||amount<=0||amount>999999.99)throw new Error('El monto del QR no es válido.');
 const fields=readEmvFields(template);
 if(fields.get('00')!=='01'||fields.get('53')!=='604'||fields.get('58')!=='PE'||!fields.get('59')||![...fields.keys()].some(key=>Number(key)>=26&&Number(key)<=51))throw new Error('Se requiere un QR EMV del comercio en soles, emitido para Perú.');
 fields.delete('63');fields.set('01','12');fields.set('54',amount.toFixed(2));
 const body=[...fields.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([key,value])=>key+String(value.length).padStart(2,'0')+value).join('')+'6304';return body+crc16(body);
}
