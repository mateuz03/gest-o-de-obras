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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Configuracoes() {
  const [mostrarChaveIA, setMostrarChaveIA] = useState(false);
  const [salvando, setSalvando] = useState(false);
  
  // Estado para controlar o modal de confirmação do modo manutenção
  const [showAlertaManutencao, setShowAlertaManutencao] = useState(false);
  
  // Estados simulados das configurações
  const [config, setConfig] = useState({
    iaKey: "sk-proj-aiconstruct-**********************",
    limiteTokens: "5000000",
    stripeWebhook: "whsec_obralink_**********************",
    modoManutencao: false,
    cadastroLojistasAberto: true
  });

  const handleSalvar = async () => {
    // 5. Validação dos campos antes de salvar
    if (!config.iaKey.trim()) {
      toast.error("A Chave da API não pode estar vazia.");
      return;
    }
    
    if (Number(config.limiteTokens) <= 0) {
      toast.error("O limite de tokens deve ser maior que zero.");
      return;
    }

    setSalvando(true);
    
    // 3. Estrutura try/catch preparada para o backend real
    try {
      // Simula a latência da rede (Substituir pela chamada real do Supabase)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success("Configurações do sistema atualizadas com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Falha ao atualizar as configurações. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  };

  const toggleModoManutencao = (checked: boolean) => {
    if (checked) {
      // 1. Se estiver ativando, mostra o alerta antes de mudar o estado
      setShowAlertaManutencao(true);
    } else {
      // Se estiver desativando, pode desativar direto
      setConfig(prev => ({ ...prev, modoManutencao: false }));
    }
  };

  const confirmarManutencao = () => {
    setConfig(prev => ({ ...prev, modoManutencao: true }));
    setShowAlertaManutencao(false);
    toast.warning("Modo de manutenção ativado. Usuários foram bloqueados.");
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
                  // 4. Usando functional update (prev => ...)
                  onChange={(e) => setConfig(prev => ({ ...prev, iaKey: e.target.value }))}
                  className="pr-10 bg-slate-50 font-mono text-sm" 
                />
                <button 
                  type="button"
                  onClick={() => setMostrarChaveIA(!mostrarChaveIA)}
                  // 2. aria-label adicionado para acessibilidade
                  aria-label={mostrarChaveIA ? "Ocultar chave da API" : "Mostrar chave da API"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
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
                onChange={(e) => setConfig(prev => ({ ...prev, limiteTokens: e.target.value }))}
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
                onChange={(e) => setConfig(prev => ({ ...prev, stripeWebhook: e.target.value }))}
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
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, cadastroLojistasAberto: checked }))} 
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
                onCheckedChange={toggleModoManutencao} 
              />
            </div>

          </CardContent>
        </Card>

      </div>

      {/* ─── ALERT DIALOG DO MODO MANUTENÇÃO ─── */}
      <AlertDialog open={showAlertaManutencao} onOpenChange={setShowAlertaManutencao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <ShieldAlert className="w-5 h-5" />
              Atenção: Modo de Manutenção
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja ativar o modo de manutenção? Isso bloqueará o acesso de <strong>todos os usuários ativos</strong> imediatamente. O sistema ficará inacessível até que você desative esta opção.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmarManutencao}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Ativar Manutenção
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}