<#
.SYNOPSIS
  Apunta termasdelrio.com a GitHub Pages (sitio Next.js) usando la API de Cloudflare.

.DESCRIPTION
  - Elimina los registros A/AAAA/CNAME actuales en @ y www.
  - Crea 4 registros A en @ y 1 CNAME en www, todos en DNS only (nube gris).
  - Verifica el resultado e intenta activar "Enforce HTTPS" en GitHub Pages.
  El token nunca se escribe en disco ni se muestra en pantalla.

.EXAMPLE
  .\scripts\apply-cloudflare-dns.ps1 -Token 'TU_TOKEN_DE_CLOUDFLARE'

  O, sin pegar el token en la terminal:
  $env:CLOUDFLARE_API_TOKEN = 'TU_TOKEN'
  .\scripts\apply-cloudflare-dns.ps1 -Token $env:CLOUDFLARE_API_TOKEN
#>
param(
  [Parameter(Mandatory = $true)]
  [string]$Token,

  [string]$Domain = 'termasdelrio.com',
  [string]$PagesHost = 'asambleadedios18-cmyk.github.io',
  [switch]$SkipHttps
)

$ErrorActionPreference = 'Stop'

$headers = @{
  Authorization = "Bearer $Token"
  'Content-Type' = 'application/json'
}
$apiBase = 'https://api.cloudflare.com/client/v4'

function Invoke-CloudflareApi {
  param(
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Path,
    [hashtable]$Body
  )

  $uri = "$apiBase$Path"
  if ($Body) {
    $json = $Body | ConvertTo-Json -Depth 6 -Compress
    return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -Body $json
  }
  return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers
}

Write-Host "==> Buscando zona $Domain ..."
$zones = Invoke-CloudflareApi -Method GET -Path "/zones?name=$Domain&per_page=50"
$zone = $zones.result | Where-Object { $_.name -eq $Domain -and $_.status -eq 'active' } | Select-Object -First 1
if (-not $zone) {
  throw "No se encontró una zona activa para $Domain. Revisa el token y su permiso Zone:DNS Edit."
}
Write-Host "    Zona: $($zone.id)"

Write-Host "==> Leyendo registros actuales ..."
$records = (Invoke-CloudflareApi -Method GET -Path "/zones/$($zone.id)/dns_records?per_page=100").result

$toRemove = @()
foreach ($record in $records) {
  $isRoot = ($record.name -eq $Domain -or $record.name -eq '@')
  $isWww = ($record.name -eq "www.$Domain")
  if (($isRoot -or $isWww) -and $record.type -in @('A', 'AAAA', 'CNAME')) {
    $toRemove += $record
  }
}

foreach ($record in $toRemove) {
  Write-Host "    Eliminando $($record.type) $($record.name) -> $($record.content)"
  Invoke-CloudflareApi -Method DELETE -Path "/zones/$($zone.id)/dns_records/$($record.id)" | Out-Null
}

$desired = @(
  @{ type = 'A'; name = '@'; content = '185.199.108.153' },
  @{ type = 'A'; name = '@'; content = '185.199.109.153' },
  @{ type = 'A'; name = '@'; content = '185.199.110.153' },
  @{ type = 'A'; name = '@'; content = '185.199.111.153' },
  @{ type = 'CNAME'; name = 'www'; content = $PagesHost }
)

Write-Host "==> Creando registros para GitHub Pages (DNS only) ..."
foreach ($item in $desired) {
  $payload = [ordered]@{
    type    = $item.type
    name    = $item.name
    content = $item.content
    ttl     = 1
    proxied = $false
  }
  Write-Host "    $($item.type) $($item.name) -> $($item.content)"
  Invoke-CloudflareApi -Method POST -Path "/zones/$($zone.id)/dns_records" -Body $payload | Out-Null
}

Write-Host "==> Verificando registros finales ..."
$final = (Invoke-CloudflareApi -Method GET -Path "/zones/$($zone.id)/dns_records?per_page=100").result
$final | Where-Object {
  ($_.name -eq $Domain -or $_.name -eq '@' -or $_.name -eq "www.$Domain") -and
  $_.type -in @('A', 'AAAA', 'CNAME')
} | Select-Object type, name, content, proxied | Format-Table -AutoSize | Out-Host

if (-not $SkipHttps) {
  Write-Host "==> Activando Enforce HTTPS en GitHub Pages ..."
  $pagePayload = '{"https_enforced":true}'
  try {
    $pagePayload | gh api -X PUT repos/asambleadedios18-cmyk/termas-del-rio/pages --input - --jq '{https_enforced}'
  }
  catch {
    Write-Warning "HTTPS aún no disponible: $($_.Exception.Message)"
    Write-Warning "GitHub emite el certificado cuando el DNS ya apunta a Pages. Vuelve a intentarlo en unos minutos."
  }
}

Write-Host "LISTO. Cuando el DNS propague, verifica:"
Write-Host "  curl -I https://termasdelrio.com/"
