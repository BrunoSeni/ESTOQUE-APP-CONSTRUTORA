// Regras do estoque que não dependem do banco, para poder testar.

export type TipoMovimento =
  | "entrada"
  | "saida"
  | "transferencia_saida"
  | "transferencia_entrada"
  | "correcao";

export type Movimento = {
  materialId: string;
  tipo: TipoMovimento;
  // Positiva. Na correção, o sinal diz se aumenta ou diminui o saldo.
  quantidade: number;
};

const SINAL: Record<TipoMovimento, 1 | -1> = {
  entrada: 1,
  transferencia_entrada: 1,
  saida: -1,
  transferencia_saida: -1,
  correcao: 1,
};

// Saldo de cada material a partir do histórico de movimentações de uma obra.
export function calcularSaldos(movimentos: Movimento[]): Map<string, number> {
  const saldos = new Map<string, number>();
  for (const m of movimentos) {
    const atual = saldos.get(m.materialId) ?? 0;
    saldos.set(m.materialId, arredondar(atual + SINAL[m.tipo] * m.quantidade));
  }
  return saldos;
}

// Diz se uma saída (ou envio por transferência) pode ser feita.
// Devolve a mensagem de erro, ou null quando está tudo certo.
export function validarRetirada(saldo: number, quantidade: number): string | null {
  if (!(quantidade > 0)) return "Informe uma quantidade maior que zero.";
  if (quantidade > saldo) {
    return `Quantidade maior que o saldo da obra (${formatarQuantidade(saldo)}).`;
  }
  return null;
}

export function formatarQuantidade(valor: number): string {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

// Evita resíduos como 0.30000000000000004 em quantidades fracionadas (m³, kg).
function arredondar(valor: number): number {
  return Math.round(valor * 1000) / 1000;
}
