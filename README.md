# 🐷 적금통 키우기 - 게임하듯 재밌게 키우는 나만의 적금통

![projectImg](./readmeFile/rn_image_picker_lib_temp_f04876cb-92ae-4526-bfe1-5a35a875a661.png)

**캐릭터 키우며 저축 습관 만들기**

신한은행 해커톤 "저쪽 신싸분께서 보내셨습니다" 팀의 게임화된 적금 서비스

## 📖 프로젝트 소개

적금통 키우기는 **게임 요소를 접목한 새로운 형태의 적금 서비스**입니다. 
사용자는 자신만의 캐릭터를 꾸미고, 적금통을 생성하여 목표 금액을 달성하며, 
대학 친구들과 챌린지를 통해 재미있게 저축 습관을 형성할 수 있습니다.

### ✨ 주요 특징

- 🎮 **게임화된 저축**: 캐릭터 육성과 업적 시스템으로 저축이 재미있어져요
- 🏦 **실제 금융 서비스**: 신한은행 API를 통한 실제 적금 계좌 연동
- 🎨 **캐릭터 커스터마이징**: 다양한 의상과 아이템으로 나만의 캐릭터 만들기
- 🏆 **대학별 챌린지**: 같은 대학 학과 친구들과 저축 경쟁
- 📱 **실시간 알림**: 납입 성공/실패, 업적 달성 등 실시간 알림

## 🏗️ 시스템 아키텍처

![projectImg](./readmeFile/Web%20App%20Reference%20Architecture%20(1).png)

## 🚀 주요 기능

### 💰 적금통 관리
- 다양한 적금 상품 선택 및 적금통 생성
- 실시간 납입 내역 동기화
- 목표 달성률 및 진행 상황 추적
- 중도 해지 기능

### 🎨 캐릭터 시스템
- 캐릭터, 의상, 모자 등 다양한 코스메틱 아이템
- 업적 달성을 통한 새로운 아이템 획득
- 적금통별 캐릭터 설정 가능

### 🏆 업적 & 랭킹
- 저축 관련 다양한 업적 시스템
- 대학별/학과별 챌린지 랭킹
- 가중치 기반 종합 점수 계산

### 🔔 알림 시스템
- 납입 성공/실패 알림
- 업적 달성 알림  
- 댓글 및 좋아요 알림

## 🛠️ 기술 스택

### Backend
- **Backend**: Node.js 22 + Express.js
- **Database**: PostgreSQL 17 (Alpine)
- **Container**: Docker + Docker Compose
- **API** Integration: 신한은행 API (SSAFY)
- **Session**: express-session (메모리 스토어)
- **Validation**: Joi
- **Cron** Jobs: node-cron
- **AI** Integration: OpenAI GPT-4o-mini
- **Documentation**: Notion API

### 시스템 요구사항

- **Docker**: 20.10.0 이상
- **Docker** Compose: 2.0.0 이상
- **Git**: 최신 버전
- **OS**: Linux, macOS, Windows (Docker Desktop 지원)

### Infrastructure
- **Deployment**: AWS EC2
- **CI/CD**: GitHub Actions
- **Database**: PostgreSQL with Docker Volume

## 📂 프로젝트 구조

```
saving_box_challenge_backend/
├── api/                          # 백엔드 소스코드
│   ├── achievement/              # 업적 시스템
│   ├── bucket/                   # 적금통 관리
│   ├── cron/                     # 배치 작업
│   ├── database/                 # DB 연결
│   ├── externalAPI/              # 신한은행 API
│   ├── notification/             # 알림 시스템
│   ├── ranking/                  # 랭킹 시스템
│   ├── users/                    # 사용자 관리
│   └── util/                     # 유틸리티
├── db/                           # 데이터베이스
│   └── init/                     # 초기화 스크립트
├── .github/workflows/            # GitHub Actions
├── docker-compose.yml            # Docker 설정
└── README.md                     # 프로젝트 문서
```

## 📋 사전 준비

###  1. API 키 및 외부 서비스 설정
프로젝트 실행을 위해 다음 API 키들이 필요합니다.

- 신한은행 API 키 (SSAFY 제공)
- OpenAI API 키 (선택적 - AI 리포트 생성용)
- Notion API 키 (선택적 - 리포트 저장용)

### 2. 환경변수 파일 준비
`.env.example` 파일을 참고하여 `.env`파일을 생성하세요.
```bash
cp .env.example .env
```
필요한 환경변수들을 설정하세요.
```bash
# 데이터베이스 설정
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=your_strong_password
POSTGRES_DB=appdb

# 서버 설정
API_PORT=3000
PORT=3000
TZ=Asia/Seoul

# 신한은행 API 설정 (필수)
API_KEY=your_shinhan_api_key
institutionCode=00100
fintechAppNo=001
SHINHAN_URL=https://finopenapi.ssafy.io/ssafy/api/v1

# 세션 보안 (필수)
SESSION_SECRET=your_random_secret_key_at_least_32_chars
ENCRYPTION_KEY=your_32_byte_encryption_key_exactly!!

# AI 리포트 (선택적)
OPENAI_API_KEY=your_openai_api_key

# Notion 통합 (선택적)
NOTION_API_KEY=your_notion_api_key
NOTION_DATABASE_ID=your_notion_page_id
```

### 3. 빌드 및 실행 방법

**Docker Compose 사용 (권장)**

1. 저장소 클론

```bash
git clone <repository-url>
cd saving_box_challenge_backend
```

2. 환경변수 설정
```bash
# 환경변수 파일 생성
cp .env.example .env

# 환경변수 수정 (위의 사전 준비 참고)
nano .env  # 또는 선호하는 에디터 사용
```

3. 서비스 빌드 및 실행
```bash
# 환경변수 파일 생성
# 백그라운드에서 모든 서비스 시작
docker compose up -d

# 로그 확인
docker compose logs -f

# 특정 서비스 로그만 확인
docker compose logs -f api
docker compose logs -f db
```

4. 서비스 상태 확인
```bash
# 실행 중인 컨테이너 확인
docker compose ps

# API 서버 동작 확인
curl http://localhost:8080/health
```

## 📊 데이터베이스 스키마

### 주요 테이블
- `users.list`: 사용자 기본 정보
- `saving_bucket.list`: 적금통 정보
- `cosmetic_item.list`: 코스메틱 아이템
- `achievement.list`: 업적 목록
- `notification.list`: 알림 내역

## 🔄 배치 작업

자동화된 크론 작업을 통해 다음 기능들이 수행됩니다:

- **매일 오전 8시**: 모든 활성 적금통의 납입 내역 동기화
- **실시간**: 만료된 적금통 자동 완료 처리
- **실시간**: 접근 불가능한 계좌 실패 처리

## 📡 API 문서

### 주요 엔드포인트

#### 사용자 관리
- `POST /users/signIn` - 회원가입
- `POST /users/logIn` - 로그인
- `GET /users/me` - 내 정보 조회
- `GET /users/inventory` - 가방 조회

#### 적금통 관리
- `GET /bucket/create_list` - 상품 목록 조회
- `POST /bucket/create` - 적금통 생성
- `GET /bucket` - 적금통 목록 조회
- `GET /bucket/:id` - 적금통 상세 조회
- `PATCH /bucket/:id` - 적금통 수정

#### 랭킹 시스템
- `GET /ranking?category=university` - 대학별 랭킹
- `GET /ranking?category=major` - 학과별 랭킹

## 🎯 주요 개발 성과

### 백엔드 핵심 시스템 구축 완료

✅ **금융 API 연동**: 신한은행 API를 활용한 적금 계좌 생성, 납입 내역 조회, 계좌 해지 기능 구현  
✅ **게임화 시스템**: 캐릭터 커스터마이징, 코스메틱 아이템 관리, 업적 달성 및 보상 시스템 개발  
✅ **적금통 관리**: CRUD 기능, 공개/비공개 설정, 좋아요/댓글 시스템, 실시간 납입 상태 동기화  
✅ **랭킹 시스템**: 대학별/학과별 챌린지 랭킹 알고리즘 구현 (가중치 기반 점수 계산)  
✅ **알림 시스템**: 납입 성공/실패, 업적 달성, 댓글 알림 등 실시간 알림 기능  
✅ **자동화**: 크론 작업을 통한 적금통 납입 내역 배치 동기화, 만료 처리 자동화  
✅ **보안**: userKey 암호화, 세션 관리, 권한 검증 시스템  
✅ **데이터베이스**: PostgreSQL 기반 정규화된 스키마 설계, 인덱스 최적화  

## ⚡ 자동화 시스템
### ✅ 크론 기반 배치 작업

- 매일 08:00 KST 전체 적금통 동기화
- 배치 처리 (3개씩 병렬, 500ms 간격) 로 부하 분산
- 상세 로그 및 진행 상황 모니터링
- 동기화 → AI 리포트 생성 → Notion 저장 파이프라인

### ✅ AI 기반 운영 분석

- OpenAI GPT-4o-mini로 일일 데이터 분석
- 8개 DB 쿼리로 종합 현황 수집
- 마크다운 → Notion 블록 자동 변환
- 성장 지표, 인기 상품, 대학 현황 등 인사이트 제공


## 🤝 팀 정보

**팀명**: 저쪽 신싸분께서 보내셨습니다  
**해커톤**: 신한은행 해커톤 2025 
**프로젝트 기간**: 2025년 8월  
