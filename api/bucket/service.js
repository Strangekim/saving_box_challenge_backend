import { shinhanRequest } from "../externalAPI/makeHeader.js";
import { shinhanRequestWithUser } from '../externalAPI/makeHeader.js';
import { customError } from "../util/customError.js";
import { query } from '../database/postgreSQL.js';
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

// ============== 사용자 아이템 보유 검증 서비스 ==============
export const validateUserItems = async (userId, characterItemId, outfitItemId, hatItemId) => {
  // 1. 입력받은 모든 아이템 ID들
  const itemIds = [characterItemId, outfitItemId, hatItemId];
  
  // 2. 사용자 가방에서 해당 아이템들 보유 여부 확인
  const result = await query(
    `SELECT item_id, item_type_id 
     FROM users.inventory 
     WHERE user_id = $1 AND item_id = ANY($2)`,
    [userId, itemIds]
  );
  
  const ownedItems = result.rows;
  const ownedItemIds = ownedItems.map(item => item.item_id);
  
  // 3. 보유하지 않은 아이템이 있는지 확인
  const missingItems = itemIds.filter(id => !ownedItemIds.includes(id));
  if (missingItems.length > 0) {
    throw customError(400, '보유하지 않은 아이템이 포함되어 있습니다.');
  }
  
  // 4. 아이템 타입별 검증 (캐릭터=1, 한벌옷=2, 모자=3)
  const itemTypeMap = {};
  ownedItems.forEach(item => {
    itemTypeMap[item.item_id] = item.item_type_id;
  });
  
  // 캐릭터 아이템 검증
  if (itemTypeMap[characterItemId] !== 1) {
    throw customError(400, '캐릭터 아이템이 올바르지 않습니다.');
  }
  
  // 한벌옷 아이템 검증
  if (itemTypeMap[outfitItemId] !== 2) {
    throw customError(400, '한벌옷 아이템이 올바르지 않습니다.');
  }
  
  // 모자 아이템 검증
  if (itemTypeMap[hatItemId] !== 3) {
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