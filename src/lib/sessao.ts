import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_SESSAO, existeUsuario, usuarioDaSessao, type Usuario } from "./auth";
import { obrasDoUsuario, type Obra } from "./cadastros";
import { banco } from "./db";

export const COOKIE_OBRA = "obra";

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

// Telas e ações de cadastro: só o administrador entra.
export async function exigirAdmin(): Promise<Usuario> {
  const usuario = await exigirUsuario();
  if (usuario.perfil !== "admin") redirect("/");
  return usuario;
}

// Obras que a pessoa pode escolher no menu e qual está escolhida agora.
export async function obraAtual(usuario: Usuario): Promise<{ obras: Obra[]; atual: Obra | null }> {
  const obras = obrasDoUsuario(banco(), usuario);
  const escolhida = Number((await cookies()).get(COOKIE_OBRA)?.value);
  return { obras, atual: obras.find((o) => o.id === escolhida) ?? obras[0] ?? null };
}
