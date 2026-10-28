import { redirect } from "next/navigation";
import { existeUsuario } from "@/lib/auth";
import { banco } from "@/lib/db";
import { primeiroAcessoAcao } from "../acoes";
import { Formulario } from "../formulario";
import { LogoCompleto } from "../logo";

export default function PrimeiroAcesso() {
  if (existeUsuario(banco())) redirect("/login");

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center p-4">
      <LogoCompleto className="mx-auto mb-4 h-auto w-56" />
      <h1 className="mb-2 text-center text-2xl font-bold text-marca-700">Primeiro acesso</h1>
      <p className="mb-6 text-center text-slate-600">
        Crie o usuário administrador. Ele vai cadastrar as obras, os materiais e as outras pessoas.
      </p>
      <Formulario
        acao={primeiroAcessoAcao}
        botao="Criar administrador"
        campos={[
          { nome: "nome", rotulo: "Nome", tipo: "text", autoComplete: "name" },
          { nome: "email", rotulo: "E-mail", tipo: "email", autoComplete: "email" },
          { nome: "senha", rotulo: "Senha (mínimo 8 caracteres)", tipo: "password", autoComplete: "new-password" },
          { nome: "confirmacao", rotulo: "Repita a senha", tipo: "password", autoComplete: "new-password" },
        ]}
      />
    </main>
  );
}
