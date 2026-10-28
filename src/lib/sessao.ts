import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_SESSAO, existeUsuario, usuarioDaSessao, type Usuario } from "./auth";
import { banco } from "./db";

export async function usuarioAtual(): Promise<Usuario | null> {
  const token = (await cookies()).get(COOKIE_SESSAO)?.value;
  return usuarioDaSessao(banco(), token);
}

// Usado no topo de cada tela protegida: quem não entrou vai para o login.
export async function exigirUsuario(): Promise<Usuario> {
  const usuario = await usuarioAtual();
  if (usuario) return usuario;
  redirect(existeUsuario(banco()) ? "/login" : "/primeiro-acesso");
}
