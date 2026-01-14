SPEC.md
Dance Deck

Beat-Synced Loop Player & Video Deck for Dancers

追加仕様5: App Store申請・課金（RevenueCat前提） v1
0. 用語（UI/機能パーツの呼称を固定）

Free: 無料で使える範囲（InEightsの“基本”）

Pro: 課金で解放される範囲（RevenueCat entitlement により制御）

Paywall: Pro機能を触ろうとしたときに表示する購入画面（RevenueCat UI / 自前UIどちらでも可）

Entitlement: RevenueCatの権限名。アプリはこれだけを信頼して機能の有効/無効を切り替える

Bookmark: ループ区間・BPM等を保存する“Loop Bookmark”（既存のブックマーク機能）

BPM Auto Detect: 音源解析でBPMを自動推定する機能（初版では未実装、将来Pro）

1. 課金方針（初版）

初版は 無料アプリとして公開し、アプリ内課金でProを提供する。

Proの対象（有料化する機能）

Loop Bookmarks（新規作成）

BPM自動判定（BPM Auto Detect） ※初版は「Pro対象だが未実装」

無料で提供する機能（例：InEightsのコア）

手動BPM測定（Tap Tempo）

8-count / eights 単位のループ操作（ループ窓、スナップ、長さボタン等）

ローカル動画インポート、再生、ミラー、速度変更、タグ/メモ等（ただしBookmark新規作成はPro）

注: App Store上の「無料で後から有料化」は一般に可能。ただし デジタル機能の解放はIAPを使う必要がある（ガイドラインのIn-App Purchase/サブスク規定に従う）。

2. 価格とトライアル

価格: 250円

トライアル: 7日間無料

RevenueCat前提の実装上の整理

「7日無料」を実現するには、通常 “自動更新サブスク + 無料トライアル（intro offer）” を使う（＝買い切りIAPには“無料トライアル”概念が基本ないため）。

よって、Proは Auto-Renewable Subscription（例: monthly ¥250, 7-day free trial） を前提として設計する。

値上げ/値下げ:

App Store Connect上で価格は後から変更可能（IAP/サブスクともに変更フローは存在）。

※サブスクの価格変更はユーザー同意など条件が絡む場合があるので、値上げ運用は別途「価格変更ポリシー」節で扱う（初版では価格変更は行わない前提でもOK）。

3. トライアル後のデータ保持ルール（重要）

トライアル期間中に作成したBookmarkは、トライアル終了後も“閲覧・再生適用”は可能（ユーザー資産として保持）。

ただし トライアル終了後に未課金の場合

Bookmarkの新規作成・編集・削除は不可（Pro誘導）

既存Bookmarkの**適用（再生開始/ループ範囲へジャンプ）**は可（※ここを不可にするかは要相談。不可にすると体験が悪く解約誘発しやすい）

課金後（Pro有効）

Bookmarkの新規作成/編集/削除が解放

BPM Auto Detect（将来実装）が解放

4. UI上の課金導線（落ちないための要件）

Pro機能を触った瞬間にハードブロックしない。基本は “触ろうとした瞬間にPaywall”。

Paywall表示トリガ例（最低限）

Bookmarkの「追加/保存」押下時に ProでなければPaywall

BPM Auto Detect の開始ボタン押下時に ProでなければPaywall（初版は“Coming soon (Pro)”でも可）

Paywallには最低限以下を表示

価格（¥250）と期間（例：月額）/ 7日無料

「いつでもキャンセル可能」

復元（Restore purchases）

利用規約/プライバシーポリシー導線（URL）

5. Data & Privacy（App Privacy対応）

App Storeでは アプリのプライバシー情報（収集データ種別・追跡有無など）を App Store Connect に入力する必要がある。

初版は「やみくも改善」を避け、導線のどこで落ちているかを計測可能にする

例: paywall_shown, trial_started, trial_converted, trial_canceled, bookmark_create_attempted 等

ただし、計測導入は App Privacy申告と整合させる（収集するなら何を収集して何に使うかを明示）。

6. 初版スコープ（明確化）

初版（App Store申請まで）で必ずやる

RevenueCat導入（サブスク + 7日無料 + entitlement）

Pro gating（Bookmark新規作成の制御、Restore、Paywall）

App Privacy申告に必要な情報の整理

初版ではやらない（次版）

BPM Auto Detect の実装（ただし“Pro対象”として仕様だけ確定）

価格変更運用（値上げ/値下げ運用ルール）

追加仕様4：Video Detail UI – Overlay / Timeline / Bookmark Refinements
1. Overlay 表示時の不要要素の削除
1.1 動画タイトル表示

削除対象
動画画面をタップした際に表示される
左上の下矢印アイコン横の動画タイトル表示

理由

再生中に動画名を確認する必要性が低い

Overlay の視覚ノイズを減らす

決定
Overlay 上に動画タイトルは一切表示しない

2. 再生速度 / Mirror の表示ルール統一
2.1 表示条件

表示するのは Overlay 表示時のみ

動画画面をタップする前（通常再生時）には
再生速度・Mirror の UI は表示しない

2.2 配置

Overlay ツールバー内に集約する

Overlay 非表示時は完全に非表示

3. Overlay ツールバーの並び順（確定）

動画画面タップ時に表示される Overlay Toolbar の左→右順は以下で固定する：

Playback Speed

Mirror

Loop ON / OFF

※ Loop ON は独立バッジではなく、Overlay 内の操作アイコンとして扱う

4. Timeline / Loop 操作精度
4.1 ループ範囲移動の粒度

1秒単位の移動は禁止

理由：

ダンサーは「ビートのワン」を正確に掴む必要がある

1秒単位では粗すぎ、実用に耐えない

4.2 要件

Timeline 上のループ範囲移動は
より細かい単位（サブ秒）で連続的に操作可能であること

※ サンプル単位である必要はないが、「感覚的に細かく動く」ことが必須

4.3 表示について

Timeline 右上の時間表記（例: 0:00 – 0:17）は
現状のままで変更不要

5. Loop Bookmark のサムネイル仕様
5.1 サムネイル画像

再生開始ポイント（ループ start）のフレームを使用すること

ループ中央・終了点のサムネイルは禁止

5.2 不要 UI の削除

Loop Bookmark サムネイル右下に表示されている
保存マーク（保存済みアイコン）は削除

理由：

Bookmark は「存在している＝保存済み」であり、状態表示は冗長

6. ダブルタップスキップ時のアニメーション位置
6.1 現状

ダブルタップ時の「+5s」アニメーションが
画面内でやや不自然な位置に表示される

6.2 変更

Overlay 表示時に左右ダブルタップした場合：

+5s / −5s のアニメーション表示位置を、再生マーク（Play/Pause）と同じ高さに揃える

画面上部に寄せすぎない

7. テキストヘッダーの完全撤廃
7.1 削除対象

以下の Text コンポーネントによるセクションヘッダーはすべて削除する：

"Timeline"

"Metadata"

"Loop Bookmarks"

7.2 代替手段（必要な場合のみ）

視覚的区切りが必要な場合は、以下の Divider を使用：

height: 0.5
backgroundColor: '#333'


テキストによるラベル付けは禁止

UI の形状・配置・挙動で意味を伝える

8. 設計意図（Codex向け補足・重要）

本画面は「設定画面」ではなく 練習中に何度も触る操作画面

情報は 必要になった瞬間にだけ現れる

表示されている UI はすべて「押せる／操作できる」ものとする
→ 状態表示に見える UI を作らない



以上追加仕様4

追加仕様3：Video Player UI / Loop UX Improvements（Dance-Focused）
0. 用語定義（重要・Codexは必ず参照）

Video Surface
動画そのものが表示される領域。ジェスチャ（タップ／ダブルタップ）の入力対象。

Overlay Controls
Video Surface 上に一時的に表示される操作UI（Play/Pause 等）。非操作時は非表示が原則。

Persistent Controls
Overlay が消えても常に表示される操作（Mirror / Speed など）。

Timeline
動画サムネイルが横方向に連結された編集用タイムライン。
iOS 写真アプリの動画編集画面と同一のメンタルモデルを前提とする。

Loop Window
Timeline 上に表示される黄色の矩形フレーム。
ループ範囲（start–end）を示す。

Loop Handles
Loop Window の左右端（長さ変更）および中央（位置移動）。

Loop Controls
Loop On/Off、Loop Length（counts/eights）など、ループ挙動を制御する UI 群。

1. UX 設計の上位原則（最重要）

本アプリは ストリートダンサーの反復練習を主用途とするため、
以下を UI 実装の最優先原則とする。

認知負荷ゼロ
→ 見ただけで「押せる／動かせる」が分かる

操作手数の最小化
→ ボタン探索を不要にし、ジェスチャ中心

メンタルモデルの流用
→ YouTube / Instagram / iOS 写真アプリと同じ操作感

映像の遮蔽最小化（Occlusion Avoidance）
→ 振付確認を UI が邪魔しない

2. Video Surface / Overlay Controls
2.1 Skip（±5s）
項目	内容
Current	画面左右に回転矢印アイコンを配置
Proposed	アイコンを完全に廃止し、ダブルタップジェスチャに変更
Behavior	右側ダブルタップ → +5s（将来的に +1 eight 可）
左側ダブルタップ → −5s
Feedback	タップ位置に波紋（Ripple）＋「+5s / −5s」テキストを一瞬表示
Rationale	YouTube / Instagram で確立されたメンタルモデル。「探さずに叩く」
2.2 Play / Pause

| Current | 中央に常駐 |
| Proposed | 操作時のみ表示。再生中は自動フェードアウト |
| Rationale | iOS 写真 / YouTube：振付の視認性を最優先 |

2.3 Mirror / Speed

| Current | 動画下部に配置 |
| Proposed | 配置は維持。ただし視認性を強化（影・コントラスト） |
| Rule | Overlay が消える時の扱いを統一：<br>① 常時表示 もしくは ② タップで再表示 |
| Rationale | TikTok / Instagram：頻繁に使う調整系は即アクセス可能 |

3. Progress Bar（再生位置）

| Current | 細い線＋赤ドット |
| Proposed | 見た目は細く、タップ判定は太く |
| Implementation Note | hitSlop / invisible padding を使用 |
| Rationale | iOS Music / YouTube：汗ばんだ手でも誤操作しない |

4. Loop & Timeline（中核）
4.1 Timeline Visual

Timeline は 動画サムネイルの連結ストリップで構成する

iOS 写真アプリの動画編集 UI を そのままメンタルモデルとして採用

4.2 Loop Window（黄色枠）

| Current | iOS風黄色枠 |
| Decision | 現状維持（非常に良い） |
| Clarification | 中央ドラッグ：長さ固定で位置移動<br>左右ドラッグ：長さ変更 |
| Rationale | iOS 写真アプリ準拠で学習コスト最小 |

4.3 Loop On / Off

| Current | 黒い「Loop On」バッジ |
| Proposed | トグル化、または Timeline 左端にリピートアイコンとして統合 |
| Rationale | ステータス表示に見える問題を解消。iOS Music の Repeat アイコン準拠 |

4.4 Loop Length（counts / eights）

| Current | 白いピル型ボタン |
| Proposed | Timeline 直上に配置し、タップ即反映 |
| Animation | 押下時、Loop Window がその長さにリサイズされる |
| Rationale | CapCut / Video Leap：操作対象と設定は近接配置 |

5. Loop Length 表記ルール（ダンス文化準拠）
用語調査結果（結論）

アメリカのストリートダンス／ヒップホップ現場でも
8 counts = “one eight”
16 counts = “two eights”
という表現は 一般的に使用される

特に choreographer / rehearsal 文脈で定着

表記ルール
Length	Label
≤4 counts	“4 counts”
8 counts	“1 eight”
16 counts	“2 eights”
32 counts	“4 eights”
6. Loop Bookmarks

| Current | サムネイル + BPM + Length |
| Proposed | Length のみ表示（eights/counts） |
| Rationale | ダンスミュージックは原則 BPM 一定。冗長情報を排除 |

7. 情報階層（最終）
通常時（Overlay 非表示）
[ Video Surface ]
[ Loop Bookmarks ]
[ Metadata (Tags, Memo) ]

動画タップ時（編集モード）
[ Video Surface ]
[ Loop Controls ]
[ Timeline + Loop Window ]
[ Loop Bookmarks ]
[ Metadata ]

以上追加仕様3

追加仕様2：Loop / Timeline UI & Interaction
用語定義（重要・Codex厳守）

Video View
動画が再生されるメイン領域（フル幅、アスペクト比維持）

Overlay Controls
Video View 上に重ねて表示される再生UI（再生/停止など）

Timeline
動画の時間軸を示すUI。
動画サムネイル（フレーム画像）が横に連続した見た目で構成される。

Loop Frame（Loop Range）
Timeline 上に表示される 黄色い矩形の囲い。
ループ再生される範囲を示す。

Loop Controls
Loop ON/OFF ボタン、および Loop Length（長さ）選択ボタン群。

Loop Bookmarks
保存されたループの一覧。
Home の Library Tile と同一デザインのタイルUIを用いる。

Metadata
タグ、メモ等の動画付随情報。

Timeline の見た目仕様

Timeline は iOS標準の写真アプリで動画編集を開いた時のUIと同等の視覚構造を持つこと。

動画フレーム（サムネイル）が横方向に連続した帯状UI

フレームは「単色バー」ではなく 動画サムネイルの接続であること。

Loop Frame（黄色い囲い）の仕様

Loop Frame は Timeline 内のサムネイル帯をちょうど囲う高さ・位置を持つこと。

Loop Frame の横幅は 選択された Loop Length に正確に対応すること。

Loop Frame は以下の操作を持つ：

左右ハンドルによる開始・終了位置の調整

フレーム全体のドラッグによる横移動（長さは保持）

表示条件（非常に重要）

Loop Controls および Timeline は常時表示しない

通常状態（動画未タップ時）

表示順：

Video View

Loop Bookmarks

Metadata

👉 Video View の直下に Loop / Timeline は存在しない

動画タップ時（操作モード）

動画をタップすると Overlay Controls が表示される

同時に Loop Controls + Timeline が表示される

表示順：

Video View

Loop Controls

Timeline

Loop Bookmarks

Metadata

再度 Video View をタップすると：

Overlay Controls

Loop Controls

Timeline
がすべて非表示になり、通常状態に戻る

Loop Bookmarks の表示内容

Loop Bookmark タイルには以下を表示する：

動画サムネイル

ループ長（例：2 eights）

BPM 表示は行わない

理由：本アプリは BPMが曲全体で一定なダンスミュージックを前提とするため

Loop Length 表記仕様（国際対応）

Loop Length は counts ではなく eights 単位で表記する。

実際の長さ	表示
4 counts	4 counts
8 counts	1 eight
16 counts	2 eights
32 counts	4 eights

8 counts 以上は eights 表記を優先

4 counts 以下は従来通り counts 表記で可

Codex向けの補足（意図）

本仕様は ダンス現場（日本／US）の実用語彙を優先している

見た目・操作は iOS ネイティブの成功事例を明示的に模倣する

Loop / Timeline は「編集モード的UI」であり、常駐UIではない

ここまで追加仕様2

追加仕様：Video Detail（再生・Loop編集画面）UI/UX 再設計

本アプリの Video Detail 画面は、
**「ループ練習に最適化された再生・範囲指定体験」**を最優先目的として設計する。

以下の仕様は 既存機能の整理・再配置であり、新機能追加ではない。

1. 情報設計（Information Architecture）
画面構成（上 → 下）

Video View（動画表示領域）

通常時は UI 非表示

画面タップで操作 UI をオーバーレイ表示

Playback / Loop 操作レイヤ

再生・ループに関する操作のみを集約

BPM や詳細設定は常時表示しない

Loop Length Selector

4 / 8 / 16 / 32 counts

ループ長を即時決定するための主要操作

Unified Timeline（統合タイムライン）

再生位置 + ループ範囲を 1本のタイムラインで表現

Loop Bookmarks

Home の Library タイルと同一ビジュアル

ループ保存のための操作単位

Metadata

タグ

メモ（autosave）

2. 操作系（Interaction Design）
2.1 再生・Loop操作の基本方針

Loop は単一トグル

ON / OFF のみ

Smart Loop / BPM Tap ボタンは常設しない

BPM 設定・Tap 操作は 必要時のみ表示される補助 UIとする

2.2 Loop Length Selector（counts）

4 / 8 / 16 / 32 counts ボタンを押すと：

現在の再生位置（または loopStart）を基準に

BPM に基づいて ループ範囲を一発決定

決定後も：

ループ範囲は手動で微調整可能（スナップ解除）

2.3 Unified Timeline（最重要）
構造（iOS 標準トリム UI を模倣）

1本の横長タイムライン

要素：

中央のプレイヘッド（再生位置）

黄色のループ範囲フレーム

左ハンドル：loopStart

右ハンドル：loopEnd

操作

左ハンドルドラッグ：開始位置変更

右ハンドルドラッグ：終了位置変更

フレーム内部ドラッグ：

ループ長を維持したまま横移動

タイムラインタップ／ドラッグ：

再生位置のみ変更（ループ範囲とは干渉しない）

誤操作防止ルール

再生位置操作とループ操作は タッチ領域を分離

最小／最大ループ長を設定

ループ操作中は視覚的に強調表示

3. 見た目（Visual Design）
デザイン原則

iOS 標準動画トリム UI を強く参照

学習コスト最小

美的品質を既存 OS に委ねる

新規独自 UI は極力作らない

具体指針

統合タイムライン：

フレーム・ハンドル・色味は iOS トリム風

Loop Bookmarks：

Home Library タイルと完全に同一コンポーネント

不要な常設 UI を排除し、触った時だけ現れる UIを基本とする

4. 実装に関する注意（Codex向け）

本仕様は UI再設計であり、データ構造変更を伴わない

既存の：

loopStart / loopEnd

BPM / counts

Bookmark 機能
を再配置・再接続すること

実装判断で迷う場合は：

推測で進めず

本 SPEC に不足があれば SPEC.md 更新 PR を作成すること

追加仕様は以上

1. 概要
1.1. コンセプト

本アプリ「Dance Deck」は、ストリートダンサーが日々直面する 動画管理の煩雑さ を解消し、
8カウント文化に最適化された練習体験 を提供するアプリである。

自身の練習動画や、スマホローカルに保存した MV / お手本動画を 一元管理 し、
ビート同期した固定長ループ を最小操作で作成・再生できることに価値を集中させる。

SNS動画の取得・DL・リンク管理は行わない

ダンサーが既にローカルに持っている動画を前提とする

「探す」手間をなくし、「踊る」時間を最大化する

1.2. ターゲットユーザー

プライマリ

初心者〜中級者のストリートダンサー

セカンダリ

K-POP / TikTokダンスの完コピ練習者

ダンスインストラクター（振り落とし・教材準備）

2. 開発方針
2.1. 開発フェーズ

フェーズ1
「統合された動画管理」＋「固定長ループを核とした練習体験」に集中

フェーズ2
比較再生（2画面）などの高度機能を追加（本仕様書では扱わない）

2.2. 対応プラットフォーム

iOS

Android

2.3. 技術スタック

Expo（React Native）

EAS / Dev Client 前提

ローカル動画再生のみ対応

サーバー不要（完全ローカル）

3. 機能仕様（フェーズ1）
3.1. 動画管理
3.1.1. ホーム画面（動画ライブラリ）

UIコンセプト

Instagram プロフィール画面に準拠した タイル形式グリッド

文字情報を極力排除し、サムネイルを主役とする

表示要素

動画サムネイルのみ

タイトル・タグ・メモ等は表示しない

操作

タイルタップ → 動画詳細画面へ遷移

スクロールで全動画を俯瞰可能

3.1.2. 動画の取り込み

対応ソース

端末ローカル動画のみ

取り込み方法

デバイスストレージをブラウズ

ユーザーが動画を選択

内部的な扱い

アプリ管理領域にコピー、または参照パス保持（実装都合で決定）

3.1.3. 検索機能

タグによる検索

AND / OR 条件指定

ホーム画面上部に検索UIを配置

3.2. 動画詳細画面（最重要画面）
3.2.1. 全体レイアウト（縦持ち）
┌──────────────┐
│  Video Player │
│ (loop / beat) │
├──────────────┤
│ Loop Bookmarks│  ← タイル
├──────────────┤
│ Tags           │
├──────────────┤
│ Memo           │
└──────────────┘


※ 横持ち時は動画を全面表示し、操作UIはYouTube同様オーバーレイ表示

3.2.2. 動画再生UI

再生 / 一時停止

シークバー

再生速度切替（0.25 / 0.5 / 0.75 / 1.0）

ミラー（左右反転）

UI方針

操作UIは 動画タップで表示

YouTube の操作感を参考に、クリーンで直感的に

3.3. 高度な練習ツール（コア機能）
3.3.1. 基本思想

非破壊編集

元動画は一切変更しない

すべて設定データとして保存

3.3.2. BPM設定

方法

Tap Tempo

± ボタンによる微調整

仕様

BPMは動画ごとに保持

Phase1では自動解析は行わない

3.3.3. 位相（ビート開始点）設定

再生中に「ここが1」ボタンをタップ

現在の再生位置をビートグリッド原点として記録

3.3.4. 固定長ループ

ループ長プリセット（拍数）

4カウント

8カウント（1エイト）

2エイト（16拍）

4エイト（32拍）

3.3.5. ループ窓スライドUX（差別化ポイント）

コンセプト

ループ長は固定

位置のみを横スライド

常にビートにスナップ

UI

プログレスバー上に

再生ヘッド

固定幅のループ窓

指で左右にドラッグ可能

挙動

指を離した位置は最寄りのビートに吸着

ループ開始・終了は自動計算

3.3.6. ループ再生挙動

再生位置 ≥ loopEnd − epsilon
→ loopStart に自動シーク

epsilon は端末差吸収用（例：0.05秒）

3.4. ループ・ブックマーク
3.4.1. 定義

「この動画の、このループ設定」 を保存する機能。

保存内容：

BPM

位相

ループ長（拍数）

ループ開始位置

3.4.2. ブックマークUI

動画詳細画面内

動画直下にタイル状で表示

ホーム画面の動画タイルと同一デザイン

操作

タイルタップ → 即ループ再生

複数保存可能

想定ユースケース

MV内の複数パート練習

振り落とし用の複数区間

レッスン準備

3.5. メタデータ管理
タグ

自由入力

入力補完あり

メモ

自由テキスト

練習メモ・注意点などを記録

4. データ保存方針

完全ローカル保存

外部サーバー不使用

保存対象：

動画参照

BPM / 位相 / ループ設定

ループブックマーク

タグ / メモ

5. 明示的にやらないこと（Phase1）

SNS連携

URL取り込み

撮影機能

オーバーレイ / 比較再生

クラウド同期

アカウント登録

6. UX成功条件

動画選択から 即ループに入れる

ダンサーが説明を読まずに使える

「このループ体験だけで入れる価値がある」と感じる

7. Phase2（参考）

BPM自動解析

比較再生

撮影補助
