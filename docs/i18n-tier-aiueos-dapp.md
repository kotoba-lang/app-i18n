# app-i18n（言語 tier）— itonami（dapp）上の分散型設計

状態: 第 1 スライス実装（2026-10-20）。正本はこの文書。
追跡: Linear JUN-128（親 JUN-116）。

## 位置づけ

app-i18n は Murakumo 翻訳サービス（200+ 言語、4 モード統合）。**この project
の wasm 面は DEPRECATED**（T1 MCP-Compose の actor-manifest へ移行済み、
T3 fallback として保持）。本スライスはその**言語 tier の判定**を判定コア化。

## このスライス: 言語 tier 判定コア

| 層 | 実体 | 状態 |
|---|---|---|
| 判定コア guest | `aiueos/i18n_tier.cljk` — auto-xlate（**Tier 1+2 かつ source でない**ときだけ yoro 自動翻訳の対象）/ registry-judgment（tier 1 = ちょうど 25 / Tier 1+2 累積 = 149 / 全 tier = 200+（下限 100）） | **実装済み・実測** |
| 記述子 | `aiueos/i18n-tier.edn` | **実装済み** |
| parity | `e2e/tests/i18n/tier_parity_test.cljk` — 正本ピン値（`language-registry.spec.ts` の `toBe(25)` / `≥100`、AGENTS.md の `Tier 1+2 (149)` / `≠ source`）と一致 | **実装済み・実測** |

実測: `amu test aiueos/i18n_tier.cljk` → **18/18**（jvm-kir / js / wasm）。
parity → 5 assertions / 0 failures。

## 正本の正確な規則（guest はこれに追従）

- **yoro 投稿の自動翻訳は Tier 1+2 全言語（149 = 完全聖書 + 新約）で、
  source 言語には翻訳しない**（`for each Tier 1+2 lang (≠ source)`）。
- registry の件数規約（e2e がピン留め）: tierLimit 1 → **ちょうど 25**、
  tierLimit 4（全 tier）→ **200+（下限 100）**。Tier 1+2 累積は **149**。
- 境界値（25 / 149 / 100）自体は違反にしない（fail closed の輪郭をゲートで確認）。
- RTL メタデータ（ar / he / fa 等 ≥7）は registry の情報 = host 側。

## 実測メモ

- 第一稿の test-fail-closed が違反値（26/150）と期待値（0）を取り違えて
  js/wasm で落ちた —— 境界値テストとして書き直し（境界自体は非違反）。

## 調査で見つかった正本内の不一致（要 repo 側の判断）

- e2e `language-registry.spec.ts` は **tierLimit 1 → ちょうど 25** を
  ピン留めするが、AGENTS.md の tier 表は **Tier 1 = Full Bible 133 / Tier 2 =
  NT 16（133+16 = 149）**。件数は bibleCoverage から導出され「マイルストーン
  とともに移動する可謬の値」と明記されている。
- guest は**実行可能なオラクル（e2e のピン値）に追従**。表側の 133 と e2e の
  25 の食い違いは repo 側へ提出すべき論点 —— 149（Tier 1+2）自体は両者一致。
- 追加した `coverage-tier` / `tier-consistent` は AGENTS.md の「
  `bibleCoverageToTier()` が唯一の対応（1=full/2=nt/3=portions/4=none）、
  bibleCoverage と食い違う tier の手設定は禁止」の判定。

## 未実装境界

- detectLanguage（post.langs / Unicode ヒューリスティック）と
  murakumoTranslate の実体（LLM = host）。
- Widget の用語提案・承認（human TM）の判定。
- 149 の内訳リスト（Tier 2 の範囲）そのものは本 repo に無し —— actor 側。
- mon（DNA）化、aiueos session 載せ（fleet 共通）。
