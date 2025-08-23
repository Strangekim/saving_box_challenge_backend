import { 
  getActiveBuckets, 
  syncSingleBucket 
} from './syncService.js';

// ============== 유틸리티 함수 ==============
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const formatDuration = (ms) => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
};


// ============== 메인 동기화 작업 ==============
export const syncAllBuckets = async () => {
  const startTime = Date.now();
  const timestamp = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  
  console.log(`🔄 [${timestamp}] Starting bucket synchronization...`);
  
  let totalBuckets = 0;
  let successCount = 0;
  let failCount = 0;
  let actionCounts = {
    UPDATED_PAYMENTS: 0,
    MARKED_AS_SUCCESS: 0,
    MARKED_AS_FAILED: 0,
    NO_CHANGES: 0
  };
  
  try {
    // 1. 활성 적금통 조회
    const activeBuckets = await getActiveBuckets();
    totalBuckets = activeBuckets.length;
    
    console.log(`📊 Found ${totalBuckets} active buckets to sync`);
    
    if (totalBuckets === 0) {
      console.log('✅ No active buckets to sync');
      return;
    }
    
    // 2. 배치 처리 설정
    const BATCH_SIZE = 3;
    const BATCH_DELAY = 500; // 500ms
    
    // 3. 배치별 처리
    for (let i = 0; i < activeBuckets.length; i += BATCH_SIZE) {
      const batch = activeBuckets.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(activeBuckets.length / BATCH_SIZE);
      
      console.log(`🔄 Processing batch ${batchNumber}/${totalBatches} (${batch.length} buckets)`);
      
      // 배치 내 병렬 처리
      const batchPromises = batch.map(bucket => syncSingleBucket(bucket));
      const batchResults = await Promise.allSettled(batchPromises);
      
      // 결과 집계
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          const syncResult = result.value;
          
          if (syncResult.success) {
            successCount++;
            actionCounts[syncResult.action] = (actionCounts[syncResult.action] || 0) + 1;
            
            // 상세 로그 출력
            if (syncResult.action === 'UPDATED_PAYMENTS') {
              console.log(`  ✅ Bucket ${syncResult.bucketId}: ${syncResult.changes.success}, ${syncResult.changes.fail}`);
            } else if (syncResult.action === 'MARKED_AS_SUCCESS') {
              console.log(`  🎉 Bucket ${syncResult.bucketId}: COMPLETED (${syncResult.reason})`);
            } else if (syncResult.action === 'MARKED_AS_FAILED') {
              console.log(`  ❌ Bucket ${syncResult.bucketId}: FAILED (${syncResult.reason})`);
            }
          } else {
            failCount++;
            console.log(`  ❌ Bucket ${syncResult.bucketId}: ERROR - ${syncResult.error}`);
          }
        } else {
          failCount++;
          console.log(`  💥 Batch processing error:`, result.reason);
        }
      }
      
      // 배치 간 대기 (마지막 배치 제외)
      if (i + BATCH_SIZE < activeBuckets.length) {
        await sleep(BATCH_DELAY);
      }
    }
    
  } catch (error) {
    console.error('💥 Critical sync job error:', error);
    
  } finally {
    const duration = Date.now() - startTime;
    const endTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    
    console.log('\n📈 === Sync Results Summary ===');
    console.log(`🕐 Started: ${timestamp}`);
    console.log(`🏁 Finished: ${endTime}`);
    console.log(`⏱️  Duration: ${formatDuration(duration)}`);
    console.log(`📊 Total Buckets: ${totalBuckets}`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📝 Actions:`);
    console.log(`   - Payment Updates: ${actionCounts.UPDATED_PAYMENTS}`);
    console.log(`   - Marked Success: ${actionCounts.MARKED_AS_SUCCESS}`);
    console.log(`   - Marked Failed: ${actionCounts.MARKED_AS_FAILED}`);
    console.log(`   - No Changes: ${actionCounts.NO_CHANGES}`);
    console.log('===============================\n');
  }
};
