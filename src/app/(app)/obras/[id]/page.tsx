import { notFound } from "next/navigation";
import { buscarObra } from "@/lib/cadastros";
import { banco, PASTA_IMAGENS_OBRAS } from "@/lib/db";
import { imagensDaObra } from "@/lib/imagens-obra";
import { exigirAdmin } from "@/lib/sessao";
import { encerrarObraAcao, salvarObraAcao } from "../../acoes";
import { BotaoAcao, FormularioCadastro } from "../../formulario-cadastro";
import { Cabecalho, Cartao } from "../../ui";
import { camposObra } from "../campos";

export default async function EditarObra({ params }: { params: Promise<{ id: string }> }) {
  await exigirAdmin();
  const obra = buscarObra(banco(), Number((await params).id));
  if (!obra) notFound();
  const encerrada = !!obra.encerrada_em;

  return (
    <div className="max-w-2xl space-y-6">
      <Cabecalho titulo={obra.nome} subtitulo="Editar obra" />
      <FormularioCadastro
        acao={salvarObraAcao.bind(null, obra.id)}
        campos={camposObra(imagensDaObra(PASTA_IMAGENS_OBRAS, obra.id))}
        inicial={{ nome: obra.nome, endereco: obra.endereco ?? "" }}
        botao="Salvar"
        voltar="/obras"
      />
      <Cartao className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">{encerrada ? "Obra encerrada" : "Encerrar a obra"}</p>
          <p className="text-sm text-slate-500">
            {encerrada
              ? "Ela não aparece mais na escolha de obra. O histórico continua guardado."
              : "Quando a obra terminar. O histórico continua guardado e dá para reabrir depois."}
          </p>
        </div>
        <BotaoAcao
          acao={encerrarObraAcao.bind(null, obra.id, !encerrada)}
          rotulo={encerrada ? "Reabrir obra" : "Encerrar obra"}
          confirmar={encerrada ? undefined : `Encerrar a obra "${obra.nome}"?`}
        />
      </Cartao>
    </div>
  );
}
