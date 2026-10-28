"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ativarMaterial,
  ativarUsuario,
  encerrarObra,
  importarMateriais,
  salvarMaterial,
  salvarObra,
  salvarUsuario,
  type ResultadoImportacao,
} from "@/lib/cadastros";
import { banco, PASTA_IMAGENS_OBRAS } from "@/lib/db";
import { conferirImagem, guardarImagemObra, removerImagemObra, TIPOS_IMAGEM } from "@/lib/imagens-obra";
import { podeLancar, registrarEntrada, registrarSaida } from "@/lib/movimentos";
import { lerPlanilha } from "@/lib/planilha";
import { COOKIE_OBRA, exigirAdmin, exigirUsuario, obraAtual } from "@/lib/sessao";

// Em caso de erro, o que foi digitado volta preenchido (menos senhas).
export type EstadoCadastro = { erro: string | null; valores?: Record<string, string | string[]> };

function texto(form: FormData, campo: string): string {
  return String(form.get(campo) ?? "");
}

function valores(form: FormData): Record<string, string | string[]> {
  const v: Record<string, string | string[]> = {};
  for (const chave of new Set(form.keys())) {
    if (chave.startsWith("$") || chave.includes("senha")) continue;
    if (form.getAll(chave).some((x) => x instanceof File)) continue;
    const todos = form.getAll(chave).map(String);
    v[chave] = todos.length > 1 || chave === "obras" ? todos : todos[0];
  }
  return v;
}

export async function trocarObraAcao(obraId: number) {
  const usuario = await exigirUsuario();
  const { obras } = await obraAtual(usuario);
  if (!obras.some((o) => o.id === obraId)) return;
  (await cookies()).set(COOKIE_OBRA, String(obraId), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 365 * 24 * 60 * 60 });
}

// ---------- Obras ----------

export async function salvarObraAcao(id: number | null, _anterior: EstadoCadastro, form: FormData): Promise<EstadoCadastro> {
  await exigirAdmin();
  // Confere as imagens antes de gravar qualquer coisa.
  const imagens = [];
  for (const tipo of TIPOS_IMAGEM) {
    const arquivo = form.get(tipo);
    if (!(arquivo instanceof File) || arquivo.size === 0) continue;
    const dados = Buffer.from(await arquivo.arrayBuffer());
    const conferida = conferirImagem(dados);
    if ("erro" in conferida) {
      return { erro: `${tipo === "logo" ? "Logo" : "Foto da fachada"}: ${conferida.erro}`, valores: valores(form) };
    }
    imagens.push({ tipo, dados });
  }

  const r = salvarObra(banco(), id, { nome: texto(form, "nome"), endereco: texto(form, "endereco") });
  if ("erro" in r) return { erro: r.erro, valores: valores(form) };
  for (const tipo of TIPOS_IMAGEM) {
    if (form.get(`remover_${tipo}`)) removerImagemObra(PASTA_IMAGENS_OBRAS, r.id, tipo);
  }
  for (const i of imagens) guardarImagemObra(PASTA_IMAGENS_OBRAS, r.id, i.tipo, i.dados);
  redirect("/obras");
}

export async function encerrarObraAcao(id: number, encerrar: boolean): Promise<EstadoCadastro> {
  await exigirAdmin();
  encerrarObra(banco(), id, encerrar);
  redirect("/obras");
}

// ---------- Materiais ----------

export async function salvarMaterialAcao(id: number | null, _anterior: EstadoCadastro, form: FormData): Promise<EstadoCadastro> {
  await exigirAdmin();
  const r = salvarMaterial(banco(), id, { nome: texto(form, "nome"), unidade: texto(form, "unidade") });
  if ("erro" in r) return { erro: r.erro, valores: valores(form) };
  redirect("/materiais");
}

export async function ativarMaterialAcao(id: number, ativo: boolean): Promise<EstadoCadastro> {
  await exigirAdmin();
  ativarMaterial(banco(), id, ativo);
  redirect("/materiais");
}

export type EstadoImportacao =
  | { etapa: "inicio"; erro?: string }
  | { etapa: "previa"; arquivo: string; resultado: ResultadoImportacao }
  | { etapa: "feito"; arquivo: string; resultado: ResultadoImportacao };

// Lê a planilha enviada. Em "conferir" só mostra o que vai acontecer; em "importar" grava.
// O arquivo não é guardado em lugar nenhum: só os materiais vão para o banco do app.
export async function importarPlanilhaAcao(form: FormData): Promise<EstadoImportacao> {
  await exigirAdmin();
  const arquivo = form.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return { etapa: "inicio", erro: "Escolha o arquivo da planilha." };

  const leitura = lerPlanilha(arquivo.name, Buffer.from(await arquivo.arrayBuffer()));
  if (!leitura.ok) return { etapa: "inicio", erro: leitura.erro };

  const gravar = form.get("modo") === "importar";
  const resultado = importarMateriais(banco(), leitura.linhas, gravar);
  return { etapa: gravar ? "feito" : "previa", arquivo: arquivo.name, resultado };
}

// ---------- Usuários ----------

export async function salvarUsuarioAcao(id: number | null, _anterior: EstadoCadastro, form: FormData): Promise<EstadoCadastro> {
  await exigirAdmin();
  const r = salvarUsuario(banco(), id, {
    nome: texto(form, "nome"),
    email: texto(form, "email"),
    perfil: texto(form, "perfil"),
    senha: texto(form, "senha"),
    obras: form.getAll("obras").map(Number).filter(Number.isInteger),
  });
  if ("erro" in r) return { erro: r.erro, valores: valores(form) };
  redirect("/usuarios");
}

export async function ativarUsuarioAcao(id: number, ativo: boolean): Promise<EstadoCadastro> {
  await exigirAdmin();
  const r = ativarUsuario(banco(), id, ativo);
  if (r) return { erro: r.erro };
  redirect("/usuarios");
}

// ---------- Entrada e saída ----------

// "envio" muda a cada lançamento certo, para o formulário voltar limpo.
export type EstadoLancamento = {
  erro: string | null;
  mensagem?: string;
  envio: number;
  valores?: Record<string, string | string[]>;
};

export async function lancarAcao(
  tipo: "entrada" | "saida",
  anterior: EstadoLancamento,
  form: FormData,
): Promise<EstadoLancamento> {
  const usuario = await exigirUsuario();
  if (!podeLancar(usuario.perfil)) return { ...anterior, erro: "Seu perfil só pode consultar o estoque." };
  // A obra precisa ser uma das que a pessoa pode usar.
  const { obras } = await obraAtual(usuario);
  const obraId = Number(texto(form, "obra"));
  if (!obras.some((o) => o.id === obraId)) return { ...anterior, erro: "Você não tem acesso a essa obra.", valores: valores(form) };

  const comum = {
    obraId,
    materialId: Number(texto(form, "material")),
    quantidade: texto(form, "quantidade"),
    observacao: texto(form, "observacao"),
    usuarioId: usuario.id,
  };
  const r =
    tipo === "entrada"
      ? registrarEntrada(banco(), {
          ...comum,
          fornecedor: texto(form, "fornecedor"),
          notaFiscal: texto(form, "nota_fiscal"),
          valorUnitario: texto(form, "valor_unitario"),
        })
      : registrarSaida(banco(), { ...comum, retiradoPor: texto(form, "retirado_por"), etapa: texto(form, "etapa") });
  if ("erro" in r) return { ...anterior, erro: r.erro, mensagem: undefined, valores: valores(form) };
  revalidatePath(`/${tipo}`);
  return { erro: null, mensagem: r.mensagem, envio: anterior.envio + 1 };
}
