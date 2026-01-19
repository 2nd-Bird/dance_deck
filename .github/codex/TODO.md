# Codex Work Queue
# Codex Work Queue (SPEC-driven)
> このファイルは Codex が更新する作業キュー。SPECの項目を「状態」「次の一手」「検証方法」で管理する。
> ルール: append/updateはOKだが、項目名（ID）は保持して追跡可能にする。

## Legend
- Status:
  - DONE: 実装済み + 機械的検証済み（テスト/型/ビルド）
  - PARTIAL: 実装はあるがUX/端末検証が必要
  - TODO: 未着手
  - HUMAN-VERIFY: 端末/UX確認のみ必要
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

- [ ] (P0) RC-VERIFY-001 RevenueCat 実機検証（Dev Client）
  - Status: HUMAN-VERIFY
  - SPEC refs: 追加仕様5.1
  - Next: EAS Dev Client で paywall/purchase/restore を実機確認
  - Human ask: 端末で以下を実行し結果共有
    - eas build --profile development --platform ios
    - TestFlight または dev client 起動
    - Paywall表示 → 購入 → entitlement "pro" 反映
    - Restore purchases → entitlement "pro" 反映

- [ ] (P0) LEGAL-001 Terms/Privacy URL
  - Status: HUMAN-BLOCKED
  - SPEC refs: 追加仕様(法務) 4.x
  - Next: TERMS_URL / PRIVACY_URL を設定して paywallリンクが開くことを確認
  - Human ask: 公開URL確定 or 仮URL

- [ ] (P0) PRIV-001 App Privacy inventory
  - Status: DONE
  - SPEC refs: 追加仕様(Privacy) 5.x
  - Next: App Store Connect へ申告内容を入力

- [ ] (P0) UX-TL-LOOP-002 ループ窓（range）が0:00に吸い付き移動できない
  - Status: HUMAN-VERIFY
  - Impact: コア価値（8-countループ練習）が成立しない
  - Expect:
    - ループ窓（中央ドラッグ/左右ハンドル）がドラッグ量に応じて連続的に移動する
    - 0:00に固定されない
  - Actual:
    - ループ窓を動かしても 0:00 に吸い付き、実質移動できない
  - Repro:
    1) iOS Dev Clientで任意の動画を開く
    2) Timeline表示状態で、Loop Window（黄色枠）中央（range）をドラッグ
    3) 位置が0:00に固定され移動しない
  - Logs (sample):
    - [TimelineTouch] {"dx": undefined, "dy": undefined, "phase": "start", "target": "range", "x": 73.6666, "y": 17.9999}
    - [TimelineTouch] {"dx": 1.3333, "dy": 0.3333, "phase": "move", "target": "range", "x": 75, "y": 18.3333}
    - ...
    - [TimelineTouch] {"dx": 105, "dy": -2.6666, "phase": "move", "target": "range", "x": 73.9999, "y": 15.3333}
    - [TimelineTouch] {"dx": undefined, "dy": undefined, "phase": "end", "target": "range", "x": undefined, "y": undefined}
  - Next: iOS Dev Clientでループ窓ドラッグが0:00に戻らないことを確認
  - Human ask: iOS Dev Clientでドラッグ後に0:00へ戻らないか確認し、[TimelineTouch]ログの開始/終了時のxを共有

- [ ] (P0) RC-PAYWALL-001 Bookmark保存時のPaywallが想定と違い、"default offering has no configured paywall" が出る
  - Status: HUMAN-VERIFY
  - Impact: Pro導線が壊れており、購入/解放の検証ができない
  - Expect:
    - Bookmark保存（Pro機能）実行時に、RevenueCatの想定Paywall（V2 / published）を表示
  - Actual:
    - 「offering ‘default’ has no configured paywall... displayed paywall contains default configuration...」が表示される
    - “手元で開発したのと異なるPaywall” に見える
  - Repro:
    1) iOS Dev Clientで動画詳細へ
    2) Bookmark保存ボタンを押す
    3) 期待と異なるPaywall + 上記メッセージ
  - Logs:
    - 画面メッセージ:
      - offering ‘default’ has no configured paywall.
      - if you expected to see a v2 paywall, make sure it is published.
      - displayed paywall contains default configuration.
      - this error will hidden in production.
  - Next: Dev ClientでPaywall表示時にcurrent offeringのPaywallが出るか確認
  - Human ask: iOS Dev ClientでBookmark保存→表示されたPaywallの内容と警告有無を共有

- [ ] (P0) UX-TL-HIT-001 4 counts のループ窓が小さすぎて操作困難（操作性上の実質バグ）
  - Status: HUMAN-VERIFY
  - Impact: 4 counts が実用にならず、練習導線が途切れる
  - Expect:
    - 4eights/2eights/1eight/4count の順で窓長が変わるのはOK
    - 4countでも操作可能な最小タッチ領域が確保される
    - 窓が短い時はタイムライン表示スケールを寄せて操作しやすくする（案）
  - Actual:
    - 4count を選ぶと窓が小さくて操作が難しい
  - Repro:
    1) 動画詳細で Timeline表示
    2) 4eights→2eights→1eight→4count と切替
    3) 4countの窓が小さく操作が困難
  - Notes:
    - 表示スケール（ズーム/表示範囲）を窓長に合わせて調整したい（案）
  - Next: iOS Dev Clientで4countでもドラッグしやすい最小タッチ領域か確認
  - Human ask: 4count選択時のドラッグ操作感（掴みやすさ）を共有

- [ ] (P0) UX-TL-SMOOTH-001 ループ窓/左右端の移動を iOS写真アプリ同様に mm:ss:XX 精度で滑らかにしたい（仕様追加の要否確認）
  - Status: HUMAN-VERIFY
  - Expect:
    - iOS写真アプリの動画範囲指定のように滑らか（サブ秒精度）に動く
  - Actual:
    - 精密調整/時間表示は実装済み。実機UXの確認待ち。
  - Repro:
    1) Timelineで左右端/窓移動を試す
    2) 期待する滑らかさに達していない
  - Next:
    - iOS Dev Clientで長押し精密調整と mm:ss:xx 表示の体感確認

### 追加仕様 UX-TL-SMOOTH-002: iOS写真アプリ準拠のループ範囲指定UX

#### 目的
ユーザーの既知操作（iOS標準写真アプリ）を流用し、
説明不要・低認知負荷でのループ範囲指定を実現する。

#### 基本方針
- ループ範囲指定UXは iOS標準写真アプリの動画トリム操作を強く参照する
- 見た目・色味・操作感は「コピー可能な範囲でコピー」する

#### 状態遷移
1. 初期状態
   - ループ範囲（黄色枠）は存在しない
   - タイムラインは通常スケール

2. 範囲指定開始
   - 左端または右端ハンドルをドラッグした瞬間に
     ループ範囲（黄色枠）を生成する

3. 端ハンドル操作中
   - 操作中のハンドル直上に時間表示を行う
   - 表示形式は `mm:ss:xx`（xx = サブ秒）
   - 時間は連続的に更新され、カクつきがあってはならない

4. 精密調整モード
   - ループ範囲（中央）を長押しすると精密調整モードに入る
   - 精密調整モードではタイムライン表示スケールを拡大する
     （結果として、ループ範囲が相対的に広く見える）
   - 微小なドラッグで時間を詰められること

#### 操作精度
- ループ範囲の移動・左右端操作は
  秒未満（サブ秒）単位で連続的に行えること
- 「1秒単位でカクカク動く」挙動は禁止

#### 視覚仕様
- ループ範囲の色は黄色系（iOS写真アプリ準拠）
- ハンドル形状・太さは、既存Timeline内で最も認知しやすい形状を採用

### P1 — Core UX (Loop / Timeline)
- [ ] (P1) UX-TL-SMOOTH-002 iOS写真アプリ準拠のループ範囲指定UX
  - Status: HUMAN-VERIFY
  - SPEC refs: 追加仕様 UX-TL-SMOOTH-002
  - Next: iOS Dev Clientで初期状態→ハンドルドラッグで範囲生成→長押し精密調整→mm:ss:xxラベル更新を確認
  - Human ask: iOS Dev Clientで上記手順の体感とスクリーン録画を共有

- [ ] (P1) UX-LOOP-001 Loop操作がFreeで常に動作する（gating巻き込み防止）
  - Status: DONE
  - SPEC refs: 追加仕様(課金) 2.4
  - Next: Expo GoでFree挙動の再確認
  - Verify: unit/integration + Expo Goで手動確認

- [ ] (P1) UX-TL-001 Scrubber vs Loop Window ジェスチャ競合の解消
  - Status: DONE
  - SPEC refs: Timeline/Loop用語セクション + 既存UI仕様
  - Next: Expo Goでジェスチャ優先順位の体感確認

- [ ] (P1) UX-SKIP-001 ダブルタップskip + フィードバック位置
  - Status: DONE
  - SPEC refs: UI追記（ダブルタップ/フィードバック高さ）
  - Next: Expo Goでフィードバック位置の体感確認

### P2 — Polish / Performance
- [ ] (P2) PERF-001 体感の重さ/メモリ/不要レンダ削減（見た目維持）
  - Status: DONE
  - Next: Expo Goでスクロール時の体感確認
  - Verify: FPS/JS frame drops をログ化（可能なら）

---

## Last updated
- 2026-01-19 22:28 (by Codex)
