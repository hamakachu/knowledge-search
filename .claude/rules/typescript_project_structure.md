# TypeScriptプロジェクト構造ルール

## テストファイルの配置

**原則**: テストファイルは必ず `src/__tests__/` ディレクトリ配下に配置する

**理由**:
- TypeScriptの `rootDir` と整合性が取れる
- プロダクションコードとテストコードが同じディレクトリツリー内に存在
- ビルド時の扱いが明確になる

**良い例**:
```
backend/
├── src/
│   ├── __tests__/        ✅ テストはsrc配下
│   │   └── search.test.ts
│   └── services/
│       └── searchService.ts
```

**悪い例**:
```
backend/
├── __tests__/            ❌ src外にテストを配置
│   └── search.test.ts
└── src/
    └── services/
        └── searchService.ts
```

---

## 未使用変数の扱い

**原則**: 「その場しのぎ」の修正は避け、根本原因を解決する

**NG例（その場しのぎ）**:
```typescript
// 使わない変数に _ プレフィックスを付けるだけ
import { _dbClient } from './db/client';  // ❌

export async function searchDocuments(query: string) {
  // dbClientを使わないのにimportしている
  return [];
}
```

**OK例（根本解決）**:
```typescript
// 必要になるまでimportしない
export async function searchDocuments(query: string) {
  // TODO: データベース実装時に dbClient をimport
  console.log('Search query:', query);
  return [];
}
```

**原則**:
1. 実装が未完成の場合、使わない変数はimportしない
2. 実装時に必要になったタイミングでimportする
3. `_` プレフィックスは、Expressのコールバック等で慣習的に使われる場合のみ使用
   - 例: `app.get('/health', (_req, res) => { ... })`

---

## 根本原因解決の実例

### 問題: TypeScript型チェックエラー「テストファイルがrootDirの外にある」

**その場しのぎ（NG）**:
```json
// tsconfig.jsonから rootDir を削除するだけ
{
  "compilerOptions": {
    // "rootDir": "./src"  削除
  }
}
```

**根本解決（OK）**:
```bash
# テストファイルの配置場所を修正
__tests__/ → src/__tests__/

# これにより、TypeScriptのベストプラクティスに準拠
```
