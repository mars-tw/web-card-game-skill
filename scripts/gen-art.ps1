<#
.SYNOPSIS
  用 Grok CLI 批次生成卡牌美術（讀 art-config.json）。

.DESCRIPTION
  從 ../art-config.json 讀取卡片清單與提示詞，對每張卡呼叫 Grok 的 generate_image 工具，
  生成到 art-config.json 指定的 outputDir（預設 assets/cards/<id>.png）。
  改提示詞、加卡、換風格都在 art-config.json，不需動本腳本。

.PARAMETER Only
  只生成指定的卡片 id（逗號分隔）。省略則生成全部。

.PARAMETER Theme
  使用 art-config.json themePresets 中的某個風格樣板（fantasy/cyber/forest/ink）。

.PARAMETER DryRun
  只印出將要送出的提示詞，不實際呼叫 grok。

.EXAMPLE
  .\gen-art.ps1
  .\gen-art.ps1 -Only dragon,phoenix
  .\gen-art.ps1 -Theme cyber
  .\gen-art.ps1 -DryRun
#>

param(
  [string[]]$Only,
  [string]$Theme,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$SkillDir   = Split-Path -Parent $ScriptDir
$ConfigPath = Join-Path $SkillDir 'art-config.json'

if (-not (Test-Path $ConfigPath)) { Write-Error "找不到設定檔: $ConfigPath"; exit 1 }
# 明確以 UTF-8 讀取，避免 PS 5.1 以 ANSI 誤讀中文（不依賴 BOM）
$cfg = [System.IO.File]::ReadAllText($ConfigPath, [System.Text.UTF8Encoding]::new($false)) | ConvertFrom-Json

$OutDir = Join-Path $SkillDir $cfg.outputDir
New-Item -ItemType Directory -Path $OutDir -Force | Out-Null

$StyleSuffix = $cfg.styleSuffix
if ($Theme) {
  if ($cfg.themePresets.$Theme) { $StyleSuffix = $cfg.themePresets.$Theme; Write-Host "使用風格樣板: $Theme" -ForegroundColor Cyan }
  else { Write-Warning "themePresets 中找不到 '$Theme'，改用預設 styleSuffix。" }
}

$Grok = Join-Path $env:USERPROFILE '.grok\bin\grok.exe'
if (-not (Test-Path $Grok)) {
  $cmd = Get-Command grok -ErrorAction SilentlyContinue
  if ($cmd) { $Grok = $cmd.Source } else { Write-Error "找不到 grok 執行檔。請先安裝 Grok CLI。"; exit 1 }
}

$targets = if ($Only) { $cfg.cards | Where-Object { $Only -contains $_.id } } else { $cfg.cards }
if (-not $targets) { Write-Warning "沒有符合的卡片 id。"; exit 0 }

Write-Host "後端: Grok CLI | 將生成 $($targets.Count) 張，輸出到: $OutDir" -ForegroundColor Cyan
if ($DryRun) { Write-Host "(DryRun：只預覽提示詞，不實際生圖)" -ForegroundColor Yellow }

foreach ($c in $targets) {
  $outPath = Join-Path $OutDir ("{0}.png" -f $c.id)
  $fullPrompt = "Use the generate_image tool to create an illustration of $($c.prompt). $StyleSuffix Save the PNG to `"$outPath`"."
  Write-Host ""
  Write-Host "[$($c.id)]" -ForegroundColor Green
  Write-Host "  -> $outPath" -ForegroundColor DarkGray
  if ($DryRun) { Write-Host "  PROMPT: $fullPrompt" -ForegroundColor DarkGray; continue }
  try {
    & $Grok -p $fullPrompt --always-approve
    if (Test-Path $outPath) { Write-Host "  ✓ 完成" -ForegroundColor Green }
    else { Write-Host "  ⚠ grok 已執行，但找不到輸出檔（請檢查 grok 訊息）" -ForegroundColor Yellow }
  } catch {
    Write-Host "  ✗ 失敗: $($_.Exception.Message)" -ForegroundColor Red
  }
}

Write-Host ""
Write-Host "生成結束。新增/修改卡片請編輯 art-config.json；接圖請到 cards.js 把 image 設為 ../../assets/cards/<id>.png。" -ForegroundColor Cyan
