import Link from "next/link";
import { listarObras } from "@/lib/cadastros";
import { banco } from "@/lib/db";
import { exigirAdmin } from "@/lib/sessao";
import { BotaoLink, Cabecalho, Cartao, CLASSE_TABELA, CLASSE_TD, CLASSE_TH, Etiqueta, Vazio } from "../ui";

export default async function Obras() {
  await exigirAdmin();
  const obras = listarObras(banco());

  return (
    <>
      <Cabecalho titulo="Obras" subtitulo="Cada obra tem o seu próprio estoque.">
        <BotaoLink href="/obras/nova" icone="mais">
          Nova obra
        </BotaoLink>
      </Cabecalho>

      <Cartao className="overflow-x-auto">
        {obras.length === 0 ? (
          <Vazio>Nenhuma obra cadastrada ainda.</Vazio>
        ) : (
          <table className={CLASSE_TABELA}>
            <thead>
              <tr>
                <th className={CLASSE_TH}>Obra</th>
                <th className={`${CLASSE_TH} hidden sm:table-cell`}>Endereço</th>
                <th className={CLASSE_TH}>Situação</th>
              </tr>
            </thead>
            <tbody>
              {obras.map((o) => (
                <tr key={o.id} className="hover:bg-orange-50/40">
                  <td className={CLASSE_TD}>
                    <Link href={`/obras/${o.id}`} className="font-medium text-slate-900 hover:text-orange-700 hover:underline">
                      {o.nome}
                    </Link>
                  </td>
                  <td className={`${CLASSE_TD} hidden text-slate-600 sm:table-cell`}>{o.endereco ?? "—"}</td>
                  <td className={CLASSE_TD}>
                    {o.encerrada_em ? <Etiqueta cor="cinza">Encerrada</Etiqueta> : <Etiqueta cor="verde">Em andamento</Etiqueta>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Cartao>
    </>
  );
}
