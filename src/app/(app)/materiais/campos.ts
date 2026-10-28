import type { DatabaseSync } from "node:sqlite";
import type { CampoCadastro } from "../formulario-cadastro";

const UNIDADES_COMUNS = ["un", "saco", "m", "m²", "m³", "kg", "barra", "lata", "galão", "rolo", "caixa", "pç", "l", "milheiro"];

// As sugestões de unidade juntam as mais comuns com as que já estão no cadastro.
export function camposMaterial(db: DatabaseSync): CampoCadastro[] {
  const usadas = (db.prepare("select distinct unidade from materiais").all() as { unidade: string }[]).map((u) => u.unidade);
  return [
    { nome: "nome", rotulo: "Nome do material", tipo: "text", obrigatorio: true, ajuda: "Ex.: Cimento CP II 50 kg" },
    {
      nome: "unidade",
      rotulo: "Unidade de medida",
      tipo: "text",
      obrigatorio: true,
      ajuda: "Ex.: saco, m³, barra, un",
      sugestoes: [...new Set([...UNIDADES_COMUNS, ...usadas])],
    },
  ];
}
