# R63 卡圖覆蓋率清償報告

## 結論

R63 已清掉本輪 P1 高刺痛缺口：5 張傳說 `image:null` 全部補圖，`op_scarra` 固定 20 卡牌組全部接上 PNG，對上快攻 AI 的敵場不再整場 emoji fallback。

| 項目 | R63 前 | R63 後 |
|---|---:|---:|
| `CARD_POOL` 總張數 | 92 | 92 |
| `image:null` | 45 | 25 |
| 有圖卡 | 47 | 67 |
| 傳說 `image:null` | 5 | 0 |
| `op_scarra` 牌組 `image:null` | 8 | 0 |

## 本輪補圖清單

新增並接線 20 張卡圖，檔案皆位於 `assets/cards/`：

`bloodmoonQueen`, `skyJudicator`, `highArchivist`, `captainGreywake`, `ladyAshenBell`, `emberpup`, `alleySkirmisher`, `sparkSquire`, `frontScout`, `packHowler`, `dualTalon`, `dawnRider`, `emberVolley`, `saltShieldSquire`, `bulwarkMonk`, `bannerGuard`, `mirrorRime`, `tidecallerAdept`, `iceNeedle`, `voidTithe`

同步更新：

- `templates/card-battle/cards.js`：上述 20 張由 `image:null` 改接 `../../assets/cards/<id>.png`。
- `art-config.json`：補入 20 張 R63 prompt 紀錄。
- `sw.js`：PWA cache revision bump 至 `card-battle-r63-v1`，並納入新 PNG。
- `README.md`、入口/對戰/開包 HTML 與 SW reload key：版本更新至 R63。
- `scripts/test-cards.js`、`scripts/test-battle-e2e.js`：新增 R63 接線與目前剩餘 null baseline 驗證。
- `docs/GROK_ASSET_AUDIT.md`：頭部與 AI 曝光數字更新為 R63 實況。

## 自檢證明

`rg -n "image:\s*null" templates/card-battle/cards.js`：

- R63 後命中數：25

Node 接線檢查：

```json
{
  "total": 92,
  "imageNull": 25,
  "withImage": 67,
  "legendaryNull": [],
  "scarraNull": [],
  "missingAssets": []
}
```

對戰畫面證據：

- `docs/evidence/R63_art/op_scarra_enemy_field_1366x768.png`
- 截圖時敵場卡：`emberpup`, `alleySkirmisher`, `sparkSquire`, `frontScout`, `packHowler`, `dualTalon`, `dawnRider`
- 敵場 fallback 數：0

## 剩餘缺件揭露

仍為 `image:null` 的 25 張長尾卡：

`mooncat`, `groveHerbalist`, `holyGlimmer`, `duskwrightBat`, `linebreaker`, `thunderClap`, `arcaneVeil`, `abyssWalker`, `stormGriffin`, `duskWitch`, `starfall`, `forbiddenHex`, `battleDrummer`, `sanctuaryWarden`, `tidebinderHex`, `bastionColossus`, `thunderRoc`, `soulfrostRaven`, `runicScrivener`, `watchtowerBowman`, `tacticalRequisition`, `toxinViper`, `graveScribe`, `silenceOne`, `scoutInterrogator`

這批未假裝完成；仍由現有四陣營 `art-fallback` 承接，建議下一輪優先清 epic 與高辨識 rare。

## 驗收

- `npm test`：PASS
- `npm run test:e2e`：PASS
- PWA version：`0.4.8` / `card-battle-r63-v1`
- `git diff --check`：PASS
- 秘密掃描：PASS，排除 `.git` / `node_modules` 後零命中
