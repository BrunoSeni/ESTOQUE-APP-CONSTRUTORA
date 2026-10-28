import { banco } from "@/lib/db";
import { exigirAdmin } from "@/lib/sessao";
import { salvarMaterialAcao } from "../../acoes";
import { FormularioCadastro } from "../../formulario-cadastro";
import { Cabecalho } from "../../ui";
import { camposMaterial } from "../campos";

export default async function NovoMaterial() {
  await exigirAdmin();
  return (
    <div className="max-w-2xl">
      <Cabecalho titulo="Novo material" />
      <FormularioCadastro
        acao={salvarMaterialAcao.bind(null, null)}
        campos={camposMaterial(banco())}
        botao="Cadastrar material"
        voltar="/materiais"
      />
    </div>
  );
}
