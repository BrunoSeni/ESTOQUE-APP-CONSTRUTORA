import type { CampoCadastro } from "../formulario-cadastro";

export const CAMPOS_OBRA: CampoCadastro[] = [
  { nome: "nome", rotulo: "Nome da obra", tipo: "text", obrigatorio: true },
  { nome: "endereco", rotulo: "Endereço", tipo: "text", ajuda: "Opcional." },
];
