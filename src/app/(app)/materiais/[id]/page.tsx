import { notFound } from "next/navigation";
import { buscarMaterial } from "@/lib/cadastros";
import { banco } from "@/lib/db";
import { exigirAdmin } from "@/lib/sessao";
import { ativarMaterialAcao, salvarMaterialAcao } from "../../acoes";
import { BotaoAcao, FormularioCadastro } from "../../formulario-cadastro";
import { Cabecalho, Cartao } from "../../ui";
import { camposMaterial } from "../campos";

export default async function EditarMaterial({ params }: { params: Promise<{ id: string }> }) {
  await exigirAdmin();
  const db = banco();
  const material = buscarMaterial(db, Number((await params).id));
  if (!material) notFound();
  const ativo = !!material.ativo;

  return (
    <div className="max-w-2xl space-y-6">
      <Cabecalho titulo={material.nome} subtitulo="Editar material" />
      <FormularioCadastro
        acao={salvarMaterialAcao.bind(null, material.id)}
        campos={camposMaterial(db)}
        inicial={{ nome: material.nome, unidade: material.unidade }}
        botao="Salvar"
        voltar="/materiais"
      />
      <Cartao className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">{ativo ? "Desativar material" : "Material desativado"}</p>
          <p className="text-sm text-slate-500">
            {ativo
              ? "Ele deixa de aparecer para novos lançamentos. O histórico continua guardado."
              : "Ele não aparece para novos lançamentos. Dá para ativar de novo."}
          </p>
        </div>
        <BotaoAcao acao={ativarMaterialAcao.bind(null, material.id, !ativo)} rotulo={ativo ? "Desativar" : "Ativar"} />
      </Cartao>
    </div>
  );
}
