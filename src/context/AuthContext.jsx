import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { supabase } from "../config/supabaseClient.js";

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const refreshProfile = useCallback(() => setRevision((r) => r + 1), []);
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!alive) return;
      if (sessionError) {
        setError(sessionError.message);
        setLoading(false);
      } else {
        setUser(data.session?.user ?? null);
        if (!data.session) setLoading(false);
      }
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!user) return;
    let alive = true;
    setLoading(true);
    setError("");
    setProfile(null);
    supabase
      .from("dna_members")
      .select("*")
      .eq("id", user.id)
      .single()
      .then(({ data, error: profileError }) => {
        if (!alive) return;
        if (profileError)
          setError(
            "Não foi possível carregar o perfil do portal. Verifique se a migração do Clube DNA foi aplicada no Supabase. " +
              profileError.message,
          );
        else setProfile(data);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [user?.id, revision]);
  const logout = async () => {
    const { error: e } = await supabase.auth.signOut();
    if (e) throw e;
  };
  return (
    <AuthContext.Provider
      value={{ user, profile, loading, error, logout, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
