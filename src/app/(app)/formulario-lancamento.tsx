"use client";

import { useActionState, useMemo, useState } from "react";
import type { EstadoLancamento } from "./acoes";
import { Icone } from "./icones";
import { CLASSE_BOTAO, CLASSE_CAMPO } from "./ui";

type Material = { id: number; nome: string; unidade: string; saldo: number };

export type CampoTexto = { nome: string; rotulo: string; sugestoes?: string[]; ajuda?: string; obrigatorio?: boolean };

const LIMITE_RESULTADOS = 30;

function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function formatar(valor: number): string {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

// Formulário de entrada ou saída: escolher o material, a quantidade e os outros campos.
// Botões e campos grandes, para lançar rápido pelo celular no canteiro.
export function FormularioLancamento({
  acao,
  obraId,
  materiais,
  campos,
  botao,
  mostrarSaldo,
}: {
  acao: (anterior: EstadoLancamento, form: FormData) => Promise<EstadoLancamento>;
  obraId: number;
  materiais: Material[];
  campos: CampoTexto[];
  botao: string;
  mostrarSaldo?: boolean;
}) {
  const [estado, enviar, enviando] = useActionState(acao, { erro: null, envio: 0 });
  return (
    <div className="space-y-4">
      {estado.mensagem && (
        <p className="flex items-center gap-2 rounded-lg bg-green-50 p-3 font-medium text-green-800 ring-1 ring-green-200">
          <span aria-hidden>✓</span> {estado.mensagem}
        </p>
      )}
      {/* A chave muda depois de cada lançamento certo, e o formulário volta limpo. */}
      <form
        key={estado.envio}
        action={enviar}
        className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <input type="hidden" name="obra" value={obraId} />
        <EscolherMaterial
          materiais={materiais}
          inicial={Number(estado.valores?.material) || null}
          mostrarSaldo={mostrarSaldo}
        />

        <label className="block">
          <span className="text-sm font-medium">Quantidade</span>
          <input
            name="quantidade"
            inputMode="decimal"
            required
            autoComplete="off"
            placeholder="Ex.: 10 ou 2,5"
            defaultValue={typeof estado.valores?.quantidade === "string" ? estado.valores.quantidade : undefined}
            className={`${CLASSE_CAMPO} text-lg`}
          />
        </label>

        {campos.map((c) => (
          <label key={c.nome} className="block">
            <span className="text-sm font-medium">
              {c.rotulo}
              {!c.obrigatorio && <span className="font-normal text-slate-400"> (opcional)</span>}
            </span>
            <input
              name={c.nome}
              required={c.obrigatorio}
              autoComplete="off"
              list={c.sugestoes?.length ? `${c.nome}-sugestoes` : undefined}
              defaultValue={typeof estado.valores?.[c.nome] === "string" ? (estado.valores[c.nome] as string) : undefined}
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
        ))}

        <p className="text-sm text-slate-500">A data, a hora e o seu nome são registrados automaticamente.</p>

        {estado.erro && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{estado.erro}</p>}

        <button type="submit" disabled={enviando} className={`${CLASSE_BOTAO} w-full py-3.5 text-lg sm:w-auto`}>
          {enviando ? "Salvando..." : botao}
        </button>
      </form>
    </div>
  );
}

// Campo de busca de material: digita parte do nome e toca no material certo.
function EscolherMaterial({
  materiais,
  inicial,
  mostrarSaldo,
}: {
  materiais: Material[];
  inicial: number | null;
  mostrarSaldo?: boolean;
}) {
  const [escolhido, setEscolhido] = useState<Material | null>(materiais.find((m) => m.id === inicial) ?? null);
  const [busca, setBusca] = useState("");

  const achados = useMemo(() => {
    const palavras = semAcento(busca.trim()).split(/\s+/).filter(Boolean);
    if (!palavras.length) return [];
    return materiais.filter((m) => palavras.every((p) => semAcento(m.nome).includes(p)));
  }, [busca, materiais]);

  if (escolhido) {
    return (
      <div>
        <span className="text-sm font-medium">Material</span>
        <input type="hidden" name="material" value={escolhido.id} />
        <div className="mt-1 flex items-center gap-3 rounded-lg border border-marca-300 bg-marca-50 p-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{escolhido.nome}</p>
            <p className="text-sm text-slate-600">
              Unidade: {escolhido.unidade}
              {mostrarSaldo && ` · Saldo na obra: ${formatar(escolhido.saldo)} ${escolhido.unidade}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEscolhido(null)}
            className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Trocar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <label className="block">
        <span className="text-sm font-medium">Material</span>
        <div className="relative">
          <Icone nome="busca" className="pointer-events-none absolute left-3 top-1/2 mt-0.5 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => {
              // Enter escolhe o primeiro da lista, em vez de enviar o formulário.
              if (e.key === "Enter") {
                e.preventDefault();
                if (achados[0]) setEscolhido(achados[0]);
              }
            }}
            autoComplete="off"
            placeholder="Digite parte do nome..."
            className={`${CLASSE_CAMPO} pl-10`}
          />
        </div>
      </label>
      {/* Campo obrigatório escondido: o navegador avisa se ninguém escolheu o material. */}
      <input
        name="material"
        required
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute left-0 top-16 h-px w-px opacity-0"
        onInvalid={(e) => e.currentTarget.setCustomValidity("Escolha o material na lista.")}
      />
      {busca.trim() && (
        <ul className="mt-2 max-h-72 overflow-y-auto rounded-lg border border-slate-200">
          {achados.length === 0 && <li className="p-3 text-sm text-slate-500">Nenhum material encontrado.</li>}
          {achados.slice(0, LIMITE_RESULTADOS).map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => setEscolhido(m)}
                className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-3 text-left hover:bg-marca-50"
              >
                <span className="font-medium">{m.nome}</span>
                <span className="shrink-0 text-sm text-slate-500">
                  {mostrarSaldo ? `${formatar(m.saldo)} ${m.unidade}` : m.unidade}
                </span>
              </button>
            </li>
          ))}
          {achados.length > LIMITE_RESULTADOS && (
            <li className="p-3 text-sm text-slate-500">
              Mais {achados.length - LIMITE_RESULTADOS} materiais. Digite mais do nome para achar.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
