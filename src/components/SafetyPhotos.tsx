import { PhotoPreview } from '@/components/PhotoPreview';
import { CameraCapture } from '@/components/CameraCapture';
import React, { useCallback, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { Trip, SafetyPhoto } from '@/types/models';
import { useApp } from '@/context/AppContext';
import { Badge, Button, Card, s } from '@/components/ui';
import { pickPhoto } from '@/services/photo-picker';
export function SafetyPhotos({ trip }: {
    trip: Trip;
}) {
    const { photo } = useApp();
    const [busy, setBusy] = useState(false), [error, setError] = useState(''), [cameraStage, setCameraStage] = useState<SafetyPhoto['stage'] | null>(null);
    const closeCamera = useCallback(() => setCameraStage(null), []);
    async function save(stage: SafetyPhoto['stage'], uri: string) { await photo(trip.id, { stage, uri, location: stage === 'BEFORE_PICKUP' ? trip.pickup.address : 'Facultad de Arquitectura PUCP', capturedAt: new Date().toISOString(), verified: false }); }
    async function capture(stage: SafetyPhoto['stage'], camera: boolean) { if (camera && Platform.OS === 'web') {
        setError('');
        setCameraStage(stage);
        return;
    } setBusy(true); setError(''); try {
        const uri = await pickPhoto(camera);
        if (uri)
            await save(stage, uri);
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo registrar la foto.');
    }
    finally {
        setBusy(false);
    } }
    const before = trip.photos?.some(p => p.stage === 'BEFORE_PICKUP');
    return <Card><Text style={s.label}>Acta Fotográfica de Seguridad</Text><Text style={s.subtitle}>Registra el estado de tu maqueta antes de salir y al entregarla.</Text>
 {(['BEFORE_PICKUP', 'AFTER_DELIVERY'] as const).map((stage, index) => {
            const evidence = trip.photos?.find(p => p.stage === stage);
            const enabled = !trip.completed && (index === 0 || before || trip.step >= 2);
            return <View key={stage} style={{ gap: 10, paddingVertical: 8 }}><Text style={s.bold}>{index + 1}. {index === 0 ? 'Antes del traslado' : 'Después del traslado'}</Text>
 {evidence && <><PhotoPreview uri={evidence.uri} revision={evidence.revision || evidence.capturedAt} label={index === 0 ? 'Foto antes del traslado' : 'Foto después del traslado'}/><Badge>✓ Evidencia registrada</Badge><Text style={s.subtitle}>{evidence.location} · {new Date(evidence.capturedAt).toLocaleString('es-PE', { timeZone: 'America/Lima' })}</Text></>}
 {enabled && <><Button title={busy ? 'Guardando…' : evidence ? 'Cambiar foto · Cámara' : 'Tomar fotografía'} disabled={busy || !!cameraStage} onPress={() => capture(stage, true)}/><Button secondary title={evidence ? 'Cambiar foto · Galería' : 'Seleccionar foto'} disabled={busy || !!cameraStage} onPress={() => capture(stage, false)}/></>}
 {!enabled && !evidence && <Text style={s.subtitle}>{trip.completed ? 'El acta de este viaje está cerrada.' : 'Registra primero la evidencia antes del traslado.'}</Text>}
 </View>;
        })}
 {!!error && <Text accessibilityRole="alert" style={[s.subtitle, { color: '#B91C1C' }]}>{error}</Text>}
 {cameraStage && <CameraCapture open onClose={closeCamera} onCapture={async (uri) => { await save(cameraStage, uri); }}/>}
 </Card>;
}
