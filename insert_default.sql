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
