// Utilitário centralizado de validação de força de senha.
// Fonte única de verdade usada tanto pelo medidor visual (strength meter)
// quanto pela validação nativa do formulário antes do envio.

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

export interface PasswordCriterion {
  /** Identificador estável do critério (usado em keys/ARIA). */
  key: "length" | "letter" | "number" | "special";
  /** Rótulo legível exibido ao usuário. */
  label: string;
  /** Se o critério foi atendido pela senha atual. */
  met: boolean;
  /** Se o critério é obrigatório para considerar a senha válida. */
  required: boolean;
}

export interface PasswordStrengthResult {
  /** Pontuação de 0 a 4 (alimenta o medidor visual). */
  score: number;
  /** Rótulo da força ("Fraca", "Média", "Forte", "Muito forte"). */
  label: string;
  /** Classe Tailwind para a barra do medidor. */
  barClass: string;
  /** Classe Tailwind para o texto do rótulo. */
  textClass: string;
  /** Lista de critérios avaliados. */
  criteria: PasswordCriterion[];
  /** Verdadeiro quando todos os critérios obrigatórios são atendidos. */
  isValid: boolean;
  /** Mensagens de erro para os critérios obrigatórios não atendidos. */
  errors: string[];
}

const hasLetter = (pw: string) => /[A-Za-z]/.test(pw);
const hasNumber = (pw: string) => /[0-9]/.test(pw);
const hasSpecial = (pw: string) => /[^A-Za-z0-9]/.test(pw);
const hasMinLength = (pw: string) => pw.length >= PASSWORD_MIN_LENGTH;

/**
 * Avalia a força de uma senha e retorna critérios, pontuação e erros.
 * Reaproveitado em todas as telas que lidam com criação/redefinição de senha.
 */
export function validatePasswordStrength(password: string): PasswordStrengthResult {
  const pw = password ?? "";

  const criteria: PasswordCriterion[] = [
    {
      key: "length",
      label: `Mínimo de ${PASSWORD_MIN_LENGTH} caracteres`,
      met: hasMinLength(pw),
      required: true,
    },
    {
      key: "letter",
      label: "Pelo menos uma letra",
      met: hasLetter(pw),
      required: true,
    },
    {
      key: "number",
      label: "Pelo menos um número",
      met: hasNumber(pw),
      required: true,
    },
    {
      key: "special",
      label: "Caractere especial (recomendado)",
      met: hasSpecial(pw),
      required: false,
    },
  ];

  // Erros das regras obrigatórias (usados na validação antes do envio).
  const errors: string[] = [];
  if (!pw) {
    errors.push("Informe uma senha");
  } else {
    if (!hasMinLength(pw)) errors.push(`A senha deve ter no mínimo ${PASSWORD_MIN_LENGTH} caracteres`);
    if (pw.length > PASSWORD_MAX_LENGTH) errors.push(`A senha deve ter no máximo ${PASSWORD_MAX_LENGTH} caracteres`);
    if (!hasLetter(pw)) errors.push("A senha deve incluir ao menos uma letra");
    if (!hasNumber(pw)) errors.push("A senha deve incluir ao menos um número");
  }

  // Pontuação para o medidor visual (independe das regras obrigatórias).
  let score = 0;
  if (pw.length >= PASSWORD_MIN_LENGTH) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (hasNumber(pw)) score++;
  if (hasSpecial(pw)) score++;
  // Normaliza para 1..4 quando há conteúdo.
  if (pw) score = Math.min(4, Math.max(1, score));
  else score = 0;

  let label = "";
  let barClass = "";
  let textClass = "";
  if (score <= 1 && pw) {
    label = "Fraca";
    barClass = "bg-destructive";
    textClass = "text-destructive";
  } else if (score === 2) {
    label = "Média";
    barClass = "bg-amber-500";
    textClass = "text-amber-600";
  } else if (score === 3) {
    label = "Forte";
    barClass = "bg-primary";
    textClass = "text-primary";
  } else if (score >= 4) {
    label = "Muito forte";
    barClass = "bg-accent";
    textClass = "text-accent";
  }

  const isValid = errors.length === 0 && hasMinLength(pw) && pw.length <= PASSWORD_MAX_LENGTH && hasLetter(pw) && hasNumber(pw);

  return { score, label, barClass, textClass, criteria, isValid, errors };
}

/** Conveniência: indica se a senha atende a todos os critérios obrigatórios. */
export function isPasswordStrongEnough(password: string): boolean {
  return validatePasswordStrength(password).isValid;
}
