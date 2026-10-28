import Link from "next/link";
import { listarObras } from "@/lib/cadastros";
import { banco, PASTA_IMAGENS_OBRAS } from "@/lib/db";
import { imagensDaObra } from "@/lib/imagens-obra";
import { Icone } from "../icones";
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
                <tr key={o.id} className="hover:bg-marca-50/40">
                  <td className={CLASSE_TD}>
                    <Link href={`/obras/${o.id}`} className="group flex items-center gap-3">
                      <MiniaturaObra logo={imagensDaObra(PASTA_IMAGENS_OBRAS, o.id).logo} />
                      <span className="font-medium text-slate-900 group-hover:text-marca-700 group-hover:underline">{o.nome}</span>
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

function MiniaturaObra({ logo }: { logo: string | null }) {
  if (!logo) {
    return (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
        <Icone nome="obra" />
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={logo} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 object-cover" />;
}
