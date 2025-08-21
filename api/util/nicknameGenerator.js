import { query } from '../database/postgreSQL.js';

const adjectives = [
  '행복한', '화가난', '신나는', '졸린', '배고픈',
  '똑똑한', '귀여운', '멋진', '용감한', '친절한',
  '재미있는', '시원한', '따뜻한', '차가운', '빠른',
  '느린', '작은', '큰', '높은', '낮은',
  '밝은', '어두운', '조용한', '시끄러운', '부드러운',
  '딱딱한', '달콤한', '쓴', '매운', '짠',
  '예쁜', '못생긴', '젊은', '늙은', '새로운',
  '오래된', '깨끗한', '더러운', '무거운', '가벼운',
  '강한', '약한', '건강한', '아픈', '날씬한'
];

const animals = [
  '북극곰', '사막여우', '앵무새', '고양이', '강아지',
  '토끼', '다람쥐', '펭귄', '코알라', '판다',
  '호랑이', '사자', '기린', '코끼리', '원숭이',
  '늑대', '여우', '곰', '사슴', '말',
  '양', '염소', '돼지', '소', '닭',
  '오리', '거북이', '개구리', '물고기', '상어',
  '고래', '돌고래', '문어', '게', '새우',
  '나비', '벌', '개미', '거미', '잠자리',
  '독수리', '매', '올빼미', '까치', '참새'
];

const generateBasicNickname = () => {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  return `${adjective}${animal}`;
};

export const generateUniqueNickname = async () => {
  let nickname = generateBasicNickname();
  
  // DB에서 중복 확인
  const existing = await query('SELECT id FROM users.list WHERE nickname = $1', [nickname]);
  
  // 중복이면 뒤에 랜덤 숫자 추가 (100~999)
  if (existing.rows.length > 0) {
    const randomNum = Math.floor(Math.random() * 900) + 100; // 100~999
    nickname += randomNum;
  }
  
  return nickname;
};