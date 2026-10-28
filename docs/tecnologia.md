# Tecnologia do app

Decisão do card EST-5.

O app é um **site que abre no navegador**, no computador do escritório e no celular do canteiro. Não é um aplicativo de loja e não precisa instalar nada no celular.

**Nesta fase, tudo roda no computador, sem nenhuma conta e sem nenhum custo.** A ideia é mostrar a ferramenta funcionando, validar com a equipe e só depois, com a aprovação da construtora, colocar na internet com um endereço próprio (ex.: `crestoque.com.br`).

| Peça | Para que serve | Custo |
|---|---|---|
| **Next.js** | As telas do app (o site). | Grátis |
| **SQLite** | O banco de dados: um arquivo dentro da pasta `dados`, no próprio computador. | Grátis |
| **Login próprio** | Cada pessoa entra com e-mail e senha. A senha é guardada embaralhada (não dá para ler). | Grátis |
| **Node.js** | O programa que faz o app rodar no computador. | Grátis |

## Como abrir o app no seu computador

Só na primeira vez:

1. Instale o **Node.js** (versão "LTS"): <https://nodejs.org>. É só avançar até o fim.
2. No GitHub, abra o repositório, clique no botão verde **Code** e em **Download ZIP**. Descompacte numa pasta (por exemplo, `Documentos\estoque`).

Para abrir:

1. Na pasta do app, dê dois cliques em **`iniciar.bat`** (no Windows).
   No Mac: abra o Terminal na pasta e digite `npm run iniciar`.
2. Na primeira vez demora alguns minutos. Depois o navegador abre sozinho em <http://localhost:3000>.
3. Na primeira vez, o app pede para criar o **usuário administrador** (nome, e-mail e senha).
4. Para fechar o app, feche a janela preta que ficou aberta.

**Depois de entrar** (como administrador), a tela inicial mostra os primeiros passos:

1. **Obras**: cadastre as obras em andamento.
2. **Materiais > Importar planilha**: escolha a planilha de insumos (Excel `.xlsx` ou `.csv`). O app confere antes e mostra quantos materiais são novos, quantos já existem e quais linhas têm problema. Só depois de clicar em "Importar" eles são gravados. A planilha **não é guardada** nem enviada ao GitHub: só os nomes e unidades vão para o banco do app, na pasta `dados`.
3. **Usuários**: cadastre as pessoas, escolha o perfil e as obras de cada uma.

**Para testar no celular:** com o celular no **mesmo Wi-Fi** do computador, abra no navegador do celular `http://IP-DO-COMPUTADOR:3000`. Para achar o IP no Windows, abra o "Prompt de Comando", digite `ipconfig` e use o número em "Endereço IPv4" (algo como `192.168.0.15`). Se o Windows perguntar sobre o firewall, clique em **Permitir**.

**Para atualizar** depois que um PR entrar na `main`: baixe o ZIP de novo e copie a pasta `dados` da versão antiga para a nova (é nela que ficam os cadastros e lançamentos).

## Cuidados

- A pasta `dados` guarda os dados reais e **nunca vai para o GitHub** (o repositório é público).
- Faça uma cópia da pasta `dados` de vez em quando, como backup.

## Como fica organizado (para quem programa)

- `src/app/` — as telas do app.
- `src/lib/db/` — o banco: tabelas, saldo por obra e as travas que impedem saldo negativo e alteração ou exclusão de lançamentos.
- `src/lib/auth.ts` — login, senhas e sessões.
- `src/lib/estoque.ts` — regras do estoque usadas nas telas.
- `src/lib/cadastros.ts` — obras, materiais (com a importação) e usuários.
- `src/lib/planilha.ts` — leitura da planilha de insumos (.xlsx e .csv), sem biblioteca de fora. `src/lib/exemplos/` tem uma planilha de exemplo com dados inventados, usada nos testes.
- `src/app/(app)/` — telas de quem já entrou: menu lateral com a obra atual, início, obras, materiais e usuários.
- Testes ficam ao lado do código (`*.test.ts`) e rodam com `npm test`.
- `.github/workflows/ci.yml` — a verificação automática de todo PR: confere o código, roda os testes e monta o app.

## Depois da aprovação (quando for para a internet)

Opção recomendada: hospedar na **Vercel** e trocar o SQLite por um banco online (**Supabase**, que usa PostgreSQL), com link de prévia a cada PR e domínio próprio. Custo estimado nos planos pagos: cerca de US$ 20/mês (Vercel) + US$ 25/mês (Supabase) + cerca de R$ 40/ano pelo domínio no Registro.br. Isso só será feito com o OK da construtora.
