/**
 * Função auxiliar para aplicar riscado (strikethrough) em texto utilizando caracteres Unicode
 * @param text Texto a ser formatado
 * @returns Texto com strikethrough aplicado
 */
export function strikethrough(text: string): string {
  if (!text) return "";
  return text.split("").map((c) => c + "\u0336").join("");
}
