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
  const { email, nickname, encryptedUserKey, accountNo, universityId, majorId  } = userData;
  
  const dbResult = await client.query(
    `INSERT INTO users.list (email, nickname, userKey, withdrawalAccountNo, university_id, major_id) 
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [email, nickname, encryptedUserKey, accountNo, universityId, majorId]
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
  
  const characterId = defaultItems.rows.find(item => item.cosmetic_item_type === 1)?.id;
  // outfit과 hat은 NULL로 시작 (착용하지 않은 상태)
  
  // 가방에 기본 아이템들 추가
  await client.query(
    `INSERT INTO users.inventory (user_id, item_id, item_type_id)
     SELECT $1, id, cosmetic_item_type
     FROM cosmetic_item.list 
     WHERE is_default = true`,
    [userId]
  );
  
  // 캐릭터에 기본 캐릭터만 장착, 옷과 모자는 NULL
  await client.query(
    `INSERT INTO users.character (user_id, character_item_id, outfit_item_id, hat_item_id) 
     VALUES ($1, $2, NULL, NULL)`,
    [userId, characterId]
  );
};
// ============== 로그인 관련 서비스 ==============

// DB: 사용자 조회
export const findUserByEmail = async (email) => {
  const result = await query(`
    SELECT 
      u.id,
      u.email,
      u.nickname,
      u.userkey,
      u.withdrawalaccountno,
      u.university_id,
      u.major_id,
      u.created_at,
      
      -- 대학 정보
      uni.name as university_name,
      
      -- 학과 정보
      maj.name as major_name,
      maj.code as major_code,
      
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
    LEFT JOIN users.university uni ON u.university_id = uni.id
    LEFT JOIN users.major maj ON u.major_id = maj.id
    
    -- 캐릭터 정보 조인
    LEFT JOIN users.character uc ON u.id = uc.user_id
    LEFT JOIN cosmetic_item.list char_item ON uc.character_item_id = char_item.id
    LEFT JOIN cosmetic_item.list outfit_item ON uc.outfit_item_id = outfit_item.id
    LEFT JOIN cosmetic_item.list hat_item ON uc.hat_item_id = hat_item.id
    
    WHERE u.email = $1
  `, [email]);
  
  
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
    nickname: user.nickname,
    university: {
      id: user.university_id,
      name: user.university_name
    },
    major: {
      id: user.major_id,
      name: user.major_name,
      code: user.major_code
    },
    character: user.character_item_id ? {
      character_item: {
        id: user.character_item_id,
        name: user.character_name,
        description: user.character_description
      },
      outfit_item: {
        id: user.outfit_item_id,
        name: user.outfit_name,
        description: user.outfit_description
      },
      hat_item: {
        id: user.hat_item_id,
        name: user.hat_name,
        description: user.hat_description
      }
    } : null
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
    outfit_item: characterInfo.outfit_item_id ? {
      id: characterInfo.outfit_item_id,
      name: characterInfo.outfit_name,
      description: characterInfo.outfit_description
    } : null,
    hat_item: characterInfo.hat_item_id ? {
      id: characterInfo.hat_item_id,
      name: characterInfo.hat_name,
      description: characterInfo.hat_description
    } : null
  };
};

// ============== 사용자 프로필 조회 서비스 ==============
export const getUserProfile = async (userId) => {
  const profileQuery = `
    SELECT 
      -- 사용자 기본 정보 (계좌번호 제외)
      u.id,
      u.email,
      u.nickname,
      u.created_at,
      
      -- 대학 정보
      uni.id  AS university_id,
      uni.name AS university_name,

      -- 학과 정보
      maj.id  AS major_id,
      maj.name AS major_name,
      
      -- 캐릭터 정보
      uc.character_item_id,
      uc.outfit_item_id,
      uc.hat_item_id,
      char_item.name        AS character_name,
      char_item.description AS character_description,
      outfit_item.name        AS outfit_name,
      outfit_item.description AS outfit_description,
      hat_item.name        AS hat_name,
      hat_item.description AS hat_description,

      -- 포인트: metrics의 카운트 합 × 100 (없으면 0)
      (
        (
          COALESCE(m.bucket_count, 0)
        + COALESCE(m.count_like_sum, 0)
        + COALESCE(m.get_like_sum, 0)
        + COALESCE(m.challenge_success_count, 0)
        + COALESCE(m.comment_count, 0)
        + COALESCE(m.bucket_push_count, 0)
        + COALESCE(m.success_bucket_count, 0)
        ) * 100
      )::INT AS point
      
    FROM users.list u
    
    -- 대학/학과 정보
    LEFT JOIN users.university uni ON u.university_id = uni.id
    LEFT JOIN users.major      maj ON u.major_id = maj.id
    
    -- 캐릭터 정보
    LEFT JOIN users.character uc ON u.id = uc.user_id
    LEFT JOIN cosmetic_item.list char_item   ON uc.character_item_id = char_item.id
    LEFT JOIN cosmetic_item.list outfit_item ON uc.outfit_item_id   = outfit_item.id
    LEFT JOIN cosmetic_item.list hat_item    ON uc.hat_item_id      = hat_item.id

    -- 메트릭스
    LEFT JOIN users.metrics m ON m.user_id = u.id
    
    WHERE u.id = $1
  `;

  const result = await query(profileQuery, [userId]);
  if (result.rows.length === 0) {
    throw customError(404, '사용자 정보를 찾을 수 없습니다.');
  }

  const userInfo = result.rows[0];

  // 응답 포맷
  return {
    id: userInfo.id,
    email: userInfo.email,
    nickname: userInfo.nickname,
    created_at: userInfo.created_at,
    point: Number(userInfo.point), // 안전하게 숫자로 변환
    university: {
      id: userInfo.university_id,
      name: userInfo.university_name
    },
    major: {
      id: userInfo.major_id,
      name: userInfo.major_name
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

// ============== 내 적금통 목록 조회 서비스 ==============
export const getMyBucketList = async (userId, page = 1) => {
  const limit = 10; // 내 적금통은 한 페이지에 더 많이 보여줘도 됨
  const offset = (page - 1) * limit;
  
  const myBucketsQuery = `
    SELECT 
      -- 적금통 기본 정보
      sb.id,
      sb.name,
      sb.description,
      sb.target_amount,
      sb.status,
      sb.is_challenge,
      sb.like_count,
      sb.view_count,
      sb.created_at,
      
      -- 금융 정보
      sb.accountname as account_name,
      sb.interestrate as interest_rate,
      sb.subscriptionperiod as subscription_period,
      sb.deposit_cycle,
      sb.total_payment,
      sb.success_payment,
      sb.fail_payment,
      sb.last_progress_date,
      sb.accountno as account_no,
      
      -- 적금통 캐릭터 정보
      sb.character_item_id,
      sb.outfit_item_id,
      sb.hat_item_id,
      char_item.name as character_name,
      outfit_item.name as outfit_name,
      hat_item.name as hat_name,
      
      -- 댓글 수
      COALESCE(comments.comment_count, 0) as comment_count
      
    FROM saving_bucket.list AS sb
    
    -- 적금통 캐릭터 정보 조인
    LEFT JOIN cosmetic_item.list AS char_item ON sb.character_item_id = char_item.id
    LEFT JOIN cosmetic_item.list AS outfit_item ON sb.outfit_item_id = outfit_item.id
    LEFT JOIN cosmetic_item.list AS hat_item ON sb.hat_item_id = hat_item.id
    
    -- 댓글 수 조인
    LEFT JOIN (
      SELECT bucket_id, COUNT(*) as comment_count 
      FROM saving_bucket.comment 
      GROUP BY bucket_id
    ) AS comments ON sb.id = comments.bucket_id
    
    WHERE sb.user_id = $1
    
    ORDER BY 
      -- 1순위: 진행중 상태를 최우선 (최신순)
      CASE WHEN sb.status = 'in_progress' THEN 0 ELSE 1 END,
      CASE WHEN sb.status = 'in_progress' THEN sb.created_at END DESC,
      
      -- 2순위: 성공 상태 (최신순)  
      CASE WHEN sb.status = 'success' THEN 0 ELSE 1 END,
      CASE WHEN sb.status = 'success' THEN sb.created_at END DESC,
      
      -- 3순위: 실패 상태 (최신순)
      CASE WHEN sb.status = 'failed' THEN 0 ELSE 1 END,
      CASE WHEN sb.status = 'failed' THEN sb.created_at END DESC
    
    LIMIT $2 OFFSET $3
  `;
  
  const result = await query(myBucketsQuery, [userId, limit, offset]);
  return result.rows;
};

// ============== 내 적금통 총 개수 조회 ==============
export const getMyBucketCount = async (userId) => {
  const countQuery = `
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
      COUNT(CASE WHEN status = 'success' THEN 1 END) as success,
      COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
    FROM saving_bucket.list 
    WHERE user_id = $1
  `;
  
  const result = await query(countQuery, [userId]);
  return result.rows[0];
};

// ============== 내 적금통 목록 응답 포맷팅 ==============
export const formatMyBucketListResponse = (buckets, counts, page) => {
  const limit = 10;
  const hasNext = (page * limit) < parseInt(counts.total);
  
  const formattedBuckets = buckets.map(bucket => {
    // 진행률 계산
    const progressPercentage = bucket.total_payment > 0 
      ? ((bucket.success_payment / bucket.total_payment) * 100).toFixed(1)
      : 0;
    
    return {
      id: bucket.id,
      name: bucket.name,
      description: bucket.description,
      target_amount: bucket.target_amount,
      current_progress: parseFloat(progressPercentage),
      status: bucket.status,
      is_challenge: bucket.is_challenge,
      like_count: bucket.like_count,
      view_count: bucket.view_count,
      comment_count: bucket.comment_count,
      created_at: bucket.created_at,
      
      // 금융 정보
      account_name: bucket.account_name,
      interest_rate: bucket.interest_rate,
      subscription_period: bucket.subscription_period,
      deposit_cycle: bucket.deposit_cycle,
      total_payment: bucket.total_payment,
      success_payment: bucket.success_payment,
      fail_payment: bucket.fail_payment,
      last_progress_date: bucket.last_progress_date,
      account_no: bucket.account_no, // 내 적금통에서는 계좌번호도 보여줌
      
      // 적금통 캐릭터 정보
      character: {
        character_item: {
          id: bucket.character_item_id,
          name: bucket.character_name
        },
        outfit_item: {
          id: bucket.outfit_item_id,
          name: bucket.outfit_name
        },
        hat_item: {
          id: bucket.hat_item_id,
          name: bucket.hat_name
        }
      }
    };
  });
  
  return {
    buckets: formattedBuckets,
    stats: {
      total: parseInt(counts.total),
      in_progress: parseInt(counts.in_progress),
      success: parseInt(counts.success),
      failed: parseInt(counts.failed)
    },
    pagination: {
      page,
      limit,
      total: parseInt(counts.total),
      has_next: hasNext
    }
  };
};

// ============== 닉네임 변경 ==============
export const changeNickname = async (userId, nickname) => {
  const changeNicknameQuery = `
    UPDATE users.list
    SET nickname = $2
    WHERE id = $1
    RETURNING *
  `;

  const result = await query(changeNicknameQuery, [userId, nickname]);
  return result.rows[0]
};

// ============== 닉네임 중복 확인 ==============
export const checkNickname = async (nickname, userId) => {
  const checkNicknameQuery = `
    SELECT id FROM users.list WHERE nickname = $1
  `;
  const result = await query(checkNicknameQuery, [nickname]);

  // 다른 유저가 쓰고 있는 경우에만 에러
  if (result.rows.length > 0 && result.rows[0].id !== userId) {
    throw customError(409, '이미 존재하는 닉네임입니다');
  }
};

// ============== 다른 사용자 프로필 조회 서비스 ==============
export const getOtherUserProfile = async (targetUserId, currentUserId = null) => {
  const profileQuery = `
    SELECT 
      -- 사용자 기본 정보 (이메일은 본인만 조회 가능)
      u.id,
      CASE WHEN $2 = u.id THEN u.email ELSE NULL END as email,
      u.nickname,
      u.created_at,
      
      -- 대학 정보
      uni.id  AS university_id,
      uni.name AS university_name,

      -- 학과 정보
      maj.id  AS major_id,
      maj.name AS major_name,
      
      -- 캐릭터 정보
      uc.character_item_id,
      uc.outfit_item_id,
      uc.hat_item_id,
      char_item.name        AS character_name,
      char_item.description AS character_description,
      outfit_item.name        AS outfit_name,
      outfit_item.description AS outfit_description,
      hat_item.name        AS hat_name,
      hat_item.description AS hat_description,

      -- 포인트: metrics의 카운트 합 × 100 (없으면 0)
      (
        (
          COALESCE(m.bucket_count, 0)
        + COALESCE(m.count_like_sum, 0)
        + COALESCE(m.get_like_sum, 0)
        + COALESCE(m.challenge_success_count, 0)
        + COALESCE(m.comment_count, 0)
        + COALESCE(m.bucket_push_count, 0)
        + COALESCE(m.success_bucket_count, 0)
        ) * 100
      )::INT AS point
      
    FROM users.list u
    
    -- 대학/학과 정보
    LEFT JOIN users.university uni ON u.university_id = uni.id
    LEFT JOIN users.major      maj ON u.major_id = maj.id
    
    -- 캐릭터 정보
    LEFT JOIN users.character uc ON u.id = uc.user_id
    LEFT JOIN cosmetic_item.list char_item   ON uc.character_item_id = char_item.id
    LEFT JOIN cosmetic_item.list outfit_item ON uc.outfit_item_id   = outfit_item.id
    LEFT JOIN cosmetic_item.list hat_item    ON uc.hat_item_id      = hat_item.id

    -- 메트릭스
    LEFT JOIN users.metrics m ON m.user_id = u.id
    
    WHERE u.id = $1
  `;

  const result = await query(profileQuery, [targetUserId, currentUserId]);
  if (result.rows.length === 0) {
    throw customError(404, '사용자 정보를 찾을 수 없습니다.');
  }

  const userInfo = result.rows[0];

  // 응답 포맷 (이메일은 본인일 때만 포함)
  const response = {
    id: userInfo.id,
    nickname: userInfo.nickname,
    created_at: userInfo.created_at,
    point: Number(userInfo.point),
    university: {
      id: userInfo.university_id,
      name: userInfo.university_name
    },
    major: {
      id: userInfo.major_id,
      name: userInfo.major_name
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

  // 본인인 경우에만 이메일 추가
  if (userInfo.email !== null) {
    response.email = userInfo.email;
  }

  return response;
};

// ============== 다른 사용자의 적금통 목록 조회 서비스 ==============
export const getOtherUserBucketList = async (targetUserId, page = 1) => {
  const limit = 10;
  const offset = (page - 1) * limit;
  
  // 사용자 존재 확인
  const userCheckResult = await query('SELECT id, nickname FROM users.list WHERE id = $1', [targetUserId]);
  if (userCheckResult.rows.length === 0) {
    throw customError(404, '사용자를 찾을 수 없습니다.');
  }
  
  const otherUserBucketsQuery = `
    SELECT 
      -- 적금통 기본 정보
      sb.id,
      sb.name,
      sb.description,
      sb.target_amount,
      sb.status,
      sb.is_challenge,
      sb.like_count,
      sb.view_count,
      sb.created_at,
      
      -- 금융 정보
      sb.accountname as account_name,
      sb.interestrate as interest_rate,
      sb.subscriptionperiod as subscription_period,
      sb.deposit_cycle,
      sb.total_payment,
      sb.success_payment,
      sb.fail_payment,
      sb.last_progress_date,
      -- 다른 사용자 조회시에는 계좌번호 숨김
      NULL as account_no,
      
      -- 적금통 캐릭터 정보
      sb.character_item_id,
      sb.outfit_item_id,
      sb.hat_item_id,
      char_item.name as character_name,
      outfit_item.name as outfit_name,
      hat_item.name as hat_name,
      
      -- 댓글 수
      COALESCE(comments.comment_count, 0) as comment_count
      
    FROM saving_bucket.list AS sb
    
    -- 적금통 캐릭터 정보 조인
    LEFT JOIN cosmetic_item.list AS char_item ON sb.character_item_id = char_item.id
    LEFT JOIN cosmetic_item.list AS outfit_item ON sb.outfit_item_id = outfit_item.id
    LEFT JOIN cosmetic_item.list AS hat_item ON sb.hat_item_id = hat_item.id
    
    -- 댓글 수 조인
    LEFT JOIN (
      SELECT bucket_id, COUNT(*) as comment_count 
      FROM saving_bucket.comment 
      GROUP BY bucket_id
    ) AS comments ON sb.id = comments.bucket_id
    
    WHERE sb.user_id = $1 
      AND sb.is_public = true  -- 공개 적금통만 조회
    
    ORDER BY 
      -- 1순위: 진행중 상태를 최우선 (최신순)
      CASE WHEN sb.status = 'in_progress' THEN 0 ELSE 1 END,
      CASE WHEN sb.status = 'in_progress' THEN sb.created_at END DESC,
      
      -- 2순위: 성공 상태 (최신순)  
      CASE WHEN sb.status = 'success' THEN 0 ELSE 1 END,
      CASE WHEN sb.status = 'success' THEN sb.created_at END DESC,
      
      -- 3순위: 실패 상태 (최신순)
      CASE WHEN sb.status = 'failed' THEN 0 ELSE 1 END,
      CASE WHEN sb.status = 'failed' THEN sb.created_at END DESC
    
    LIMIT $2 OFFSET $3
  `;
  
  const result = await query(otherUserBucketsQuery, [targetUserId, limit, offset]);
  return {
    buckets: result.rows,
    user: userCheckResult.rows[0]
  };
};

// ============== 다른 사용자의 적금통 총 개수 조회 ==============
export const getOtherUserBucketCount = async (targetUserId) => {
  const countQuery = `
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
      COUNT(CASE WHEN status = 'success' THEN 1 END) as success,
      COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
    FROM saving_bucket.list 
    WHERE user_id = $1 AND is_public = true  -- 공개 적금통만 카운트
  `;
  
  const result = await query(countQuery, [targetUserId]);
  return result.rows[0];
};

// ============== 다른 사용자의 적금통 목록 응답 포맷팅 ==============
export const formatOtherUserBucketListResponse = (buckets, counts, page, targetUser) => {
  const limit = 10;
  const hasNext = (page * limit) < parseInt(counts.total);
  
  const formattedBuckets = buckets.map(bucket => {
    // 진행률 계산
    const progressPercentage = bucket.total_payment > 0 
      ? ((bucket.success_payment / bucket.total_payment) * 100).toFixed(1)
      : 0;
    
    return {
      id: bucket.id,
      name: bucket.name,
      description: bucket.description,
      target_amount: bucket.target_amount,
      current_progress: parseFloat(progressPercentage),
      status: bucket.status,
      is_challenge: bucket.is_challenge,
      like_count: bucket.like_count,
      view_count: bucket.view_count,
      comment_count: bucket.comment_count,
      created_at: bucket.created_at,
      
      // 금융 정보
      account_name: bucket.account_name,
      interest_rate: bucket.interest_rate,
      subscription_period: bucket.subscription_period,
      deposit_cycle: bucket.deposit_cycle,
      total_payment: bucket.total_payment,
      success_payment: bucket.success_payment,
      fail_payment: bucket.fail_payment,
      last_progress_date: bucket.last_progress_date,
      account_no: bucket.account_no, // 다른 사용자 조회시에는 NULL
      
      // 적금통 캐릭터 정보
      character: {
        character_item: {
          id: bucket.character_item_id,
          name: bucket.character_name
        },
        outfit_item: {
          id: bucket.outfit_item_id,
          name: bucket.outfit_name
        },
        hat_item: {
          id: bucket.hat_item_id,
          name: bucket.hat_name
        }
      }
    };
  });
  
  return {
    target_user: {
      id: targetUser.id,
      nickname: targetUser.nickname
    },
    buckets: formattedBuckets,
    stats: {
      total: parseInt(counts.total),
      in_progress: parseInt(counts.in_progress),
      success: parseInt(counts.success),
      failed: parseInt(counts.failed),
      note: "공개 적금통만 포함된 통계입니다."
    },
    pagination: {
      page,
      limit,
      total: parseInt(counts.total),
      has_next: hasNext
    }
  };
};