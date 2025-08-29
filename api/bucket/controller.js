import { trycatchWrapper } from '../util/trycatchWrapper.js';
import { customError } from '../util/customError.js';
import { 
  handleBucketCreationAchievement,
  handleLikeAchievement,
  handleCommentAchievement
} from '../util/achievementMiddleware.js';
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
    getSavingsPaymentHistory,
    syncBucketDetailData,
    getBucketDetailInfo,
    incrementBucketViewCount,
    validateBucketTermination,
    deleteShinhanDepositAccount,
    deleteShinhanSavingsAccount,
    completeBucketTermination,
    enrichProductsWithParticipationStatus,
    validateChallengeParticipationOnCreate,
    toggleBucketLike,
    createBucketComment,
    getCommentWithUserInfo,
    updateBucketComment,
    deleteBucketComment,
    createDepositAccount
} from './service.js';

const { processUserAction } = await import('../util/achievementService.js');
const { notifyAchievement } = await import('../util/notification/index.js');

// ============== 제외할 상품 목록 전역 관리 ==============
const EXCLUDED_PRODUCTS = {
  // 제외할 은행 코드들
  bankCodes: [
    "001"  // 한국은행
  ],
  
  // 제외할 특정 상품 고유번호들
  accountTypeUniqueNos: [
    "088-3-e4b8d1dbedd141"  // 특정 적금 상품
  ],
  
  // 제외 사유 메시지
  exclusionReasons: {
    "001": "한국은행 상품은 사용할 수 없습니다.",
    "088-3-e4b8d1dbedd141": "해당 적금 상품은 현재 이용할 수 없습니다."
  }
};

// ============== 상품 필터링 헬퍼 함수 ==============
const filterExcludedProducts = (products) => {
  return products.filter(product => {
    // 은행 코드로 제외
    if (EXCLUDED_PRODUCTS.bankCodes.includes(product.bankCode)) {
      return false;
    }
    
    // 특정 상품 고유번호로 제외
    if (EXCLUDED_PRODUCTS.accountTypeUniqueNos.includes(product.accountTypeUniqueNo)) {
      return false;
    }
    
    return true;
  });
};

// ============== 제외된 상품 검증 헬퍼 함수 ==============
const validateProductNotExcluded = (product) => {
  // 은행 코드 체크
  if (EXCLUDED_PRODUCTS.bankCodes.includes(product.bankCode)) {
    const reason = EXCLUDED_PRODUCTS.exclusionReasons[product.bankCode] || 
                  "해당 은행의 상품은 사용할 수 없습니다.";
    throw customError(400, reason);
  }
  
  // 특정 상품 고유번호 체크
  if (EXCLUDED_PRODUCTS.accountTypeUniqueNos.includes(product.accountTypeUniqueNo)) {
    const reason = EXCLUDED_PRODUCTS.exclusionReasons[product.accountTypeUniqueNo] || 
                  "해당 상품은 현재 이용할 수 없습니다.";
    throw customError(400, reason);
  }
  
  return true;
};

// ============== 챌린지 상품 판별 헬퍼 함수 ==============
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

// api/bucket/controller.js - 예적금 상품 목록 조회 컨트롤러 
export const inquireAllProducts = trycatchWrapper(async (req, res) => {
  const userId = req.session?.userId;
  
  // 로그인 필수로 변경
  if (!userId) {
    throw customError(401, '상품 목록을 조회하려면 로그인이 필요합니다.');
  }
  
  // 1. 모든 상품 조회
  const allProducts = await getAllProducts();
  
  // 2. 제외할 상품들 필터링
  const filteredProducts = filterExcludedProducts(allProducts);
  
  // 3. 챌린지 참여 정보 추가
  const productsWithStatus = await enrichProductsWithParticipationStatus(filteredProducts, userId);
  
  res.status(200).json(productsWithStatus);
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
  const userId = req.session.userId; 
  
  // 1. 상품 존재 및 금액 범위 검증
  const selectedProduct = await validateBucketCreation(accountTypeUniqueNo, target_amount);

  // 2. 제외된 상품인지 검증
  validateProductNotExcluded(selectedProduct);

  // 3. 챌린지 중복 참여 검증
  await validateChallengeParticipationOnCreate(userId, accountTypeUniqueNo, selectedProduct);

  // 4. 사용자 아이템 보유 검증
  await validateUserItems(userId, character_item_id, outfit_item_id, hat_item_id);
  
  // 5. 상품 타입에 따른 계좌 생성
  let accountInfo;
  const accountTypeCode = selectedProduct.accountTypeCode;
  
  if (accountTypeCode === '3') {
    // 적금 계좌 생성
    accountInfo = await createSavingsAccount(userId, accountTypeUniqueNo, target_amount);
  } else if (accountTypeCode === '2') {
    // 예금 계좌 생성
    accountInfo = await createDepositAccount(userId, accountTypeUniqueNo, target_amount);
  } else {
    throw customError(400, '지원하지 않는 계좌 타입입니다.');
  }
  
  // 6. DB에 적금통 정보 저장
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

  // 7. 일반 응답 데이터 준비
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

  // 8. 업적 처리 및 응답 가로채기 시도 (기존 데이터 포함)
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

  // my_liked 카테고리인데 로그인하지 않은 경우 에러 응답
  if (category === 'my_liked' && !userId) {
    return res.status(401).json({
      message: '내가 좋아요 누른 목록을 보려면 로그인이 필요합니다.',
      category,
      buckets: [],
      pagination: {
        page,
        limit: 5,
        total: 0,
        has_next: false
      }
    });
  }
  
  // 1. 적금통 목록 조회
  const buckets = await getBucketList(category, page, userId);
  
  // 2. 전체 개수 조회
  const total = await getBucketListCount();
  
  // 3. 응답 데이터 포맷팅
  const response = formatBucketListResponse(buckets, total, page, category);
  
  // 4. 성공 응답
  res.status(200).json(response);
});

// ============== 적금통 상세보기 (실시간 동기화 포함) ==============
export const getBucketDetailController = trycatchWrapper(async (req, res) => {
  const bucketId = parseInt(req.params.id);
  const userId = req.session?.userId || null; // 로그인한 경우만 사용자 ID 가져오기
  
  // 1. 적금통 존재 확인 및 기본 정보 조회
  const bucket = await getBucketById(bucketId);
  
  // 2. 공개 적금통이 아닌 경우 접근 제한
  if (!bucket.is_public) {
    // 본인 적금통이 아닌 경우 접근 금지
    if (!userId || bucket.user_id !== userId) {
      throw customError(403, '비공개 적금통입니다.');
    }
  }
  // 3. 조회수 증가 (단순하게)
  await incrementBucketViewCount(bucketId);
  
  // 4. 적금통이 활성 상태가 아닌 경우 (완료/실패 상태)
  if (bucket.status !== 'in_progress') {
    // 비활성 상태면 기본 정보 + 댓글 반환 (신한 API 호출 없음)
    const bucketDetailInfo = await getBucketDetailInfo(bucketId, userId);
    return res.status(200).json({
      ...bucketDetailInfo,
      sync_status: 'inactive',
      message: `${bucket.status === 'success' ? '완료된' : '실패한'} 적금통입니다.`
    });
  }
  
  // 5. 적금통이 활성 상태인데 계좌번호가 없는 경우
  if (!bucket.account_no) {
    throw customError(400, '계좌 정보가 없는 적금통입니다.');
  }
  
  // 6. 실시간 동기화 수행
  // const syncResult = await syncBucketDetailData(bucket);
  
  // 7. 동기화 후 최신 상태의 적금통 상세 정보 조회
  const bucketDetailInfo = await getBucketDetailInfo(bucketId, userId);
  
  // 8. 동기화 결과와 상세 정보를 합쳐서 응답
  res.status(200).json(bucketDetailInfo);
});

// ============== 적금통 중도 해지 ==============
export const terminateBucket = trycatchWrapper(async (req, res) => {
  const bucketId = parseInt(req.params.id);
  const userId = req.session.userId;
  
  // 1. 적금통 해지 가능 여부 확인 및 정보 조회
  const bucket = await validateBucketTermination(bucketId, userId);
  
  // 2. 사용자 userKey 조회
  const userKey = await getBucketOwnerUserKey(bucket.user_id);
  
  // 3. 계좌 타입에 따른 해지 API 호출
  let deleteResult;
  let accountType;
  
  if (bucket.account_type_code === '2') {
    // 예금 계좌 해지
    accountType = 'deposit';
    deleteResult = await deleteShinhanDepositAccount(userKey, bucket.accountno);
  } else if (bucket.account_type_code === '3') {
    // 적금 계좌 해지
    accountType = 'savings';
    deleteResult = await deleteShinhanSavingsAccount(userKey, bucket.accountno);
  } else {
    throw customError(400, '알 수 없는 계좌 타입입니다.');
  }
  
  console.log('🔍 해지 API 응답:', deleteResult);
  
  // 4. 해지 API 호출 성공 확인 (REC 구조로 수정)
  if (!deleteResult.REC || deleteResult.REC.status !== 'CLOSED') {
    throw customError(500, '계좌 해지 처리 중 오류가 발생했습니다.');
  }
  
  // 5. DB에서 적금통 실패 처리 및 계좌번호 삭제
  const terminationResult = await completeBucketTermination(bucketId, deleteResult);
  
  // 6. 성공 응답
  res.status(200).json({
    success: true,
    message: '적금통 중도 해지가 완료되었습니다.',
    account_type: accountType,
    ...terminationResult
  });
});

// ============== 적금통 좋아요 토글 (최적화 버전) ==============
export const toggleBucketLikeController = trycatchWrapper(async (req, res) => {
  const bucketId = parseInt(req.params.id);
  const userId = req.session.userId; 
  
  // 1. 좋아요 토글 처리
  const result = await toggleBucketLike(bucketId, userId);
  
  // 2. 좋아요를 새로 추가한 경우에만 업적 처리
  if (result.action === 'added') {
    // 2-1. 좋아요를 받은 사람의 업적 처리 (본인이 아닌 경우만)
    if (result.bucket.owner_id !== userId) {
      try {
        const achievementResult = await processUserAction(result.bucket.owner_id, 'receive_like', {
          bucketId: bucketId,
          likerId: userId
        });
        
        // 업적 달성 시에만 알림 생성
        if (achievementResult.newAchievements && achievementResult.newAchievements.length > 0) {
          for (const unlock of achievementResult.newAchievements) {
            await notifyAchievement(result.bucket.owner_id, {
              achievementId: unlock.achievement.id,
              achievementTitle: unlock.achievement.title,
              achievementCode: unlock.achievement.code
            });
          }
        }
      } catch (achievementError) {
        console.error('좋아요 받기 업적 처리 실패:', achievementError);
        // 업적 처리 실패해도 좋아요 기능은 정상 동작
      }
    }
    
    // 2-2. 좋아요를 누른 사람의 업적 처리 (기존 로직 유지)
    const achievementHandled = await handleLikeAchievement(req, res, {
      bucketId: bucketId,
      targetUserId: result.bucket.owner_id
    });
    
    if (achievementHandled) {
      return; // 업적 응답이 전송됨
    }
  }
  
  // 3. 일반 응답
  const statusCode = result.action === 'added' ? 201 : 200;
  const message = result.action === 'added' ? 
    '좋아요를 눌렀습니다.' : '좋아요를 취소했습니다.';
  
  res.status(statusCode).json({
    success: true,
    message,
    action: result.action,
    bucket: result.bucket,
    is_liked: result.is_liked
  });
});

// ============== 적금통 댓글 생성 ==============
export const createBucketCommentController = trycatchWrapper(async (req, res) => {
  const bucketId = parseInt(req.params.id);
  const userId = req.session.userId;
  const { content } = req.body;
  
  // 1. 댓글 생성
  const { bucket, comment } = await createBucketComment(bucketId, userId, content);
  
  // 2. 댓글 상세 정보 조회 (작성자 정보 포함)
  const commentWithUserInfo = await getCommentWithUserInfo(comment.id);
  
  // 3. 적금통 소유자에게 알림 생성 (본인 댓글이 아닌 경우만)
  if (bucket.user_id !== userId) {
    try {
      await notifyComment(bucket.user_id, {
        bucketId: bucket.id,
        commentId: comment.id,
        commenterId: userId,
        commenterName: commentWithUserInfo.author.nickname,
        bucketName: bucket.name,
        commentContent: content
      });
    } catch (notifyError) {
      console.error('댓글 알림 생성 실패:', notifyError);
      // 알림 실패해도 댓글 생성은 성공으로 처리
    }
  }
  
  // 4. 일반 응답 데이터 준비
  const responseData = {
    success: true,
    message: '댓글이 성공적으로 작성되었습니다.',
    comment: commentWithUserInfo
  };
  
  // 5. 댓글 작성 업적 처리 및 응답 가로채기 시도
  const achievementHandled = await handleCommentAchievement(req, res, {
    id: comment.id,
    bucketId: bucket.id,
    content : content
  });
  
  // 6. 업적이 달성되지 않았으면 일반 응답
  if (!achievementHandled) {
    res.status(201).json(responseData);
  }
});

// ============== 댓글 수정 컨트롤러 ==============
export const updateBucketCommentController = trycatchWrapper(async (req, res) => {
  const bucketId = parseInt(req.params.id);
  const commentId = parseInt(req.params.commentId);
  const userId = req.session.userId;
  const { content } = req.body;
  
  // 1. 댓글 수정 처리
  const updatedComment = await updateBucketComment(commentId, userId, content);
  
  // 2. 성공 응답
  res.status(200).json({
    success: true,
    message: '댓글이 성공적으로 수정되었습니다.',
    comment: updatedComment
  });
});

// ============== 댓글 삭제 컨트롤러 ==============
export const deleteBucketCommentController = trycatchWrapper(async (req, res) => {
  const bucketId = parseInt(req.params.id);
  const commentId = parseInt(req.params.commentId);
  const userId = req.session.userId;
  
  // 1. 댓글 삭제 처리
  const deletedComment = await deleteBucketComment(commentId, userId);
  
  // 2. 성공 응답
  res.status(200).json({
    success: true,
    message: '댓글이 성공적으로 삭제되었습니다.',
    deletedComment: {
      id: deletedComment.id,
      content: deletedComment.content,
      created_at: deletedComment.created_at,
      bucket_id: deletedComment.bucket_id
    }
  });
});