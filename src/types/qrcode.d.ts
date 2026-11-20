declare module 'qrcode/lib/core/qrcode' { export function create(text:string,options:import('qrcode').QRCodeOptions):import('qrcode').QRCode; }
declare module 'qrcode/lib/renderer/svg-tag' { export function render(data:import('qrcode').QRCode,options?:import('qrcode').QRCodeToStringOptions):string; }
