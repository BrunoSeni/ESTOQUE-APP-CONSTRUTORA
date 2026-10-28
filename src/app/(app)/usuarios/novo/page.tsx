import { banco } from "@/lib/db";
import { exigirAdmin } from "@/lib/sessao";
import { salvarUsuarioAcao } from "../../acoes";
import { FormularioCadastro } from "../../formulario-cadastro";
import { Cabecalho } from "../../ui";
import { camposUsuario } from "../campos";

export default async function NovoUsuario() {
  await exigirAdmin();
  return (
    <div className="max-w-3xl">
      <Cabecalho titulo="Novo usuário" />
      <FormularioCadastro
        acao={salvarUsuarioAcao.bind(null, null)}
        campos={camposUsuario(banco(), true)}
        inicial={{ perfil: "almoxarife" }}
        botao="Cadastrar usuário"
        voltar="/usuarios"
      />
    </div>
  );
}
