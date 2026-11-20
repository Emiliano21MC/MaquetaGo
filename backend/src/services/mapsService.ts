import { HttpError } from '../http';
import { z } from 'zod';
export const limaCoordinates = z.object({ latitude: z.coerce.number().min(-12.28).max(-11.78), longitude: z.coerce.number().min(-77.22).max(-76.82) });
export const DESTINATION = { latitude: -12.0695, longitude: -77.0794 };
const cache = new Map<string, {
    until: number;
    value: unknown;
}>();
const pending = new Map<string, Promise<unknown>>();
let queue = Promise.resolve();
let nextRequest = 0;
async function json(url: string, geocoding = false): Promise<any> {
    const cached = cache.get(url);
    if (cached && cached.until > Date.now())
        return cached.value;
    const existing = pending.get(url);
    if (existing)
        return existing;
    if (pending.size >= 30)
        throw new HttpError(503, 'El servicio de mapas está ocupado. Inténtalo nuevamente.');
    const run = async () => {
        if (geocoding) {
            await new Promise(r => setTimeout(r, Math.max(0, nextRequest - Date.now())));
            nextRequest = Date.now() + 1100;
        }
        try {
            const response = await fetch(url, { headers: { 'User-Agent': 'MaquetaGo-PUCP-App/1.0', 'Accept-Language': 'es' }, signal: AbortSignal.timeout(8000) });
            if (!response.ok)
                throw new Error('provider');
            const value = await response.json();
            if (cache.size >= 500)
                cache.delete(cache.keys().next().value!);
            cache.set(url, { until: Date.now() + (geocoding ? 86400000 : 600000), value });
            return value;
        }
        catch {
            throw new HttpError(503, 'No pudimos consultar el servicio de mapas. Inténtalo nuevamente.');
        }
    };
    const request = geocoding ? queue.then(run) : run();
    if (geocoding)
        queue = request.then(() => { }, () => { });
    pending.set(url, request);
    try {
        return await request;
    }
    finally {
        pending.delete(url);
    }
}
function address(place: any) {
    const latitude = Number(place.lat), longitude = Number(place.lon);
    if (!limaCoordinates.safeParse({ latitude, longitude }).success || (place.address?.country_code && place.address.country_code !== 'pe'))
        return null;
    const a = place.address || {};
    const district = a.city_district || a.suburb || a.borough || a.town || a.city || 'Lima';
    const street = a.road || a.pedestrian || a.residential || a.neighbourhood || place.name || '';
    const number = a.house_number || '';
    return { street, number, district, address: [[street, number].filter(Boolean).join(' '), district, 'Lima'].filter(Boolean).join(', '), latitude, longitude, lat: latitude, lng: longitude, km: 0, min: 0, x: 0, y: 0 };
}
export async function searchPlaces(q: string) {
    const url = new URL('search', (process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org').replace(/\/$/, '') + '/');
    url.search = new URLSearchParams({ q, countrycodes: 'pe', viewbox: '-77.22,-11.78,-76.82,-12.28', bounded: '1', format: 'json', addressdetails: '1', limit: '5' }).toString();
    const data = await json(url.toString(), true);
    if (!Array.isArray(data))
        throw new HttpError(503, 'El buscador no está disponible.');
    return data.map(address).filter(Boolean);
}
export async function reversePlace(latitude: number, longitude: number) {
    const url = new URL('reverse', (process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org').replace(/\/$/, '') + '/');
    url.search = new URLSearchParams({ lat: String(latitude), lon: String(longitude), format: 'json', addressdetails: '1' }).toString();
    const result = address(await json(url.toString(), true));
    if (!result)
        throw new HttpError(422, 'No encontramos una dirección en este punto de Lima.');
    return result;
}
export async function drivingRoute(latitude: number, longitude: number) {
    const base = (process.env.OSRM_BASE_URL || 'https://router.project-osrm.org').replace(/\/$/, '');
    const data = await json(base + '/route/v1/driving/' + longitude + ',' + latitude + ';-77.0794,-12.0695?overview=full&geometries=geojson');
    const route = data.routes?.[0];
    if (data.code !== 'Ok' || !route || !Number.isFinite(route.distance) || !Number.isFinite(route.duration) || route.distance < 0 || route.duration < 0 || route.geometry?.type !== 'LineString' || !Array.isArray(route.geometry.coordinates) || route.geometry.coordinates.length < 2)
        throw new HttpError(422, 'No encontramos una ruta por carretera para este punto.');
    return { km: route.distance / 1000, baseMinutes: route.duration / 60, trafficMinutes: Math.round(route.duration / 60 * 1.35), geometry: route.geometry as {
            type: 'LineString';
            coordinates: [
                number,
                number
            ][];
        } };
}
