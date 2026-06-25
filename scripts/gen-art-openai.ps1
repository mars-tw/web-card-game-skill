<#
.SYNOPSIS
  用 OpenAI (GPT) 圖像 API 批次生成卡牌美術（讀 art-config.json）。

.DESCRIPTION
  與 gen-art.ps1 共用同一份 ../art-config.json（卡片清單、提示詞、風格樣板）。
  差別只在「後端」：本腳本呼叫 OpenAI 的 image generation API (gpt-image-1)。
  需要環境變數 OPENAI_API_KEY（不把金鑰寫進檔案，安全做法）：
      $env:OPENAI_API_KEY = "sk-..."

.PARAMETER Only
  只生成指定的卡片 id（逗號分隔）。省略則生成全部。

.PARAMETER Theme
  使用 art-config.json themePresets 中的某個風格樣板。

.PARAMETER Model
  OpenAI 影像模型，預設 gpt-image-1。

.PARAMETER DryRun
  只印出將送出的提示詞與請求，不實際呼叫 API。

.EXAMPLE
  $env:OPENAI_API_KEY = "sk-..."
  .\gen-art-openai.ps1 -Only dragon
  .\gen-art-openai.ps1 -Theme cyber
#>

param(
  [string[]]$Only,
  [string]$Theme,
  [string]$Model = 'gpt-image-1',
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$SkillDir   = Split-Path -Parent $ScriptDir
$ConfigPath = Join-Path $SkillDir 'art-config.json'

if (-not (Test-Path $ConfigPath)) { Write-Error "找不到設定檔: $ConfigPath"; exit 1 }
$cfg = [System.IO.File]::ReadAllText($ConfigPath, [System.Text.UTF8Encoding]::new($false)) | ConvertFrom-Json

$OutDir = Join-Path $SkillDir $cfg.outputDir
New-Item -ItemType Directory -Path $OutDir -Force | Out-Null

$StyleSuffix = $cfg.styleSuffix
if ($Theme) {
  if ($cfg.themePresets.$Theme) { $StyleSuffix = $cfg.themePresets.$Theme; Write-Host "使用風格樣板: $Theme" -ForegroundColor Cyan }
  else { Write-Warning "themePresets 中找不到 '$Theme'，改用預設 styleSuffix。" }
}

# 金鑰：從環境變數讀，不寫進檔案
$ApiKey = $env:OPENAI_API_KEY
if (-not $DryRun -and -not $ApiKey) {
  Write-Error "未設定 OPENAI_API_KEY 環境變數。請先執行： `$env:OPENAI_API_KEY = `"sk-...`"，或用 -DryRun 預覽。"
  exit 1
}

$size = if ($cfg.size) { $cfg.size } else { '1024x1024' }

$targets = if ($Only) { $cfg.cards | Where-Object { $Only -contains $_.id } } else { $cfg.cards }
if (-not $targets) { Write-Warning "沒有符合的卡片 id。"; exit 0 }

Write-Host "後端: OpenAI ($Model) | 將生成 $($targets.Count) 張，輸出到: $OutDir" -ForegroundColor Cyan
if ($DryRun) { Write-Host "(DryRun：只預覽，不實際呼叫 API)" -ForegroundColor Yellow }

foreach ($c in $targets) {
  $outPath = Join-Path $OutDir ("{0}.png" -f $c.id)
  $fullPrompt = "An illustration of $($c.prompt). $StyleSuffix"

  Write-Host ""
  Write-Host "[$($c.id)]" -ForegroundColor Green
  Write-Host "  -> $outPath" -ForegroundColor DarkGray

  if ($DryRun) {
    Write-Host "  POST https://api.openai.com/v1/images/generations" -ForegroundColor DarkGray
    Write-Host "  model=$Model size=$size" -ForegroundColor DarkGray
    Write-Host "  PROMPT: $fullPrompt" -ForegroundColor DarkGray
    continue
  }

  try {
    $body = @{ model = $Model; prompt = $fullPrompt; size = $size; n = 1 } | ConvertTo-Json
    $headers = @{ Authorization = "Bearer $ApiKey"; 'Content-Type' = 'application/json' }
    $resp = Invoke-RestMethod -Uri 'https://api.openai.com/v1/images/generations' -Method Post -Headers $headers -Body $body

    # gpt-image-1 預設回傳 base64；DALL·E 可能回 url。兩者都處理。
    $item = $resp.data[0]
    if ($item.b64_json) {
      [System.IO.File]::WriteAllBytes($outPath, [Convert]::FromBase64String($item.b64_json))
    } elseif ($item.url) {
      Invoke-WebRequest -Uri $item.url -OutFile $outPath -UseBasicParsing
    } else {
      throw "API 回應中找不到 b64_json 或 url。"
    }
    Write-Host "  ✓ 完成" -ForegroundColor Green
  } catch {
    Write-Host "  ✗ 失敗: $($_.Exception.Message)" -ForegroundColor Red
  }
}

Write-Host ""
Write-Host "生成結束。接圖請到 cards.js 把 image 設為 ../../assets/cards/<id>.png。" -ForegroundColor Cyan
