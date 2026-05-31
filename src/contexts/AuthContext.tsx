import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface ProfileExtra {
  data_nascimento?: string | null;
  celular_whatsapp?: string | null;
  tipo_empresa?: string | null;
  nome_empresa?: string | null;
  qtd_funcionarios?: string | null;
  qtd_obras_atual?: number | null;
  ano_criacao_negocio?: number | null;
  cidade?: string | null;
  estado?: string | null;
  area_atuacao?: string | null;
  motivo_uso?: string | null;
  como_conheceu?: string | null;
  account_type?: "PF" | "PJ" | null;
  cpf?: string | null;
  cnpj?: string | null;
  inscricao_estadual?: string | null;
  telefone_comercial?: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, nome: string, extra?: ProfileExtra) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, nome: string, extra?: ProfileExtra) => {
    const redirectUrl = `${window.location.origin}/`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nome }, emailRedirectTo: redirectUrl },
    });
    if (error) throw error;

    // Update the profile with extra fields if provided
    if (extra && data.user) {
      await supabase
        .from("profiles")
        .update({
          nome_completo: nome,
          ...extra,
        } as any)
        .eq("user_id", data.user.id);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
