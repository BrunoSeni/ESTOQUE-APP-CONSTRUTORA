# Atualiza o app para a versao mais nova da main, na mesma pasta.
# A pasta "dados" (cadastros e lancamentos) nao e tocada; antes, uma copia dela vai para "backups".
# Chamado pelo atualizar.bat. Sem acentos de proposito: o PowerShell do Windows le melhor assim.

$ErrorActionPreference = 'Stop'
$pasta = $PSScriptRoot
$endereco = 'https://github.com/BrunoSeni/ESTOQUE-APP-CONSTRUTORA/archive/refs/heads/main.zip'
$temp = Join-Path $env:TEMP 'estoque-atualizacao'
# Pastas de codigo que sao trocadas inteiras (junto com as que vierem na versao nova), para nao sobrar
# arquivo antigo. As pastas "dados", "backups" e "node_modules" nunca sao apagadas.
$pastasDeCodigo = @('src', 'docs', '.github', 'public', '.next')

function Parar($mensagem) {
  Write-Host ''
  Write-Host $mensagem -ForegroundColor Red
  exit 1
}

# So roda dentro da pasta do app.
$pacote = Join-Path $pasta 'package.json'
if (-not (Test-Path $pacote) -or -not ((Get-Content $pacote -Raw) -match '"estoque-app-construtora"')) {
  Parar 'Este arquivo precisa estar dentro da pasta do app de estoque.'
}

if (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue) {
  Parar 'O app esta aberto. Feche a janela preta do app e rode o atualizar.bat de novo.'
}

# 1. Baixa a versao nova antes de mexer em qualquer coisa.
Write-Host 'Baixando a versao nova...'
if (Test-Path $temp) { Remove-Item $temp -Recurse -Force }
New-Item $temp -ItemType Directory | Out-Null
$zip = Join-Path $temp 'app.zip'
try {
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  Invoke-WebRequest $endereco -OutFile $zip -UseBasicParsing
  Expand-Archive $zip -DestinationPath $temp -Force
} catch {
  Parar 'Nao foi possivel baixar a versao nova. Confira a internet e tente de novo. Nada foi alterado.'
}
$nova = Get-ChildItem $temp -Directory | Select-Object -First 1
if (-not $nova -or -not (Test-Path (Join-Path $nova.FullName 'package.json'))) {
  Parar 'O arquivo baixado veio incompleto. Tente de novo. Nada foi alterado.'
}

# 2. Copia de seguranca dos dados.
$dados = Join-Path $pasta 'dados'
if (Test-Path $dados) {
  $destino = Join-Path $pasta ('backups\dados-' + (Get-Date -Format 'yyyy-MM-dd-HHmm'))
  New-Item (Split-Path $destino) -ItemType Directory -Force | Out-Null
  Copy-Item $dados $destino -Recurse -Force
  Write-Host "Copia de seguranca dos dados em: $destino"
}

# 3. Troca o codigo antigo pelo novo.
Write-Host 'Instalando a versao nova...'
$pastasNovas = Get-ChildItem $nova.FullName -Directory -Force | ForEach-Object { $_.Name }
foreach ($p in ($pastasDeCodigo + $pastasNovas | Select-Object -Unique)) {
  if (@('dados', 'backups', 'node_modules') -contains $p) { continue }
  $caminho = Join-Path $pasta $p
  if (Test-Path $caminho) { Remove-Item $caminho -Recurse -Force }
}
Get-ChildItem $nova.FullName -Force | Copy-Item -Destination $pasta -Recurse -Force
Remove-Item $temp -Recurse -Force -ErrorAction SilentlyContinue

Write-Host 'Pronto! App atualizado.' -ForegroundColor Green
