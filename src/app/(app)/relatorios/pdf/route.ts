import { readFileSync } from "node:fs";
import path from "node:path";
import { listarObras } from "@/lib/cadastros";
import { banco } from "@/lib/db";
import { podeVerRelatorios } from "@/lib/movimentos";
import { gerarPdf } from "@/lib/pdf";
import { usuarioAtual } from "@/lib/sessao";
import { montarRelatorio, textoCelula } from "../dados";

// Abre o relatório como PDF, com o logo e as cores da CR Incorp. Só escritório e administrador.
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
  const agora = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  const arquivo = await gerarPdf({
    titulo: r.titulo,
    subtitulo: r.subtitulo,
    resumo: r.resumo,
    colunas: r.colunas.map((c) => ({ titulo: c.titulo, largura: c.largura, direita: c.tipo !== "texto" })),
    linhas: r.linhas.map((l) => l.map((v, i) => textoCelula(v, r.colunas[i]))),
    vazio: r.tipo === "saldo" ? "Nenhum material com saldo nessa obra." : "Nenhuma saída de material nesse período.",
    rodape: `CR Incorp · Estoque da Obra · Gerado em ${agora} por ${usuario.nome}`,
    logo: readFileSync(path.join(process.cwd(), "public", "marca", "logo-cr-incorp.png")),
  });
  // "inline": o navegador abre o PDF direto, em vez de só baixar.
  return new Response(new Uint8Array(arquivo), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${r.arquivo}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
