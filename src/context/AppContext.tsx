import { isSubscriptionActive } from "../../shared/subscriptions";
import { useNow } from "@/hooks/use-now";
import { cancelReminders } from "@/services/reminders";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useState,
  useCallback,
} from "react";
import {
  Account,
  AcademicEvent,
  AppState,
  Draft,
  OtpChallenge,
  SafetyPhoto,
  Plan,
  GoogleTokens,
} from "@/types/models";
import { Action, appReducer, initial } from "./reducer";
import { api, ApiError, restoreToken, saveToken } from "@/services/api";
import { plans as defaultPlans } from "@/data/limaLocations";
interface ContextValue {
  state: AppState;
  account: Account | null;
  dispatch: React.Dispatch<Action>;
  storageError: boolean;
  offline: boolean;
  events: AcademicEvent[];
  catalogPlans: Plan[];
  pendingOtp: OtpChallenge | null;
  beginLogin: (input: {
    email: string;
    name?: string;
    password?: string;
    recovery?: boolean;
  }) => Promise<void>;
  beginGoogle: (tokens: GoogleTokens) => Promise<void>;
  verifyOtp: (code: string) => Promise<void>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  createTrip: (
    draft: Draft,
    method: string,
    code: string,
    key: string,
    paymentMethodId?: number,
  ) => Promise<string>;
  subscribe: (
    plan: string,
    method: string,
    code: string,
    key: string,
    paymentMethodId?: number,
  ) => Promise<void>;
  status: (id: string, status: string) => Promise<void>;
  photo: (id: string, photo: SafetyPhoto) => Promise<void>;
  rate: (
    id: string,
    stars: number,
    praise: string[],
    comment: string,
  ) => Promise<void>;
  toggleReminder: (id: number, active: boolean) => Promise<void>;
}
const Context = createContext<ContextValue | null>(null);
const cacheKey = "maquetago.server-account.v3";
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initial);
  const now = useNow();
  const [storageError, setStorageError] = useState(false);
  const [offline, setOffline] = useState(false);
  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [catalogPlans, setCatalogPlans] = useState(defaultPlans);
  const [pendingOtp, setPendingOtp] = useState<OtpChallenge | null>(null);
  const account = state.user
    ? (state.accounts[state.user.email] ?? null)
    : null;
  const sync = useCallback(async (a: Account) => {
    dispatch({ type: "SYNC", account: a });
    setOffline(false);
    await AsyncStorage.setItem(cacheKey, JSON.stringify(a)).catch(() =>
      setStorageError(true),
    );
  }, []);
  const loadEvents = useCallback(async (a: Account) => {
    const id = a.user.id;
    try {
      setCatalogPlans(await api.plans());
    } catch {
      /* Keep the local catalog while offline. */
    }
    if (!isSubscriptionActive(a.subscription, Date.now())) {
      setEvents([]);
      await cancelReminders(id).catch(() => {});
      return;
    }
    try {
      const data = await api.events(id);
      setEvents(data);

      await AsyncStorage.setItem(
        cacheKey + ".events." + id,
        JSON.stringify(data),
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setEvents([]);
        await cancelReminders(id).catch(() => {});
        return;
      }
      const cached = await AsyncStorage.getItem(cacheKey + ".events." + id);
      if (cached) setEvents(JSON.parse(cached));
    }
  }, []);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const token = await restoreToken();
        if (!token) {
          if (active) dispatch({ type: "LOAD" });
          return;
        }
        try {
          const a = await api.me();
          if (active) {
            await sync(a);
            await loadEvents(a);
          }
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) {
            await saveToken(null);
            if (active) dispatch({ type: "LOAD" });
            return;
          }
          const cached = await AsyncStorage.getItem(cacheKey);
          if (active) {
            const a = cached ? (JSON.parse(cached) as Account) : undefined;
            dispatch({ type: "LOAD", account: a });
            setOffline(true);
            if (a) await loadEvents(a);
          }
        }
      } catch {
        if (active) {
          setStorageError(true);
          dispatch({ type: "LOAD" });
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [sync, loadEvents]);
  useEffect(() => {
    if (!account || isSubscriptionActive(account.subscription, now)) return;
    void Promise.resolve()
      .then(() => {
        setEvents((current) => (current.length ? [] : current));
        return cancelReminders(account.user.id);
      })
      .catch(() => {});
  }, [account, now]);
  const refresh = useCallback(async () => {
    try {
      const a = await api.me();
      await sync(a);
      await loadEvents(a);
    } catch (error) {
      if (error instanceof ApiError && error.status === 0) setOffline(true);
      throw error;
    }
  }, [sync, loadEvents]);
  async function beginLogin(input: Parameters<typeof api.login>[0]) {
    setPendingOtp(await api.login(input));
  }
  async function beginGoogle(tokens: GoogleTokens) {
    const result = await api.google(tokens);
    await saveToken(result.token);
    await sync(result.account);
    setPendingOtp(null);
    // Calendar requests must not delay successful sign-in or navigation.
    void loadEvents(result.account).catch(() => {});
  }
  async function verifyOtp(code: string) {
    if (!pendingOtp) throw new Error("Solicita primero tu código.");
    const result = await api.verify(pendingOtp.challenge, code);
    await saveToken(result.token);
    await sync(result.account);
    setPendingOtp(null);
    await loadEvents(result.account);
  }
  async function logout() {
    if (account) await cancelReminders(account.user.id).catch(() => {});
    await saveToken(null);
    await AsyncStorage.removeItem(cacheKey);
    dispatch({ type: "LOGOUT" });
    setEvents([]);
    setPendingOtp(null);
  }
  async function createTrip(
    draft: Draft,
    method: string,
    code: string,
    key: string,
    paymentMethodId?: number,
  ) {
    const result = await api.createTrip(draft, method, code, key, paymentMethodId);
    await sync(result.account);
    return result.tripId;
  }
  async function subscribe(
    plan: string,
    method: string,
    code: string,
    key: string,
    paymentMethodId?: number,
  ) {
    const updated = await api.subscribe(plan, method, code, key, paymentMethodId);
    await sync(updated);
    await loadEvents(updated);
  }
  async function status(id: string, status: string) {
    await sync(await api.status(id, status));
  }
  async function photo(id: string, photo: SafetyPhoto) {
    await sync(await api.photo(id, photo));
  }
  async function rate(
    id: string,
    stars: number,
    praise: string[],
    comment: string,
  ) {
    await sync(await api.rate(id, stars, praise, comment));
  }
  async function toggleReminder(id: number, active: boolean) {
    await api.reminder(id, active);
    if (account) await loadEvents(account);
  }
  return (
    <Context.Provider
      value={{
        state,
        account,
        dispatch,
        storageError,
        offline,
        events,
        catalogPlans,
        pendingOtp,
        beginLogin,
        beginGoogle,
        verifyOtp,
        refresh,
        logout,
        createTrip,
        subscribe,
        status,
        photo,
        rate,
        toggleReminder,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useApp() {
  const value = useContext(Context);
  if (!value) throw new Error("AppProvider requerido");
  return value;
}
