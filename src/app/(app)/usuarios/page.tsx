import Link from "next/link";
import { listarObras, listarUsuarios, nomePerfil } from "@/lib/cadastros";
import { banco } from "@/lib/db";
import { exigirAdmin } from "@/lib/sessao";
import { BotaoLink, Cabecalho, Cartao, CLASSE_TABELA, CLASSE_TD, CLASSE_TH, Etiqueta } from "../ui";

export default async function Usuarios() {
  await exigirAdmin();
  const db = banco();
  const usuarios = listarUsuarios(db);
  const nomeObra = new Map(listarObras(db).map((o) => [o.id, o.nome]));

  return (
    <>
      <Cabecalho titulo="Usuários" subtitulo="Quem usa o app, o perfil de cada um e as obras que enxerga.">
        <BotaoLink href="/usuarios/novo" icone="mais">
          Novo usuário
        </BotaoLink>
      </Cabecalho>

      <Cartao className="overflow-x-auto">
        <table className={CLASSE_TABELA}>
          <thead>
            <tr>
              <th className={CLASSE_TH}>Nome</th>
              <th className={CLASSE_TH}>Perfil</th>
              <th className={`${CLASSE_TH} hidden md:table-cell`}>Obras</th>
              <th className={CLASSE_TH}>Situação</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="hover:bg-orange-50/40">
                <td className={CLASSE_TD}>
                  <Link href={`/usuarios/${u.id}`} className="font-medium hover:text-orange-700 hover:underline">
                    {u.nome}
                  </Link>
                  <p className="text-xs text-slate-500">{u.email}</p>
                </td>
                <td className={`${CLASSE_TD} text-slate-600`}>{nomePerfil(u.perfil)}</td>
                <td className={`${CLASSE_TD} hidden text-slate-600 md:table-cell`}>
                  {u.perfil === "admin" || u.perfil === "escritorio"
                    ? "Todas"
                    : u.obras.map((id) => nomeObra.get(id)).filter(Boolean).join(", ") || "Nenhuma"}
                </td>
                <td className={CLASSE_TD}>
                  {u.ativo ? <Etiqueta cor="verde">Ativo</Etiqueta> : <Etiqueta cor="cinza">Desativado</Etiqueta>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Cartao>
    </>
  );
}
