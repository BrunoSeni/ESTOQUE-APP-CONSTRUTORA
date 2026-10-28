import { exigirUsuario } from "@/lib/sessao";
import { sairAcao } from "./acoes";

// Atalhos da tela inicial. Os botões são grandes para usar no celular, no canteiro.
const ATALHOS = [
  { titulo: "Entrada", texto: "Material que chegou na obra" },
  { titulo: "Saída", texto: "Material usado na obra" },
  { titulo: "Transferência", texto: "Mandar material para outra obra" },
  { titulo: "Saldo", texto: "Quanto tem de cada material" },
  { titulo: "Histórico", texto: "Todas as movimentações" },
  { titulo: "Relatórios", texto: "Saldo, histórico e consumo em Excel" },
];

const NOME_PERFIL = {
  almoxarife: "Almoxarife",
  engenheiro: "Engenheiro / mestre de obras",
  escritorio: "Escritório / compras",
  admin: "Administrador",
};

export default async function Inicio() {
  const usuario = await exigirUsuario();

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Estoque da Obra</h1>
          <p className="text-slate-600">
            {usuario.nome} · {NOME_PERFIL[usuario.perfil]}
          </p>
        </div>
        <form action={sairAcao}>
          <button className="rounded-lg border border-slate-300 bg-white px-4 py-2">Sair</button>
        </form>
      </header>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ATALHOS.map((a) => (
          <li key={a.titulo}>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-lg font-semibold">{a.titulo}</p>
              <p className="text-slate-600">{a.texto}</p>
              <p className="mt-2 text-sm text-slate-400">Em construção</p>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
