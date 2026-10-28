import { listarObras } from "@/lib/cadastros";
import { banco } from "@/lib/db";
import { gerarXlsx } from "@/lib/excel";
import { podeVerRelatorios } from "@/lib/movimentos";
import { usuarioAtual } from "@/lib/sessao";
import { montarRelatorio } from "../dados";

// Baixa o relatório que está na tela como planilha do Excel. Só escritório e administrador.
export async function GET(req: Request) {
  const usuario = await usuarioAtual();
  if (!usuario || !podeVerRelatorios(usuario.perfil)) return new Response(null, { status: 404 });
  const p = new URL(req.url).searchParams;
  const r = montarRelatorio(banco(), listarObras(banco()), {
    tipo: p.get("tipo") ?? undefined,
    obra: p.get("obra") ?? undefined,
    de: p.get("de") ?? undefined,
    ate: p.get("ate") ?? undefined,
  });
  const arquivo = gerarXlsx([
    {
      nome: r.titulo,
      colunas: r.colunas.map((c) => c.titulo),
      larguras: r.colunas.map((c) => c.largura),
      moedas: r.colunas.flatMap((c, i) => (c.tipo === "moeda" ? [i] : [])),
      linhas: r.linhas,
    },
  ]);
  return new Response(new Uint8Array(arquivo), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${r.arquivo}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
