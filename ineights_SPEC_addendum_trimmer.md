# InEights — SPEC追記案（Codex作業用）：Photos風トリマー/8カウントループ

目的：Codexが迷わず実装できるよう、言語化しづらい「ぬるぬる挙動」を **測れる要件**に落とす。

---

## 1) Scope
- 対象：ループ範囲指定UI（トリマー）
- 前提：iOS（Expo + EAS dev build）。必要ならネイティブ（UIKit）を採用。

---

## 2) UX要件（Photosライク）

### 2.1 UI構成
- タイムライン（サムネ列）
- 左右ハンドル（start/end）
- 再生位置バー（playhead）
- ループ範囲のハイライト

### 2.2 操作
- ハンドルドラッグで start/end を変更
- タイムラインタップで playhead 移動（任意）
- ループ再生プレビュー：再生が end に到達したら start に戻る

### 2.3 “ぬるぬる”の定義（測定）
- 操作中にUIがカクつかない：
  - 目標：60fps
  - サムネ生成はメインスレッドで行わない
- ドラッグ中にガタつかない：
  - start/end はドラッグ中は連続値で更新（スナップ/丸めはしない）
  - 指を離した瞬間（onEnd）に量子化（8カウント）して確定

---

## 3) 音楽/8カウント仕様

### 3.1 8カウント→秒
- 入力：BPM（beats per minute）
- 1カウント=1拍と仮定（必要なら 1カウント=1/2拍など設定化）
- 8カウント秒 = 60/BPM * 8

### 3.2 量子化（スナップ）
- quantize(t) = round(t / eightCountSeconds) * eightCountSeconds
- 例外：start/end の最小長、asset範囲内にclamp

---

## 4) 制約（破綻防止）

### 4.1 clamp関数（単一責務）
- start <= end
- minLoopSeconds を満たす
- 0 <= start/end <= assetDuration
- 量子化は onEnd で実施（ドラッグ中は連続）

---

## 5) 実装タスク（Codex向け）

### Task A: iOSプロジェクトの現状把握
- どの画面にトリマーを入れるか
- 既存のプレイヤー/音源同期の有無

### Task B: トリマーUIのPoC
- start/end が取得できる
- ループ再生ができる

### Task C: 8カウント量子化
- BPM設定
- onEndでスナップして確定

### Task D: サムネ生成の非同期化/キャッシュ
- 生成をバックグラウンドへ
- キャッシュ戦略（LRU等）

---

## 6) DoD（完了条件）
- start/end をドラッグで変更できる
- ドラッグ中の更新は連続でジャダーが目立たない
- 指を離した瞬間に8カウントにスナップする
- ループ再生が破綻しない（end→startへ戻る）
- パフォーマンス：タイムライン表示がカクつかない（サムネ生成が原因で止まらない）

---

## 7) 未確定（要判断）
- 8カウントの定義（拍との対応、テンポ変化の扱い）
- スナップタイミング（onEndのみで良いか／停止時ズーム等を入れるか）
- 精密調整ズームを入れるか（VideoTrimmerControl方式など）

---

## 8) （重要）BPM推定の現状A→目標B（Beat Map）への移行SPEC（dance_deck前提）

前提：現状は **A: bpmのみ推定**（beatTimesSec[]なし）想定。将来的に **B: bpm + beatTimesSec[]（Beat Map）**へ持っていき、ループ操作のスナップ品質を上げる。

### 8.1 追加データ契約（Videoごと）
- `bpmAuto` に以下を持たせる（既存SPECと整合）：
  - `bpm: number`
  - `confidence: number`
  - `tempoFamilyCandidates?: number[]`
  - `beatTimesSec?: number[]`  ← **Bのキー（Beat Head配列、秒）**
  - `analyzedAt: string` (ISO)
  - `version: "1"`
- `bpmSource?: "manual" | "auto"`

保存ルール：
- `beatTimesSec` が存在する場合は **それを最優先のスナップ基盤**として使う
- 存在しない場合は **均一グリッド（BPM+phase）**にフォールバック

### 8.2 ループ長（counts/eights）の定義
- countsPerLoop はプリセット：`4 | 8 | 16 | 32`
- UIラベル：
  - 4 → "4 counts"
  - 8 → "1 eight"
  - 16 → "2 eights"
  - 32 → "4 eights"

### 8.3 スナップ優先順位（最重要）
1) `beatTimesSec` が存在する（B）
   - start候補 `tCandidate` を **最寄りのBeat Head**にスナップ
   - endは **インデックスで保証**：
     - `startIndex = nearestBeatIndex(tCandidate)`
     - `endIndex = startIndex + countsPerLoop`
     - `end = beats[endIndex]`
   - これにより「指定カウント数を必ず含む」ことを保証

2) `beatTimesSec` が存在しない（A）
   - `gridSec = 60 / BPM`
   - `phaseSec`（"This is 1" で得たグリッド原点）を使って
     - `snap(t) = phaseSec + round((t - phaseSec)/gridSec)*gridSec`
   - `end = start + countsPerLoop * gridSec`

### 8.4 Snap UX（マグネット挙動）
- 仕様：
  - `snapThresholdSec` 以内なら常に吸着（magnet）
  - それ以外は追従を優先し、**指を離した瞬間（onEnd）にスナップ確定**
- 実装ポリシー（UX優先のため）：
  - ドラッグ中は「連続値」を表示/追従（ジャダー防止）
  - onEndで「確定値（Beat Head / Grid）」へ寄せる

### 8.5 Beat Map生成（Bへの移行タスク）
BPM推定に加えて Beat Map（beatTimesSec[]）を生成・保存する。

#### 入力
- ローカル動画URI

#### 前処理
- 動画→音声抽出（mono, fixed sample rate, PCM/WAV）
- 最初はN秒（例 60〜90s）を解析対象にしてOK

#### 出力（最低限）
- `estimatedBpm`
- `confidence`
- `tempoFamilyCandidates`（BPM, BPM/2, BPM*2 等）
- `beatTimesSec[]`
  - 0〜解析範囲内で、Beat Headの時刻（秒）配列
  - 単調増加、重複なし、範囲外なし

#### 受け入れ条件（DoD）
- beatTimesSec が存在する動画では、
  - ループのstart/end調整がBeat Headに吸着する
  - countsPerLoop を変えても **必ず指定拍数の長さ**を保つ（endIndex計算）
- beatTimesSec が無い動画では、既存のBPM+phase挙動が保持される（非回帰）

### 8.6 JS/Native境界（EAS運用前提）
- iOS先行で品質を出す場合、トリマーUIはネイティブ（UIKit）でも良い。
- ただし **スナップ/固定長保証の最終決定ロジック**はTS側に置く（iOS/Android一致のため）。

推奨イベント設計：
- `onRangeChange(startCandidateSec, endCandidateSec, isDragging)`
- `onRangeCommit(startSec, endSec)` ← commit時はTSで `snapAndFixLength()` を通した値

### 8.7 Codex実装タスク分割（粒度）
1. **データモデル**：bpmAuto に beatTimesSec を追加（optional）＋保存/読み出し確認
2. **解析サービス**：BPM推定に加えて beatTimesSec を生成する処理を追加
3. **正規化**：Tempo Family（×2/½）候補とprior（80–130優先）適用
4. **スナップ関数**：
   - `snapToBeatMap(tCandidate, beatTimesSec, snapThresholdSec)`
   - `snapToGrid(tCandidate, bpm, phaseSec)`
   - `computeLoopEnd(start, countsPerLoop, mode)`（BeatMap優先）
5. **UI統合**：Video Detail（edit mode）に Auto Detect BPM と、½/×2切り替え導線
6. **キャッシュ/フォールバック**：
   - 解析済みは再解析しない
   - 失敗時はTap Tempoへ誘導し、既存機能を壊さない
7. **テスト**：
   - BeatMapあり/なしでのスナップ非回帰
   - countsPerLoop保証（endIndex）
