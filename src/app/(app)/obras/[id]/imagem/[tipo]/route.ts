import { obrasDoUsuario } from "@/lib/cadastros";
import { banco, PASTA_IMAGENS_OBRAS } from "@/lib/db";
import { eTipoImagem, lerImagemObra } from "@/lib/imagens-obra";
import { usuarioAtual } from "@/lib/sessao";

// Entrega o logo ou a foto da fachada de uma obra, só para quem entrou no app e pode ver essa obra.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; tipo: string }> }) {
  const { id, tipo } = await params;
  const usuario = await usuarioAtual();
  const obraId = Number(id);
  if (!usuario || !eTipoImagem(tipo)) return new Response(null, { status: 404 });
  if (usuario.perfil !== "admin" && !obrasDoUsuario(banco(), usuario).some((o) => o.id === obraId)) {
    return new Response(null, { status: 404 });
  }
  const imagem = lerImagemObra(PASTA_IMAGENS_OBRAS, obraId, tipo);
  if (!imagem) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(imagem.dados), {
    headers: { "Content-Type": imagem.mime, "Cache-Control": "private, max-age=31536000, immutable" },
  });
}
