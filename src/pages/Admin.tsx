import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import { AdminDashboard } from "@/components/AdminDashboard";

interface Profile {
  id: string;
  nome_completo: string | null;
  nome: string | null;
  tipo_empresa: string | null;
  nome_empresa: string | null;
  estado: string | null;
  cidade: string | null;
  area_atuacao: string | null;
  qtd_funcionarios: string | null;
  qtd_obras_atual: number | null;
  created_at: string;
  como_conheceu: string | null;
}

export default function Admin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    // Check admin role
    supabase
      .from("user_roles" as any)
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .then(({ data }) => {
        const admin = !!(data && data.length > 0);
        setIsAdmin(admin);
        if (admin) loadProfiles();
        else setLoading(false);
      });
  }, [user]);

  const loadProfiles = async () => {
    const { data } = await supabase.from("profiles").select("*");
    setProfiles((data as any) || []);
    setLoading(false);
  };

  if (isAdmin === false) return <Navigate to="/dashboard" replace />;

  if (loading || isAdmin === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return <AdminDashboard profiles={profiles} />;
}
