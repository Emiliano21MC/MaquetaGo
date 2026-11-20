import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import type * as Leaflet from 'leaflet';
import type { MapProps } from './LimaInteractiveMap';
import '@/theme/leaflet.web.css';
export function LimaInteractiveMap({ pickup, onChange, geometry }: MapProps) {
    const host = useRef<HTMLDivElement>(null);
    const instance = useRef<{
        map: Leaflet.Map;
        marker: Leaflet.Marker;
        line: Leaflet.Polyline;
    } | null>(null);
    const latest = useRef({ pickup, onChange });
    const [ready, setReady] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => { latest.current = { pickup, onChange }; }, [pickup, onChange]);
    useEffect(() => {
        if (Platform.OS !== 'web' || !host.current)
            return;
        let disposed = false;
        let cleanup = () => { };
        void import('leaflet').then(L => {
            if (disposed || !host.current)
                return;
            const map = L.map(host.current, { zoomControl: true, maxBounds: [[-12.28, -77.22], [-11.78, -76.82]], minZoom: 10 }).setView([latest.current.pickup.latitude, latest.current.pickup.longitude], 13);
            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(map);
            const pin = (color: string) => L.divIcon({ className: 'maquetago-pin', html: '<div style="background:' + color + ';width:24px;height:24px;border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px #0005"></div>', iconSize: [30, 30], iconAnchor: [15, 30] });
            L.marker([-12.0695, -77.0794], { icon: pin('#0F2537'), keyboard: true, title: 'Arq. PUCP' }).addTo(map).bindTooltip('Arq. PUCP', { permanent: true, direction: 'top', offset: [0, -30] });
            const marker = L.marker([latest.current.pickup.latitude, latest.current.pickup.longitude], { draggable: true, icon: pin('#00A896'), title: 'Recojo' }).addTo(map).bindTooltip('Recojo', { permanent: true, direction: 'top', offset: [0, -30] });
            const change = (latitude: number, longitude: number) => latest.current.onChange({ ...latest.current.pickup, latitude, longitude });
            marker.on('dragend', () => { const p = marker.getLatLng(); change(p.lat, p.lng); });
            map.on('click', (event: Leaflet.LeafletMouseEvent) => change(event.latlng.lat, event.latlng.lng));
            const line = L.polyline([], { color: '#00A896', weight: 5, opacity: 0.9, interactive: false }).addTo(map);
            instance.current = { map, marker, line };
            const observer = new ResizeObserver(() => map.invalidateSize());
            observer.observe(host.current);
            cleanup = () => { observer.disconnect(); map.remove(); instance.current = null; };
            setReady(true);
        }).catch(() => setError('No se pudo cargar el mapa. Recarga la página.'));
        return () => { disposed = true; cleanup(); };
    }, []);
    useEffect(() => { const i = instance.current; if (!i)
        return; i.marker.setLatLng([pickup.latitude, pickup.longitude]); i.map.panTo([pickup.latitude, pickup.longitude]); i.line.setLatLngs([]); }, [pickup.latitude, pickup.longitude, ready]);
    useEffect(() => { const i = instance.current; if (!i)
        return; const points = geometry?.coordinates.map(([lng, lat]) => [lat, lng] as [
        number,
        number
    ]) || []; i.line.setLatLngs(points); if (points.length)
        i.map.fitBounds(i.line.getBounds(), { padding: [40, 45], maxZoom: 15 }); }, [geometry, ready]);
    return <div><div ref={host} role="region" aria-label="Mapa de recojo en Lima" style={{ height: 400, width: '100%', borderRadius: 12, isolation: 'isolate' }}/>{error && <p role="alert">{error}</p>}</div>;
}
