import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
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

/** Tipo de conta normalizado para a UI: CPF (Pessoa Física) ou CNPJ (Pessoa Jurídica). */
export type AccountType = "CPF" | "CNPJ";

export interface UserProfile {
  user_id: string;
  nome: string | null;
  nome_completo: string | null;
  account_type: string | null;
  avatar_url: string | null;
}

/** Converte o valor armazenado no banco (PF/PJ/CPF/CNPJ) para o tipo de conta da UI. */
export function normalizeAccountType(raw?: string | null): AccountType {
  const v = (raw || "").toUpperCase();
  if (v === "PJ" || v === "CNPJ") return "CNPJ";
  // Padrão seguro: contas sem tipo definido se comportam como Pessoa Física.
  return "CPF";
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  /** "CPF" para Pessoa Física, "CNPJ" para Pessoa Jurídica. */
  accountType: AccountType;
  loading: boolean;
  profileLoading: boolean;
  refreshProfile: () => Promise<void>;
  signUp: (email: string, password: string, nome: string, extra?: ProfileExtra) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const loadProfile = useCallback(async (userId: string) => {
    setProfileLoading(true);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, nome, nome_completo, account_type, avatar_url")
        .eq("user_id", userId)
        .maybeSingle();
      setProfile((data as UserProfile) ?? null);
    } catch {
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      // Carrega o perfil de forma assíncrona (evita travar o callback de auth)
      if (session?.user) {
        setTimeout(() => loadProfile(session.user.id), 0);
      } else {
        setProfile(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) loadProfile(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id);
  }, [user, loadProfile]);

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

  /**
   * Logout seguro: encerra a sessão, limpa o estado/caches locais e reseta a
   * pilha de navegação com `location.replace` — assim o botão "Voltar" do
   * navegador não consegue reaver telas/dados privados.
   */
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      // Limpa estado em memória
      setUser(null);
      setSession(null);
      setProfile(null);
      // Limpa caches persistidos (inclui tokens do Supabase e preferências)
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {
        /* ambiente sem storage — ignora */
      }
      // Reset duro da navegação para a área pública (sem histórico privado)
      window.location.replace("/");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        accountType: normalizeAccountType(profile?.account_type),
        loading,
        profileLoading,
        refreshProfile,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
