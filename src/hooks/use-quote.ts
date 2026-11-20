import { useEffect, useState } from "react";
import { Draft, RouteQuote } from "@/types/models";
import { useApp } from "@/context/AppContext";
import { api } from "@/services/api";
import { calculateFare } from "@/utils/pricing";
import { useNow } from "@/hooks/use-now";
export function useQuote(draft: Draft) {
    const { account } = useApp();
    const now = useNow();
    const [remote, setRemote] = useState<{
        key: string;
        fare: RouteQuote;
        km: number;
    } | null>(null);
    const [error, setError] = useState("");
    const key = JSON.stringify([
        draft.pickup.latitude,
        draft.pickup.longitude,
        draft.date,
        draft.time,
        draft.size,
        draft.insuranceSelected,
        account?.pricing?.microInsuranceFee,
        account?.promoUsed,
        account?.subscription,
        Math.floor(now / 30000),
    ]);
    useEffect(() => {
        let active = true;
        const timer = setTimeout(() => {
            if (!draft.time)
                return;
            api
                .quote(draft)
                .then((fare) => {
                if (active) {
                    setRemote({ key, fare, km: fare.km });
                    setError("");
                }
            })
                .catch((error) => {
                if (active)
                    setError(error instanceof Error ? error.message : "No se pudo calcular la ruta.");
            });
        }, 350);
        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [key, draft]);
    const local = calculateFare(draft.pickup.km, draft.size, account?.promoUsed ?? true, account?.subscription ?? null, now, draft.pickup.min, draft.time || "08:00 AM", account?.user.verified ?? false, draft.insuranceSelected, account?.pricing?.microInsuranceFee ?? 2);
    return {
        fare: remote?.key === key ? remote.fare : local,
        km: remote?.key === key ? remote.km : draft.pickup.km,
        estimated: !!error || remote?.key !== key,
        geometry: remote?.key === key ? remote.fare.geometry : null,
        error: remote?.key === key ? "" : error,
    };
}
