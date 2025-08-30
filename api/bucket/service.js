import { shinhanRequest } from "../externalAPI/makeHeader.js";
import { shinhanRequestWithUser } from '../externalAPI/makeHeader.js';
import { customError } from "../util/customError.js";
import { query,pool } from '../database/postgreSQL.js';
import { decrypt } from '../util/encryption.js';

// ============== 적금 상품 조회 서비스 ==============
export const getSavingsProducts = async () => {
  const data = await shinhanRequest({
    path: '/edu/savings/inquireSavingsProducts',
    json: {},
    method: 'POST'
  });
  
  return data?.REC || [];
};

// ============== 예금 상품 조회 서비스 ==============
export const getDepositProducts = async () => {
  const data = await shinhanRequest({
    path: '/edu/deposit/inquireDepositProducts',
    json: {},
    method: 'POST'
  });
  
  return data?.REC || [];
};

// ============== 예금+적금 통합 조회 서비스 ==============
export const getAllProducts = async () => {
  // 두 API를 병렬로 호출
  const [savingsProducts, depositProducts] = await Promise.all([
    getSavingsProducts(),
    getDepositProducts()
  ]);

  // 두 결과를 합쳐서 반환
  return [...savingsProducts, ...depositProducts];
};

// ============== 적금통 생성 검증 서비스 ==============
export const validateBucketCreation = async (accountTypeUniqueNo, targetAmount) => {
  // 1. 모든 상품 목록 조회
  const allProducts = await getAllProducts();
  
  // 2. 입력받은 계좌 정보가 실제 존재하는지 확인
  const selectedProduct = allProducts.find(
    product => product.accountTypeUniqueNo === accountTypeUniqueNo
  );
  
  if (!selectedProduct) {
    throw customError(400, '존재하지 않는 상품입니다.');
  }
  
  // 3. 목표 금액이 허용 범위 내에 있는지 확인
  const minAmount = parseInt(selectedProduct.minSubscriptionBalance);
  const maxAmount = parseInt(selectedProduct.maxSubscriptionBalance);
  
  if (targetAmount < minAmount) {
    throw customError(400, `목표 금액은 최소 ${minAmount.toLocaleString()}원 이상이어야 합니다.`);
  }
  
  if (targetAmount > maxAmount) {
    throw customError(400, `목표 금액은 최대 ${maxAmount.toLocaleString()}원 이하여야 합니다.`);
  }
  
  // 검증 통과 시 상품 정보 반환
  return selectedProduct;
};

// ============== 사용자 정보 조회 서비스 ==============
export const getUserInfo = async (userId) => {
  const result = await query(
    'SELECT userKey, withdrawalAccountNo FROM users.list WHERE id = $1',
    [userId]
  );
  
  if (result.rows.length === 0) {
    throw customError(404, '사용자를 찾을 수 없습니다.');
  }
  
  const user = result.rows[0];
  
  // userKey 복호화
  const decryptedUserKey = decrypt(user.userkey);
  
  return {
    userKey: decryptedUserKey,
    withdrawalAccountNo: user.withdrawalaccountno
  };
};

// ============== 신한 적금 계좌 생성 서비스 ==============
export const createSavingsAccount = async (userId, accountTypeUniqueNo, depositBalance) => {
  // 1. 사용자 정보 조회
  const { userKey, withdrawalAccountNo } = await getUserInfo(userId);
  
  // 2. 신한 API로 적금 계좌 생성
  const accountResult = await shinhanRequestWithUser({
    path: '/edu/savings/createAccount',
    userKey,
    json: {
      withdrawalAccountNo,
      accountTypeUniqueNo,
      depositBalance: depositBalance.toString()
    }
  });
  
  if (!accountResult?.REC?.accountNo) {
    throw customError(500, '적금 계좌 생성에 실패했습니다.');
  }
  
  return {
    accountNo: accountResult.REC.accountNo,
    userKey,
    withdrawalAccountNo
  };
};

// ============== 신한 적금 계좌 생성 서비스 ==============
export const createDepositAccount = async (userId, accountTypeUniqueNo, depositBalance) => {
  // 1. 사용자 정보 조회
  const { userKey, withdrawalAccountNo } = await getUserInfo(userId);
  
  // 2. 신한 API로 적금 계좌 생성
  const accountResult = await shinhanRequestWithUser({
    path: '/edu/deposit/createDepositAccount',
    userKey,
    json: {
      withdrawalAccountNo,
      accountTypeUniqueNo,
      depositBalance: depositBalance.toString()
    }
  });
  
  if (!accountResult?.REC?.accountNo) {
    throw customError(500, '예금 계좌 생성에 실패했습니다.');
  }
  
  return {
    accountNo: accountResult.REC.accountNo,
    userKey,
    withdrawalAccountNo
  };
};

// ============== 사용자 아이템 보유 검증 서비스 ==============
export const validateUserItems = async (userId, characterItemId, outfitItemId, hatItemId) => {
  // NULL인 아이템들은 검증에서 제외
  const itemIds = [characterItemId, outfitItemId, hatItemId].filter(id => id !== null);
  
  if (itemIds.length === 0) {
    throw customError(400, '최소한 캐릭터 아이템은 선택해야 합니다.');
  }
  
  // 사용자 가방에서 해당 아이템들 보유 여부 확인
  const result = await query(
    `SELECT item_id, item_type_id 
     FROM users.inventory 
     WHERE user_id = $1 AND item_id = ANY($2)`,
    [userId, itemIds]
  );
  
  const ownedItems = result.rows;
  const ownedItemIds = ownedItems.map(item => item.item_id);
  
  // 보유하지 않은 아이템이 있는지 확인
  const missingItems = itemIds.filter(id => !ownedItemIds.includes(id));
  if (missingItems.length > 0) {
    throw customError(400, '보유하지 않은 아이템이 포함되어 있습니다.');
  }
  
  // 아이템 타입별 검증 (NULL이 아닌 경우만)
  const itemTypeMap = {};
  ownedItems.forEach(item => {
    itemTypeMap[item.item_id] = item.item_type_id;
  });
  
  // 캐릭터 아이템 검증 (필수)
  if (!characterItemId || itemTypeMap[characterItemId] !== 1) {
    throw customError(400, '캐릭터 아이템이 올바르지 않습니다.');
  }
  
  // 한벌옷 아이템 검증 (선택적)
  if (outfitItemId && itemTypeMap[outfitItemId] !== 2) {
    throw customError(400, '한벌옷 아이템이 올바르지 않습니다.');
  }
  
  // 모자 아이템 검증 (선택적)
  if (hatItemId && itemTypeMap[hatItemId] !== 3) {
    throw customError(400, '모자 아이템이 올바르지 않습니다.');
  }
  
  return true;
};

// ============== 챌린지 상품 여부 확인 헬퍼 ==============
const extractIsChallengeFromDescription = (accountDescription) => {
  try {
    // accountDescription이 JSON 문자열 형태라고 가정
    const parsed = JSON.parse(accountDescription);
    return parsed.is_challenge === 'true';
  } catch (error) {
    // JSON 파싱 실패 시 기본값 false 반환
    return false;
  }
};

// ============== total_payment 계산 헬퍼 (일 단위 기준) ==============
const calculateTotalPayment = (depositCycle, subscriptionPeriodDays) => {
  const periodInDays = parseInt(subscriptionPeriodDays);
  
  switch (depositCycle) {
    case 'daily':
      return periodInDays; // 매일 1회씩
    case 'weekly':
      return Math.ceil(periodInDays / 7); // 주당 1회
    case 'monthly':
      return Math.ceil(periodInDays / 30); // 월당 1회 (30일 기준)
    default:
      return periodInDays; // 기본값은 daily
  }
};

// ============== 적금통 DB 삽입 서비스 ==============
export const saveBucketToDatabase = async (bucketData, productInfo, accountNo) => {
  const {
    userId,
    name,
    description,
    target_amount,
    deposit_cycle,
    is_public,
    character_item_id,
    outfit_item_id,
    hat_item_id
  } = bucketData;

  // 챌린지 상품 여부 추출
  const isChallenge = extractIsChallengeFromDescription(productInfo.accountDescription);
  
  // subscriptionPeriod를 정수로 파싱
  const subscriptionPeriod = parseInt(productInfo.subscriptionPeriod);
  
  // total_payment 계산 (일 단위 기준)
  const totalPayment = calculateTotalPayment(deposit_cycle, subscriptionPeriod);

  const insertQuery = `
    INSERT INTO saving_bucket.list (
      user_id, accountNo, accountTypeUniqueNo, accountTypeCode,
      accountName, interestRate, is_challenge, name, description,
      target_amount, subscriptionPeriod, deposit_cycle, is_public,
      total_payment, character_item_id, outfit_item_id, hat_item_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    RETURNING *
  `;

  const values = [
    userId,
    accountNo,
    productInfo.accountTypeUniqueNo,
    productInfo.accountTypeCode,
    productInfo.accountName,
    parseFloat(productInfo.interestRate),
    isChallenge,
    name,
    description,
    target_amount,
    subscriptionPeriod, // INT로 파싱된 값
    deposit_cycle,
    is_public,
    totalPayment,
    character_item_id,
    outfit_item_id,
    hat_item_id
  ];

  const result = await query(insertQuery, values);
  return result.rows[0];
};

// ============== 적금통 존재 및 소유권 확인 서비스 ==============
export const validateBucketOwnership = async (bucketId, userId) => {
  const result = await query(
    'SELECT id, user_id, status FROM saving_bucket.list WHERE id = $1',
    [bucketId]
  );
  
  if (result.rows.length === 0) {
    throw customError(404, '존재하지 않는 적금통입니다.');
  }
  
  const bucket = result.rows[0];
  
  if (bucket.user_id !== userId) {
    throw customError(403, '수정 권한이 없습니다.');
  }
  
  if (bucket.status !== 'in_progress') {
    throw customError(400, '진행 중인 적금통만 수정할 수 있습니다.');
  }
  
  return bucket;
};

// ============== 적금통 정보 업데이트 서비스 ==============
export const updateBucketInDatabase = async (bucketId, updateData) => {
  const updateFields = [];
  const values = [];
  let paramIndex = 1;
  
  // 동적으로 UPDATE 쿼리 생성
  for (const [field, value] of Object.entries(updateData)) {
    updateFields.push(`${field} = $${paramIndex}`);
    values.push(value);
    paramIndex++;
  }
  
  values.push(bucketId); // WHERE 조건용
  
  const updateQuery = `
    UPDATE saving_bucket.list 
    SET ${updateFields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;
  
  const result = await query(updateQuery, values);
  return result.rows[0];
};


// ============== 적금통 목록 조회 서비스 ==============
export const getBucketList = async (category, page, userId = null) => {
  const limit = 5;
  const offset = (page - 1) * limit;
  
  // 기본 SELECT 절과 JOIN 부분
  const baseSelect = `
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
      sb.last_progress_date,
      
      -- 소유자 정보
      u.id as owner_id,
      u.nickname as owner_nickname,
      uni.name as owner_university,
      
      -- 적금통 캐릭터 정보 (변경된 부분!)
      sb.character_item_id,
      sb.outfit_item_id,
      sb.hat_item_id,
      char_item.name as character_name,
      outfit_item.name as outfit_name,
      hat_item.name as hat_name,
      
      -- 댓글 수
      COALESCE(comments.comment_count, 0) as comment_count
      
      ${userId ? ', CASE WHEN user_like.id IS NOT NULL THEN true ELSE false END as is_liked' : ', false as is_liked'}
  `;

  const baseJoins = `
    FROM saving_bucket.list AS sb
    
    -- 소유자 정보 조인
    LEFT JOIN users.list AS u ON sb.user_id = u.id
    LEFT JOIN users.university AS uni ON u.university_id = uni.id
    
    -- 적금통 캐릭터 정보 조인 (변경된 부분!)
    LEFT JOIN cosmetic_item.list AS char_item ON sb.character_item_id = char_item.id
    LEFT JOIN cosmetic_item.list AS outfit_item ON sb.outfit_item_id = outfit_item.id
    LEFT JOIN cosmetic_item.list AS hat_item ON sb.hat_item_id = hat_item.id
    
    -- 댓글 수 조인
    LEFT JOIN (
      SELECT bucket_id, COUNT(*) as comment_count 
      FROM saving_bucket.comment 
      GROUP BY bucket_id
    ) AS comments ON sb.id = comments.bucket_id
    
    ${userId ? `LEFT JOIN saving_bucket.like AS user_like ON sb.id = user_like.bucket_id AND user_like.user_id = $3` : ''}
  `;

  // 카테고리별 WHERE 조건과 ORDER BY 설정
  let whereCondition, orderBy, params;

  switch (category) {
    case 'recently':
      // 최신순 (기존 로직)
      whereCondition = `WHERE sb.is_public = true AND sb.status = 'in_progress'`;
      orderBy = `ORDER BY sb.created_at DESC`;
      params = userId ? [limit, offset, userId] : [limit, offset];
      break;
      
    case 'like':
      // 좋아요순 (좋아요 많은 순 → 최신순)
      whereCondition = `WHERE sb.is_public = true AND sb.status = 'in_progress'`;
      orderBy = `ORDER BY sb.like_count DESC, sb.created_at DESC`;
      params = userId ? [limit, offset, userId] : [limit, offset];
      break;
      
    case 'my_liked':
      // 내가 좋아요 누른 적금통만 (로그인 필수)
      if (!userId) {
        // 비로그인 사용자는 빈 결과 반환
        return [];
      }
      whereCondition = `
        WHERE sb.is_public = true 
          AND sb.status = 'in_progress' 
          AND user_like.id IS NOT NULL
      `;
      orderBy = `ORDER BY user_like.created_at DESC`; // 좋아요 누른 순서로 정렬
      params = [limit, offset, userId];
      break;
      
    default:
      // 기본값은 최신순
      whereCondition = `WHERE sb.is_public = true AND sb.status = 'in_progress'`;
      orderBy = `ORDER BY sb.created_at DESC`;
      params = userId ? [limit, offset, userId] : [limit, offset];
      break;
  }

  // 최종 쿼리 조합
  const sqlQuery = `
    ${baseSelect}
    ${baseJoins}
    ${whereCondition}
    ${orderBy}
    LIMIT $1 OFFSET $2
  `;
  
  const result = await query(sqlQuery, params);
  return result.rows;
};

// ============== 카테고리별 전체 개수 조회 서비스 ==============
export const getBucketListCount = async (category = 'recently', userId = null) => {
  let countQuery, params;
  
  switch (category) {
    case 'recently':
    case 'like':
      // 최신순, 좋아요순 둘 다 동일한 기본 조건
      countQuery = `
        SELECT COUNT(*) as total
        FROM saving_bucket.list 
        WHERE is_public = true AND status = 'in_progress'
      `;
      params = [];
      break;
      
    case 'my_liked':
      // 내가 좋아요 누른 적금통 개수
      if (!userId) {
        return 0; // 비로그인 사용자는 0개
      }
      countQuery = `
        SELECT COUNT(*) as total
        FROM saving_bucket.list sb
        INNER JOIN saving_bucket.like ul ON sb.id = ul.bucket_id
        WHERE sb.is_public = true 
          AND sb.status = 'in_progress'
          AND ul.user_id = $1
      `;
      params = [userId];
      break;
      
    default:
      // 기본값
      countQuery = `
        SELECT COUNT(*) as total
        FROM saving_bucket.list 
        WHERE is_public = true AND status = 'in_progress'
      `;
      params = [];
      break;
  }
  
  const result = await query(countQuery, params);
  return parseInt(result.rows[0].total);
};

// ============== 적금통 목록 데이터 포맷팅 서비스 ==============
export const formatBucketListResponse = (buckets, total, page, category = 'recently') => {
  const limit = 5;
  const hasNext = (page * limit) < total;
  
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
      is_liked: bucket.is_liked,
      
      // 금융 정보 (밖으로 뺌)
      account_name: bucket.account_name,
      interest_rate: bucket.interest_rate,
      subscription_period: bucket.subscription_period,
      deposit_cycle: bucket.deposit_cycle,
      total_payment: bucket.total_payment,
      success_payment: bucket.success_payment,
      last_progress_date: bucket.last_progress_date,
      
      // 소유자 정보 (캐릭터 포함)
      owner: {
        id: bucket.owner_id,
        nickname: bucket.owner_nickname,
        university: bucket.owner_university,
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
      }
    };
  });
  
  // 카테고리별 메시지 설정
  const categoryMessages = {
    recently: '최신 적금통 목록을 조회했습니다.',
    like: '인기 적금통 목록을 조회했습니다. (좋아요순)',
    my_liked: '내가 좋아요 누른 적금통 목록을 조회했습니다.'
  };
  
  return {
    message: categoryMessages[category] || '적금통 목록을 조회했습니다.',
    category,
    buckets: formattedBuckets,
    pagination: {
      page,
      limit,
      total,
      has_next: hasNext
    }
  };
};


// ============== 적금통 존재 및 상세 정보 조회 서비스 ==============
export const getBucketById = async (bucketId) => {
  const result = await query(
    `SELECT 
      id, 
      user_id, 
      accountno as account_no, 
      name, 
      status,
      is_public,
      success_payment,
      fail_payment,
      total_payment,
      last_progress_date
     FROM saving_bucket.list 
     WHERE id = $1`,
    [bucketId]
  );
  
  if (result.rows.length === 0) {
    throw customError(404, '존재하지 않는 적금통입니다.');
  }
  
  return result.rows[0];
};

// ============== 적금통 소유자의 userKey 조회 서비스 ==============
export const getBucketOwnerUserKey = async (userId) => {
  const result = await query(
    'SELECT userKey FROM users.list WHERE id = $1',
    [userId]
  );
  
  if (result.rows.length === 0) {
    throw customError(404, '적금통 소유자를 찾을 수 없습니다.');
  }
  
  const user = result.rows[0];
  
  // userKey 복호화
  const decryptedUserKey = decrypt(user.userkey);
  
  return decryptedUserKey;
};

// ============== 신한 API: 적금 납입 내역 조회 서비스 ==============
export const getSavingsPaymentHistory = async (userKey, accountNo) => {
  const paymentData = await shinhanRequestWithUser({
    path: '/edu/savings/inquirePayment',
    userKey,
    json: {
      accountNo
    }
  });
  
  return paymentData;
};

// ============== 적금통 상세 정보 조회 (목록보기 형태 + 댓글) ==============
export const getBucketDetailInfo = async (bucketId, userId = null) => {
  // 현재 사용자의 좋아요 정보 조인 (로그인한 경우만)
  const userLikeJoin = userId ? 
    `LEFT JOIN saving_bucket.like AS user_like 
     ON sb.id = user_like.bucket_id AND user_like.user_id = $2` : '';
  
  const userLikeSelect = userId ? 
    ', CASE WHEN user_like.id IS NOT NULL THEN true ELSE false END as is_liked' : 
    ', false as is_liked';
  
  // 댓글 수 서브쿼리
  const commentCountSubquery = `
    LEFT JOIN (
      SELECT bucket_id, COUNT(*) as comment_count 
      FROM saving_bucket.comment 
      GROUP BY bucket_id
    ) AS comments ON sb.id = comments.bucket_id
  `;
  
const bucketQuery = `
  SELECT
    -- 기본 정보
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
    sb.accountname          AS account_name,
    sb.interestrate         AS interest_rate,
    sb.subscriptionperiod   AS subscription_period,
    sb.deposit_cycle,
    sb.total_payment,
    sb.success_payment,
    sb.fail_payment,
    sb.last_progress_date,

    -- 소유자
    u.id    AS owner_id,
    u.nickname AS owner_nickname,
    uni.name  AS owner_university,

    -- ✅ 버킷에 바인딩된 코스메틱(프로필 아님)
    sb.character_item_id AS bucket_character_item_id,
    sb.outfit_item_id    AS bucket_outfit_item_id,
    sb.hat_item_id       AS bucket_hat_item_id,
    ci_char.name   AS bucket_character_name,
    ci_outfit.name AS bucket_outfit_name,
    ci_hat.name    AS bucket_hat_name,

    -- 댓글 수(간단 상관 서브쿼리, 정수 캐스팅)
    COALESCE( (SELECT COUNT(*)::int FROM saving_bucket.comment c WHERE c.bucket_id = sb.id), 0 ) AS comment_count

    ${userLikeSelect}
  FROM saving_bucket.list sb
  LEFT JOIN users.list u           ON u.id = sb.user_id
  LEFT JOIN users.university uni   ON uni.id = u.university_id
  LEFT JOIN cosmetic_item.list ci_char   ON ci_char.id   = sb.character_item_id
  LEFT JOIN cosmetic_item.list ci_outfit ON ci_outfit.id = sb.outfit_item_id
  LEFT JOIN cosmetic_item.list ci_hat    ON ci_hat.id    = sb.hat_item_id
  ${userLikeJoin}
  WHERE sb.id = $1
`;
  
  // 파라미터 설정
  const bucketParams = userId ? [bucketId, userId] : [bucketId];

  console.log('[DETAIL_SQL]', bucketQuery);
  console.log('[DETAIL_PARAMS]', bucketParams);

  
  const bucketResult = await query(bucketQuery, bucketParams);
  console.log('[DETAIL_ROW_0]', bucketResult.rows[0]);
  
  if (bucketResult.rows.length === 0) {
    throw customError(404, '존재하지 않는 적금통입니다.');
  }
  
  const bucket = bucketResult.rows[0];
  
  // ✅ 댓글 목록 조회 (댓글 작성자는 프로필 캐릭터 사용, 고유한 alias)
  const commentsQuery = `
    SELECT 
      c.id,
      c.content,
      c.created_at,
      u.id as author_id,
      u.nickname as author_nickname,
      uni.name as author_university,
      -- 작성자 프로필 캐릭터 정보 (고유한 alias 사용)
      uc.character_item_id as author_character_item_id,
      uc.outfit_item_id as author_outfit_item_id,
      uc.hat_item_id as author_hat_item_id,
      author_char_item.name as author_character_name,
      author_outfit_item.name as author_outfit_name,
      author_hat_item.name as author_hat_name
    FROM saving_bucket.comment c
    LEFT JOIN users.list u ON c.user_id = u.id
    LEFT JOIN users.university uni ON u.university_id = uni.id
    -- 작성자 프로필 캐릭터 정보 조인 (고유한 alias)
    LEFT JOIN users.character uc ON u.id = uc.user_id
    LEFT JOIN cosmetic_item.list author_char_item ON uc.character_item_id = author_char_item.id
    LEFT JOIN cosmetic_item.list author_outfit_item ON uc.outfit_item_id = author_outfit_item.id
    LEFT JOIN cosmetic_item.list author_hat_item ON uc.hat_item_id = author_hat_item.id
    WHERE c.bucket_id = $1
    ORDER BY c.created_at DESC
  `;
  
  const commentsResult = await query(commentsQuery, [bucketId]);
  
  // 진행률 계산
  const progressPercentage = bucket.total_payment > 0 
    ? ((bucket.success_payment / bucket.total_payment) * 100).toFixed(1)
    : 0;
  
  // 댓글 데이터 포맷팅 (작성자는 프로필 캐릭터)
  const formattedComments = commentsResult.rows.map(comment => ({
    id: comment.id,
    content: comment.content,
    created_at: comment.created_at,
    author: {
      id: comment.author_id,
      nickname: comment.author_nickname,
      university: comment.author_university,
      character: {
        character_item: comment.author_character_item_id ? {
          id: comment.author_character_item_id,
          name: comment.author_character_name
        } : null,
        outfit_item: comment.author_outfit_item_id ? {
          id: comment.author_outfit_item_id,
          name: comment.author_outfit_name
        } : null,
        hat_item: comment.author_hat_item_id ? {
          id: comment.author_hat_item_id,
          name: comment.author_hat_name
        } : null
      }
    }
  }));
  
  // ✅ 적금통 데이터 포맷팅 (적금통 전용 캐릭터 사용)
  const formattedBucket = {
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
    is_liked: bucket.is_liked,
    
    // 금융 정보
    account_name: bucket.account_name,
    interest_rate: bucket.interest_rate,
    subscription_period: bucket.subscription_period,
    deposit_cycle: bucket.deposit_cycle,
    total_payment: bucket.total_payment,
    success_payment: bucket.success_payment,
    fail_payment: bucket.fail_payment,
    last_progress_date: bucket.last_progress_date,
    
    // 소유자 정보 (적금통 전용 캐릭터로 수정!)
    owner: {
      id: bucket.owner_id,
      nickname: bucket.owner_nickname,
      university: bucket.owner_university,
      character: {
        character_item: bucket.bucket_character_item_id ? {
          id: bucket.bucket_character_item_id,
          name: bucket.bucket_character_name
        } : null,
        outfit_item: bucket.bucket_outfit_item_id ? {
          id: bucket.bucket_outfit_item_id,
          name: bucket.bucket_outfit_name
        } : null,
        hat_item: bucket.bucket_hat_item_id ? {
          id: bucket.bucket_hat_item_id,
          name: bucket.bucket_hat_name
        } : null
      }
    }
  };
  
  return {
    bucket: formattedBucket,
    comments: formattedComments
  };
};

// ============== 적금통 기본 정보 조회 (비활성 적금통용) - 삭제예정 ==============
export const getBucketBasicInfo = async (bucketId) => {
  const result = await query(`
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
      
      -- 소유자 정보
      u.id as owner_id,
      u.nickname as owner_nickname,
      uni.name as owner_university,
      
      -- 적금통 캐릭터 정보 (변경된 부분!)
      sb.character_item_id,
      sb.outfit_item_id,
      sb.hat_item_id,
      char_item.name as character_name,
      outfit_item.name as outfit_name,
      hat_item.name as hat_name
      
    FROM saving_bucket.list AS sb
    
    -- 소유자 정보 조인
    LEFT JOIN users.list AS u ON sb.user_id = u.id
    LEFT JOIN users.university AS uni ON u.university_id = uni.id
    
    -- 적금통 캐릭터 정보 조인 (변경된 부분!)
    LEFT JOIN cosmetic_item.list AS char_item ON sb.character_item_id = char_item.id
    LEFT JOIN cosmetic_item.list AS outfit_item ON sb.outfit_item_id = outfit_item.id
    LEFT JOIN cosmetic_item.list AS hat_item ON sb.hat_item_id = hat_item.id
    
    WHERE sb.id = $1
  `, [bucketId]);
  
  if (result.rows.length === 0) {
    throw customError(404, '존재하지 않는 적금통입니다.');
  }
  
  const bucket = result.rows[0];
  
  // 진행률 계산
  const progressPercentage = bucket.total_payment > 0 
    ? ((bucket.success_payment / bucket.total_payment) * 100).toFixed(1)
    : 0;
  
  return {
    bucket: {
      id: bucket.id,
      name: bucket.name,
      description: bucket.description,
      target_amount: bucket.target_amount,
      current_progress: parseFloat(progressPercentage),
      status: bucket.status,
      is_challenge: bucket.is_challenge,
      like_count: bucket.like_count,
      view_count: bucket.view_count,
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
      
      // 소유자 정보 (캐릭터 포함)
      owner: {
        id: bucket.owner_id,
        nickname: bucket.owner_nickname,
        university: bucket.owner_university,
        character: {
          character_item: {
            name: bucket.character_name
          },
          outfit_item: {
            name: bucket.outfit_name
          },
          hat_item: {
            name: bucket.hat_name
          }
        }
      }
    }
  };
};

// ============== 실시간 적금통 동기화 ==============
export const syncBucketDetailData = async (bucket) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. 적금통 소유자의 userKey 조회
    const userKey = await getBucketOwnerUserKey(bucket.user_id);
    
    // 2. 신한 API로 납입 내역 조회
    let paymentHistory;
    try {
      paymentHistory = await getSavingsPaymentHistory(userKey, bucket.account_no);
    } catch (apiError) {
      // API 호출 실패 시 적금통을 실패 상태로 변경
      if (apiError.status === 404 || apiError.status === 400) {
        await client.query(`
          UPDATE saving_bucket.list 
          SET status = 'failed', accountno = NULL 
          WHERE id = $1
        `, [bucket.id]);
        
        await client.query('COMMIT');
        
        return {
          action: 'MARKED_AS_FAILED',
          message: '적금통에 접근할 수 없어 실패 처리되었습니다.'
        };
      } else {
        throw apiError;
      }
    }
    
    // 3. 납입 데이터 파싱 (cron의 parsePaymentResponse와 동일한 로직)
    const paymentData = parsePaymentResponse(paymentHistory);
    
    // 4. 만료일 체크 - 만료되었으면 성공 처리
    if (paymentData.isExpired) {
      // 적금통 상태를 성공으로 변경, 계좌번호 제거
      await client.query(`
        UPDATE saving_bucket.list 
        SET status = 'success', accountno = NULL 
        WHERE id = $1
      `, [bucket.id]);
      
      // 사용자 업적 추적 테이블 업데이트
      const bucketInfo = await client.query(
        'SELECT is_challenge FROM saving_bucket.list WHERE id = $1',
        [bucket.id]
      );
      const isChallenge = bucketInfo.rows[0]?.is_challenge;
      
      if (isChallenge) {
        // 챌린지 상품인 경우: 성공 적금통 + 챌린지 성공 모두 증가
        await client.query(`
          UPDATE users.metrics 
          SET 
            success_bucket_count = success_bucket_count + 1,
            challenge_success_count = challenge_success_count + 1,
            updated_at = NOW()
          WHERE user_id = $1
        `, [bucket.user_id]);
      } else {
        // 일반 상품인 경우: 성공 적금통만 증가
        await client.query(`
          UPDATE users.metrics 
          SET 
            success_bucket_count = success_bucket_count + 1,
            updated_at = NOW()
          WHERE user_id = $1
        `, [bucket.user_id]);
      }
      
      await client.query('COMMIT');
      
      return {
        action: 'MARKED_AS_SUCCESS',
        message: '적금통이 만료되어 성공 처리되었습니다.'
      };
    }
    
    // 5. 납입 정보가 변경되었는지 확인
    const hasChanged = (
      bucket.success_payment !== paymentData.successCount ||
      bucket.fail_payment !== paymentData.failCount
    );
    
    // 6. 변경사항이 있으면 DB 업데이트
    if (hasChanged) {
      await client.query(`
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
        bucket.id
      ]);
      
      await client.query('COMMIT');
      
      return {
        action: 'UPDATED_PAYMENTS',
        message: '납입 정보가 업데이트되었습니다.'
      };
    }
    
    // 7. 변경사항이 없으면 그대로 반환
    await client.query('COMMIT');
    
    return {
      action: 'NO_CHANGES',
      message: '최신 납입 내역입니다.'
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`동기화 실패 - Bucket ${bucket.id}:`, error.message);
    throw customError(500, '적금통 동기화 중 오류가 발생했습니다.');
  } finally {
    client.release();
  }
};

// ============== 납입 데이터 파싱 (cron과 동일한 로직) ==============
const parsePaymentResponse = (apiResponse) => {
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

// ============== 조회수 증가 서비스 ==============
export const incrementBucketViewCount = async (bucketId) => {
  try {
    await query(
      'UPDATE saving_bucket.list SET view_count = view_count + 1 WHERE id = $1',
      [bucketId]
    );
  } catch (error) {
    // 조회수 증가 실패해도 메인 로직에 영향 없도록 에러 무시
    console.warn(`조회수 증가 실패 - Bucket ${bucketId}:`, error.message);
  }
};

// ============== 적금통 해지 가능 여부 확인 ==============
export const validateBucketTermination = async (bucketId, userId) => {
  const result = await query(`
    SELECT 
      id, 
      user_id, 
      accountno, 
      accounttypecode as account_type_code,
      name, 
      status,
      target_amount
    FROM saving_bucket.list 
    WHERE id = $1
  `, [bucketId]);
  
  if (result.rows.length === 0) {
    throw customError(404, '존재하지 않는 적금통입니다.');
  }
  
  const bucket = result.rows[0];
  
  // 소유권 확인
  if (bucket.user_id !== userId) {
    throw customError(403, '해지 권한이 없습니다.');
  }
  
  // 상태 확인 (중복 처리 방지)
  if (bucket.status !== 'in_progress') {
    throw customError(400, `이미 ${bucket.status} 상태인 적금통은 해지할 수 없습니다.`);
  }
  
  // 계좌번호 확인
  if (!bucket.accountno) {
    throw customError(400, '계좌 정보가 없는 적금통입니다.');
  }
  
  return bucket;
};

// ============== 신한 API: 예금 계좌 해지 서비스 ==============
export const deleteShinhanDepositAccount = async (userKey, accountNo) => {
  const deleteResult = await shinhanRequestWithUser({
    path: '/edu/deposit/deleteDepositAccount',
    userKey,
    json: {
      accountNo
    }
  });
  
  return deleteResult;
};

// ============== 신한 API: 적금 계좌 해지 서비스 ==============
export const deleteShinhanSavingsAccount = async (userKey, accountNo) => {
  const deleteResult = await shinhanRequestWithUser({
    path: '/edu/savings/deleteAccount',
    userKey,
    json: {
      accountNo
    }
  });
  
  return deleteResult;
};

// ============== 중도 해지 완료 처리 ==============
export const completeBucketTermination = async (bucketId, deleteApiResponse) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. 적금통 상태 재확인 (동시성 제어)
    const bucketResult = await client.query(`
      SELECT id, status, name, user_id
      FROM saving_bucket.list 
      WHERE id = $1
      FOR UPDATE
    `, [bucketId]);
    
    
    if (bucketResult.rows.length === 0) {
      throw new Error('적금통을 찾을 수 없습니다.');
    }
    
    const bucket = bucketResult.rows[0];
    
    // 2. 이미 처리된 적금통인지 재확인
    if (bucket.status !== 'in_progress') {
      await client.query('ROLLBACK');
      throw customError(400, `이미 ${bucket.status} 상태로 처리된 적금통입니다.`);
    }
    
    // 3. 적금통을 실패 상태로 변경 및 계좌번호 삭제
    await client.query(`
      UPDATE saving_bucket.list 
      SET 
        status = 'failed',
        accountno = NULL
      WHERE id = $1
    `, [bucketId]);
    
    await client.query('COMMIT');
    
    // 4. 중도 해지 정보 로깅 (REC 구조로 수정)
    const withdrawalInfo = deleteApiResponse.REC;
    console.log(`💸 중도 해지 처리 완료 - Bucket ${bucketId} (${bucket.name})`);
    console.log(`   최종 환불 금액: ${withdrawalInfo.earlyTerminationBalance}원`);
    console.log(`   해지일: ${withdrawalInfo.earlyTerminationDate}`);
    
    return {
      success: true,
      bucket: {
        id: bucketId,
        name: bucket.name,
        user_id: bucket.user_id,
        status: 'failed'
      },
      refund: {
        total_balance: parseInt(withdrawalInfo.totalBalance),
        early_termination_interest: parseInt(withdrawalInfo.earlyTerminationInterest),
        early_termination_balance: parseInt(withdrawalInfo.earlyTerminationBalance),
        early_termination_date: withdrawalInfo.earlyTerminationDate,
        bank_info: {
          bank_code: withdrawalInfo.bankCode,
          bank_name: withdrawalInfo.bankName,
          account_no: withdrawalInfo.accountNo,
          account_name: withdrawalInfo.accountName
        }
      }
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`❌ 중도 해지 완료 처리 실패 - Bucket ${bucketId}:`, error.message);
    throw error;
  } finally {
    client.release();
  }
};

// ============== 챌린지 참여 기록 확인 (핵심 추상화 함수) ==============
export const checkChallengeParticipationHistory = async (userId, accountTypeUniqueNo) => {
  const participationQuery = `
    SELECT 
      sb.id,
      sb.name,
      sb.status,
      sb.created_at
    FROM saving_bucket.list sb
    WHERE sb.user_id = $1 
      AND sb.accounttypeuniqueNo = $2
      AND sb.is_challenge = true
    LIMIT 1  -- 존재 여부만 확인
  `;
  
  const result = await query(participationQuery, [userId, accountTypeUniqueNo]);
  
  if (result.rows.length === 0) {
    return {
      has_participated: false,
      can_participate: true,
      latest_participation: null
    };
  }
  
  const latestParticipation = result.rows[0];
  
  return {
    has_participated: true,
    can_participate: false, // 한 번이라도 참여했으면 불가
    latest_participation: latestParticipation
  };
};

// ============== 상품에 챌린지 참여 정보 추가하는 함수 ==============
export const enrichProductsWithParticipationStatus = async (products, userId) => {
  const enrichedProducts = [];
  
  for (const product of products) {
    // 챌린지 상품인지 확인
    const isChallenge = extractIsChallengeFromDescription(product.accountDescription);
    
    let participationStatus = null;
    
    if (isChallenge && userId) {
      // 챌린지 상품이고 로그인한 사용자인 경우 참여 기록 확인
      participationStatus = await checkChallengeParticipationHistory(userId, product.accountTypeUniqueNo);
    }
    
    enrichedProducts.push({
      ...product,
      is_challenge: isChallenge,
      participation_status: participationStatus
    });
  }
  
  return enrichedProducts;
};

// ============== 챌린지 중복 참여 검증 함수 (수정) ==============
export const validateChallengeParticipationOnCreate = async (userId, accountTypeUniqueNo, productInfo) => {
  // 1. 챌린지 상품이 아니면 검증 통과
  if (!extractIsChallengeFromDescription(productInfo.accountDescription)) {
    return true;
  }
  
  // 2. 참여 기록 확인 (추상화된 함수 사용)
  const participationStatus = await checkChallengeParticipationHistory(userId, accountTypeUniqueNo);
  
  if (participationStatus.has_participated) {
    const latest = participationStatus.latest_participation;
    const statusText = {
      'in_progress': '진행 중',
      'success': '완료',
      'failed': '실패'
    }[latest.status] || latest.status;
    
    throw customError(409, 
      `이미 해당 챌린지에 참여한 기록이 있습니다. ` +
      `이전 참여: "${latest.name}" (${statusText}) - ` +
      `진행률: ${latest.progress_rate}%. ` +
      `각 챌린지는 1회만 참여 가능합니다.`
    );
  }
  
  return true;
};

// ============== 적금통 좋아요 토글 서비스 ==============
export const toggleBucketLike = async (bucketId, userId) => {
  // 1. 적금통 정보 + 좋아요 상태를 한 번에 조회
  const combinedResult = await query(`
    SELECT 
      sb.id,
      sb.user_id,
      sb.name,
      sb.is_public,
      sb.status,
      sb.like_count,
      CASE WHEN sbl.id IS NOT NULL THEN true ELSE false END as is_currently_liked,
      sbl.id as like_record_id,
      sbl.created_at as liked_at
    FROM saving_bucket.list sb
    LEFT JOIN saving_bucket.like sbl ON sb.id = sbl.bucket_id AND sbl.user_id = $2
    WHERE sb.id = $1
  `, [bucketId, userId]);
  
  if (combinedResult.rows.length === 0) {
    throw customError(404, '존재하지 않는 적금통입니다.');
  }
  
  const bucketInfo = combinedResult.rows[0];
  
  // 2. 검증 로직
  if (!bucketInfo.is_public) {
    throw customError(403, '비공개 적금통에는 좋아요를 누를 수 없습니다.');
  }

  const isCurrentlyLiked = bucketInfo.is_currently_liked;
  let action;
  let newLikeCount;
  
  if (isCurrentlyLiked) {
    // 3-A. 좋아요 취소 (단일 쿼리)
    const removeResult = await query(`
      WITH deleted_like AS (
        DELETE FROM saving_bucket.like 
        WHERE bucket_id = $1 AND user_id = $2
        RETURNING bucket_id
      ),
      updated_bucket AS (
        UPDATE saving_bucket.list 
        SET like_count = like_count - 1 
        WHERE id = $1 AND EXISTS(SELECT 1 FROM deleted_like)
        RETURNING like_count
      )
      SELECT like_count FROM updated_bucket
    `, [bucketId, userId]);
    
    action = 'removed';
    newLikeCount = removeResult.rows[0]?.like_count ?? bucketInfo.like_count - 1;
    
  } else {
    // 3-B. 좋아요 추가 (단일 쿼리)
    const addResult = await query(`
      WITH inserted_like AS (
        INSERT INTO saving_bucket.like (bucket_id, user_id) 
        VALUES ($1, $2)
        RETURNING bucket_id
      ),
      updated_bucket AS (
        UPDATE saving_bucket.list 
        SET like_count = like_count + 1 
        WHERE id = $1 AND EXISTS(SELECT 1 FROM inserted_like)
        RETURNING like_count
      )
      SELECT like_count FROM updated_bucket
    `, [bucketId, userId]);
    
    action = 'added';
    newLikeCount = addResult.rows[0]?.like_count ?? bucketInfo.like_count + 1;
  }
  
  return {
    success: true,
    action,
    bucket: {
      id: bucketId,
      name: bucketInfo.name,
      like_count: newLikeCount,
      owner_id: bucketInfo.user_id
    },
    is_liked: !isCurrentlyLiked // 새로운 상태
  };
};

// ============== 적금통 댓글 달기 ==============
export const createBucketComment = async (bucketId, userId, content) => {
  const client = await pool.connect();

  // 1. 적금통 존재 및 공개 여부 확인
    const bucketResult = await client.query(`
      SELECT 
        id, 
        user_id, 
        name, 
        is_public, 
        status
      FROM saving_bucket.list 
      WHERE id = $1
    `, [bucketId]);

    if (bucketResult.rows.length === 0) {
      throw customError(404, '존재하지 않는 적금통입니다.');
    }
    
    const bucket = bucketResult.rows[0];
    
    // 2. 공개 적금통만 댓글 작성 가능
    if (!bucket.is_public) {
      throw customError(403, '비공개 적금통에는 댓글을 작성할 수 없습니다.');
    }

    // 3. 댓글 생성
    const commentResult = await client.query(`
      INSERT INTO saving_bucket.comment (bucket_id, user_id, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [bucketId, userId, content]);
    
    const newComment = commentResult.rows[0];

  return {
    bucket,
    comment: newComment
  };
};


// ============== 댓글 상세 정보 조회 서비스 ==============
export const getCommentWithUserInfo = async (commentId) => {
  const commentQuery = `
    SELECT 
      c.id,
      c.content,
      c.created_at,
      c.bucket_id,
      
      -- 작성자 정보
      u.id as author_id,
      u.nickname as author_nickname,
      uni.name as author_university,
      
      -- 작성자 캐릭터 정보
      uc.character_item_id,
      uc.outfit_item_id,
      uc.hat_item_id,
      char_item.name as character_name,
      outfit_item.name as outfit_name,
      hat_item.name as hat_name,
      
      -- 적금통 소유자 정보 (알림용)
      sb.user_id as bucket_owner_id,
      sb.name as bucket_name
      
    FROM saving_bucket.comment c
    LEFT JOIN users.list u ON c.user_id = u.id
    LEFT JOIN users.university uni ON u.university_id = uni.id
    LEFT JOIN users.character uc ON u.id = uc.user_id
    LEFT JOIN cosmetic_item.list char_item ON uc.character_item_id = char_item.id
    LEFT JOIN cosmetic_item.list outfit_item ON uc.outfit_item_id = outfit_item.id
    LEFT JOIN cosmetic_item.list hat_item ON uc.hat_item_id = hat_item.id
    LEFT JOIN saving_bucket.list sb ON c.bucket_id = sb.id
    WHERE c.id = $1
  `;
  
  const result = await query(commentQuery, [commentId]);
  
  if (result.rows.length === 0) {
    throw customError(404, '댓글을 찾을 수 없습니다.');
  }
  
  const commentData = result.rows[0];
  
  return {
    id: commentData.id,
    content: commentData.content,
    created_at: commentData.created_at,
    bucket_id: commentData.bucket_id,
    bucket_name: commentData.bucket_name,
    bucket_owner_id: commentData.bucket_owner_id,
    author: {
      id: commentData.author_id,
      nickname: commentData.author_nickname,
      university: commentData.author_university,
      character: {
        character_item: {
          id: commentData.character_item_id,
          name: commentData.character_name
        },
        outfit_item: {
          id: commentData.outfit_item_id,
          name: commentData.outfit_name
        },
        hat_item: {
          id: commentData.hat_item_id,
          name: commentData.hat_name
        }
      }
    }
  };
};

// ============== 댓글 수정 서비스 ==============
export const updateBucketComment = async (commentId, userId, newContent) => {
  // 1. 댓글 존재 및 소유권 확인
  const commentResult = await query(`
    SELECT 
      c.id,
      c.user_id,
      c.content,
      c.bucket_id,
      c.created_at,
      sb.is_public
    FROM saving_bucket.comment c
    LEFT JOIN saving_bucket.list sb ON c.bucket_id = sb.id
    WHERE c.id = $1
  `, [commentId]);
  
  if (commentResult.rows.length === 0) {
    throw customError(404, '존재하지 않는 댓글입니다.');
  }
  
  const comment = commentResult.rows[0];
  
  // 2. 소유권 확인
  if (comment.user_id !== userId) {
    throw customError(403, '댓글 수정 권한이 없습니다.');
  }
  
  // 3. 적금통이 비공개로 변경되었는지 확인
  if (!comment.is_public) {
    throw customError(403, '비공개 적금통의 댓글은 수정할 수 없습니다.');
  }
  
  // 4. 댓글 내용 업데이트
  const updateResult = await query(`
    UPDATE saving_bucket.comment 
    SET content = $1
    WHERE id = $2 AND user_id = $3
    RETURNING *
  `, [newContent, commentId, userId]);
  
  // 5. 수정된 댓글 상세 정보 조회
  const updatedCommentInfo = await getCommentWithUserInfo(commentId);
  
  return updatedCommentInfo;
};

// ============== 댓글 삭제 서비스 ==============
export const deleteBucketComment = async (commentId, userId) => {
  // 1. 댓글 존재 및 소유권 확인
  const commentResult = await query(`
    SELECT 
      c.id,
      c.user_id,
      c.content,
      c.bucket_id,
      c.created_at
    FROM saving_bucket.comment c
    WHERE c.id = $1
  `, [commentId]);
  
  if (commentResult.rows.length === 0) {
    throw customError(404, '존재하지 않는 댓글입니다.');
  }
  
  const comment = commentResult.rows[0];
  
  // 2. 소유권 확인
  if (comment.user_id !== userId) {
    throw customError(403, '댓글 삭제 권한이 없습니다.');
  }
  
  // 3. 댓글 삭제
  await query(`
    DELETE FROM saving_bucket.comment 
    WHERE id = $1 AND user_id = $2
  `, [commentId, userId]);
  
  return {
    id: comment.id,
    content: comment.content,
    created_at: comment.created_at,
    bucket_id: comment.bucket_id
  };
};