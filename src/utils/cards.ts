export function validCard(number: string) {
  const digits = number.replace(/\D/g, "");
  if (!/^\d{13,19}$/.test(digits) || /^0+$/.test(digits)) return false;
  let sum = 0;
  for (let i = digits.length - 1, j = 0; i >= 0; i--, j++) {
    let n = Number(digits[i]);
    if (j % 2) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}
export function validExpiry(value: string, now = new Date()) {
  const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(value);
  if (!match) return false;
  return (
    new Date(2000 + Number(match[2]), Number(match[1]), 1).getTime() >
    now.getTime()
  );
}

export function cardBrand(number:string):'Visa'|'Mastercard'|'Amex'|null {const n=number.replace(/\D/g,'');if(/^4/.test(n))return 'Visa';if(/^(34|37)/.test(n))return 'Amex';const prefix=Number(n.slice(0,4));if(/^(5[1-5])/.test(n)||(n.length>=4&&prefix>=2221&&prefix<=2720))return 'Mastercard';return null;}
export function formatCardNumber(value:string){const digits=value.replace(/\D/g,'').slice(0,19);return cardBrand(digits)==='Amex'?digits.replace(/^(\d{4})(\d{0,6})(\d{0,5}).*/,(_,a,b,c)=>[a,b,c].filter(Boolean).join(' ')):digits.replace(/(.{4})/g,'$1 ').trim();}
export function formatExpiry(value:string){const n=value.replace(/\D/g,'').slice(0,4);return n.length>2?n.slice(0,2)+'/'+n.slice(2):n;}
