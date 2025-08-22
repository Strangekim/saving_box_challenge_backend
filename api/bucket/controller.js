import { trycatchWrapper } from '../util/trycatchWrapper.js';
import { getAllProducts, validateBucketCreation } from './service.js';

// ============== 예금+적금 통합 상품 목록 조회 ==============
export const inquireAllProducts = trycatchWrapper(async (req, res) => {
  const products = await getAllProducts();
  
  res.status(200).json(products);
});

// ============== 적금통 생성 ==============
export const createBucket = trycatchWrapper(async (req, res) => {
  const { accountTypeUniqueNo, target_amount } = req.body;
  
  // 1. 상품 존재 및 금액 범위 검증
  const selectedProduct = await validateBucketCreation(accountTypeUniqueNo, target_amount);
  
  // TODO: 실제 적금통 생성 로직 구현
  // - DB에 적금통 정보 저장
  // - 신한 API로 실제 계좌 생성
  // - 사용자 보유 아이템 검증 등...
  
  res.status(201).json({
    message: '적금통 생성이 완료되었습니다.',
    product: selectedProduct
  });
});