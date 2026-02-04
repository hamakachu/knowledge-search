import { QiitaClient } from './clients/qiitaClient';

export async function syncQiitaTeam(): Promise<void> {
  const qiitaClient = new QiitaClient(process.env.QIITA_TEAM_TOKEN!);

  // TODO: Implement sync logic
  console.log('Fetching articles from Qiita Team...');

  const articles = await qiitaClient.fetchArticles();
  console.log(`Fetched ${articles.length} articles`);

  // TODO: Upsert to database
  console.log('Syncing to database...');
}
