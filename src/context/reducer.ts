import { locations, materials } from "@/data/limaLocations";
import { Account, AppState, Draft } from "@/types/models";
import { dateKey } from "@/utils/dates";
export const initialDraft = (): Draft => ({
  pickup: locations.find((p) => p.district === "Miraflores")!,
  date: dateKey(new Date(Date.now() + 86400000)),
  time: "08:00 AM",
  size: "MEDIUM",
  material: materials[0],
  notes: "",
  insuranceSelected: false,
});
export const initial: AppState = {
  user: null,
  accounts: {},
  draft: initialDraft(),
  ready: false,
};
export type Action =
  | { type: "LOAD"; account?: Account }
  | { type: "SYNC"; account: Account }
  | { type: "LOGOUT" }
  | { type: "DRAFT"; patch: Partial<Draft> };
export function appReducer(state: AppState, action: Action): AppState {
  if (action.type === "DRAFT")
    return { ...state, draft: { ...state.draft, ...action.patch } };
  if (action.type === "LOGOUT")
    return { ...initial, ready: true, draft: initialDraft() };
  if (action.type === "LOAD" || action.type === "SYNC") {
    const a = action.account;
    return {
      ...state,
      ready: true,
      user: a?.user ?? null,
      accounts: a ? { [a.user.email]: a } : {},
    };
  }
  return state;
}
