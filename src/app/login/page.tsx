import { redirect } from "next/navigation";
import { existeUsuario } from "@/lib/auth";
import { banco } from "@/lib/db";
import { usuarioAtual } from "@/lib/sessao";
import { entrarAcao } from "../acoes";
import { Formulario } from "../formulario";

export default async function Login() {
  if (!existeUsuario(banco())) redirect("/primeiro-acesso");
  if (await usuarioAtual()) redirect("/");

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center p-4">
      <h1 className="mb-6 text-center text-2xl font-bold">Estoque da Obra</h1>
      <Formulario
        acao={entrarAcao}
        botao="Entrar"
        campos={[
          { nome: "email", rotulo: "E-mail", tipo: "email", autoComplete: "email" },
          { nome: "senha", rotulo: "Senha", tipo: "password", autoComplete: "current-password" },
        ]}
      />
    </main>
  );
}
