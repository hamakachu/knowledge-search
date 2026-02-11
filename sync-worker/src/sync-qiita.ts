import { QiitaClient } from './clients/qiitaClient';
import { generateEmbedding } from './clients/geminiClient';
import { upsertDocument } from './db/documentRepository';
import type { DocumentInput } from './db/documentRepository';

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
