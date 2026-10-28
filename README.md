# ESTOQUE-APP-CONSTRUTORA

Aplicativo de uso interno da equipe da construtora para controlar o estoque de material da obra.

O que o app precisa fazer está em [docs/requisitos.md](docs/requisitos.md).

## Como as mudanças entram no app

A branch `main` guarda sempre a versão que está funcionando. Ninguém altera a `main` diretamente: toda mudança segue este caminho.

1. **Branch separada**: cada pedido é feito numa cópia isolada (uma *branch*). Se algo der errado, a `main` continua intacta.
2. **Pull Request (PR)**: a mudança é apresentada num PR, onde dá para ver exatamente o que foi alterado.
3. **Testes automáticos**: em todo PR o GitHub roda a verificação automática (aba *Checks*). Ela precisa ficar verde.
4. **Aprovação**: o responsável revisa e aprova o PR. Só depois disso a mudança entra na `main`. Se não gostar, é só fechar o PR e nada muda.
5. **Marcos de versão (tags)**: quando uma versão estiver boa, ela recebe uma *tag* (ex.: `v1.0`), um ponto fixo para onde sempre dá para voltar.
