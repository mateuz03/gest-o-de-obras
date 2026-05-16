import { useState } from "react";
import { 
  Settings, 
  Key, 
  CreditCard, 
  ShieldAlert, 
  Save, 
  Eye, 
  EyeOff,
  Server
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function Configuracoes() {
  const [mostrarChaveIA, setMostrarChaveIA] = useState(false);
  const [salvando, setSalvando] = useState(false);
  
  // Estados simulados das configurações
  const [config, setConfig] = useState({
    iaKey: "sk-proj-aiconstruct-**********************",
    limiteTokens: "5000000",
    stripeWebhook: "whsec_obralink_**********************",
    modoManutencao: false,
    cadastroLojistasAberto: true
  });

  const handleSalvar = () => {
    setSalvando(true);
    // Simula uma chamada ao backend para salvar as variáveis de ambiente
    setTimeout(() => {
      setSalvando(false);
      toast.success("Configurações do sistema atualizadas com sucesso!");
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300 pb-12">
      
      {/* ─── CABEÇALHO ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <Settings className="w-8 h-8 text-emerald-600" />
            Configurações Globais
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            Gerencie variáveis de ambiente, integrações de pagamento e estado geral da plataforma.
          </p>
        </div>
        <Button 
          onClick={handleSalvar}
          disabled={salvando}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm px-6"
        >
          {salvando ? "Salvando..." : <><Save className="w-4 h-4 mr-2" /> Salvar Alterações</>}
        </Button>
      </div>

      <div className="space-y-6">
        
        {/* ─── BLOCO 1: INTEGRAÇÃO IA ─── */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Key className="w-5 h-5 text-indigo-500" /> Inteligência Artificial (OpenAI)
            </CardTitle>
            <CardDescription>
              Credenciais da API usada para leitura de plantas e orçamentação automatizada.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div>
              <Label className="text-slate-700 font-bold mb-2 block">Chave da API (Secret Key)</Label>
              <div className="relative">
                <Input 
                  type={mostrarChaveIA ? "text" : "password"} 
                  value={config.iaKey}
                  onChange={(e) => setConfig({...config, iaKey: e.target.value})}
                  className="pr-10 bg-slate-50 font-mono text-sm" 
                />
                <button 
                  type="button"
                  onClick={() => setMostrarChaveIA(!mostrarChaveIA)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {mostrarChaveIA ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            <div>
              <Label className="text-slate-700 font-bold mb-2 block">Limite Global de Tokens (Mensal)</Label>
              <Input 
                type="number" 
                value={config.limiteTokens}
                onChange={(e) => setConfig({...config, limiteTokens: e.target.value})}
                className="bg-slate-50 max-w-[200px]" 
              />
              <p className="text-xs text-slate-500 mt-1">Evita cobranças surpresa caso ocorra um pico anômalo de uso.</p>
            </div>
          </CardContent>
        </Card>

        {/* ─── BLOCO 2: PAGAMENTOS ─── */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-500" /> Pagamentos & Assinaturas
            </CardTitle>
            <CardDescription>
              Configuração do Webhook do Stripe para liberar acesso automático após o pagamento.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div>
              <Label className="text-slate-700 font-bold mb-2 block">Stripe Webhook Secret</Label>
              <Input 
                type="password" 
                value={config.stripeWebhook}
                onChange={(e) => setConfig({...config, stripeWebhook: e.target.value})}
                className="bg-slate-50 font-mono text-sm" 
              />
            </div>
          </CardContent>
        </Card>

        {/* ─── BLOCO 3: CONTROLES DO SISTEMA ─── */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Server className="w-5 h-5 text-amber-500" /> Controles Operacionais
            </CardTitle>
            <CardDescription>
              Ative ou desative módulos inteiros da plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            
            {/* Toggle de Cadastro de Lojistas */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <p className="font-bold text-slate-900">Cadastro de Lojistas</p>
                <p className="text-sm text-slate-500">Permite que novas lojas se cadastrem no marketplace.</p>
              </div>
              <Switch 
                checked={config.cadastroLojistasAberto} 
                onCheckedChange={(checked) => setConfig({...config, cadastroLojistasAberto: checked})} 
              />
            </div>

            {/* Toggle de Manutenção (DANGER ZONE) */}
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-bold text-red-900">Modo de Manutenção</p>
                  <p className="text-sm text-red-700">Bloqueia o acesso de todos os usuários (exceto admins). Use apenas em atualizações críticas do banco de dados.</p>
                </div>
              </div>
              <Switch 
                checked={config.modoManutencao} 
                onCheckedChange={(checked) => setConfig({...config, modoManutencao: checked})} 
              />
            </div>

          </CardContent>
        </Card>

      </div>
    </div>
  );
}