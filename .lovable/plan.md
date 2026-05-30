## Objetivo

Aprimorar o fluxo de recuperação de senha em três frentes: reenvio do link com proteção anti-spam, feedback visual de força/critérios da senha e tratamento claro de token expirado ou inválido.

## O que será feito

### 1. Reenvio do link com cooldown (`src/pages/EsqueciSenha.tsx`)
Na tela de sucesso ("Verifique seu e-mail"), o botão atual "Enviar para outro e-mail" será mantido, e será adicionado um novo botão **"Reenviar link"** que:
- Reenvia para o mesmo e-mail já informado.
- Fica desabilitado durante um **cooldown de 60s**, exibindo a contagem regressiva (ex.: "Reenviar em 45s").
- Mostra um toast de confirmação após o reenvio.
- O cooldown inicia automaticamente no primeiro envio, evitando spam.

### 2. Medidor de força e critérios visuais (`src/pages/RedefinirSenha.tsx`)
No formulário de nova senha:
- **Barra de força** (Fraca / Média / Forte / Muito forte) calculada por comprimento e variedade de caracteres (letras, números, maiúsculas, símbolos), com cor adaptativa usando tokens do design system.
- **Checklist de critérios** em tempo real, com ícone de check/pendente para cada regra:
  - Mínimo de 8 caracteres
  - Pelo menos uma letra
  - Pelo menos um número
- Indicador de **"As senhas conferem"** para o campo "Confirmar Nova Senha".
- A lógica de validação Zod existente permanece como fonte de verdade para habilitar o botão.

### 3. Validação de token aprimorada (`src/pages/RedefinirSenha.tsx`)
- Detectar explicitamente erros vindos no hash da URL (`error`, `error_code`, `error_description`) — caso comum quando o link expira (`otp_expired`) ou é inválido (`access_denied`).
- Diferenciar mensagens: **expirado** vs **inválido**, com texto orientando a solicitar um novo link.
- Manter o estado de carregamento enquanto verifica a sessão/evento `PASSWORD_RECOVERY`, e cair no estado de erro claro quando nenhum token válido for encontrado (com botão "Solicitar novo link" já existente, reforçado).

## Detalhes técnicos

- **Componentes reutilizados:** `Button`, `Input`, `Card`, ícones `lucide-react` (`Check`, `X`, `RefreshCw`), `toast` (sonner) — todos já usados nas telas.
- **Cooldown:** implementado com `useState` + `useEffect`/`setInterval` para a contagem regressiva, limpando o intervalo no unmount.
- **Força da senha:** função pura local que retorna `{ score, label, color }`; barra renderizada com `div` segmentada ou `Progress`, usando classes de token (`bg-primary`, `bg-destructive`, etc.) — sem cores hardcoded.
- **Sem mudanças de backend:** nenhuma migração, RLS ou edge function. Apenas chamadas já existentes (`resetPasswordForEmail`, `updateUser`).
- **Sem mudança de paleta:** todo o styling segue os tokens atuais do design system.

## Arquivos afetados
- `src/pages/EsqueciSenha.tsx` (editar) — botão de reenvio + cooldown
- `src/pages/RedefinirSenha.tsx` (editar) — medidor de força, checklist, validação de token
