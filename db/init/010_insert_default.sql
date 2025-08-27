-- 사용자 대학 기본 데이터 삽입
INSERT INTO users.university (name) VALUES 
('한양대학교'),
('홍익대학교'),
('동국대학교'),
('이화여자대학교'),
('한국외국어대학교'),
('경기대학교'),
('신한대학교'),
('숭실대학교');


-- 의상 아이템 종류 기본 데이터 삽입
INSERT INTO cosmetic_item.type (code, name) VALUES
('character', '캐릭터'),
('outfit', '한벌옷'),
('hat', '모자');


-- 의상 아이템 목록 기본 데이터 삽입

-- 캐릭터 (type_id = 1)
INSERT INTO cosmetic_item.list (cosmetic_item_type, name, description, is_default) VALUES
(1, '푸른 용사', '용사의 기본 캐릭터', TRUE),
(1, '붉은 마법사', '불 속성 마법을 다루는 캐릭터', FALSE),
(1, '초록 궁수', '민첩한 숲의 궁수', FALSE);

-- 한벌옷 (type_id = 2)
INSERT INTO cosmetic_item.list (cosmetic_item_type, name, description, is_default) VALUES
(2, '초심자 복장', '게임 시작 시 지급되는 기본 복장', TRUE),
(2, '은빛 기사 갑옷', '기사단을 상징하는 은빛 갑옷', FALSE),
(2, '황금 파티 드레스', '행사용으로 입는 화려한 드레스', FALSE);

-- 모자 (type_id = 3)
INSERT INTO cosmetic_item.list (cosmetic_item_type, name, description, is_default) VALUES
(3, '초심자 모자', '기본 제공되는 모자', TRUE),
(3, '마법사의 뾰족 모자', '마법사의 상징인 뾰족한 모자', FALSE),
(3, '깃털 장식 투구', '고급 전사의 투구', FALSE);

-- 업적 목록 기본 데이터 삽입 (쉬운 난이도, 9개)

INSERT INTO achievement.list (code, title, description, condition) VALUES
-- 캐릭터 관련
('ACH_FIRST_BUCKET', '첫 적금통 생성', '처음으로 적금통을 만들어보세요.', '{"type":"bucket_count","value":1}'),
('ACH_FIRST_COMMENT', '첫 댓글 작성', '처음으로 댓글을 작성해보세요.', '{"type":"comment_count","value":1}'),
('ACH_FIRST_LIKE_GIVEN', '첫 좋아요 누르기', '다른 사람의 적금통에 처음으로 좋아요를 눌러보세요.', '{"type":"count_like_sum","value":1}'),

-- 한벌옷 관련
('ACH_FIRST_BUCKET_PUSH', '첫 적금하기', '처음으로 적금을 넣어보세요.', '{"type":"bucket_push_count","value":1}'),
('ACH_FIRST_BUCKET_SUCCESS', '첫 적금통 성공', '처음으로 목표 금액을 달성해보세요.', '{"type":"success_bucket_count","value":1}'),
('ACH_FIRST_CHALLENGE', '첫 챌린지 성공', '처음으로 챌린지를 성공해보세요.', '{"type":"challenge_success_count","value":1}'),

-- 모자 관련
('ACH_FIRST_GET_LIKE', '첫 좋아요 받기', '다른 사용자에게 처음으로 좋아요를 받아보세요.', '{"type":"get_like_sum","value":1}'),
('ACH_COMMENT_5', '댓글 5개 작성', '댓글을 5개 작성하면 달성됩니다.', '{"type":"comment_count","value":5}'),
('ACH_PUSH_5', '적금 5회 달성', '적금을 총 5회 넣으면 달성됩니다.', '{"type":"bucket_push_count","value":5}');


INSERT INTO cosmetic_item.list (cosmetic_item_type, name, description, is_default) VALUES
(1, '검은 닌자', '그림자 속에서 활동하는 은밀한 닌자', FALSE),
(2, '왕족 로브', '왕실에서만 입을 수 있는 고급 로브', FALSE),
(3, '용의 머리장식', '전설적인 용의 힘이 깃든 머리장식', FALSE);

-- 2. 업적별 보상 1:1 매핑 (총 12개 아이템 중 9개 사용, 기본 아이템 3개 제외)
INSERT INTO achievement.reward (achievement_id, item_id) VALUES

-- 1. ACH_FIRST_BUCKET (첫 적금통 생성) -> 붉은 마법사 캐릭터
(1, 2),

-- 2. ACH_FIRST_COMMENT (첫 댓글 작성) -> 초록 궁수 캐릭터
(2, 3),

-- 3. ACH_FIRST_LIKE_GIVEN (첫 좋아요 누르기) -> 은빛 기사 갑옷
(3, 5),

-- 4. ACH_FIRST_BUCKET_PUSH (첫 적금하기) -> 황금 파티 드레스
(4, 6),

-- 5. ACH_FIRST_BUCKET_SUCCESS (첫 적금통 성공) -> 마법사의 뾰족 모자
(5, 8),

-- 6. ACH_FIRST_CHALLENGE (첫 챌린지 성공) -> 깃털 장식 투구
(6, 9),

-- 7. ACH_FIRST_GET_LIKE (첫 좋아요 받기) -> 검은 닌자 캐릭터 (신규)
(7, 10),

-- 8. ACH_COMMENT_5 (댓글 5개 작성) -> 왕족 로브 한벌옷 (신규)
(8, 11),

-- 9. ACH_PUSH_5 (적금 5회 달성) -> 용의 머리장식 모자 (신규)
(9, 12);

-- 각 대학별 학과 데이터 삽입 (대학마다 7개씩)

-- 한양대학교 (id=1) 학과들
INSERT INTO users.major (university_id, name, code) VALUES
(1, '컴퓨터소프트웨어학부', 'CSE'),
(1, '전자공학부', 'EE'),
(1, '기계공학부', 'ME'),
(1, '건축학부', 'ARCH'),
(1, '경영학부', 'BIZ'),
(1, '화학공학과', 'ChE'),
(1, '산업공학과', 'IE');

-- 홍익대학교 (id=2) 학과들  
INSERT INTO users.major (university_id, name, code) VALUES
(2, '컴퓨터공학과', 'CS'),
(2, '전자전기공학부', 'EEE'),
(2, '기계시스템디자인공학과', 'MSD'),
(2, '건축학과', 'ARCH'),
(2, '경영학과', 'BA'),
(2, '화학공학과', 'CE'),
(2, '산업디자인학과', 'ID');

-- 동국대학교 (id=3) 학과들
INSERT INTO users.major (university_id, name, code) VALUES
(3, '컴퓨터공학과', 'CE'),
(3, '전자전기공학부', 'EE'),
(3, '기계로봇에너지공학과', 'MRE'),
(3, '건축공학부', 'AE'),
(3, '경영학부', 'BM'),
(3, '화공생물공학과', 'CBE'),
(3, '산업시스템공학과', 'ISE');

-- 이화여자대학교 (id=4) 학과들
INSERT INTO users.major (university_id, name, code) VALUES
(4, '컴퓨터공학과', 'CSE'),
(4, '전자공학과', 'EE'),
(4, '기계공학과', 'ME'),
(4, '건축학과', 'ARCH'),
(4, '경영학부', 'BUS'),
(4, '화학신소재공학과', 'CHEM'),
(4, '수학과', 'MATH');

-- 한국외국어대학교 (id=5) 학과들
INSERT INTO users.major (university_id, name, code) VALUES
(5, '컴퓨터전자시스템공학부', 'CESE'),
(5, '디지털정보공학과', 'DIE'),
(5, '국제경영학과', 'IBM'),
(5, '영어통번역학과', 'EIT'),
(5, '중국어과', 'CHN'),
(5, '일본어과', 'JPN'),
(5, '글로벌경영학과', 'GM');

-- 경기대학교 (id=6) 학과들
INSERT INTO users.major (university_id, name, code) VALUES
(6, '컴퓨터공학부', 'CE'),
(6, '전자공학과', 'EE'),
(6, '기계시스템공학과', 'MSE'),
(6, '건축공학과', 'AE'),
(6, '경영학과', 'BIZ'),
(6, '화학공학과', 'ChE'),
(6, '산업경영공학과', 'IME');

-- 신한대학교 (id=7) 학과들
INSERT INTO users.major (university_id, name, code) VALUES
(7, '컴퓨터공학부', 'CS'),
(7, '전기전자공학과', 'EE'),
(7, '기계자동차융합공학과', 'MACE'),
(7, '건축학부', 'ARCH'),
(7, '글로벌경영학과', 'GBM'),
(7, '바이오융합공학과', 'BCE'),
(7, '디자인학부', 'DES');

-- 숭실대학교 (id=8) 학과들
INSERT INTO users.major (university_id, name, code) VALUES
(8, '컴퓨터학부', 'CS'),
(8, '전자정보공학부', 'EIE'),
(8, '기계공학부', 'ME'),
(8, '건축학부', 'ARCH'),
(8, '경영학부', 'BUS'),
(8, '화학공학과', 'ChE'),
(8, '산업정보시스템공학과', 'IISE');