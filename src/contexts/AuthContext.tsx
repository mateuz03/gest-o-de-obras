import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabase } from "@/integrations/supabase/client";

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
export type AccountStatus = "active" | "suspended" | "banned";

export interface UserProfile {
  user_id: string;
  nome: string | null;
  nome_completo: string | null;
  account_type: string | null;
  account_status: AccountStatus | null;
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
  accountStatus: AccountStatus;
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
        .select("user_id, nome, nome_completo, account_type, account_status, avatar_url")
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
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = nome.trim();
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: { data: { nome: normalizedName }, emailRedirectTo: redirectUrl },
    });
    if (error) throw error;

    // Update the profile with extra fields if provided
    if (extra && data.user) {
      const profilePayload = {
        nome_completo: normalizedName,
        data_nascimento: extra.data_nascimento ?? null,
        celular_whatsapp: extra.celular_whatsapp ?? null,
        tipo_empresa: extra.tipo_empresa ?? null,
        nome_empresa: extra.nome_empresa ?? null,
        qtd_funcionarios: extra.qtd_funcionarios ?? null,
        qtd_obras_atual: extra.qtd_obras_atual ?? null,
        ano_criacao_negocio: extra.ano_criacao_negocio ?? null,
        cidade: extra.cidade ?? null,
        estado: extra.estado ?? null,
        area_atuacao: extra.area_atuacao ?? null,
        motivo_uso: extra.motivo_uso ?? null,
        como_conheceu: extra.como_conheceu ?? null,
        account_type: extra.account_type ?? null,
        cpf: extra.cpf ?? null,
        cnpj: extra.cnpj ?? null,
        inscricao_estadual: extra.inscricao_estadual ?? null,
        telefone_comercial: extra.telefone_comercial ?? null,
      };

      await supabase
        .from("profiles")
        .update(profilePayload as any)
        .eq("user_id", data.user.id);
    }
  };

  const signInDirectly = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  }, []);

  const signIn = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/auth-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const authError = new Error(
          typeof payload?.error === "string" ? payload.error : "Nao foi possivel concluir o login.",
        ) as Error & { code?: string };
        authError.code = typeof payload?.code === "string" ? payload.code : "LOGIN_FAILED";

        if (response.status >= 500) {
          console.warn("[auth] auth-login unavailable, trying direct sign-in fallback", {
            status: response.status,
            code: authError.code,
          });
          await signInDirectly(normalizedEmail, password);
          return;
        }

        throw authError;
      }

      const accessToken = payload?.session?.access_token;
      const refreshToken = payload?.session?.refresh_token;
      if (typeof accessToken !== "string" || typeof refreshToken !== "string") {
        console.warn("[auth] auth-login returned an invalid session payload, trying direct sign-in fallback");
        await signInDirectly(normalizedEmail, password);
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) throw error;
    } catch (error) {
      if (error instanceof TypeError) {
        console.warn("[auth] auth-login request failed, trying direct sign-in fallback", error);
        await signInDirectly(normalizedEmail, password);
        return;
      }

      throw error;
    }
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
        accountStatus: profile?.account_status ?? "active",
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
