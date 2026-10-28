import Image from "next/image";

// Logo da CR Incorp. Os arquivos ficam em public/marca.
export function LogoCompleto({ className = "" }: { className?: string }) {
  return <Image src="/marca/logo-cr-incorp.png" alt="CR Incorp" width={600} height={288} priority className={className} />;
}

// Só o símbolo "CR", para lugares pequenos como o menu.
export function SimboloCR({ className = "" }: { className?: string }) {
  return <Image src="/marca/simbolo-cr.png" alt="CR Incorp" width={130} height={160} className={className} />;
}
