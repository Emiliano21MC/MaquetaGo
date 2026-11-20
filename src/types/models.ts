export type Size = "SMALL" | "MEDIUM" | "LARGE";
export interface GoogleTokens {
  id_token?: string;
  access_token?: string;
}
export interface Pickup {
  address: string;
  district: string;
  km: number;
  min: number;
  x: number;
  y: number;
  latitude: number;
  longitude: number;
}
export interface Plan {
  id: string;
  name: string;
  price: number;
  rides: number;
  validityDays: number;
  period: string;
  badge?: string;
  highlight: string;
  insuranceLimit: number;
  discountPercent: number;
}
export interface Subscription extends Plan {
  remainingRides: number;
  expiresAt: number;
  startsAt: number;
  status: "ACTIVE" | "INACTIVE";
}
export interface User {
  id: number;
  name: string;
  email: string;
  verified: boolean;
}
export interface Draft {
  pickup: Pickup;
  date: string;
  time: string;
  size: Size;
  material: string;
  notes: string;
  insuranceSelected: boolean;
}
export interface Fare {
  baseRate: number;
  distanceRate: number;
  sizeFee: number;
  subtotal: number;
  discount: number;
  total: number;
  covered: boolean;
  promotional: boolean;
  trafficRate: number;
  trafficMinutes: number;
  peak: boolean;
  insuranceLimit: number;
  discountPercent: number;
  discountKind: "PLAN" | "FIRST_TRIP" | "REGULAR" | "LEGACY_INCLUDED";
  insuranceFee: number;
  insuranceSelected: boolean;
}
export interface Trip extends Draft {
  id: string;
  code: string;
  step: number;
  completed: boolean;
  totalPaid: number;
  paymentLabel: string;
  fare: Fare;
  rating?: number;
  praise?: string[];
  ratingComment?: string;
  insuranceCode: string | null;
  insuranceLimit: number;
  photos: SafetyPhoto[];
}
export interface Account {
  pricing: { microInsuranceFee: number };
  user: User;
  promoUsed: boolean;
  plansUnlocked: boolean;
  subscription: Subscription | null;
  trips: Trip[];
}
export interface AppState {
  user: User | null;
  accounts: Record<string, Account>;
  draft: Draft;
  ready: boolean;
}
export interface SafetyPhoto {
  revision?: string;
  stage: "BEFORE_PICKUP" | "AFTER_DELIVERY";
  uri: string;
  location: string;
  capturedAt: string;
  verified: boolean;
}
export interface AcademicEvent {
  id: number;
  title: string;
  course: string;
  date: string;
  time: string;
  semester: string;
  reminder: boolean | number;
}
export interface OtpChallenge {
  challenge: string;
  email: string;
  expiresIn: number;
  devCode: string | null;
}

export interface RouteQuote extends Fare { km:number; baseMinutes:number; source:string; trafficEstimate:boolean; geometry:{type:"LineString";coordinates:[number,number][]}; }

export interface PaymentMethod {id:number;student_id:number;brand:'Visa'|'Mastercard'|'Amex';last4:string;holder_name:string;exp_month:number;exp_year:number;is_default:boolean;created_at:string;}
export type NewPaymentMethod=Pick<PaymentMethod,'brand'|'last4'|'holder_name'|'exp_month'|'exp_year'>&{is_default?:boolean};
export interface PaymentConfig {mode:string;yapePhone:string|null;yapeMerchant:string|null;yapePayload:string|null;}
