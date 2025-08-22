import { createShinhanService } from '../util/serviceHelpers.js';

// ============== 예,적금 목록 가져오기 ==============

export const inquireSavingsProducts = createShinhanService({
  apiPath: '/edu/savings/inquireSavingsProducts'
});
