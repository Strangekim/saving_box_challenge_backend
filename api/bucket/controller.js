import { trycatchWrapper } from '../util/trycatchWrapper.js';
import { handleBucketCreationAchievement } from '../util/achievementMiddleware.js';
import { 
    getAllProducts, 
    validateBucketCreation,
    createSavingsAccount,
    validateUserItems,
    saveBucketToDatabase
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