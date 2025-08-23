import { query } from '../database/postgreSQL.js';
import { trycatchWrapper } from '../util/trycatchWrapper.js';
import {customError} from "../util/customError.js"
import { simpleShinhanRequest } from '../externalAPI/simpleRequest.js';
import { shinhanRequestWithUser } from '../externalAPI/makeHeader.js';
import { generateUniqueNickname } from '../util/nicknameGenerator.js';
import { encrypt } from '../util/encryption.js';


// 1. 신한 API: 계정 중복 체크
export const checkShinhanAccountExists = async (email) => {
  const apiKey = process.env.API_KEY;
  
  try {
    const searchResult = await simpleShinhanRequest({
      path: '/member/search',
      apiKey,
      userId: email
    });
    
    // 201 응답이 오면 이미 계정 존재
    if (searchResult) {
      throw customError(409, '이미 존재하는 계정입니다');
    }
  } catch (error) {
    // 400 에러가 아니면 다시 throw
    if (error.status !== 400) {
      throw error;
    }
    // 400 에러면 계정이 없다는 뜻이므로 정상
  }
};

// 2. 신한 API: 계정 생성
export const createShinhanAccount = async (email) => {
  const apiKey = process.env.API_KEY;
  
  const createResult = await simpleShinhanRequest({
    path: '/member',
    apiKey,
    userId: email
  });
  
  return createResult;
};

// 3. 신한 API: 계좌 생성
export const createBankAccount = async (userKey) => {
  const accountResult = await shinhanRequestWithUser({
    path: '/edu/demandDeposit/createDemandDepositAccount',
    userKey,
    json: {
      accountTypeUniqueNo: "088-1-782bc8779cb949"
    }
  });
  
  return accountResult;
};

// 4. 신한 API: 테스트용 입금
export const depositWelcomeMoney = async (userKey, accountNo) => {
  await shinhanRequestWithUser({
    path: '/edu/demandDeposit/updateDemandDepositAccountDeposit',
    userKey,
    json: {
      accountNo,
      transactionBalance: "100000000",  // 1억원
      transactionSummart: "회원가입 축하금, 1억원 입금"
    }
  });
};

// 5. DB: 사용자 기본 정보 생성
export const createUserData = async (client, userData) => {
  const { email, nickname, encryptedUserKey, accountNo, universityId } = userData;
  
  const dbResult = await client.query(
    `INSERT INTO users.list (email, nickname, userKey, withdrawalAccountNo, university_id) 
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [email, nickname, encryptedUserKey, accountNo, universityId]
  );
  
  return dbResult.rows[0];
};

// 6. DB: 사용자 업적 추적 테이블 초기화
export const initializeUserMetrics = async (client, userId) => {
  await client.query(
    `INSERT INTO users.metrics (user_id) VALUES ($1)`,
    [userId]
  );
};

// 7. DB: 기본 아이템 지급 및 장착
export const setupDefaultItems = async (client, userId) => {
  // 기본 아이템들 조회
  const defaultItems = await client.query(
    `SELECT id, cosmetic_item_type 
     FROM cosmetic_item.list 
     WHERE is_default = true`
  );
  
  // 타입별로 분류
  const characterId = defaultItems.rows.find(item => item.cosmetic_item_type === 1)?.id;
  const outfitId = defaultItems.rows.find(item => item.cosmetic_item_type === 2)?.id;
  const hatId = defaultItems.rows.find(item => item.cosmetic_item_type === 3)?.id;
  
  // 가방에 기본 아이템들 추가
  await client.query(
    `INSERT INTO users.inventory (user_id, item_id, item_type_id)
     SELECT $1, id, cosmetic_item_type
     FROM cosmetic_item.list 
     WHERE is_default = true`,
    [userId]
  );
  
  // 캐릭터에 기본 아이템들 장착
  await client.query(
    `INSERT INTO users.character (user_id, character_item_id, outfit_item_id, hat_item_id) 
     VALUES ($1, $2, $3, $4)`,
    [userId, characterId, outfitId, hatId]
  );
};

// ============== 로그인 관련 서비스 ==============

// DB: 사용자 조회
export const findUserByEmail = async (email) => {
  const result = await query('SELECT * FROM users.list WHERE email = $1', [email]);
  
  if (result.rows.length === 0) {
    throw customError(404, '사용자를 찾을 수 없습니다');
  }
  
  return result.rows[0];
};

// 세션: 사용자 세션 생성
export const createUserSession = (req, user) => {
  req.session.userId = user.id;
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname
  };
};

// ============== 로그아웃 관련 서비스 ==============

// 세션: 세션 확인
export const checkUserSession = (req) => {
  if (!req.session.userId) {
    throw customError(400, '이미 로그아웃 상태입니다');
  }
};

// 11. 세션: 세션 삭제
export const destroyUserSession = (req, res) => {
  return new Promise((resolve, reject) => {
    req.session.destroy((err) => {
      if (err) {
        reject(new Error('로그아웃 처리 중 오류가 발생했습니다'));
        return;
      }
      
      res.clearCookie('connect.sid');
      resolve();
    });
  });
};

// ============== 로그인 시 완료된 적금통 업적 확인 (챌린지/일반 구분) ==============
export const checkCompletedBucketsForAchievements = async (userId) => {
  // 완료된 적금통들을 챌린지 여부로 구분하여 조회
  const result = await query(`
    SELECT 
      sb.id,
      sb.name,
      sb.target_amount,
      sb.is_challenge,
      sb.created_at
    FROM saving_bucket.list sb
    WHERE sb.user_id = $1 
      AND sb.status = 'success'
    ORDER BY sb.created_at DESC
  `, [userId]);
  
  const buckets = result.rows;
  const challengeBuckets = buckets.filter(bucket => bucket.is_challenge);
  const normalBuckets = buckets.filter(bucket => !bucket.is_challenge);
  
  console.log(`🔍 사용자 ${userId}의 완료된 적금통:`);
  console.log(`   총 ${buckets.length}개 (챌린지: ${challengeBuckets.length}개, 일반: ${normalBuckets.length}개)`);
  
  return {
    buckets,
    challengeBuckets,
    normalBuckets,
    length: buckets.length,
    challengeCount: challengeBuckets.length,
    normalCount: normalBuckets.length
  };
};
