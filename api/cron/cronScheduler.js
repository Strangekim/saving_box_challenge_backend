import cron from 'node-cron';
import { syncAllBuckets } from './bucketSyncJob.js';

// ============== 크론 스케줄러 설정 ==============
export const setupCronJobs = () => {
  
  // 매일 오전 8시에 실행 (한국시간)
  cron.schedule('0 8 * * *', async () => {
    const timestamp = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    console.log(`[${timestamp}] Daily bucket sync started`);
    
    try {
      await syncAllBuckets();

    //  동기화 완료 후 AI 리포트 생성
    console.log('AI 리포트 생성 시작...');
    const response = await fetch('http://localhost:3000/report/generate-ai-report', {
      method: 'POST'
    });
    
    if (response.ok) {
      console.log('✅ AI 리포트 생성 완료');
    } else {
      console.error('AI 리포트 생성 실패:', response.status);
    }
    } catch (error) {
      console.error('Daily sync cron failed:', error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Seoul"
  });
  
  
  const nextRun = new Date();
  nextRun.setDate(nextRun.getDate() + 1);
  nextRun.setHours(8, 0, 0, 0);
  
  console.log('Cron jobs scheduled successfully');
  console.log(`Next daily sync: ${nextRun.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
};