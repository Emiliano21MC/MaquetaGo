import React, { useMemo, useRef, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { Button, Card, Field, Page, s } from '@/components/ui';
import { LimaInteractiveMap } from '@/components/LimaInteractiveMap';
import { useApp } from '@/context/AppContext';
import { api } from '@/services/api';
import { Pickup } from '@/types/models';
import { useQuote } from '@/hooks/use-quote';
import { money } from '@/utils/pricing';
export default function MapPickerScreen() {
    const { state, dispatch } = useApp();
    const [pickup, setPickup] = useState(state.draft.pickup);
    const [query, setQuery] = useState('');
    const [matches, setMatches] = useState<Pickup[]>([]);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [searching, setSearching] = useState(false);
    const [resolving, setResolving] = useState(false);
    const [resolved, setResolved] = useState(true);
    const sequence = useRef(0), searchSequence = useRef(0);
    const draft = useMemo(() => ({ ...state.draft, pickup }), [state.draft, pickup]);
    const { fare, km, geometry, error: quoteError, estimated } = useQuote(draft);
    async function search() {
        if (query.trim().length < 3)
            return;
        const id = ++searchSequence.current;
        setSearching(true);
        setError('');
        try {
            const result = await api.search(query.trim());
            if (id === searchSequence.current) {
                setMatches(result);
                if (!result.length)
                    setError('No encontramos direcciones. Prueba con calle y distrito.');
            }
        }
        catch (e) {
            if (id === searchSequence.current)
                setError(e instanceof Error ? e.message : 'No se pudo buscar.');
        }
        finally {
            if (id === searchSequence.current)
                setSearching(false);
        }
    }
    async function move(point: Pickup) {
        const id = ++sequence.current;
        setPickup(point);
        setResolving(true);
        setResolved(false);
        setError('');
        try {
            const address = await api.reverse(point.latitude, point.longitude);
            if (id === sequence.current) {
                setPickup(address);
                setResolved(true);
            }
        }
        catch (e) {
            if (id === sequence.current)
                setError(e instanceof Error ? e.message : 'No se pudo obtener la dirección.');
        }
        finally {
            if (id === sequence.current)
                setResolving(false);
        }
    }
    async function locate() {
        setBusy(true);
        setError('');
        try {
            let coords: {
                latitude: number;
                longitude: number;
            };
            if (Platform.OS === 'web') {
                if (!navigator.geolocation)
                    throw new Error('Este navegador no ofrece ubicación.');
                coords = await new Promise<GeolocationCoordinates>((resolve, reject) => navigator.geolocation.getCurrentPosition(p => resolve(p.coords), () => reject(new Error('Permite la ubicación en el navegador o elige un punto en el mapa.')), { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }));
            }
            else {
                const permission = await Location.requestForegroundPermissionsAsync();
                if (!permission.granted)
                    throw new Error('Permite el acceso a tu ubicación.');
                coords = (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })).coords;
            }
            if (coords.latitude < -12.28 || coords.latitude > -11.78 || coords.longitude < -77.22 || coords.longitude > -76.82)
                throw new Error('Tu ubicación está fuera de la cobertura en Lima. Selecciona un punto en el mapa.');
            setQuery('');
            setMatches([]);
            await move({ ...pickup, ...coords });
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo obtener tu ubicación.');
        }
        finally {
            setBusy(false);
        }
    }
    return <Page title="Punto de recojo" footer={<>
  <View style={s.row}><View style={{ flex: 1 }}><Text style={s.bold}>{resolving ? 'Buscando dirección…' : pickup.address}</Text><Text style={s.subtitle}>{pickup.district}</Text></View><Text style={s.bold}>{estimated ? '—' : km.toFixed(1) + ' km'}</Text></View>
  <Text style={s.subtitle}>{estimated ? 'Calculando ruta por carretera…' : fare.trafficMinutes + ' min estimados · ' + money(fare.total)}</Text>
  <Text style={s.subtitle}>Tiempo estimado con ajuste urbano; no es tráfico en vivo.</Text>
  {!!quoteError && <Text accessibilityRole="alert" style={s.subtitle}>{quoteError}</Text>}
  <Button title="Confirmar punto de recojo" disabled={resolving || !resolved || estimated} onPress={() => { dispatch({ type: 'DRAFT', patch: { pickup: { ...pickup, km, min: fare.trafficMinutes } } }); router.back(); }}/>
 </>}>
  <Field label="Buscar dirección o distrito en Lima" placeholder="Av. José Larco 450, Miraflores" value={query} onChangeText={text => { searchSequence.current++; setSearching(false); setQuery(text); setMatches([]); }} onSubmitEditing={() => void search()} returnKeyType="search"/>
  <Button secondary title={searching ? 'Buscando…' : 'Buscar dirección'} disabled={searching || query.trim().length < 3} onPress={search}/>
  {matches.map(l => <Pressable accessibilityRole="button" key={l.latitude + ',' + l.longitude} onPress={() => { sequence.current++; setResolving(false); setResolved(true); setPickup(l); setMatches([]); setQuery(''); setError(''); }}><Card><Text style={s.bold}>{l.address}</Text><Text style={s.subtitle}>{l.district}</Text></Card></Pressable>)}
  <Text style={s.subtitle}>Toca una calle o arrastra el pin turquesa para fijar el recojo.</Text>
  <LimaInteractiveMap pickup={pickup} onChange={point => void move(point)} geometry={geometry}/>
  <Button secondary title={busy ? 'Obteniendo ubicación…' : 'Mi ubicación'} disabled={busy} onPress={locate}/>
  {!!error && <Text accessibilityRole="alert" style={s.subtitle}>{error}</Text>}
  <Text style={[s.subtitle, { fontSize: 11 }]}>Direcciones © OpenStreetMap contributors · Ruta OSRM · Destino: Av. Universitaria 1801, San Miguel.</Text>
 </Page>;
}
