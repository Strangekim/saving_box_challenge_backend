<div align="center">

# 🐷 적금통 키우기
### 게임하듯 재밌게 키우는 나만의 적금통

<br>

<p>
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express.js"/>
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker"/>
  <img src="https://img.shields.io/badge/AWS-232F3E?style=for-the-badge&logo=amazon-aws&logoColor=white" alt="AWS"/>
  <img src="https://img.shields.io/badge/GitHub%20Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white" alt="GitHub Actions"/>
</p>

![projectImg](./readmeFile/rn_image_picker_lib_temp_f04876cb-92ae-4526-bfe1-5a35a875a661.png)

</div>

---

<br>

## 📚 목차

1.  [**프로젝트 소개**](#-프로젝트-소개)
2.  [**주요 특징**](#-주요-특징)
3.  [**화면 구성 및 시연 동영상**](#-화면-구성-및-시연-동영상)
4.  [**시스템 아키텍쳐**](#-시스템-아키텍쳐)
5.  [**주요 기능**](#-주요-기능)
6.  [**주요 개발 성과**](#-주요-개발-성과)
7.  [**자동화 시스템**](#-자동화-시스템)
8.  [**기술 스택**](#-기술-스택)
9.  [**프로젝트 구조**](#-프로젝트-구조)
10. [**시작하기**](#-시작하기)
11. [**팀원 소개**](#-팀원-소개)
12. [**바로가기**](#-바로가기)

<br>

---

## 📖 프로젝트 소개

**적금통 키우기**는 게임 요소를 접목하여 저축을 즐거운 경험으로 만드는 새로운 형태의 적금 서비스입니다.  
사용자는 자신만의 캐릭터를 꾸미고, 목표 금액을 설정한 적금통을 만들며 성장시킬 수 있습니다.  
특히, 대학 친구들과 함께하는 챌린지를 통해 재미와 동기부여를 얻으며 자연스럽게 저축 습관을 형성할 수 있습니다.

<br>

## ✨ 주요 특징

- 🎮 **게임화된 저축**: 캐릭터 육성과 업적 시스템으로 저축이 재미있어져요
- 🏦 **실제 금융 서비스**: 신한은행 API를 통한 실제 적금 계좌 연동
- 🎨 **캐릭터 커스터마이징**: 다양한 의상과 아이템으로 나만의 캐릭터 만들기
- 🏆 **대학별 챌린지**: 같은 대학 학과 친구들과 저축 경쟁
- 📱 **실시간 알림**: 납입 성공/실패, 업적 달성 등 실시간 알림

<br>

---

## 🖥️ 화면 구성 및 시연 동영상
- **시연 영상** 👉 [**YouTube 바로가기**](https://youtube.com/shorts/6i-mFkp4MJI?feature=share)
<br>

<table>
  <tr>
    <th align="center">메인 화면</th>
    <th align="center">메인 화면(랭킹 및 피드)</th>
    <th align="center">적금통 개설 화면</th>
    <th align="center">적금통 상세 화면</th>
  </tr>
  <tr>
    <td align="center"><img src="https://github.com/user-attachments/assets/3ef40563-1567-4e6a-b11e-c78acb3661c9" width="200"></td>
    <td align="center"><img src="https://github.com/user-attachments/assets/6e7d841e-aaba-4c3f-9d50-28fa97e05c10" width="200"></td>
    <td align="center"><img src="https://github.com/user-attachments/assets/3586ed49-c2f4-49c3-bb30-7ea05a4ae3e1" width="200"></td>
    <td align="center"><img src="https://github.com/user-attachments/assets/f7886180-49f0-40b6-ba44-a70272f5dd0d" width="200"></td>
  </tr>
  <tr>
    <th align="center">알림 화면</th>
    <th align="center">챌린지 화면</th>
    <th align="center">마이페이지 화면</th>
    <th align="center">캐릭터 설정 화면</th>
  </tr>
  <tr>
    <td align="center"><img src="https://github.com/user-attachments/assets/f99b2068-60af-449d-bde2-0cc5d7ab8987" width="200"></td>
    <td align="center"><img src="https://github.com/user-attachments/assets/29b1876c-bb6e-44d7-bb2a-e8ccc39d7678" width="200"></td>
    <td align="center"><img src="https://github.com/user-attachments/assets/659bb2ba-c897-428a-913f-f21115a7f9b3" width="200"></td>
    <td align="center"><img src="https://github.com/user-attachments/assets/c2ae23fe-ebb4-4f48-a8fc-3eb7d1c00c32" width="200"></td>
  </tr>
</table>

<br>

---

## 🧩 시스템 아키텍쳐 

<details>
<summary><b>Architecture</b></summary>
<br>
<img width="1920" height="1138" alt="architecture" src="https://github.com/user-attachments/assets/5ca137a3-291e-47af-ae08-55eb63f44572" />
</details>

<details>
<summary><b>Flow Chart</b></summary>
<br>
<img width="1920" height="1080" alt="유저플로우" src="https://github.com/user-attachments/assets/44e34def-8541-4675-b7e6-9cfefb95215d" />
</details>

<details>
<summary><b>ERD</b></summary>
<br>
<img width="624" height="755" alt="erd" src="https://github.com/user-attachments/assets/d62a5752-f6b2-40c6-8697-8e1aa659ba9d" />
</details>

<br>

---

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

<br>

---

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

<br>

---

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

<br>

---

## 🛠️ 기술 스택

<table>
  <tr>
    <th>분야</th>
    <th>기술</th>
  </tr>
  <tr>
    <td><b>Backend</b></td>
    <td>
      <img src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js"/>
      <img src="https://img.shields.io/badge/Express.js-000000?style=flat-square&logo=express&logoColor=white" alt="Express.js"/>
    </td>
  </tr>
  <tr>
    <td><b>Database</b></td>
    <td>
      <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL"/>
    </td>
  </tr>
  <tr>
    <td><b>Infrastructure</b></td>
    <td>
      <img src="https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker"/>
      <img src="https://img.shields.io/badge/AWS-232F3E?style=flat-square&logo=amazon-aws&logoColor=white" alt="AWS"/>
      <img src="https://img.shields.io/badge/EC2-FF9900?style=flat-square&logo=amazon-ec2&logoColor=white" alt="EC2"/>
    </td>
  </tr>
  <tr>
    <td><b>CI/CD</b></td>
    <td>
      <img src="https://img.shields.io/badge/GitHub%20Actions-2088FF?style=flat-square&logo=github-actions&logoColor=white" alt="GitHub Actions"/>
    </td>
  </tr>
    <tr>
    <td><b>Etc</b></td>
    <td>
      <img src="https://img.shields.io/badge/OpenAI-412991?style=flat-square&logo=openai&logoColor=white" alt="OpenAI"/>
      <img src="https://img.shields.io/badge/Notion-000000?style=flat-square&logo=notion&logoColor=white" alt="Notion"/>
    </td>
  </tr>
</table>

<br>

---

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

<br>

---

## 🏁 시작하기

### 1. 사전 준비
프로젝트 실행을 위해 다음 API 키 및 환경 설정이 필요합니다.
- 신한은행 API 키 (SSAFY 제공)
- OpenAI API 키 (선택적)
- Notion API 키 (선택적)
- Docker, Docker Compose

<br>

### 2. 실행 방법
`.env.example` 파일을 복사하여 `.env` 파일을 생성하고, 환경변수를 설정합니다.
```bash
# 1. 저장소 클론
git clone https://github.com/ssafy-final-project/saving-box-challenge-backend.git
cd saving-box-challenge-backend

# 2. 환경변수 파일 생성 및 수정
cp .env.example .env
nano .env # 에디터로 환경변수 입력

# 3. Docker Compose로 서비스 실행
docker compose up -d --build

# 4. 서버 상태 확인
curl http://localhost:8080/health
```

<br>

---

## 🤝 팀원 소개
| <img src="https://github.com/user-attachments/assets/6fab8eee-77b9-4653-a640-7be48705deb2" width="150" height="150"/> | <img src="https://github.com/user-attachments/assets/97cc7586-35de-4955-b349-aecc1ceb53e1" width="150" height="150"/> | <img src="https://github.com/user-attachments/assets/d2ef48f3-3673-4264-a8a4-0dcd2d6c4213" width="150" height="150"/> | <img src="https://github.com/user-attachments/assets/a55a3ee4-0222-4928-a000-25c121772699" width="150" height="150"/> | <img src="https://avatars.githubusercontent.com/u/144078388?v=4" width="150" height="150"/> |
|:---:|:---:|:---:|:---:|:---:|
| 김연호 [@Strangekim](https://github.com/Strangekim) | 명민주 [@typ0squir](https://github.com/typ0squir) | 송영주 [@yjsong2154](https://github.com/yjsong2154) | 김현우 [@So8oro](https://github.com/So8oro) | 조예림 [@YeRimmm-Cho](https://github.com/YeRimmm-Cho) |
| 팀장, 백엔드 | 백엔드 및 UX/UI | 프론트엔드 | 프론트엔드 | 프론트엔드 |

<br>

---

## 🔗 바로가기
- **Frontend Repository**: [https://github.com/yjsong2154/ShinhanBank](https://github.com/yjsong2154/ShinhanBank)
- **배포 주소**: [shinhan-bank-drab.vercel.app](https://shinhan-bank-drab.vercel.app/login)
