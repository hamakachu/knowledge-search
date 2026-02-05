import { QiitaClient } from './clients/qiitaClient';
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
    const documentInput: DocumentInput = {
      id: article.id,
      title: article.title,
      body: article.body,
      url: article.url,
      author: article.user.id,
      source: 'qiita_team',
      created_at: new Date(article.created_at),
      updated_at: new Date(article.updated_at),
    };

    await upsertDocument(documentInput);
  }

  console.log(`Upserted ${articles.length} articles`);
}
