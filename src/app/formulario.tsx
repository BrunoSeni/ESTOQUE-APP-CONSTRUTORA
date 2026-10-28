"use client";

import { useActionState } from "react";
import type { EstadoFormulario } from "./acoes";

type Campo = {
  nome: string;
  rotulo: string;
  tipo: "text" | "email" | "password";
  autoComplete: string;
};

// Formulário simples com campos grandes, fácil de usar no celular.
export function Formulario({
  acao,
  campos,
  botao,
}: {
  acao: (anterior: EstadoFormulario, form: FormData) => Promise<EstadoFormulario>;
  campos: Campo[];
  botao: string;
}) {
  const [estado, enviar, enviando] = useActionState(acao, { erro: null });

  return (
    <form action={enviar} className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
      {campos.map((c) => (
        <label key={c.nome} className="block">
          <span className="text-sm font-medium">{c.rotulo}</span>
          <input
            name={c.nome}
            type={c.tipo}
            required
            autoComplete={c.autoComplete}
            defaultValue={estado.valores?.[c.nome]}
            className="mt-1 w-full rounded-lg border border-slate-300 p-3 text-lg"
          />
        </label>
      ))}
      {estado.erro && <p className="text-sm text-red-700">{estado.erro}</p>}
      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-lg bg-blue-700 p-3 text-lg font-semibold text-white disabled:opacity-60"
      >
        {enviando ? "Aguarde..." : botao}
      </button>
    </form>
  );
}
