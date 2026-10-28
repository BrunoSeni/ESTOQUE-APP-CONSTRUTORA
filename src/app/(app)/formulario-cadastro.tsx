"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { EstadoCadastro } from "./acoes";
import { CLASSE_BOTAO, CLASSE_BOTAO_CLARO, CLASSE_CAMPO } from "./ui";

export type CampoCadastro = {
  nome: string;
  rotulo: string;
  tipo: "text" | "email" | "password" | "escolha" | "marcar" | "imagem";
  obrigatorio?: boolean;
  ajuda?: string;
  autoComplete?: string;
  sugestoes?: string[];
  // Para "escolha" (só uma) e "marcar" (várias).
  opcoes?: { valor: string; rotulo: string; ajuda?: string }[];
  // Para "imagem": endereço da imagem que já está cadastrada.
  atual?: string | null;
  limiteMB?: number;
};

// Formulário de cadastro montado a partir da lista de campos.
// Se der erro, mostra a mensagem e mantém o que a pessoa digitou.
export function FormularioCadastro({
  acao,
  campos,
  inicial = {},
  botao,
  voltar,
}: {
  acao: (anterior: EstadoCadastro, form: FormData) => Promise<EstadoCadastro>;
  campos: CampoCadastro[];
  inicial?: Record<string, string | string[]>;
  botao: string;
  voltar: string;
}) {
  const [estado, enviar, enviando] = useActionState(acao, { erro: null });
  const valor = (nome: string) => estado.valores?.[nome] ?? inicial[nome];

  return (
    <form action={enviar} className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      {campos.map((c) => {
        const v = valor(c.nome);
        if (c.tipo === "imagem") {
          return (
            <div key={c.nome}>
              <span className="text-sm font-medium">{c.rotulo}</span>
              {c.atual && (
                <div className="mt-2 flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.atual} alt={c.rotulo} className="h-24 w-24 rounded-lg border border-slate-200 object-cover" />
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input type="checkbox" name={`remover_${c.nome}`} className="accent-marca-600" /> Remover
                  </label>
                </div>
              )}
              <input
                name={c.nome}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  // Avisa antes de enviar quando a foto é grande demais (ex.: arquivo original da agência).
                  const arquivo = e.target.files?.[0];
                  e.target.setCustomValidity(
                    arquivo && c.limiteMB && arquivo.size > c.limiteMB * 1024 * 1024
                      ? `A imagem é maior que ${c.limiteMB} MB. Diminua o tamanho da foto e tente de novo.`
                      : "",
                  );
                }}
                className="mt-2 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-marca-50 file:px-4 file:py-2 file:font-medium file:text-marca-700 hover:file:bg-marca-100"
              />
              <span className="mt-1 block text-sm text-slate-500">
                {c.atual ? "Para trocar, escolha outra imagem. " : ""}
                {c.ajuda}
              </span>
            </div>
          );
        }
        if (c.tipo === "escolha" || c.tipo === "marcar") {
          const marcados = Array.isArray(v) ? v : v ? [v] : [];
          return (
            <fieldset key={c.nome}>
              <legend className="text-sm font-medium">{c.rotulo}</legend>
              {c.ajuda && <p className="text-sm text-slate-500">{c.ajuda}</p>}
              {c.opcoes?.length ? (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {c.opcoes.map((o) => (
                    <label
                      key={o.valor}
                      className="flex cursor-pointer gap-3 rounded-lg border border-slate-200 p-3 hover:border-marca-300 has-[:checked]:border-marca-500 has-[:checked]:bg-marca-50"
                    >
                      <input
                        type={c.tipo === "escolha" ? "radio" : "checkbox"}
                        name={c.nome}
                        value={o.valor}
                        defaultChecked={marcados.includes(o.valor)}
                        required={c.tipo === "escolha" && c.obrigatorio}
                        className="mt-1 accent-marca-600"
                      />
                      <span>
                        <span className="block text-sm font-medium">{o.rotulo}</span>
                        {o.ajuda && <span className="block text-xs text-slate-500">{o.ajuda}</span>}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-400">Nenhuma opção cadastrada ainda.</p>
              )}
            </fieldset>
          );
        }
        return (
          <label key={c.nome} className="block">
            <span className="text-sm font-medium">{c.rotulo}</span>
            <input
              name={c.nome}
              type={c.tipo}
              required={c.obrigatorio}
              autoComplete={c.autoComplete ?? "off"}
              defaultValue={typeof v === "string" ? v : undefined}
              list={c.sugestoes ? `${c.nome}-sugestoes` : undefined}
              className={CLASSE_CAMPO}
            />
            {c.sugestoes && (
              <datalist id={`${c.nome}-sugestoes`}>
                {c.sugestoes.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            )}
            {c.ajuda && <span className="mt-1 block text-sm text-slate-500">{c.ajuda}</span>}
          </label>
        );
      })}

      {estado.erro && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{estado.erro}</p>}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link href={voltar} className={CLASSE_BOTAO_CLARO}>
          Cancelar
        </Link>
        <button type="submit" disabled={enviando} className={CLASSE_BOTAO}>
          {enviando ? "Salvando..." : botao}
        </button>
      </div>
    </form>
  );
}

// Botão que faz uma ação só (encerrar obra, desativar material...) e mostra o erro, se houver.
export function BotaoAcao({
  acao,
  rotulo,
  confirmar,
}: {
  acao: () => Promise<EstadoCadastro>;
  rotulo: string;
  confirmar?: string;
}) {
  const [estado, enviar, enviando] = useActionState(acao, { erro: null });
  return (
    <form
      action={enviar}
      onSubmit={(e) => {
        if (confirmar && !window.confirm(confirmar)) e.preventDefault();
      }}
    >
      <button type="submit" disabled={enviando} className={CLASSE_BOTAO_CLARO}>
        {enviando ? "Aguarde..." : rotulo}
      </button>
      {estado.erro && <p className="mt-2 text-sm text-red-700">{estado.erro}</p>}
    </form>
  );
}
