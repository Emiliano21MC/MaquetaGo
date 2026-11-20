import { normalizeWebPhoto } from '@/utils/web-photo';
export function pickPhoto(_camera: boolean): Promise<string | null> { return new Promise((resolve, reject) => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.style.display = 'none'; document.body.appendChild(input); let settled = false; const finish = () => { if (settled)
    return; settled = true; input.remove(); }; input.oncancel = () => { finish(); resolve(null); }; input.onchange = () => { const file = input.files?.[0]; finish(); if (!file) {
    resolve(null);
    return;
} void normalizeWebPhoto(file).then(resolve, reject); }; input.click(); }); }
