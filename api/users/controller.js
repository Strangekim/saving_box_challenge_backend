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
  destroyUserSession,
  // 가방 관련
  getUserInventory,
  // 프로필 업데이트
  updateUserCharacter,
  // 내 정보 가져오기
  getUserProfile,
  // 내 적금통 목록 가져오기
  getMyBucketList,
  getMyBucketCount,
  formatMyBucketListResponse,
  // 닉네임 변경
  checkNickname,
  changeNickname,
  // 프로필 조회
  getOtherUserProfile,
  getOtherUserBucketList,
  getOtherUserBucketCount,
  formatOtherUserBucketListResponse
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

    // 선택된 대학의 랜덤 학과 선택
    const majorResult = await client.query(
      'SELECT id, name FROM users.major WHERE university_id = $1 ORDER BY RANDOM() LIMIT 1',
      [randomUniversity.id]
    );
    const randomMajor = majorResult.rows[0];

    // 7. userKey 암호화
    const encryptedUserKey = encrypt(createResult.userKey);

    // 8. 사용자 기본 정보 생성
    const user = await createUserData(client, {
      email: createResult.userId,
      nickname,
      encryptedUserKey,
      accountNo: accountResult.REC.accountNo,
      universityId: randomUniversity.id,
      majorId: randomMajor.id
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
        university: randomUniversity.name,
        major: randomMajor.name
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
  
  // 1. DB에서 사용자 찾기 (대학, 학과 정보 포함)
  const user = await findUserByEmail(email);
  
  // 2. 세션 생성 및 응답 데이터 준비 (대학, 학과 정보 포함)
  const responseUser = createUserSession(req, user);

  
  // 7. 성공 응답 (대학, 학과 정보 포함)
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

// ============== 사용자 가방 조회 ==============
export const getUserInventoryController = trycatchWrapper(async (req, res) => {
  const userId = req.session.userId;
  
  // 1. 전체 아이템 목록과 사용자 보유 정보 조회
  const inventoryData = await getUserInventory(userId);
  
  // 2. 성공 응답
  res.status(200).json({
    message: '가방 조회 성공',
    inventory: inventoryData
  });
});

// ============== 사용자 캐릭터 프로필 수정 ==============
export const updateUserCharacterController = trycatchWrapper(async (req, res) => {
  const userId = req.session.userId;
  let { character_item_id, outfit_item_id, hat_item_id } = req.body;
  
  // 캐릭터는 필수, 나머지는 선택적
  if (!character_item_id) {
    throw customError(400, '캐릭터 아이템은 필수로 선택해야 합니다.');
  }
  
  // 빈 값들을 null로 변환
  outfit_item_id = outfit_item_id || null;
  hat_item_id = hat_item_id || null;
  
  // 사용자 캐릭터 프로필 업데이트
  const updatedCharacter = await updateUserCharacter(userId, {
    character_item_id,
    outfit_item_id,
    hat_item_id
  });
  
  res.status(200).json({
    message: '캐릭터 프로필이 성공적으로 수정되었습니다.',
    character: updatedCharacter
  });
});
// ============== 내 정보 조회 ==============
export const getUserProfileController = trycatchWrapper(async (req, res) => {
  const userId = req.session.userId;
  
  // 1. 사용자 프로필 정보 조회
  const userProfile = await getUserProfile(userId);
  
  // 2. 성공 응답
  res.status(200).json({
    message: '프로필 조회 성공',
    user: userProfile
  });
});

// ============== 내 적금통 목록 조회 ==============
export const getMyBucketListController = trycatchWrapper(async (req, res) => {
  const userId = req.session.userId;
  const page = parseInt(req.query.page) || 1;
  
  // 1. 내 적금통 목록 조회
  const buckets = await getMyBucketList(userId, page);
  
  // 2. 내 적금통 통계 조회
  const counts = await getMyBucketCount(userId);
  
  // 3. 응답 데이터 포맷팅
  const response = formatMyBucketListResponse(buckets, counts, page);
  
  // 4. 성공 응답
  res.status(200).json({
    message: '내 적금통 목록 조회 성공',
    ...response
  });
});


// ============== 닉네임 변경 ==============
export const updateUserNicknameController = trycatchWrapper(async (req, res) => {
  const userId = req.session.userId;
  const { nickname } = req.body

  // 사용자가 변경하려는 닉네임이 기존에 있는지 확인
  await checkNickname(nickname, userId);

  // DB에서 닉네임 바꾸기
  const response = await changeNickname(userId, nickname)

  res.status(200).json({
    message: '닉네임 변경 성공',
    nickname : response.nickname
  });
});

// ============== 다른 사용자 정보 조회 컨트롤러 ==============
export const getOtherUserProfileController = trycatchWrapper(async (req, res) => {
  const targetUserId = parseInt(req.params.id);
  const currentUserId = req.session?.userId || null; // 로그인하지 않았을 수도 있음
  
  // 1. 사용자 프로필 정보 조회
  const userProfile = await getOtherUserProfile(targetUserId, currentUserId);
  
  // 2. 본인 조회인지 다른 사용자 조회인지에 따른 메시지 설정
  const isSelf = currentUserId && currentUserId === targetUserId;
  const message = isSelf ? '내 프로필 조회 성공' : '사용자 프로필 조회 성공';
  
  // 3. 성공 응답
  res.status(200).json({
    message,
    user: userProfile
  });
});

// ============== 다른 사용자의 적금통 목록 조회 컨트롤러 ==============
export const getOtherUserBucketListController = trycatchWrapper(async (req, res) => {
  const targetUserId = parseInt(req.params.id);
  const page = parseInt(req.query.page) || 1;
  const currentUserId = req.session?.userId || null;
  
  // 1. 다른 사용자의 적금통 목록 조회
  const { buckets, user } = await getOtherUserBucketList(targetUserId, page);
  
  // 2. 다른 사용자의 적금통 통계 조회
  const counts = await getOtherUserBucketCount(targetUserId);
  
  // 3. 응답 데이터 포맷팅
  const response = formatOtherUserBucketListResponse(buckets, counts, page, user);
  
  // 4. 본인 조회인지 다른 사용자 조회인지에 따른 메시지 설정
  const isSelf = currentUserId && currentUserId === targetUserId;
  const message = isSelf ? '내 적금통 목록 조회 성공' : `${user.nickname}님의 공개 적금통 목록 조회 성공`;
  
  // 5. 성공 응답
  res.status(200).json({
    message,
    ...response
  });
});