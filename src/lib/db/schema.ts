// Estrutura do banco. Roda toda vez que o app abre e só cria o que ainda não existe.
// Não contém dados da empresa: obras, materiais e usuários são cadastrados pelo app.
export const SCHEMA = `
pragma foreign_keys = on;

create table if not exists usuarios (
  id integer primary key,
  nome text not null,
  email text not null unique collate nocase,
  senha_hash text not null,
  perfil text not null check (perfil in ('almoxarife', 'engenheiro', 'escritorio', 'admin')),
  ativo integer not null default 1,
  criado_em text not null default (datetime('now'))
);

create table if not exists sessoes (
  token text primary key,
  usuario_id integer not null references usuarios (id) on delete cascade,
  expira_em text not null
);

create table if not exists obras (
  id integer primary key,
  nome text not null,
  endereco text,
  encerrada_em text,
  criado_em text not null default (datetime('now'))
);

-- Quais obras cada almoxarife/engenheiro enxerga.
create table if not exists usuarios_obras (
  usuario_id integer not null references usuarios (id) on delete cascade,
  obra_id integer not null references obras (id) on delete cascade,
  primary key (usuario_id, obra_id)
);

create table if not exists materiais (
  id integer primary key,
  nome text not null,
  unidade text not null,
  ativo integer not null default 1,
  criado_em text not null default (datetime('now'))
);

-- Toda movimentação de estoque. Nunca é apagada nem alterada:
-- erros são acertados com um lançamento do tipo 'correcao'.
create table if not exists movimentos (
  id integer primary key,
  obra_id integer not null references obras (id),
  material_id integer not null references materiais (id),
  tipo text not null check (tipo in
    ('entrada', 'saida', 'transferencia_saida', 'transferencia_entrada', 'correcao')),
  -- Positiva, exceto na correção, onde o sinal diz se aumenta ou diminui o saldo.
  quantidade real not null check (quantidade <> 0 and (tipo = 'correcao' or quantidade > 0)),
  fornecedor text,
  nota_fiscal text,
  -- Valor de 1 unidade na entrada (R$), para saber quanto vale o estoque.
  valor_unitario real check (valor_unitario is null or valor_unitario >= 0),
  retirado_por text,
  etapa text,
  -- Liga as duas pontas de uma transferência entre obras.
  transferencia_id text,
  observacao text,
  registrado_por integer not null references usuarios (id),
  registrado_em text not null default (datetime('now'))
);
create index if not exists movimentos_obra_material_idx on movimentos (obra_id, material_id);
create index if not exists movimentos_data_idx on movimentos (registrado_em);

-- Saldo atual de cada material por obra.
create view if not exists saldos as
select obra_id, material_id,
  round(sum(case when tipo in ('saida', 'transferencia_saida') then -quantidade else quantidade end), 3) as saldo
from movimentos
group by obra_id, material_id;

-- Não deixa sair mais do que tem no estoque.
create trigger if not exists movimentos_conferir_saldo
before insert on movimentos
when new.tipo in ('saida', 'transferencia_saida') or (new.tipo = 'correcao' and new.quantidade < 0)
begin
  select raise(abort, 'Quantidade maior que o saldo da obra.')
  where coalesce((select saldo from saldos
    where obra_id = new.obra_id and material_id = new.material_id), 0) - abs(new.quantidade) < -0.0005;
end;

-- O histórico não pode ser alterado nem apagado.
create trigger if not exists movimentos_sem_alteracao
before update on movimentos
begin
  select raise(abort, 'Lançamentos não podem ser alterados. Faça um lançamento de correção.');
end;
create trigger if not exists movimentos_sem_exclusao
before delete on movimentos
begin
  select raise(abort, 'Lançamentos não podem ser apagados. Faça um lançamento de correção.');
end;
`;
