import { PLAN_DISCOUNTS } from "../../shared/subscriptions";
import { Pickup, Plan, Size } from "@/types/models";
export const locations: Pickup[] = [
  {
    address: "Av. Universitaria 450, San Miguel",
    district: "San Miguel",
    km: 2.4,
    min: 9,
    latitude: -12.0764,
    longitude: -77.0812,
    x: 96,
    y: 194,
  },
  {
    address: "Av. Simón Bolívar 920, Pueblo Libre",
    district: "Pueblo Libre",
    km: 3.8,
    min: 13,
    latitude: -12.0748,
    longitude: -77.0625,
    x: 136,
    y: 186,
  },
  {
    address: "Av. General Garzón 1280, Jesús María",
    district: "Jesús María",
    km: 5.4,
    min: 16,
    latitude: -12.0782,
    longitude: -77.0491,
    x: 160,
    y: 196,
  },
  {
    address: "Jr. León Velarde 310, Lince",
    district: "Lince",
    km: 6.5,
    min: 19,
    latitude: -12.0846,
    longitude: -77.0378,
    x: 168,
    y: 204,
  },
  {
    address: "Av. San Borja Norte 640, San Borja",
    district: "San Borja",
    km: 11.4,
    min: 28,
    latitude: -12.0941,
    longitude: -76.9998,
    x: 198,
    y: 218,
  },
  {
    address: "Av. José Larco 450, Miraflores",
    district: "Miraflores",
    km: 10.2,
    min: 26,
    latitude: -12.1219,
    longitude: -77.0297,
    x: 156,
    y: 250,
  },
  {
    address: "Av. Primavera 1240, Santiago de Surco",
    district: "Santiago de Surco",
    km: 14.5,
    min: 34,
    latitude: -12.1105,
    longitude: -76.9882,
    x: 222,
    y: 244,
  },
  {
    address: "Av. Carlos Izaguirre 810, Los Olivos",
    district: "Los Olivos",
    km: 14.8,
    min: 35,
    latitude: -11.9912,
    longitude: -77.0634,
    x: 122,
    y: 88,
  },
  {
    address: "Av. Túpac Amaru 3450, Comas",
    district: "Comas",
    km: 19.6,
    min: 44,
    latitude: -11.9541,
    longitude: -77.0489,
    x: 154,
    y: 46,
  },
];
export const sizes: {
  id: Size;
  name: string;
  dimensions: string;
  detail: string;
  fee: number;
}[] = [
  {
    id: "SMALL",
    name: "Pequeña",
    dimensions: "Hasta 40 × 40 cm",
    detail: "Cabina protegida con sujeción",
    fee: 0,
  },
  {
    id: "MEDIUM",
    name: "Mediana",
    dimensions: "Hasta 80 × 60 cm",
    detail: "Maletera plana acondicionada",
    fee: 3,
  },
  {
    id: "LARGE",
    name: "Gran Formato",
    dimensions: "Hasta 120 × 80 cm",
    detail: "Plataforma extendida antideslizante",
    fee: 6,
  },
];
export const materials = [
  "Cartón pluma / Balsa",
  "Madera MDF / Acrílico",
  "Yeso / Topografía",
  "Alambre / Mixto",
];
export const timeSlots = [
  "07:00 AM",
  "08:00 AM",
  "10:00 AM",
  "12:30 PM",
  "02:30 PM",
  "04:00 PM",
  "06:00 PM",
];
const planReference = [
  {
    id: "monthly",
    name: "Plan Mensual",
    periodLabel: "mes",
    price: 68.0,
    rides: 4,
    validityDays: 30,
    insuranceLimit: 200,
    badge: null,
    highlight: "15% de descuento en cada traslado",
    features: [
      "15% de descuento durante 30 días",
      "Cobertura hasta Gran Formato (120 × 80 cm)",
      "MaquetaSegura opcional hasta S/ 200.00",
    ],
  },
  {
    id: "semester",
    name: "Plan Semestral · Ciclo Completo",
    periodLabel: "4 meses",
    price: 240.0,
    rides: 16,
    validityDays: 120,
    insuranceLimit: 300,
    badge: "Recomendado",
    highlight: "25% de descuento en cada traslado",
    features: [
      "25% de descuento durante 120 días",
      "Prioridad de flota en semanas de entrega final",
      "MaquetaSegura opcional hasta S/ 300.00",
    ],
  },
  {
    id: "annual",
    name: "Plan Anual · 2 Ciclos",
    periodLabel: "8 meses",
    price: 432.0,
    rides: 32,
    validityDays: 240,
    insuranceLimit: 300,
    badge: "Mejor valor",
    highlight: "30% de descuento en cada traslado",
    features: [
      "30% de descuento durante 240 días",
      "Prioridad máxima en entregas con jurado",
      "MaquetaSegura opcional hasta S/ 300.00",
    ],
  },
];
export const plans: Plan[] = planReference.map((p) => ({
  id: p.id,
  name: p.name,
  price: p.price,
  rides: p.rides,
  validityDays: p.validityDays,
  period: p.periodLabel,
  badge: p.badge || undefined,
  highlight: p.highlight,
  insuranceLimit: p.insuranceLimit,
  discountPercent: PLAN_DISCOUNTS[p.id as keyof typeof PLAN_DISCOUNTS],
}));
export const tripSteps = [
  "Reserva confirmada",
  "Conductor en punto de recojo",
  "Maqueta asegurada · En ruta a PUCP",
  "Llegada a Facultad de Arquitectura",
];
export const praiseTags = [
  "Maqueta intacta",
  "Manejo suave",
  "Puntualidad",
  "Buen trato",
  "Cuidado de maqueta",
];
export const destination = "Facultad de Arquitectura y Urbanismo - PUCP";
