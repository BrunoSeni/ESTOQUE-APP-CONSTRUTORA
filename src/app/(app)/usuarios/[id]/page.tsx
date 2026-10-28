import { notFound } from "next/navigation";
import { buscarUsuario } from "@/lib/cadastros";
import { banco } from "@/lib/db";
import { exigirAdmin } from "@/lib/sessao";
import { ativarUsuarioAcao, salvarUsuarioAcao } from "../../acoes";
import { BotaoAcao, FormularioCadastro } from "../../formulario-cadastro";
import { Cabecalho, Cartao } from "../../ui";
import { camposUsuario } from "../campos";

export default async function EditarUsuario({ params }: { params: Promise<{ id: string }> }) {
  const eu = await exigirAdmin();
  const db = banco();
  const usuario = buscarUsuario(db, Number((await params).id));
  if (!usuario) notFound();
  const ativo = !!usuario.ativo;

  return (
    <div className="max-w-3xl space-y-6">
      <Cabecalho titulo={usuario.nome} subtitulo="Editar usuário" />
      <FormularioCadastro
        acao={salvarUsuarioAcao.bind(null, usuario.id)}
        campos={camposUsuario(db, false)}
        inicial={{
          nome: usuario.nome,
          email: usuario.email,
          perfil: usuario.perfil,
          obras: usuario.obras.map(String),
        }}
        botao="Salvar"
        voltar="/usuarios"
      />
      {usuario.id !== eu.id && (
        <Cartao className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">{ativo ? "Desativar acesso" : "Acesso desativado"}</p>
            <p className="text-sm text-slate-500">
              {ativo
                ? "A pessoa não consegue mais entrar. Os lançamentos que ela fez continuam no histórico."
                : "A pessoa não consegue entrar. Dá para reativar."}
            </p>
          </div>
          <BotaoAcao
            acao={ativarUsuarioAcao.bind(null, usuario.id, !ativo)}
            rotulo={ativo ? "Desativar" : "Reativar"}
            confirmar={ativo ? `Desativar o acesso de ${usuario.nome}?` : undefined}
          />
        </Cartao>
      )}
    </div>
  );
}
