import { exigirAdmin } from "@/lib/sessao";
import { Cabecalho } from "../../ui";
import { Importador } from "./importador";

export default async function ImportarMateriais() {
  await exigirAdmin();
  return (
    <div className="max-w-3xl">
      <Cabecalho titulo="Importar planilha de materiais" subtitulo="Traga de uma vez a lista de insumos que a empresa já usa." />
      <Importador />
    </div>
  );
}
