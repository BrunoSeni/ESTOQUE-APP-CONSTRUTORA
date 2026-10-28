import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Permite enviar a planilha de insumos (o padrão é só 1 MB).
    serverActions: { bodySizeLimit: "20mb" },
  },
};

export default nextConfig;
