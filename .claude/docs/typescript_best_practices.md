# TypeScript 開発ベストプラクティス

## 型の使用

### 明示的な型宣言
```typescript
// Good
const name: string = "John";
function add(a: number, b: number): number {
  return a + b;
}

// Avoid
const name = "John"; // 推論に頼りすぎない重要な箇所では明示
```

### `any` 型の回避
```typescript
// Bad
function process(data: any) { }

// Good
function process(data: unknown) {
  if (typeof data === 'string') {
    // 型ガードで安全に処理
  }
}
```

### `strict` モードの有効化
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

## 非同期処理

### async/await の活用
```typescript
// Good
async function fetchData(): Promise<Data> {
  try {
    const response = await fetch('/api/data');
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch:', error);
    throw error;
  }
}

// Avoid
function fetchData() {
  return fetch('/api/data')
    .then(response => response.json())
    .catch(error => console.error(error));
}
```

### Promise の適切な型付け
```typescript
const promise: Promise<string> = new Promise((resolve) => {
  resolve("result");
});
```

## エラーハンドリング

### カスタムエラー型
```typescript
class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
```

### 型安全なエラー処理
```typescript
function handleError(error: unknown): void {
  if (error instanceof ApiError) {
    console.error(`API Error: ${error.message} (${error.statusCode})`);
  } else if (error instanceof Error) {
    console.error(`Error: ${error.message}`);
  } else {
    console.error('Unknown error:', error);
  }
}
```

## コード構成

### インターフェースと型エイリアス
```typescript
// インターフェース: 拡張可能なオブジェクト型
interface User {
  id: string;
  name: string;
}

// 型エイリアス: ユニオン型や複雑な型
type Status = 'active' | 'inactive' | 'pending';
type Result<T> = { success: true; data: T } | { success: false; error: string };
```

### readonly と const assertions
```typescript
interface Config {
  readonly apiUrl: string;
  readonly timeout: number;
}

const CONSTANTS = {
  MAX_RETRIES: 3,
  TIMEOUT: 5000,
} as const;
```

## 関数とメソッド

### 関数のシグネチャ
```typescript
// 明確な引数と戻り値の型
function transform(
  input: string,
  options?: { uppercase?: boolean }
): string {
  return options?.uppercase ? input.toUpperCase() : input;
}
```

### ジェネリクス
```typescript
function identity<T>(value: T): T {
  return value;
}

function map<T, U>(array: T[], fn: (item: T) => U): U[] {
  return array.map(fn);
}
```

## null/undefined の扱い

### Optional Chaining と Nullish Coalescing
```typescript
// Optional Chaining
const userName = user?.profile?.name;

// Nullish Coalescing
const displayName = userName ?? 'Guest';
```

### Non-null assertion は慎重に
```typescript
// 確実な場合のみ使用
const element = document.getElementById('app')!;

// より安全
const element = document.getElementById('app');
if (element) {
  // 処理
}
```

## モジュールとインポート

### 名前付きエクスポート優先
```typescript
// Good
export function helper() { }
export const CONSTANT = 42;

// Default export は控えめに
export default class MainClass { }
```

### パスエイリアス
```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

## その他のベストプラクティス

- **ユーティリティ型を活用**: `Partial<T>`, `Pick<T, K>`, `Omit<T, K>`, `Record<K, V>` など
- **型ガードの使用**: `typeof`, `instanceof`, カスタム型ガード
- **列挙型**: 定数のグループには `enum` または `const` オブジェクト
- **コメントよりコード**: 自己文書化されたコードを書く
- **小さな関数**: 単一責任の原則に従う
- **テスト**: 型だけでなく、実行時の動作もテストする
