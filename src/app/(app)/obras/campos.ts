import { LIMITE_IMAGEM_MB, type TipoImagem } from "@/lib/imagens-obra";
import type { CampoCadastro } from "../formulario-cadastro";

// Na edição, "imagens" traz o endereço do logo e da fachada que a obra já tem, para mostrar na tela.
export function camposObra(imagens: Record<TipoImagem, string | null> = { logo: null, fachada: null }): CampoCadastro[] {
  return [
    { nome: "nome", rotulo: "Nome da obra", tipo: "text", obrigatorio: true },
    { nome: "endereco", rotulo: "Endereço", tipo: "text", ajuda: "Opcional." },
    { nome: "logo", rotulo: "Logo da obra", tipo: "imagem", ajuda: "Opcional. PNG ou JPG.", atual: imagens.logo, limiteMB: LIMITE_IMAGEM_MB },
    {
      nome: "fachada",
      rotulo: "Foto da fachada",
      tipo: "imagem",
      ajuda: `Opcional. PNG ou JPG, até ${LIMITE_IMAGEM_MB} MB.`,
      atual: imagens.fachada,
      limiteMB: LIMITE_IMAGEM_MB,
    },
  ];
}
