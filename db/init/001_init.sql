-- 스키마 생성 (없으면)
CREATE SCHEMA IF NOT EXISTS users;
-- 스키마 생성 (없으면)
CREATE SCHEMA IF NOT EXISTS cosmetic_item;

-- 의상 아이템 종류 테이블 생성
CREATE TABLE cosmetic_item.type (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,  -- 아이템 종류 고유 ID
    code TEXT UNIQUE NOT NULL,                        -- 종류 코드 (예: character, background, outfit, hat)
    name TEXT NOT NULL,                               -- 표시명 (예: 캐릭터, 배경, 한벌옷, 모자)
    created_at TIMESTAMP DEFAULT NOW()                -- 생성일
);

-- 사용자 대학 테이블 생성
CREATE TABLE users.university (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,  -- 대학 고유 ID (자동 증가)
    name VARCHAR(100) UNIQUE NOT NULL,                -- 대학명 (예: 연세대학교)
    created_at TIMESTAMP DEFAULT NOW()                -- 등록 일시
);

-- 사용자 테이블
CREATE TABLE users.list (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,   -- 유저 고유 ID (자동 증가)
    email VARCHAR(100) UNIQUE NOT NULL,                -- 사용자 이메일
    nickname VARCHAR(10) NOT NULL,                     -- 닉네임
    userKey VARCHAR(200),                               -- 금융 API에서 발급해주는 고유 키
    university_id INT REFERENCES users.university(id), -- 소속 대학 ID (FK)
    created_at TIMESTAMP DEFAULT NOW(),                -- 가입일시
    withdrawalAccountNo VARCHAR(20) UNIQUE NOT NULL    -- 연결 계좌
);


-- 의상 아이템 목록 테이블
CREATE TABLE cosmetic_item.list (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,   -- 아이템 고유 ID
    cosmetic_item_type INT REFERENCES cosmetic_item.type(id), -- 아이템 분류 (FK)
    name VARCHAR(100) NOT NULL,                        -- 아이템 이름
    description TEXT,                                  -- 설명
    is_default BOOLEAN DEFAULT FALSE,                  -- 기본 제공 여부
    created_at TIMESTAMP DEFAULT NOW()                 -- 생성일
);


-- 사용자 업적 달성 추적 테이블
CREATE TABLE users.metrics (
    user_id INT PRIMARY KEY 
        REFERENCES users.list(id) ON DELETE CASCADE, -- 유저 ID (1:1 매핑)
    
    bucket_count INT DEFAULT 0,          -- 보유 적금통 수
    count_like_sum INT DEFAULT 0,        -- 누적 좋아요 수
    get_like_sum INT DEFAULT 0,          -- 누적 좋아요 받은 수
    challenge_success_count INT DEFAULT 0, -- 챌린지 성공 갯수
    comment_count INT DEFAULT 0,         -- 댓글 단 갯수
    bucket_push_count INT DEFAULT 0,     -- 적금하기 횟수
    success_bucket_count INT DEFAULT 0,  -- 성공한 적금통 갯수

    updated_at TIMESTAMP DEFAULT NOW()   -- 갱신 시각
);

-- 사용자 프로필 캐릭터 테이블
CREATE TABLE users.character (
    user_id INT PRIMARY KEY 
        REFERENCES users.list(id) ON DELETE CASCADE,   -- 유저 ID (1:1 매핑, 유저 삭제 시 자동 삭제)
    
    character_item_id INT REFERENCES cosmetic_item.list(id), -- 장착 캐릭터
    outfit_item_id    INT REFERENCES cosmetic_item.list(id), -- 장착 한벌옷
    hat_item_id       INT REFERENCES cosmetic_item.list(id)  -- 장착 모자
);


-- 스키마 생성 (없으면)
CREATE SCHEMA IF NOT EXISTS achievement;

-- 업적 목록 테이블
CREATE TABLE achievement.list (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,  -- 업적 ID
    code VARCHAR(50) UNIQUE NOT NULL,                 -- 업적 코드(프로그램 키) 내부에서 식별하기 위한
    title VARCHAR(100) NOT NULL,                      -- 업적 제목
    description TEXT,                                 -- 업적 설명
    condition JSONB,                                  -- 달성 조건 (예: {"type":"streak","days":7})
    is_active BOOLEAN DEFAULT TRUE,                   -- 활성 여부
    created_at TIMESTAMP DEFAULT NOW()                -- 생성일
);

-- 업적 보상 테이블
CREATE TABLE achievement.reward (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,    -- 고유 ID
    achievement_id INT NOT NULL 
        REFERENCES achievement.list(id) ON DELETE CASCADE, -- 업적 ID (FK)
    item_id INT NOT NULL 
        REFERENCES cosmetic_item.list(id) ON DELETE CASCADE, -- 지급 아이템 (FK)

    -- 동일 업적-아이템 매핑 중복 방지
    CONSTRAINT uq_achievement_reward UNIQUE (achievement_id, item_id)
);

-- 사용자 가방 테이블
CREATE TABLE users.inventory (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,      -- 고유 ID
    
    user_id INT NOT NULL 
        REFERENCES users.list(id) ON DELETE CASCADE,      -- 유저 ID (유저 삭제 시 같이 삭제)
    
    item_id INT NOT NULL 
        REFERENCES cosmetic_item.list(id) ON DELETE CASCADE, -- 보유 아이템
    
    item_type_id INT NOT NULL 
        REFERENCES cosmetic_item.type(id),                -- 아이템 종류
    
    acquired_at TIMESTAMP DEFAULT NOW(),                  -- 획득 시각
    
    CONSTRAINT uq_inventory_user_item UNIQUE (user_id, item_id) -- 동일 아이템 중복 보유 방지
);

-- 유저 업적 테이블
CREATE TABLE achievement.user (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,      -- 고유 ID
    
    user_id INT NOT NULL 
        REFERENCES users.list(id) ON DELETE CASCADE,      -- 유저 ID (유저 삭제 시 업적도 삭제)
    
    achievement_id INT NOT NULL 
        REFERENCES achievement.list(id) ON DELETE CASCADE,-- 업적 ID (업적 삭제 시 해당 기록도 삭제)
    
    unlocked_at TIMESTAMP DEFAULT NOW(),                  -- 획득 시각
    
    meta JSONB,                                           -- 부가 정보(당시 기록 등)
    
    CONSTRAINT uq_user_achievement UNIQUE (user_id, achievement_id) -- 같은 업적 중복 방지
);

-- 스키마 생성 (없으면)
CREATE SCHEMA IF NOT EXISTS saving_bucket;

-- 적금통 테이블
CREATE TABLE saving_bucket.list (
    id                   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,     -- 적금통 고유 ID
    user_id              INT NOT NULL 
        REFERENCES users.list(id) ON DELETE CASCADE,                       -- 적금통 생성자

    accountNo            VARCHAR(16),                                      -- 적금 계좌번호 (종료 시 NULL 처리)
    accountTypeUniqueNo  VARCHAR(100),                                     -- 금융 API 상품 고유 번호
    accountTypeCode      VARCHAR(3) NOT NULL 
        CHECK (accountTypeCode IN ('2','3')),                              -- 상품 구분 코드

    accountName          VARCHAR(100),                                     -- 금융 API 상품명
    interestRate         DOUBLE PRECISION,                                 -- 금융 API 이자율(%)  예: 2.5
    is_challenge         BOOLEAN DEFAULT FALSE,                            -- 챌린지 상품 여부

    name                 VARCHAR(100) NOT NULL,                            -- 적금통 제목
    description          TEXT,                                             -- 설명
    target_amount        INT NOT NULL CHECK (target_amount >= 0),          -- 목표 금액(원, 음수 금지)
    subscriptionPeriod   INT NOT NULL,                                     -- 가입 기간
    
    deposit_cycle        TEXT CHECK (deposit_cycle IN ('daily','weekly','monthly')), -- 적립 주기
    is_public            BOOLEAN DEFAULT TRUE,                             -- 공개 여부

    status               VARCHAR(20) DEFAULT 'in_progress'
        CHECK (status IN ('in_progress','success','failed')),              -- 진행 상태

    total_payment        INT DEFAULT 0 CHECK (total_payment >= 0),         -- 필요한 전체 이체 수
    success_payment      INT DEFAULT 0 CHECK (success_payment >= 0),       -- 성공한 이체 수
    fail_payment         INT DEFAULT 0 CHECK (fail_payment >= 0),          -- 실패한 이체 수
    last_progress_date   DATE,                                             -- 마지막 이체 날짜

    like_count           INT DEFAULT 0 CHECK (like_count >= 0),            -- 좋아요 누적 수
    view_count           INT DEFAULT 0 CHECK (view_count >= 0),            -- 조회수 누적

    created_at           TIMESTAMP DEFAULT NOW(),                          -- 생성일

    character_item_id    INT REFERENCES cosmetic_item.list(id),            -- 장착 캐릭터(보유품만 허용: 앱/트리거에서 검증)
    outfit_item_id       INT REFERENCES cosmetic_item.list(id),            -- 장착 한벌옷(보유품만 허용)
    hat_item_id          INT REFERENCES cosmetic_item.list(id)             -- 장착 모자(보유품만 허용)
);

-- 적금통 좋아요 테이블
CREATE TABLE saving_bucket.like (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,     -- 고유 ID

    bucket_id INT NOT NULL
        REFERENCES saving_bucket.list(id) ON DELETE CASCADE, -- 적금통 ID (적금통 삭제 시 같이 삭제)

    user_id INT NOT NULL
        REFERENCES users.list(id) ON DELETE CASCADE,         -- 좋아요 누른 사용자 ID (사용자 삭제 시 같이 삭제)

    created_at TIMESTAMP DEFAULT NOW(),                  -- 좋아요 누른 시각

    CONSTRAINT uq_bucket_user UNIQUE (bucket_id, user_id) -- 중복 좋아요 방지
);

-- 적금통 댓글 테이블
CREATE TABLE saving_bucket.comment (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,  -- 댓글 고유 ID

    bucket_id INT NOT NULL
        REFERENCES saving_bucket.list(id) ON DELETE CASCADE, -- 댓글이 달린 적금통 (삭제 시 댓글도 같이 삭제)

    user_id INT NOT NULL
        REFERENCES users.list(id) ON DELETE CASCADE,         -- 댓글 작성자 (탈퇴 시 댓글도 같이 삭제)

    content TEXT NOT NULL 
        CHECK (char_length(content) <= 500),                 -- 댓글 내용 (최대 500자)

    created_at TIMESTAMP DEFAULT NOW()                       -- 작성 시각
);

[
    {
        "accountTypeUniqueNo":"001-3-29802e64e42943",
        "bankCode":"088",
        "bankName":"신한은행",
        "accountTypeCode":"2",
        "accountTypeName":"예금",
        "accountName":"헤이영 우대금리 적금통",
        "accountDescription": "
        {
            'is_challenge' : 'false', 
            'description' : '헤이영 우대금리가 적용되는 기본 예금입니다.'
        }
        ",
        "subscriptionPeriod":"50",
        "minSubscriptionBalance":"10000",
        "maxSubscriptionBalance":"1000000",
        "interestRate":"10",
        "rateDescription":"10%의 이자를 지급합니다."
    },
    {
        "accountTypeUniqueNo":"088-3-e4b8d1dbedd141",
        "bankCode":"088",
        "bankName":"신한은행",
        "accountTypeCode":"3",
        "accountTypeName":"적금",
        "accountName":"2025 여름방학 적금 챌린지",
        "accountDescription": "
        {
            'is_challenge' : 'true', 
            'description' : '신한은행 여름방학 적금 챌린지 입니다. 챌린지 1위 대학에는 2학기 대학 행사를 신한은행에서 지원합니다.'
        }",
        "subscriptionPeriod":"50",
        "minSubscriptionBalance":"10000",
        "maxSubscriptionBalance":"500000",
        "interestRate":"10",
        "rateDescription":"10% 우대 금리를 적용합니다.
        "
    }
]
