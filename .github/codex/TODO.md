# Codex Work Queue
# Codex Work Queue (SPEC-driven)
> このファイルは Codex が更新する作業キュー。SPECの項目を「状態」「次の一手」「検証方法」で管理する。
> ルール: append/updateはOKだが、項目名（ID）は保持して追跡可能にする。

## Legend
- Status:
  - DONE: 実装済み + 機械的検証済み（テスト/型/ビルド）
  - PARTIAL: 実装はあるがUX/端末検証が必要
  - TODO: 未着手
  - HUMAN-BLOCKED: 端末/外部設定がないと進めない
- Priority:
  - P0: 申請/利用不能に直結
  - P1: 主要UX
  - P2: 仕上げ/最適化

---

## Queue

### P0 — App Store / RevenueCat / Compliance
- [ ] (P0) RC-001 RevenueCat keys / entitlement wiring
  - Status: HUMAN-BLOCKED
  - SPEC refs: 追加仕様(課金) 2.x / 3.x
  - Next: envキーを受け取ったら Dev Client で purchase/restore を通す
  - Human ask: RevenueCat iOS API key / entitlementId / offeringId

- [ ] (P0) LEGAL-001 Terms/Privacy URL
  - Status: HUMAN-BLOCKED
  - SPEC refs: 追加仕様(法務) 4.x
  - Next: TERMS_URL / PRIVACY_URL を設定して paywallリンクが開くことを確認
  - Human ask: 公開URL確定 or 仮URL

- [ ] (P0) PRIV-001 App Privacy inventory
  - Status: DONE
  - SPEC refs: 追加仕様(Privacy) 5.x
  - Next: App Store Connect へ申告内容を入力

### P1 — Core UX (Loop / Timeline)
- [ ] (P1) UX-LOOP-001 Loop操作がFreeで常に動作する（gating巻き込み防止）
  - Status: DONE
  - SPEC refs: 追加仕様(課金) 2.4
  - Next: Expo GoでFree挙動の再確認
  - Verify: unit/integration + Expo Goで手動確認

- [ ] (P1) UX-TL-001 Scrubber vs Loop Window ジェスチャ競合の解消
  - Status: TODO
  - SPEC refs: Timeline/Loop用語セクション + 既存UI仕様
  - Next: hitSlop/gesture priorityを整理、操作領域を分離

- [ ] (P1) UX-SKIP-001 ダブルタップskip + フィードバック位置
  - Status: TODO
  - SPEC refs: UI追記（ダブルタップ/フィードバック高さ）
  - Next: 左/右double tapで±5s、波紋＋テキスト、表示位置は再生アイコンと同じ高さ

### P2 — Polish / Performance
- [ ] (P2) PERF-001 体感の重さ/メモリ/不要レンダ削減（見た目維持）
  - Status: TODO
  - Next: render profiling / memoization / FlatList最適化 / 画像サムネキャッシュなど
  - Verify: FPS/JS frame drops をログ化（可能なら）

---

## Last updated
- 2026-01-14 21:46 (by Codex)
