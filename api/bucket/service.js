import { createShinhanService } from '../util/serviceHelpers.js';
import { query } from '../database/postgreSQL.js';

export const inquireSavingsProducts = createShinhanService({
  apiPath: '/edu/savings/inquireSavingsProducts'
});
