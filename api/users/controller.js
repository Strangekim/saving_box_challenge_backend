// api/users/controller.js
import { pool } from '../database/postgreSQL.js';
import { trycatchWrapper } from '../util/trycatchWrapper.js';
import { generateUniqueNickname } from '../util/nicknameGenerator.js';
import { encrypt } from '../util/encryption.js';
import {
  // 회원가입 관련
  checkShinhanAccountExists,
  createShinhanAccount,
  createBankAccount,
  depositWelcomeMoney,
  createUserData,
  initializeUserMetrics,
  setupDefaultItems,
  // 로그인 관련
  findUserByEmail,
  createUserSession,
  // 로그아웃 관련
  checkUserSession,
  destroyUserSession
} from './service.js';

// ============== 회원가입 컨트롤러 ==============

export const signUp = trycatchWrapper(async (req, res) => {
  const { email } = req.body;
  const client = await pool.connect();

  try {
    // 1. 신한 계정 중복 체크
    await checkShinhanAccountExists(email);

    // 2. 신한 계정 생성
    const createResult = await createShinhanAccount(email);

    // 3. 계좌 생성
    const accountResult = await createBankAccount(createResult.userKey);

    // 4. 테스트용 1억원 입금
    await depositWelcomeMoney(createResult.userKey, accountResult.REC.accountNo);

    // 5. DB 트랜잭션 시작
    await client.query('BEGIN');

    // 6. 랜덤 닉네임 및 대학 준비
    const nickname = await generateUniqueNickname();
    const universityResult = await client.query(
      'SELECT id, name FROM users.university ORDER BY RANDOM() LIMIT 1'
    );
    const randomUniversity = universityResult.rows[0];

    // 7. userKey 암호화
    const encryptedUserKey = encrypt(createResult.userKey);

    // 8. 사용자 기본 정보 생성
    const user = await createUserData(client, {
      email: createResult.userId,
      nickname,
      encryptedUserKey,
      accountNo: accountResult.REC.accountNo,
      universityId: randomUniversity.id
    });

    // 9. 사용자 업적 추적 초기화
    await initializeUserMetrics(client, user.id);

    // 10. 기본 아이템 지급 및 장착
    await setupDefaultItems(client, user.id);
    
    // 11. 트랜잭션 커밋
    await client.query('COMMIT');

    // 12. 성공 응답
    res.status(201).json({
      message: '회원가입, 계좌 생성 및 1억원 입금이 완료되었습니다',
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        accountNo: user.withdrawalaccountno,
        university: randomUniversity.name
      }
    });

  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
});

// ============== 로그인 컨트롤러 ==============
export const logIn = trycatchWrapper(async (req, res) => {
  const { email } = req.body;
  
  // 1. DB에서 사용자 찾기
  const user = await findUserByEmail(email);
  
  // 2. 세션 생성 및 응답 데이터 준비
  const responseUser = createUserSession(req, user);
  
  // 3. 성공 응답
  res.json({ 
    message: '로그인 성공', 
    user: responseUser 
  });
});

// ============== 로그아웃 컨트롤러 ==============
export const logOut = trycatchWrapper(async (req, res) => {
  // 1. 세션 존재 확인
  checkUserSession(req);
  
  // 2. 세션 삭제
  await destroyUserSession(req, res);
  
  // 3. 성공 응답
  res.status(200).json({
    message: '로그아웃이 완료되었습니다'
  });
});