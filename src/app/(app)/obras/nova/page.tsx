import { exigirAdmin } from "@/lib/sessao";
import { salvarObraAcao } from "../../acoes";
import { FormularioCadastro } from "../../formulario-cadastro";
import { Cabecalho } from "../../ui";
import { camposObra } from "../campos";

export default async function NovaObra() {
  await exigirAdmin();
  return (
    <div className="max-w-2xl">
      <Cabecalho titulo="Nova obra" />
      <FormularioCadastro acao={salvarObraAcao.bind(null, null)} campos={camposObra()} botao="Cadastrar obra" voltar="/obras" />
    </div>
  );
}
