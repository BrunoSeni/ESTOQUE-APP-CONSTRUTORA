import { nomePerfil } from "@/lib/cadastros";
import { exigirUsuario, obraAtual } from "@/lib/sessao";
import { sairAcao } from "../acoes";
import { MenuLateral } from "./menu-lateral";

// Moldura das telas de quem já entrou: menu à esquerda e conteúdo à direita.
export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const usuario = await exigirUsuario();
  const { obras, atual } = await obraAtual(usuario);
  const admin = usuario.perfil === "admin";

  const itens = [
    { href: "/", rotulo: "Início", icone: "inicio" as const },
    { href: "/materiais", rotulo: "Materiais", icone: "material" as const },
    ...(admin
      ? [
          { href: "/obras", rotulo: "Obras", icone: "obra" as const },
          { href: "/usuarios", rotulo: "Usuários", icone: "usuarios" as const },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen">
      <MenuLateral
        itens={itens}
        obras={obras.map((o) => ({ id: o.id, nome: o.nome }))}
        obraAtualId={atual?.id ?? null}
        usuario={{ nome: usuario.nome, perfil: nomePerfil(usuario.perfil) }}
        podeCadastrarObra={admin}
        sair={sairAcao}
      />
      <div className="lg:pl-64">
        <main className="mx-auto max-w-6xl p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
