"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { importarPlanilhaAcao, type EstadoImportacao } from "../../acoes";
import { Icone } from "../../icones";
import { CLASSE_BOTAO, CLASSE_BOTAO_CLARO, Cartao } from "../../ui";

const MOSTRAR = 15;

// Passo 1: escolher o arquivo e conferir. Passo 2: confirmar a importação.
// O formulário não é limpo entre os passos, para não precisar escolher o arquivo de novo.
export function Importador() {
  const form = useRef<HTMLFormElement>(null);
  const [estado, setEstado] = useState<EstadoImportacao>({ etapa: "inicio" });
  const [enviando, iniciar] = useTransition();

  function enviar(modo: "conferir" | "importar") {
    if (!form.current) return;
    const dados = new FormData(form.current);
    dados.set("modo", modo);
    iniciar(async () => setEstado(await importarPlanilhaAcao(dados)));
  }

  if (estado.etapa === "feito") {
    const r = estado.resultado;
    return (
      <Cartao className="space-y-4 p-6">
        <p className="text-lg font-semibold text-green-700">
          Pronto! {r.novos.length.toLocaleString("pt-BR")} materiais foram incluídos.
        </p>
        {r.jaCadastrados > 0 && <p className="text-slate-600">{r.jaCadastrados} já estavam cadastrados e ficaram como estavam.</p>}
        <div className="flex flex-wrap gap-2">
          <Link href="/materiais" className={CLASSE_BOTAO}>
            Ver materiais
          </Link>
          <button className={CLASSE_BOTAO_CLARO} onClick={() => setEstado({ etapa: "inicio" })}>
            Importar outra planilha
          </button>
        </div>
      </Cartao>
    );
  }

  return (
    <form
      ref={form}
      onSubmit={(e) => {
        e.preventDefault();
        enviar("conferir");
      }}
      className="space-y-4"
    >
      <Cartao className="space-y-4 p-6">
        <div className="text-sm text-slate-600">
          <p>A planilha precisa ter uma coluna com o <b>nome do material</b> (ex.: “Descrição”, “Nome” ou “Insumo”) e outra com a <b>unidade</b> (ex.: “Unidade” ou “Und”). Outras colunas são ignoradas.</p>
          <p className="mt-2">Aceita Excel (.xlsx) e .csv. Materiais que já existem não são duplicados.</p>
        </div>
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-6 text-center hover:border-marca-400 hover:bg-marca-50/50">
          <Icone nome="importar" className="h-8 w-8 text-marca-600" />
          <span className="font-medium">Escolher planilha</span>
          <input
            type="file"
            name="arquivo"
            required
            accept=".xlsx,.xlsm,.csv,.xls"
            onChange={() => setEstado({ etapa: "inicio" })}
            className="max-w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-marca-50 file:px-3 file:py-2 file:text-marca-700"
          />
        </label>
        {estado.etapa === "inicio" && estado.erro && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{estado.erro}</p>
        )}
        {estado.etapa === "inicio" && (
          <button type="submit" disabled={enviando} className={CLASSE_BOTAO}>
            {enviando ? "Lendo a planilha..." : "Conferir planilha"}
          </button>
        )}
      </Cartao>

      {estado.etapa === "previa" && <Previa estado={estado} enviando={enviando} importar={() => enviar("importar")} />}
    </form>
  );
}

function Previa({
  estado,
  enviando,
  importar,
}: {
  estado: Extract<EstadoImportacao, { etapa: "previa" }>;
  enviando: boolean;
  importar: () => void;
}) {
  const r = estado.resultado;
  return (
    <Cartao className="space-y-4 p-6">
      <h2 className="text-lg font-semibold">Conferência de “{estado.arquivo}”</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        <Numero valor={r.novos.length} texto="materiais novos para incluir" destaque />
        <Numero valor={r.jaCadastrados} texto="já cadastrados (ficam como estão)" />
        <Numero valor={r.repetidosNaPlanilha} texto="repetidos na planilha (entra só um)" />
        <Numero valor={r.problemas.length} texto="linhas com problema (não entram)" />
      </ul>

      {r.novos.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">Alguns dos materiais novos:</p>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
            {r.novos.slice(0, MOSTRAR).map((m) => (
              <li key={`${m.nome}|${m.unidade}`} className="flex justify-between gap-3 px-3 py-2">
                <span>{m.nome}</span>
                <span className="text-slate-500">{m.unidade}</span>
              </li>
            ))}
          </ul>
          {r.novos.length > MOSTRAR && <p className="mt-1 text-sm text-slate-500">e mais {r.novos.length - MOSTRAR}...</p>}
        </div>
      )}

      {r.problemas.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">Linhas com problema (corrija na planilha, se quiser, e envie de novo):</p>
          <ul className="space-y-1 text-sm text-red-700">
            {r.problemas.slice(0, MOSTRAR).map((p) => (
              <li key={p.linha}>
                Linha {p.linha}: {p.motivo}
              </li>
            ))}
          </ul>
          {r.problemas.length > MOSTRAR && <p className="mt-1 text-sm text-slate-500">e mais {r.problemas.length - MOSTRAR}...</p>}
        </div>
      )}

      {r.novos.length > 0 ? (
        <button type="button" disabled={enviando} onClick={importar} className={CLASSE_BOTAO}>
          {enviando ? "Importando..." : `Importar ${r.novos.length.toLocaleString("pt-BR")} materiais`}
        </button>
      ) : (
        <p className="font-medium text-slate-600">Não há materiais novos para incluir.</p>
      )}
    </Cartao>
  );
}

function Numero({ valor, texto, destaque }: { valor: number; texto: string; destaque?: boolean }) {
  return (
    <li className={`rounded-lg border p-3 ${destaque ? "border-marca-200 bg-marca-50" : "border-slate-200"}`}>
      <p className={`text-2xl font-bold ${destaque ? "text-marca-700" : ""}`}>{valor.toLocaleString("pt-BR")}</p>
      <p className="text-sm text-slate-600">{texto}</p>
    </li>
  );
}
