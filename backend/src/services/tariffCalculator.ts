import { pricingSettings } from './subscriptionService';
import { tariff } from '../../../shared/tariff';
import { DB, rows } from '../config/db';
import { activeSubscription } from './accountService';
import { drivingRoute, limaCoordinates } from './mapsService';
export async function quote(db: DB, studentId: number, input: {
    latitude: number;
    longitude: number;
    time: string;
    size: 'SMALL' | 'MEDIUM' | 'LARGE';
    date?: string;
    insuranceSelected?: boolean;
}) {
    limaCoordinates.parse(input);
    const route = await drivingRoute(input.latitude, input.longitude);
    const [student] = await rows(db, 'SELECT promo_80_used,is_verified_pucp FROM students WHERE id=?', [studentId]);
    const subscription = await activeSubscription(db, studentId);
    const pricing = await pricingSettings(db);
    return { ...tariff({ km: route.km, baseMinutes: route.baseMinutes, trafficMinutes: route.trafficMinutes, size: input.size, time: input.time, promoUsed: !!student.promo_80_used, verified: !!student.is_verified_pucp, subscription, insuranceSelected: input.insuranceSelected, insuranceFee: pricing.microInsuranceFee }), ...route, source: 'osrm', trafficEstimate: true };
}
