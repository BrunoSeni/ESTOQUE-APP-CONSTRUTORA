// Ícones simples desenhados em linha (no estilo do restante da tela).
const CAMINHOS = {
  inicio: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z",
  obra: "M3 21h18M5 21V8l7-4 7 4v13M9 21v-5h6v5M9 11h.01M15 11h.01",
  material: "M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8",
  usuarios: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  importar: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
  sair: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  menu: "M4 6h16M4 12h16M4 18h16",
  fechar: "M18 6 6 18M6 6l12 12",
  mais: "M12 5v14M5 12h14",
  busca: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16M21 21l-4.35-4.35",
  entrada: "M12 19V5M5 12l7-7 7 7",
  saida: "M12 5v14M19 12l-7 7-7-7",
  transferencia: "M7 17 3 13l4-4M3 13h13M17 7l4 4-4 4M21 11H8",
  historico: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l4 2",
  relatorio: "M3 3v18h18M7 16v-5M12 16V8M17 16v-3",
} as const;

export type NomeIcone = keyof typeof CAMINHOS;

export function Icone({ nome, className = "h-5 w-5" }: { nome: NomeIcone; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={CAMINHOS[nome]} />
    </svg>
  );
}
