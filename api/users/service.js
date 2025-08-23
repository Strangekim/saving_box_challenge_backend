import { query } from '../database/postgreSQL.js';
import { trycatchWrapper } from '../util/trycatchWrapper.js';
import {customError} from "../util/customError.js"
import { simpleShinhanRequest } from '../externalAPI/simpleRequest.js';
import { shinhanRequestWithUser } from '../externalAPI/makeHeader.js';
import { generateUniqueNickname } from '../util/nicknameGenerator.js';
import { encrypt } from '../util/encryption.js';
import { validateUserItems } from '../bucket/service.js';


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

// ============== 사용자 가방 조회 서비스 ==============
export const getUserInventory = async (userId) => {
  // 전체 아이템 목록과 사용자 보유 여부, 획득 방법 조회
  const inventoryQuery = `
    SELECT 
      -- 아이템 기본 정보
      cil.id,
      cil.name,
      cil.description,
      cil.is_default,
      cil.created_at,
      
      -- 아이템 타입 정보
      cit.id as type_id,
      cit.code as type_code,
      cit.name as type_name,
      
      -- 사용자 보유 여부
      CASE WHEN ui.item_id IS NOT NULL THEN true ELSE false END as is_owned,
      ui.acquired_at,
      
      -- 획득 방법 (업적 정보)
      al.id as achievement_id,
      al.code as achievement_code,
      al.title as achievement_title,
      al.description as achievement_description,
      al.condition as achievement_condition,
      
      -- 업적 달성 여부
      CASE WHEN au.achievement_id IS NOT NULL THEN true ELSE false END as is_achievement_unlocked
      
    FROM cosmetic_item.list cil
    
    -- 아이템 타입 조인
    LEFT JOIN cosmetic_item.type cit ON cil.cosmetic_item_type = cit.id
    
    -- 사용자 보유 여부 조인
    LEFT JOIN users.inventory ui ON cil.id = ui.item_id AND ui.user_id = $1
    
    -- 획득 방법 (업적 보상) 조인
    LEFT JOIN achievement.reward ar ON cil.id = ar.item_id
    LEFT JOIN achievement.list al ON ar.achievement_id = al.id
    
    -- 업적 달성 여부 조인
    LEFT JOIN achievement.user au ON al.id = au.achievement_id AND au.user_id = $1
    
    ORDER BY cit.id, cil.id
  `;
  
  const result = await query(inventoryQuery, [userId]);
  
  // 데이터를 타입별로 그룹화하여 정리
  const groupedInventory = {};
  
  result.rows.forEach(item => {
    const typeCode = item.type_code;
    
    if (!groupedInventory[typeCode]) {
      groupedInventory[typeCode] = {
        type_id: item.type_id,
        type_code: item.type_code,
        type_name: item.type_name,
        items: []
      };
    }
    
    // 이미 추가된 아이템인지 확인 (같은 아이템이 여러 업적의 보상일 수 있음)
    let existingItem = groupedInventory[typeCode].items.find(i => i.id === item.id);
    
    if (!existingItem) {
      existingItem = {
        id: item.id,
        name: item.name,
        description: item.description,
        is_default: item.is_default,
        is_owned: item.is_owned,
        acquired_at: item.acquired_at,
        created_at: item.created_at,
        acquisition_methods: [] // 획득 방법 배열
      };
      groupedInventory[typeCode].items.push(existingItem);
    }
    
    // 획득 방법 추가 (업적이 있는 경우)
    if (item.achievement_id) {
      const acquisitionMethod = {
        type: 'achievement',
        achievement: {
          id: item.achievement_id,
          code: item.achievement_code,
          title: item.achievement_title,
          description: item.achievement_description,
          condition: item.achievement_condition,
          is_unlocked: item.is_achievement_unlocked
        }
      };
      
      // 중복 방지
      const alreadyAdded = existingItem.acquisition_methods.some(
        method => method.achievement?.id === item.achievement_id
      );
      
      if (!alreadyAdded) {
        existingItem.acquisition_methods.push(acquisitionMethod);
      }
    }
    
    // 기본 아이템인 경우 획득 방법 추가
    if (item.is_default && existingItem.acquisition_methods.length === 0) {
      existingItem.acquisition_methods.push({
        type: 'default',
        description: '기본 제공 아이템'
      });
    }
  });
  
  // 중복 아이템 ID 제거를 위한 Set 사용
  const allItemIds = new Set();
  const ownedItemIds = new Set();
  
  Object.values(groupedInventory).forEach(typeGroup => {
    typeGroup.items.forEach(item => {
      allItemIds.add(item.id);
      if (item.is_owned) {
        ownedItemIds.add(item.id);
      }
    });
  });
  
  // 통계 계산
  const totalItems = allItemIds.size;
  const ownedItemsCount = ownedItemIds.size;
  
  return {
    summary: {
      total_items: totalItems,
      owned_items: ownedItemsCount,
      completion_rate: totalItems > 0 ? ((ownedItemsCount / totalItems) * 100).toFixed(1) : "0.0"
    },
    items_by_type: groupedInventory
  };
};

// ============== 사용자 캐릭터 프로필 수정 서비스 ==============
export const updateUserCharacter = async (userId, characterData) => {
  const { character_item_id, outfit_item_id, hat_item_id } = characterData;
  
  // 1. 사용자 아이템 보유 검증 (기존 함수 재사용)
  await validateUserItems(userId, character_item_id, outfit_item_id, hat_item_id);
  
  // 2. 사용자 캐릭터 프로필 업데이트 (UPSERT)
  const updateQuery = `
    INSERT INTO users.character (user_id, character_item_id, outfit_item_id, hat_item_id)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      character_item_id = EXCLUDED.character_item_id,
      outfit_item_id = EXCLUDED.outfit_item_id,
      hat_item_id = EXCLUDED.hat_item_id
    RETURNING *
  `;
  
  const result = await query(updateQuery, [userId, character_item_id, outfit_item_id, hat_item_id]);
  
  // 3. 업데이트된 캐릭터 정보와 아이템 이름 조회
  const characterWithItemsQuery = `
    SELECT 
      uc.user_id,
      uc.character_item_id,
      uc.outfit_item_id,
      uc.hat_item_id,
      char_item.name as character_name,
      char_item.description as character_description,
      outfit_item.name as outfit_name,
      outfit_item.description as outfit_description,
      hat_item.name as hat_name,
      hat_item.description as hat_description
    FROM users.character uc
    LEFT JOIN cosmetic_item.list char_item ON uc.character_item_id = char_item.id
    LEFT JOIN cosmetic_item.list outfit_item ON uc.outfit_item_id = outfit_item.id
    LEFT JOIN cosmetic_item.list hat_item ON uc.hat_item_id = hat_item.id
    WHERE uc.user_id = $1
  `;
  
  const characterInfoResult = await query(characterWithItemsQuery, [userId]);
  const characterInfo = characterInfoResult.rows[0];
  
  // 4. 응답 데이터 포맷팅
  return {
    user_id: characterInfo.user_id,
    character_item: {
      id: characterInfo.character_item_id,
      name: characterInfo.character_name,
      description: characterInfo.character_description
    },
    outfit_item: {
      id: characterInfo.outfit_item_id,
      name: characterInfo.outfit_name,
      description: characterInfo.outfit_description
    },
    hat_item: {
      id: characterInfo.hat_item_id,
      name: characterInfo.hat_name,
      description: characterInfo.hat_description
    }
  };
};

// ============== 사용자 프로필 조회 서비스 ==============
export const getUserProfile = async (userId) => {
  // 사용자 정보 + 캐릭터 + 대학 정보 조회
  const profileQuery = `
    SELECT 
      -- 사용자 기본 정보 (계좌번호 제외)
      u.id,
      u.email,
      u.nickname,
      u.created_at,
      
      -- 대학 정보
      uni.id as university_id,
      uni.name as university_name,
      
      -- 캐릭터 정보
      uc.character_item_id,
      uc.outfit_item_id,
      uc.hat_item_id,
      char_item.name as character_name,
      char_item.description as character_description,
      outfit_item.name as outfit_name,
      outfit_item.description as outfit_description,
      hat_item.name as hat_name,
      hat_item.description as hat_description
      
    FROM users.list u
    
    -- 대학 정보 조인
    LEFT JOIN users.university uni ON u.university_id = uni.id
    
    -- 캐릭터 정보 조인
    LEFT JOIN users.character uc ON u.id = uc.user_id
    LEFT JOIN cosmetic_item.list char_item ON uc.character_item_id = char_item.id
    LEFT JOIN cosmetic_item.list outfit_item ON uc.outfit_item_id = outfit_item.id
    LEFT JOIN cosmetic_item.list hat_item ON uc.hat_item_id = hat_item.id
    
    WHERE u.id = $1
  `;
  
  const result = await query(profileQuery, [userId]);
  
  if (result.rows.length === 0) {
    throw customError(404, '사용자 정보를 찾을 수 없습니다.');
  }
  
  const userInfo = result.rows[0];
  
  // 응답 데이터 포맷팅
  return {
    id: userInfo.id,
    email: userInfo.email,
    nickname: userInfo.nickname,
    created_at: userInfo.created_at,
    university: {
      id: userInfo.university_id,
      name: userInfo.university_name
    },
    character: userInfo.character_item_id ? {
      character_item: {
        id: userInfo.character_item_id,
        name: userInfo.character_name,
        description: userInfo.character_description
      },
      outfit_item: {
        id: userInfo.outfit_item_id,
        name: userInfo.outfit_name,
        description: userInfo.outfit_description
      },
      hat_item: {
        id: userInfo.hat_item_id,
        name: userInfo.hat_name,
        description: userInfo.hat_description
      }
    } : null
  };
};

