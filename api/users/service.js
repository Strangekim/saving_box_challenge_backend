import { query } from '../database/postgreSQL.js';
import { trycatchWrapper } from '../util/trycatchWrapper.js';
import {customError} from "../util/customError.js"
import { simpleShinhanRequest } from '../externalAPI/simpleRequest.js';
import { shinhanRequestWithUser } from '../externalAPI/makeHeader.js';
import { generateUniqueNickname } from '../util/nicknameGenerator.js';
import { encrypt } from '../util/encryption.js';

// 로그인
export const logIn = trycatchWrapper(async (req, res) => {
  const { email } = req.body;
  
  // DB에서 사용자 찾기
  const result = await query('SELECT * FROM users.list WHERE email = $1', [email]);
  
  if (result.rows.length === 0) {
    throw customError(404, '사용자를 찾을 수 없습니다');
  }
  
  const user = result.rows[0];
  req.session.userId = user.id;  // 세션에 사용자 ID 저장
  
  res.json({ message: '로그인 성공', user: { id: user.id, email: user.email } });
});

// 로그아웃
export const logOut = trycatchWrapper(async (req, res) => {
  // 세션이 존재하는지 확인
  if (!req.session.userId) {
    return res.status(400).json({
      message: '이미 로그아웃 상태입니다'
    });
  }

  // 세션 삭제
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        message: '로그아웃 처리 중 오류가 발생했습니다'
      });
    }

    // 세션 쿠키도 삭제
    res.clearCookie('connect.sid'); // express-session 기본 쿠키명
    
    res.status(200).json({
      message: '로그아웃이 완료되었습니다'
    });
  });
});


// 회원가입
export const signUp = trycatchWrapper(async (req, res) => {
  const { email } = req.body;
  const apiKey = process.env.API_KEY;

  try {
    // 1. 먼저 /member/search로 중복 체크
    const searchResult = await simpleShinhanRequest({
      path: '/member/search',
      apiKey,
      userId: email
    });

    // 201 응답이 왔다는 것은 이미 계정이 존재한다는 뜻
    if (searchResult) {
      throw customError(409, '이미 존재하는 계정입니다');
    }

  } catch (error) {
    // 400 에러면 계정이 없다는 뜻이므로 계정 생성 진행
    if (error.status === 400) {
      
      // 2. /member로 계정 생성 요청
      const createResult = await simpleShinhanRequest({
        path: '/member',
        apiKey,
        userId: email
      });

      // 3. userKey로 계좌 생성
      const accountResult = await shinhanRequestWithUser({
        path: '/edu/demandDeposit/createDemandDepositAccount',
        userKey: createResult.userKey,
        json: {
          accountTypeUniqueNo: "088-1-782bc8779cb949"
        }
      });

      // 4. 랜덤 닉네임 생성 (중복 체크 포함)
      const nickname = await generateUniqueNickname();

      // 5. 랜덤 대학 선택
      const universityResult = await query(
        'SELECT id FROM users.university ORDER BY RANDOM() LIMIT 1'
      );
      const randomUniversityId = universityResult.rows[0].id;

      // 6. 테스트용 1억원 입금
      await shinhanRequestWithUser({
        path: '/edu/demandDeposit/updateDemandDepositAccountDeposit',
        userKey: createResult.userKey,
        json: {
          accountNo: accountResult.REC.accountNo,
          transactionBalance: "100000000",  // 1억원
          transactionSummart: "회원가입 축하금, 1억원 입금"
        }
      });

      // 6. userKey 암호화
      const encryptedUserKey = encrypt(createResult.userKey);

      // 8. DB에 사용자 정보와 계좌번호 저장 (대학 정보 포함 조인)
     const dbResult = await query(
     `INSERT INTO users.list (email, nickname, userKey, withdrawalAccountNo, university_id) 
      VALUES ($1, $2, $3, $4, $5) RETURNING ...`,
        [
            createResult.userId, 
            nickname,  
            encryptedUserKey,
            accountResult.REC.accountNo,
            randomUniversityId  // ← 이미 포함되어 있음
        ]
     );

      return res.status(201).json({
        message: '회원가입 및 계좌 생성이 완료되었습니다',
        user: {
          id: dbResult.rows[0].id,
          nickname : dbResult.rows[0].nickname,
          email: dbResult.rows[0].email,
          userKey: dbResult.rows[0].userkey,
          accountNo: dbResult.rows[0].withdrawalaccountno,
          university: universityInfo.rows[0].name
        }
      });

    } else {
      throw error;
    }
  }
});