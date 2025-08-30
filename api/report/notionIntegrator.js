import { Client } from '@notionhq/client';

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

// 데이터베이스 접근 테스트
export const testNotionConnection = async () => {
  try {
    const response = await notion.databases.retrieve({
      database_id: process.env.NOTION_DATABASE_ID,
    });
    
    console.log('✅ 노션 연결 성공:', response.title[0].plain_text);
    return true;
  } catch (error) {
    console.error('❌ 노션 연결 실패:', error.message);
    return false;
  }
};


testNotionConnection()