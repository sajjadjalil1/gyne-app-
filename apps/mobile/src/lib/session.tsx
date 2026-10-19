import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, getToken, setToken } from "./api";

type User = { id: string; name: string; role: string; patientId: string | null };
type Ctx = { ready: boolean; user: User | null; signIn: (token: string, user: User) => Promise<void>; signOut: () => Promise<void> };
const SessionCtx = createContext<Ctx>({ ready: false, user: null, signIn: async () => {}, signOut: async () => {} });

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    (async () => {
      const t = await getToken();
      if (t) {
        try { const me = await api<{ patient: { id: string; name: string } }>("/api/me"); setUser({ id: "", name: me.patient.name, role: "PATIENT", patientId: me.patient.id }); }
        catch { await setToken(null); }
      }
      setReady(true);
    })();
  }, []);
  const signIn = useCallback(async (token: string, u: User) => { await setToken(token); setUser(u); }, []);
  const signOut = useCallback(async () => { try { await api("/api/auth/logout", { method: "POST" }); } catch {} await setToken(null); setUser(null); }, []);
  const value = useMemo(() => ({ ready, user, signIn, signOut }), [ready, user, signIn, signOut]);
  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}
export const useSession = () => useContext(SessionCtx);
