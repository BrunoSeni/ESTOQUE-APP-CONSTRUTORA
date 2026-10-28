// Valores em reais, no jeito brasileiro: R$ 1.234,56.
export function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
