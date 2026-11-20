import { useEffect, useRef, useState } from 'react';
import type { CameraCaptureProps } from './CameraCapture';
import { normalizeWebPhoto } from '@/utils/web-photo';
export function CameraCapture({ open, onClose, onCapture }: CameraCaptureProps) {
    const busyRef = useRef(false);
    const video = useRef<HTMLVideoElement>(null);
    const input = useRef<HTMLInputElement>(null);
    const stream = useRef<MediaStream | null>(null);
    const [ready, setReady] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
    useEffect(() => { busyRef.current = busy; }, [busy]);
    useEffect(() => {
        if (!open)
            return;
        let active = true;
        const stop = () => { stream.current?.getTracks().forEach(track => track.stop()); stream.current = null; };
        async function start() { try {
            if (!navigator.mediaDevices?.getUserMedia)
                throw new Error('La cámara requiere HTTPS o localhost y un navegador compatible.');
            const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
            if (!active) {
                media.getTracks().forEach(track => track.stop());
                return;
            }
            stream.current = media;
            if (video.current) {
                video.current.srcObject = media;
                await video.current.play();
            }
        }
        catch (e) {
            if (active)
                setError(e instanceof DOMException && e.name === 'NotAllowedError' ? 'Permiso de cámara denegado. Autorízalo en el navegador o usa el selector de cámara/galería.' : e instanceof DOMException && e.name === 'NotFoundError' ? 'No encontramos una cámara en este dispositivo. Puedes seleccionar una foto.' : e instanceof Error ? e.message : 'No se pudo abrir la cámara.');
        } }
        void start();
        const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busyRef.current)
            onClose(); };
        document.addEventListener('keydown', escape);
        return () => { active = false; stop(); document.removeEventListener('keydown', escape); };
    }, [open, onClose]);
    if (!open)
        return null;
    async function submit(uri: string) { if (busyRef.current)
        return; busyRef.current = true; setBusy(true); setError(''); try {
        await onCapture(uri);
        onClose();
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo guardar la foto.');
    }
    finally {
        busyRef.current = false;
        setBusy(false);
    } }
    const button = { minHeight: 46, padding: '10px 18px', borderRadius: 10, border: '1px solid #CBD5E1', cursor: 'pointer', fontSize: 14, fontWeight: 600 } as const;
    return <div role="dialog" aria-modal="true" aria-label="Cámara para evidencia de la maqueta" style={{ position: 'fixed', inset: 0, zIndex: 10000, background: '#0F2537CC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}><div style={{ background: 'white', borderRadius: 20, padding: 22, width: '100%', maxWidth: 580, color: '#0F2537', fontFamily: 'system-ui', display: 'grid', gap: 16 }}>
 <div><h2 style={{ fontSize: 20, margin: '0 0 6px' }}>Fotografía de tu maqueta</h2><p style={{ fontSize: 13, margin: 0, color: '#64748B' }}>Encuadra la maqueta completa y comprueba su estado.</p></div>
 <video ref={video} autoPlay playsInline muted onLoadedData={() => setReady(true)} style={{ width: '100%', maxHeight: '50vh', minHeight: 150, background: '#0F2537', borderRadius: 12, objectFit: 'contain' }}/>
 {!!error && <p role="alert" style={{ fontSize: 13, color: '#B91C1C', margin: 0 }}>{error}</p>}
 <input ref={input} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; if (file)
        void normalizeWebPhoto(file).then(submit).catch(e => setError(e.message)); }}/>
 <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><button autoFocus disabled={!ready || busy} style={{ ...button, background: '#00A896', color: 'white', opacity: !ready || busy ? 0.6 : 1 }} onClick={() => { const v = video.current; if (!v || !v.videoWidth)
        return; const canvas = document.createElement('canvas'); const scale = Math.min(1, 1600 / Math.max(v.videoWidth,v.videoHeight)); canvas.width = Math.round(v.videoWidth * scale); canvas.height = Math.round(v.videoHeight * scale); const context=canvas.getContext('2d'); if(!context){setError('No se pudo capturar la imagen. Usa el selector de cámara.');return;}context.drawImage(v, 0, 0, canvas.width, canvas.height); void submit(canvas.toDataURL('image/jpeg', 0.7)); }}>{busy ? 'Guardando…' : 'Capturar foto'}</button><button disabled={busy} style={button} onClick={() => input.current?.click()}>Abrir selector de cámara</button><button disabled={busy} style={button} onClick={onClose}>Cancelar</button></div>
 </div></div>;
}
