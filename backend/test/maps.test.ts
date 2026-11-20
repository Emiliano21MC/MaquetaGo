import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchPlaces, reversePlace, drivingRoute } from '../src/services/mapsService';
import { HttpError } from '../src/http';
test('Mapas: proxy, límites Nominatim, caché, direcciones y GeoJSON OSRM', async (t) => {
    const calls: {
        url: URL;
        time: number;
    }[] = [];
    t.mock.method(globalThis, 'fetch', async (input: any, init: any) => {
        const url = new URL(String(input));
        calls.push({ url, time: Date.now() });
        assert.equal(init.headers['User-Agent'], 'MaquetaGo-PUCP-App/1.0');
        if (url.pathname.includes('/route/'))
            return new Response(JSON.stringify({ code: 'Ok', routes: [{ distance: 11076.5, duration: 927.7, geometry: { type: 'LineString', coordinates: [[-77.0297, -12.1219], [-77.0794, -12.0695]] } }] }));
        const point = { lat: '-12.1219', lon: '-77.0297', address: { road: 'Avenida José Larco', house_number: '450', suburb: 'Miraflores', country_code: 'pe' } };
        return new Response(JSON.stringify(url.pathname === '/search' ? [point] : point));
    });
    const [one, two] = await Promise.all([searchPlaces('Larco fixture'), searchPlaces('Larco fixture')]);
    assert.deepEqual(one, two);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url.searchParams.get('bounded'), '1');
    assert.equal(calls[0].url.searchParams.get('viewbox'), '-77.22,-11.78,-76.82,-12.28');
    assert.equal(calls[0].url.searchParams.get('countrycodes'), 'pe');
    assert.equal(one[0].district, 'Miraflores');
    assert.match(one[0].address, /Larco 450/);
    await reversePlace(-12.1219, -77.0297);
    assert.ok(calls[1].time - calls[0].time >= 1000);
    const route = await drivingRoute(-12.1219, -77.0297);
    assert.equal(route.km, 11.0765);
    assert.equal(route.trafficMinutes, 21);
    assert.equal(route.geometry.type, 'LineString');
    assert.ok(calls[2].url.pathname.endsWith(';-77.0794,-12.0695'));
    await drivingRoute(-12.1219, -77.0297);
    assert.equal(calls.length, 3);
});
test('Mapas comunica indisponibilidad y ausencia de carretera sin inventar geometría', async (t) => {
    t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ code: 'NoRoute', routes: [] })));
    await assert.rejects(drivingRoute(-12.15, -77.04), (e: any) => e instanceof HttpError && e.status === 422);
    t.mock.method(globalThis, 'fetch', async () => new Response('{}', { status: 429 }));
    await assert.rejects(searchPlaces('provider failure fixture'), (e: any) => e instanceof HttpError && e.status === 503);
});
