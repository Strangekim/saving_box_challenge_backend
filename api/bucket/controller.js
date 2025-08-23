import { trycatchWrapper } from '../util/trycatchWrapper.js';
import { handleBucketCreationAchievement } from '../util/achievementMiddleware.js';
import { 
    getAllProducts, 
    validateBucketCreation,
    createSavingsAccount,
    validateUserItems,
    saveBucketToDatabase,
    validateBucketOwnership,
    updateBucketInDatabase,
    getBucketList,
    getBucketListCount,
    formatBucketListResponse,
    getBucketById,
    getBucketOwnerUserKey,
    getSavingsPaymentHistory
} from './service.js';

// ============== 예금+적금 통합 상품 목록 조회 ==============
export const inquireAllProducts = trycatchWrapper(async (req, res) => {
  const allProducts = await getAllProducts();
  
  // 제외할 상품들
  const excludedProducts = [
    "001",  // 한국은행 bankCode
    "088-3-e4b8d1dbedd141"  // 특정 적금 상품 accountTypeUniqueNo
  ];
  
  // 한국은행(bankCode: "001") 및 특정 적금 상품 제외
  const filteredProducts = allProducts.filter(product => 
    product.bankCode !== "001" && 
    product.accountTypeUniqueNo !== "088-3-e4b8d1dbedd141"
  );
  
  res.status(200).json(filteredProducts);
});

// ============== 적금통 생성 ==============
export const createBucket = trycatchWrapper(async (req, res) => {
  const { 
    accountTypeUniqueNo, 
    target_amount, 
    name,
    description,
    deposit_cycle,
    is_public,
    character_item_id,
    outfit_item_id,
    hat_item_id 
  } = req.body;
  const userId = req.session.userId; // 세션에서 사용자 ID 가져오기
  
  // 1. 상품 존재 및 금액 범위 검증
  const selectedProduct = await validateBucketCreation(accountTypeUniqueNo, target_amount);

  // 2. 사용자 아이템 보유 검증
  await validateUserItems(userId, character_item_id, outfit_item_id, hat_item_id);
  
  // 3. 신한 적금 계좌 생성
  const accountInfo = await createSavingsAccount(userId, accountTypeUniqueNo, target_amount);
  
  // 4. DB에 적금통 정보 저장
  const bucketData = {
    userId,
    name,
    description,
    target_amount,
    deposit_cycle,
    is_public,
    character_item_id,
    outfit_item_id,
    hat_item_id
  };

  const savedBucket = await saveBucketToDatabase(bucketData, selectedProduct, accountInfo.accountNo);

  // 5. 일반 응답 데이터 준비
  const responseData = {
    success: true,
    message: '적금통 생성이 완료되었습니다.',
    bucket: {
      id: savedBucket.id,
      name: savedBucket.name,
      accountNo: savedBucket.accountno,
      target_amount: savedBucket.target_amount,
      subscriptionPeriod: savedBucket.subscriptionperiod,
      deposit_cycle: savedBucket.deposit_cycle,
      total_payment: savedBucket.total_payment,
      is_challenge: savedBucket.is_challenge,
      product: {
        accountName: savedBucket.accountname,
        interestRate: savedBucket.interestrate,
        accountTypeCode: savedBucket.accounttypecode
      }
    }
  };

  // 6. 업적 처리 및 응답 가로채기 시도 (기존 데이터 포함)
  const achievementHandled = await handleBucketCreationAchievement(req, res, savedBucket, responseData);
  
  
  if (!achievementHandled) {
    console.log('📤 일반 응답 전송 시도 (201)');
    if (res.headersSent) {
      console.log('⚠️ 응답이 이미 전송됨! 201 응답 불가');
    } else {
      res.status(201).json(responseData);
      console.log('✅ 201 응답 전송 완료');
    }
  } else {
    console.log('🎉 업적 응답이 전송됨 - 일반 응답 생략');
  }
});

// ============== 적금통 수정 ==============
export const updateBucket = trycatchWrapper(async (req, res) => {
  const bucketId = parseInt(req.params.id);
  const userId = req.session.userId;
  const updateData = req.body;
  
  // 1. 적금통 존재 및 소유권 확인
  await validateBucketOwnership(bucketId, userId);
  
  // 2. 아이템 관련 업데이트가 있는 경우에만 검증
  const hasItemUpdates = updateData.character_item_id || 
                        updateData.outfit_item_id || 
                        updateData.hat_item_id;
  
  if (hasItemUpdates) {
    // 모든 아이템 ID가 제공되었는지 확인
    if (!updateData.character_item_id || !updateData.outfit_item_id || !updateData.hat_item_id) {
      throw customError(400, '아이템을 변경할 때는 캐릭터, 한벌옷, 모자를 모두 선택해야 합니다.');
    }
    
    // 3. 사용자 아이템 보유 검증 (기존 함수 재사용)
    await validateUserItems(
      userId, 
      updateData.character_item_id, 
      updateData.outfit_item_id, 
      updateData.hat_item_id
    );
  }
  
  // 4. 적금통 정보 업데이트
  const updatedBucket = await updateBucketInDatabase(bucketId, updateData);
  
  // 5. 성공 응답
  res.status(200).json({
    success: true,
    message: '적금통 정보가 성공적으로 수정되었습니다.',
    bucket: {
      id: updatedBucket.id,
      name: updatedBucket.name,
      description: updatedBucket.description,
      character_item_id: updatedBucket.character_item_id,
      outfit_item_id: updatedBucket.outfit_item_id,
      hat_item_id: updatedBucket.hat_item_id
    }
  });
});

// ============== 적금통 목록 조회 ==============
export const getBucketListController = trycatchWrapper(async (req, res) => {
  const { category, page } = req.query;
  const userId = req.session?.userId || null; // 로그인한 경우만 사용자 ID 가져오기
  
  // 1. 적금통 목록 조회
  const buckets = await getBucketList(category, page, userId);
  
  // 2. 전체 개수 조회
  const total = await getBucketListCount();
  
  // 3. 응답 데이터 포맷팅
  const response = formatBucketListResponse(buckets, total, page);
  
  // 4. 성공 응답
  res.status(200).json(response);
});

// ============== 적금통 상세보기 ==============
export const getBucketDetailController = trycatchWrapper(async (req, res) => {
  const bucketId = parseInt(req.params.id);
  
  // 1. 적금통 존재 확인 및 기본 정보 조회
  const bucket = await getBucketById(bucketId);
  
  // 2. 공개 적금통이 아닌 경우 접근 제한 (선택사항)
  // if (!bucket.is_public) {
  //   throw customError(403, '비공개 적금통입니다.');
  // }
  
  // 3. 적금통이 활성 상태가 아닌 경우 계좌번호가 없을 수 있음
  if (!bucket.account_no) {
    throw customError(400, '계좌 정보가 없는 적금통입니다.');
  }
  
  // 4. 적금통 소유자의 userKey 조회
  const userKey = await getBucketOwnerUserKey(bucket.user_id);
  
  // 5. 신한 API로 납입 내역 조회
  const paymentHistory = await getSavingsPaymentHistory(userKey, bucket.account_no);
  
  // 6. 신한 API 응답 그대로 반환
  res.status(200).json(paymentHistory);
});
