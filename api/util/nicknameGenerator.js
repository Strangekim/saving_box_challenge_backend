import { query } from '../database/postgreSQL.js';

const adjectives = [
  '푸른별', '붉은달', '작은별', '거친파', '하얀눈',
  '깊은밤', '은빛별', '검은불', '찬바람', '따순불',
  '푸른빛', '노을빛', '새하얀', '은하수', '별빛길',
  '흔들별', '울보귀', '꿀잠별', '반짝별', '번개불',
  '돌멩이', '나무속', '하늘빛', '초록불', '검은돌',
  '유리별', '달콤빛', '미소꽃', '빛나는', '어두밤'
];

const animals = [
  '강아지', '고양이', '호랑이', '사슴별', '여우별',
  '펭귄이', '코끼리', '다람쥐', '돌고래', '상어별',
  '문어별', '거북이', '까치별', '참새별', '올빼미',
  '독수리', '잠자리', '꿀벌이', '개구리', '원숭이',
  '용사님', '도깨비', '마법사', '전사님', '장군님',
  '천사님', '악마별', '로봇이', '기사님', '모험가',
  '괴물별', '영웅님', '요정님', '드래곤', '정령별'
];

const generateBasicNickname = () => {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  return `${adjective}${animal}`;
};

export const generateUniqueNickname = async () => {
  let nickname = generateBasicNickname();
  
  // DB 통신 1번으로 중복 확인 + MAX ID 동시 조회
  const result = await query(`
    SELECT 
      EXISTS(SELECT 1 FROM users.list WHERE nickname = $1) as is_duplicate,
      COALESCE(MAX(id), 0) + 1 as next_id
    FROM users.list
  `, [nickname]);
  
  const { is_duplicate, next_id } = result.rows[0];
  
  // 중복이면 고유 식별자 추가
  if (is_duplicate) {
    nickname += next_id;
  }
  
  return nickname;
};