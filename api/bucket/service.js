import { shinhanRequest } from "../externalAPI/makeHeader";
import { customError } from "../util/customError";

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
