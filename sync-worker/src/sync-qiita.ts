import { QiitaClient } from './clients/qiitaClient';
import { generateEmbedding } from './clients/geminiClient';
import { upsertDocument, batchUpsertDocuments } from './db/documentRepository';
import type { DocumentInput } from './db/documentRepository';

/**
 * 同期結果の型
 */
export interface SyncResult {
  /** 同期が成功したかどうか */
  success: boolean;
  /** 同期されたドキュメント数 */
  syncedCount: number;
  /** 失敗したドキュメント数 */
  failedCount: number;
  /** エラーメッセージの配列（エンベディング生成失敗など） */
  errors: string[];
}

export async function syncQiitaTeam(): Promise<void> {
  const qiitaClient = new QiitaClient(process.env.QIITA_TEAM_TOKEN!);

  console.log('Fetching articles from Qiita Team...');

  const articles = await qiitaClient.fetchArticles();
  console.log(`Fetched ${articles.length} articles`);

  // QiitaArticle[] → DocumentInput[] への変換
  console.log('Syncing to database...');

  for (const article of articles) {
    // エンベディングを生成する（失敗しても記事同期は継続）
    let embedding: number[] | undefined;
    try {
      // タイトルと本文を結合してエンベディング生成のテキストとする
      const textForEmbedding = `${article.title}\n${article.body}`;
      embedding = await generateEmbedding(textForEmbedding);
    } catch (error) {
      // エンベディング生成に失敗した場合はログを出力してembeddingなしで続行
      console.error(
        `エンベディング生成に失敗しました (記事ID: ${article.id}):`,
        error instanceof Error ? error.message : error
      );
    }

    const documentInput: DocumentInput = {
      id: article.id,
      title: article.title,
      body: article.body,
      url: article.url,
      author: article.user.id,
      source: 'qiita_team',
      created_at: new Date(article.created_at),
      updated_at: new Date(article.updated_at),
      embedding,
    };

    await upsertDocument(documentInput);
  }

  console.log(`Upserted ${articles.length} articles`);
}

/**
 * Qiita Team記事をトランザクションで一括同期する
 * すべての記事を取得し、エンベディングを生成した後、一括でDBにupsertする。
 * エンベディング生成に失敗した記事もembeddingなしで同期を継続する。
 * @returns 同期結果
 */
export async function syncQiitaTeamWithTransaction(): Promise<SyncResult> {
  const qiitaClient = new QiitaClient(process.env.QIITA_TEAM_TOKEN!);
  const errors: string[] = [];

  console.log('[Transaction] Fetching articles from Qiita Team...');

  const articles = await qiitaClient.fetchArticles();
  console.log(`[Transaction] Fetched ${articles.length} articles`);

  // 先にすべての記事のエンベディングを生成する
  console.log('[Transaction] Generating embeddings...');
  const documentsWithEmbeddings: DocumentInput[] = [];

  for (const article of articles) {
    let embedding: number[] | undefined;
    try {
      const textForEmbedding = `${article.title}\n${article.body}`;
      embedding = await generateEmbedding(textForEmbedding);
    } catch (error) {
      const errorMessage = `エンベディング生成に失敗しました (記事ID: ${article.id}): ${error instanceof Error ? error.message : error}`;
      console.error(errorMessage);
      errors.push(errorMessage);
    }

    const documentInput: DocumentInput = {
      id: article.id,
      title: article.title,
      body: article.body,
      url: article.url,
      author: article.user.id,
      source: 'qiita_team',
      created_at: new Date(article.created_at),
      updated_at: new Date(article.updated_at),
      embedding,
    };

    documentsWithEmbeddings.push(documentInput);
  }

  // トランザクションで一括upsert
  console.log('[Transaction] Batch upserting to database...');
  const batchResult = await batchUpsertDocuments(documentsWithEmbeddings);

  if (batchResult.success) {
    console.log(`[Transaction] Successfully upserted ${batchResult.insertedCount} articles`);
  } else {
    console.error(`[Transaction] Batch upsert failed: ${batchResult.error}`);
    errors.push(`バッチupsert失敗: ${batchResult.error}`);
  }

  return {
    success: batchResult.success,
    syncedCount: batchResult.insertedCount,
    failedCount: batchResult.failedCount,
    errors,
  };
}
