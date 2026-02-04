# Skill Creator - スキル自動生成
## Overview
作業中に発見した汎用的なパターンを、再利用可能なClaude Codeスキルとして保存する。 これにより、同じ作業を繰り返す際の品質と効率が向上する。

## When to Create a Skill
以下の条件を満たす場合、スキル化を検討せよ：

1. 再利用性: 他のプロジェクトでも使えるパターン
2. 複雑性: 単純すぎず、手順や知識が必要なもの
3. 安定性: 頻繁に変わらない手順やルール
4. 価値: スキル化することで明確なメリットがある
## Skill Structure
生成するスキルは以下の構造に従う：
```
skill-name/
├── SKILL.md          # 必須
├── scripts/          # オプション（実行スクリプト）
└── resources/        # オプション（参照ファイル）
```
## SKILL.md Template
```
---
name: {skill_name}
description: {いつこのスキルを使うか、具体的なユースケースを明記}
---

# {Skill Name}

## Overview
{このスキルが何をするか}

## When to Use
{どういう状況で使うか、トリガーとなるキーワードや状況}

## Instructions
{具体的な手順}

## Examples
{入力と出力の例}

## Guidelines
{守るべきルール、注意点}
```

## Creation Process
1. パターンの特定
    - 何が汎用的か
    - どこで再利用できるか
2. スキル名の決定
    - snake_case を使用（例: api_error_handler）
    - 動詞+名詞 or 名詞+名詞
3. description の記述（最重要）
    - Claude がいつこのスキルを使うか判断する材料
    - 具体的なユースケース、ファイルタイプ、アクション動詞を含める
        - 悪い例: "ドキュメント処理スキル"
        - 良い例: "PDFからテーブルを抽出しCSVに変換する。データ分析ワークフローで使用。"
4. Instructions の記述
    - 明確な手順
    - 判断基準
    - エッジケースの対処
5. 保存
    - パス: ~/.claude/skills/{skill_name}/
    - 既存スキルと名前が被らないか確認

## 使用フロー

1. 作業サブエージェントがスキル化候補を発見
2. 管理サブエージェントが最新仕様をリサーチし、スキル設計を行、人間に承認を依頼（dashboard.md経由）
人間が承認
3. 管理サブエージェントがこのskill-creatorを使用してスキルを作成
完了報告

Examples of Good Skills
Example 1: API Response Handler
---
name: api_response_handler
description: REST APIのレスポンス処理パターン。エラーハンドリング、リトライロジック、レスポンス正規化を含む。API統合作業時に使用。
---
Example 2: Meeting Notes Formatter
---
name: meeting_notes_formatter
description: 議事録を標準フォーマットに変換する。参加者、決定事項、アクションアイテムを抽出・整理。会議後のドキュメント作成時に使用。
---
Example 3: Data Validation Rules
---
name: data_validation_rules
description: 入力データのバリデーションパターン集。メール、電話番号、日付、金額などの検証ルール。フォーム処理やデータインポート時に使用。
---
Reporting Format
スキル生成時は以下の形式で報告：

「新たなスキルを作成しました(New skill created!)

スキル名: {name}
用途: {description}
保存先: {path}」