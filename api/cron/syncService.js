import { query, pool } from '../database/postgreSQL.js';
import { shinhanRequestWithUser } from '../externalAPI/makeHeader.js';
import { decrypt } from '../util/encryption.js';
import { notifyPaymentSuccess, notifyPaymentFailed } from '../util/notification/index.js';
import { processUserAction } from '../util/achievementService.js';
import { notifyAchievement } from '../util/notification/index.js';

// ============== 활성 적금통 조회 ==============
export const getActiveBuckets = async () => {
  const result = await query(`
    SELECT 
      sb.id, 
      sb.user_id, 
      sb.accountno, 
      sb.success_payment, 
      sb.fail_payment,
      sb.name
    FROM saving_bucket.list sb
    WHERE sb.status = 'in_progress' 
      AND sb.accountno IS NOT NULL
    ORDER BY sb.id
  `);
  
  return result.rows;
};

// ============== 소유자 userKey 조회 ==============
export const getUserKeyByUserId = async (userId) => {
  const result = await query(
    'SELECT userkey FROM users.list WHERE id = $1',
    [userId]
  );
  
  if (result.rows.length === 0) {
    throw new Error(`User not found: ${userId}`);
  }
  
  return decrypt(result.rows[0].userkey);
};

// ============== 신한 API 호출 ==============
export const callShinhanPaymentAPI = async (userKey, accountNo) => {
  return await shinhanRequestWithUser({
    path: '/edu/savings/inquirePayment',
    userKey,
    json: { accountNo }
  });
};

// ============== 납입 데이터 파싱 ==============
export const parsePaymentResponse = (apiResponse) => {
  const rec = apiResponse.REC[0];
  const payments = rec.paymentInfo || [];
  
  let successCount = 0;
  let failCount = 0;
  let lastPaymentDate = null;
  
  // paymentInfo 배열 순회
  for (const payment of payments) {
    if (payment.status === 'SUCCESS') {
      successCount++;
    } else {
      failCount++;
    }
    
    // 가장 최근 납입일 찾기 (YYYYMMDD 형식)
    if (!lastPaymentDate || payment.paymentDate > lastPaymentDate) {
      lastPaymentDate = payment.paymentDate;
    }
  }
  
  // 만료일 확인 (YYYYMMDD 형식을 Date로 변환)
  const expiryDateStr = rec.accountExpiryDate; // "20251011"
  const expiryDate = new Date(
    parseInt(expiryDateStr.substring(0, 4)),     // year
    parseInt(expiryDateStr.substring(4, 6)) - 1, // month (0-based)
    parseInt(expiryDateStr.substring(6, 8))      // day
  );
  
  const today = new Date();
  const isExpired = today > expiryDate;
  
  return {
    successCount,
    failCount,
    lastPaymentDate,
    totalBalance: parseInt(rec.totalBalance || '0'),
    accountExpiryDate: expiryDateStr,
    isExpired,
    rawData: rec
  };
};

// ============== 변경 여부 확인 ==============
export const hasPaymentChanged = (bucket, newPaymentData) => {
  return (
    bucket.success_payment !== newPaymentData.successCount ||
    bucket.fail_payment !== newPaymentData.failCount
  );
};

// ============== DB 업데이트 - 납입 정보만 ==============
export const updateBucketPayments = async (bucketId, paymentData) => {
  await query(`
    UPDATE saving_bucket.list 
    SET 
      success_payment = $1,
      fail_payment = $2,
      last_progress_date = TO_DATE($3, 'YYYYMMDD')
    WHERE id = $4
  `, [
    paymentData.successCount,
    paymentData.failCount,
    paymentData.lastPaymentDate,
    bucketId
  ]);
};

// ============== 적금통 실패 처리 ==============
export const markBucketAsFailed = async (bucketId) => {
  await query(`
    UPDATE saving_bucket.list 
    SET status = 'failed', accountno = NULL 
    WHERE id = $1
  `, [bucketId]);
  
  console.log(`❌ Bucket ${bucketId} marked as FAILED (API access failed)`);
};


// ============== 적금통 성공 처리 ==============
export const markBucketAsSuccess = async (bucketId) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. 적금통 정보 조회 (챌린지 여부 확인용)
    const bucketResult = await client.query(`
      SELECT user_id, is_challenge, name 
      FROM saving_bucket.list 
      WHERE id = $1
    `, [bucketId]);
    
    if (bucketResult.rows.length === 0) {
      throw new Error(`Bucket ${bucketId} not found`);
    }
    
    const bucket = bucketResult.rows[0];
    const isChallenge = bucket.is_challenge;
    
    // 2. 적금통 상태를 성공으로 변경, 계좌번호 제거
    await client.query(`
      UPDATE saving_bucket.list 
      SET status = 'success', accountno = NULL 
      WHERE id = $1
    `, [bucketId]);
    
    await client.query('COMMIT');
    
    // 3. 업적 처리 (트랜잭션 외부에서 처리)
    try {
      let achievementResult;
      
      if (isChallenge) {
        // 챌린지 상품인 경우: 챌린지 완료 업적 처리
        achievementResult = await processUserAction(bucket.user_id, 'complete_challenge', {
          challengeId: bucketId,
          bucketName: bucket.name
        });
        
        console.log(`🏆 Bucket ${bucketId} (${bucket.name}) marked as SUCCESS - Challenge completed!`);
      } else {
        // 일반 상품인 경우: 적금통 완료 업적 처리
        achievementResult = await processUserAction(bucket.user_id, 'complete_bucket', {
          bucketId: bucketId,
          bucketName: bucket.name
        });
        
        console.log(`✅ Bucket ${bucketId} (${bucket.name}) marked as SUCCESS (expired)`);
      }
      
      // 4. 업적 달성 시 읽지 않은 알림 생성
      if (achievementResult.newAchievements && achievementResult.newAchievements.length > 0) {
        for (const unlock of achievementResult.newAchievements) {
          await notifyAchievement(bucket.user_id, {
            achievementId: unlock.achievement.id,
            achievementTitle: unlock.achievement.title,
            achievementCode: unlock.achievement.code
          });
        }
        
        console.log(`🎉 업적 달성 알림 생성 - 사용자 ${bucket.user_id}: ${achievementResult.newAchievements.length}개 업적`);
      }
      
    } catch (achievementError) {
      console.error(`❌ 업적 처리 실패 - Bucket ${bucketId}:`, achievementError.message);
      // 업적 처리 실패해도 적금통 성공 처리는 유지
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`❌ Failed to mark bucket ${bucketId} as success:`, error.message);
    throw error;
  } finally {
    client.release();
  }
};

// ============== 단일 적금통 동기화 ==============
export const syncSingleBucket = async (bucket) => {
  try {
    // 1. 소유자 userKey 조회
    const userKey = await getUserKeyByUserId(bucket.user_id);
    
    // 2. 신한 API 호출
    let apiResponse;
    try {
      apiResponse = await callShinhanPaymentAPI(userKey, bucket.accountno);
    } catch (apiError) {
      // API 호출 실패 (404 등) - 적금통 실패 처리
      if (apiError.status === 404 || apiError.status === 400) {
        await markBucketAsFailed(bucket.id);
        
        // ✨ 실패 알림 생성
        await notifyPaymentFailed(bucket.user_id, bucket, 'API 접근 실패로 적금통이 비활성화되었습니다.');
        
        return { 
          success: true, 
          bucketId: bucket.id, 
          action: 'MARKED_AS_FAILED',
          reason: 'API_ACCESS_FAILED'
        };
      } else {
        // 다른 에러는 재시도 가능하므로 throw
        throw apiError;
      }
    }
    
    // 3. 응답 데이터 파싱
    const paymentData = parsePaymentResponse(apiResponse);
    
    // 4. 만료일 체크 - 만료되었으면 성공 처리
    if (paymentData.isExpired) {
      await markBucketAsSuccess(bucket.id);
      
      // ✨ 성공 알림 생성 (만료로 인한 완료)
      await notifyPaymentSuccess(bucket.user_id, bucket, paymentData.totalBalance);
      
      return { 
        success: true, 
        bucketId: bucket.id, 
        action: 'MARKED_AS_SUCCESS',
        reason: 'EXPIRED'
      };
    }
    
    // 5. 납입 정보 변경 시에만 DB 업데이트
    if (hasPaymentChanged(bucket, paymentData)) {
      await updateBucketPayments(bucket.id, paymentData);
      
      // ✨ 납입 상태 변화에 따른 알림 생성
      const successIncreased = paymentData.successCount > bucket.success_payment;
      const failIncreased = paymentData.failCount > bucket.fail_payment;
      
      if (successIncreased) {
        // 성공한 납입이 증가한 경우
        const newSuccessCount = paymentData.successCount - bucket.success_payment;
        await notifyPaymentSuccess(bucket.user_id, bucket, `${newSuccessCount}회의 새로운 납입`);
      }
      
      if (failIncreased) {
        // 실패한 납입이 증가한 경우
        const newFailCount = paymentData.failCount - bucket.fail_payment;
        await notifyPaymentFailed(bucket.user_id, bucket, `${newFailCount}회의 납입이 실패했습니다. 계좌 잔액을 확인해주세요.`);
      }
      
      return { 
        success: true, 
        bucketId: bucket.id, 
        action: 'UPDATED_PAYMENTS',
        changes: {
          success: `${bucket.success_payment} → ${paymentData.successCount}`,
          fail: `${bucket.fail_payment} → ${paymentData.failCount}`
        }
      };
    }
    
    // 6. 변경사항 없음
    return { 
      success: true, 
      bucketId: bucket.id, 
      action: 'NO_CHANGES'
    };
    
  } catch (error) {
    console.error(`❌ Sync failed for bucket ${bucket.id} (${bucket.name}):`, error.message);
    
    // ✨ 크론 동기화 실패 알림 (심각한 오류인 경우만)
    try {
      await notifyPaymentFailed(bucket.user_id, bucket, '적금통 동기화 중 오류가 발생했습니다. 고객센터에 문의해주세요.');
    } catch (notifyError) {
      console.error(`❌ Failed to send error notification for bucket ${bucket.id}:`, notifyError.message);
    }
    
    return { 
      success: false, 
      bucketId: bucket.id, 
      error: error.message 
    };
  }
};