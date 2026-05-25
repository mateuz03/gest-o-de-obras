import { ShieldCheck } from "lucide-react";
import { LegalLayout, LegalSection } from "@/components/institutional/LegalLayout";

// 📝 Substitua pelos textos jurídicos reais (LGPD)
const ULTIMA_ATUALIZACAO = "25 de maio de 2026";

const SECOES: LegalSection[] = [
  {
    title: "Quem somos",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. O Obra Link é controlador dos dados pessoais coletados em sua plataforma, comprometido com a transparência e segurança no tratamento de informações dos usuários, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018).",
  },
  {
    title: "Dados que coletamos",
    body: "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Coletamos: (i) dados cadastrais (nome, e-mail, telefone); (ii) dados profissionais (CREA/CAU, especialidade); (iii) dados de uso (logs, IP, navegador); (iv) arquivos enviados (plantas, fotos, notas fiscais) e (v) dados de pagamento, quando aplicável.",
  },
  {
    title: "Como utilizamos seus dados",
    body: "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Utilizamos seus dados para: prestação do serviço contratado, melhoria contínua da plataforma, comunicação operacional, cumprimento de obrigações legais e prevenção de fraude.",
  },
  {
    title: "Base legal para o tratamento",
    body: "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore. As bases legais incluem: execução de contrato, cumprimento de obrigação legal, legítimo interesse e consentimento — este último sempre que exigido.",
  },
  {
    title: "Compartilhamento de dados",
    body: "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim. Compartilhamos dados apenas com processadores essenciais (hospedagem, gateway de pagamento, ferramentas de IA), todos sob contrato de confidencialidade. Nunca vendemos seus dados.",
  },
  {
    title: "Seus direitos como titular",
    body: "Sed ut perspiciatis unde omnis iste natus error sit voluptatem. Você tem direito a: (a) confirmar a existência de tratamento; (b) acessar seus dados; (c) corrigir dados incompletos ou desatualizados; (d) solicitar anonimização, bloqueio ou eliminação; (e) portabilidade; (f) revogar consentimento; (g) ser informado sobre compartilhamentos.",
  },
  {
    title: "Segurança da informação",
    body: "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit. Adotamos medidas técnicas e organizacionais para proteger seus dados: criptografia em trânsito (TLS) e em repouso, controle de acesso por função, logs de auditoria, backups regulares e monitoramento contínuo.",
  },
  {
    title: "Retenção de dados",
    body: "Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet. Mantemos seus dados pelo tempo necessário à prestação do serviço e ao cumprimento de obrigações legais. Após esse período, os dados são anonimizados ou excluídos com segurança.",
  },
  {
    title: "Cookies e tecnologias similares",
    body: "Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse. Utilizamos cookies essenciais para o funcionamento da plataforma e cookies analíticos para entender uso. Você pode gerenciar preferências no banner exibido em sua primeira visita.",
  },
  {
    title: "Encarregado (DPO) e contato",
    body: "Para exercer seus direitos ou esclarecer dúvidas sobre o tratamento dos seus dados pessoais, entre em contato com nosso Encarregado de Dados pelo e-mail: dpo@obralink.com.br.",
  },
];

export default function PoliticaPrivacidade() {
  return (
    <LegalLayout
      title="Política de Privacidade"
      subtitle="Como tratamos seus dados pessoais com base na LGPD."
      lastUpdated={ULTIMA_ATUALIZACAO}
      sections={SECOES}
      highlight={
        <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
          <div className="text-sm text-emerald-900">
            <strong className="block font-semibold">Seus dados são seus.</strong>
            Você pode acessar, corrigir, exportar ou excluir suas informações a qualquer momento
            pelo painel da sua conta ou solicitando ao nosso DPO.
          </div>
        </div>
      }
    />
  );
}
