# Requisitos do app de estoque

Este documento diz **o que o app precisa fazer**. A escolha da tecnologia fica para outro passo (card EST-5).

**Objetivo da 1ª versão:** fazer o básico bem feito. Controlar quanto material tem em cada obra, o que entrou, o que saiu e para onde foi.

## Contexto

- App de uso interno da construtora, para controlar o estoque de material das obras.
- A empresa já usa o ERP **Sienge** para pedidos de compra, solicitações e entrada de nota fiscal. **O app não substitui o Sienge**: ele cuida só do que acontece com o material dentro da obra.
- Tamanho esperado: **cerca de 3 obras ao mesmo tempo** e **até 10 pessoas** usando.
- Uso no **celular, no canteiro**, e no **computador, no escritório**.

## Quem usa (perfis)

| Perfil | O que pode fazer |
|---|---|
| **Almoxarife** | Registra entradas, saídas e transferências da sua obra. Consulta o saldo. |
| **Engenheiro / mestre de obras** | Consulta o saldo e o histórico das suas obras. Não faz pedidos de material, porque isso já é feito no Sienge. |
| **Escritório / compras** | Vê todas as obras, o histórico e os relatórios. |
| **Administrador** | Cadastra usuários, obras e materiais e define o perfil de cada pessoa. |

Cada pessoa entra com o seu próprio login. O app registra quem fez cada lançamento.

## 1ª versão (o que entra agora)

### 1. Login e usuários
- Entrar com usuário e senha.
- O administrador cria, edita e desativa usuários e escolhe o perfil e as obras de cada um.

### 2. Obras
- Cadastrar uma obra (nome e endereço) e marcar quando terminar (encerrar).
- **Cada obra tem o seu próprio estoque.**

### 3. Materiais (insumos)
- Um cadastro único de materiais para todas as obras: **nome** e **unidade de medida** (ex.: saco, m³, barra, un).
- **Importar a planilha de insumos que a empresa já tem**, para não precisar cadastrar um por um.
- O administrador pode incluir, corrigir ou desativar um material depois.
- Busca rápida de material pelo nome.

### 4. Entrada de material
Registrar o que chegou na obra:
- material e quantidade;
- fornecedor;
- número da nota fiscal;
- valor unitário (R$), para saber quanto vale o estoque;
- data e quem registrou (preenchidos automaticamente).

### 5. Saída de material
Registrar o que foi usado:
- material e quantidade;
- quem retirou;
- para qual etapa ou serviço (ex.: fundação, alvenaria, reboco);
- data e quem registrou (automático).
- O app não deixa sair mais do que tem no estoque.

### 6. Transferência entre obras
- Mandar material de uma obra para outra: o app tira de uma e põe na outra, com data e quem fez.

### 7. Saldo e histórico
- Ver o **saldo atual de cada material por obra** e o **valor em estoque** (pelo custo médio das entradas).
- Ver o **histórico de movimentações** (entradas, saídas e transferências), com filtro por obra, material e período.
- Lançamentos não são apagados. Se houver erro, faz-se um **lançamento de correção**, para que o histórico fique sempre confiável.

### 8. Relatórios
- **Saldo por obra.**
- **Histórico de movimentações.**
- **Consumo por período** (quanto de cada material saiu, por obra e por etapa/serviço).
- Ao clicar em "Ver relatório", abre um **PDF** com o logo e as cores da CR Incorp.
- Todos com opção de **exportar para Excel**.
- **2ª etapa:** relatório de movimentação completa, mostrando como as entradas e saídas estão girando e quanto tempo cada material fica no estoque (ciclo).

### 9. Celular e computador
- A mesma ferramenta funciona bem na tela do celular (botões grandes e lançamento rápido) e no computador.

## Fica para depois

- **Pedidos de compra e solicitações**: não vamos fazer, porque já são feitos no Sienge.
- **Código de barras / QR code** para lançar material.
- **Alerta de estoque mínimo** (avisar quando um material estiver acabando).
- **Funcionar sem internet** no canteiro (guardar os lançamentos e enviar quando voltar o sinal).
- **Foto da nota fiscal ou do material** no lançamento.
- **Integração com o Sienge** (por exemplo, trazer as notas fiscais ou os insumos automaticamente).
- **Controle de custo completo** (orçamento e gasto por obra). O valor do estoque já entra na 1ª versão.

## Cuidados

- O repositório do app é público: **dados reais da empresa** (planilha de insumos, nomes de obras, fornecedores, notas fiscais) **nunca entram no código**. Eles ficam só no banco de dados do app.
- Senhas e chaves de acesso ficam guardadas em local seguro, nunca no código.
