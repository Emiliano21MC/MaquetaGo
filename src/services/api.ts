import type {PaymentMethod,NewPaymentMethod,PaymentConfig} from '@/types/models';
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { Account, AcademicEvent, Draft, OtpChallenge, Pickup, Plan, SafetyPhoto, GoogleTokens, RouteQuote, } from "@/types/models";
const base = (process.env.EXPO_PUBLIC_API_URL ||
    (Platform.OS === "android"
        ? "http://10.0.2.2:3001/api"
        : "http://localhost:3001/api")).replace(/\/$/, "");
let token: string | null = null;
export class ApiError extends Error {
    constructor(message: string, public status: number) {
        super(message);
    }
}
export async function saveToken(value: string | null) {
    token = value;
    if (Platform.OS === "web") {
        if (typeof localStorage !== "undefined") {
            if (value)
                localStorage.setItem("maquetago.token", value);
            else
                localStorage.removeItem("maquetago.token");
            sessionStorage.removeItem("maquetago.token");
        }
    }
    else if (value)
        await SecureStore.setItemAsync("maquetago.token", value);
    else
        await SecureStore.deleteItemAsync("maquetago.token");
}
export async function restoreToken() {
    token =
        Platform.OS === "web"
            ? typeof localStorage !== "undefined"
                ? localStorage.getItem("maquetago.token") ||
                    sessionStorage.getItem("maquetago.token")
                : null
            : await SecureStore.getItemAsync("maquetago.token");
    return token;
}
async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
    let response: Response;
    try {
        response = await fetch(`${base}${path}`, {
            method,
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: body === undefined ? undefined : JSON.stringify(body),
            signal: AbortSignal.timeout(12000),
        });
    }
    catch {
        throw new ApiError("No pudimos conectar. Revisa tu conexión e inténtalo nuevamente.", 0);
    }
    const data = await response
        .json()
        .catch(() => ({ error: "Respuesta no válida del servicio." }));
    if (!response.ok)
        throw new ApiError(data.error || "No pudimos completar la operación.", response.status);
    return data as T;
}
export const api = {
    paymentConfig:()=>request<PaymentConfig>('/payments/config'),
    paymentMethods:(studentId:number)=>request<PaymentMethod[]>('/payments/methods/'+studentId),
    savePaymentMethod:(method:NewPaymentMethod)=>request<PaymentMethod>('/payments/methods','POST',method),
    image: (path: string) => {
        if (!/^\/trips\/\d+\/safety-photo\/(BEFORE_PICKUP|AFTER_DELIVERY)$/.test(path))
            throw new Error("Referencia de foto inválida.");
        return request<{
            uri: string;
        }>(path);
    },
    login: (input: {
        email: string;
        name?: string;
        password?: string;
        recovery?: boolean;
    }) => request<OtpChallenge>("/auth/login-or-register", "POST", input),
    google: (tokens: GoogleTokens) => request<{
        token: string;
        account: Account;
    }>("/auth/google", "POST", tokens),
    verify: (challenge: string, code: string) => request<{
        token: string;
        account: Account;
    }>("/auth/verify-otp", "POST", {
        challenge,
        code,
    }),
    me: () => request<Account>("/me"),
    plans: () => request<Plan[]>("/plans"),
    locations: () => request<Pickup[]>("/locations"),
    events: (id: number) => request<AcademicEvent[]>(`/academic-events/${id}`),
    reminder: (eventId: number, active: boolean) => request("/academic-events/toggle-reminder", "POST", { eventId, active }),
    quote: (draft: Draft) => request<RouteQuote>('/trips/quote', 'POST', { pickupLat: draft.pickup.latitude, pickupLng: draft.pickup.longitude, date: draft.date, time: draft.time, size: draft.size, insuranceSelected: draft.insuranceSelected }),
    search: (q: string) => request<Pickup[]>('/maps/search?q=' + encodeURIComponent(q)),
    reverse: (lat: number, lng: number) => request<Pickup>('/maps/reverse?' + new URLSearchParams({ lat: String(lat), lng: String(lng) })),
    createTrip: (draft: Draft, method: string, approvalCode: string, requestKey: string, paymentMethodId?:number) => request<{
        tripId: string;
        account: Account;
    }>("/trips", "POST", {
        ...draft,
        method,
        approvalCode,
        requestKey,
        paymentMethodId,
    }),
    subscribe: (planId: string, method: string, approvalCode: string, requestKey: string, paymentMethodId?:number) => request<Account>("/subscriptions", "POST", {
        planId,
        method,
        approvalCode,
        requestKey,
    }),
    status: (id: string, status: string) => request<Account>(`/trips/${id}/status`, "PATCH", { status }),
    photo: (id: string, photo: SafetyPhoto) => request<Account>(`/trips/${id}/evidence`, "POST", {
        stage: photo.stage,
        photoUrl: photo.uri,
        location: photo.location,
    }),
    rate: (id: string, stars: number, praise: string[], comment: string) => request<Account>(`/trips/${id}/rating`, "POST", { stars, praise, comment }),
};
