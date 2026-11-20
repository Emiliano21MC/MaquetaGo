import { Text, View } from 'react-native';
import { Pickup, RouteQuote } from '@/types/models';
export interface MapProps {
    pickup: Pickup;
    onChange: (pickup: Pickup) => void;
    geometry?: RouteQuote['geometry'] | null;
}
// Leaflet uses the browser DOM. The .web implementation is excluded on native.
export function LimaInteractiveMap({ pickup }: MapProps) { return <View style={{ padding: 20, backgroundColor: '#F1F5F9', borderRadius: 12 }}><Text>Mapa interactivo disponible en la versión web. Usa el buscador o Mi ubicación para fijar tu recojo.</Text><Text>{pickup.latitude.toFixed(5)}, {pickup.longitude.toFixed(5)}</Text></View>; }
