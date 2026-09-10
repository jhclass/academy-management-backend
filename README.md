# Academy API

직업훈련학원, 일반 학원, 학교형 교육기관의 운영 업무를 관리하기 위한 NestJS 기반 백엔드 API 서버입니다. GraphQL API를 중심으로 학생, 상담, 수강, 결제, 강의, 출결, 알림, 문자, 업무 기록 등 교육기관 운영에 필요한 데이터를 관리합니다.

이 프로젝트는 단순 CRUD 서버가 아니라 교육기관 내부 운영 시스템을 구성하기 위한 API 레이어를 목표로 합니다.

## 주요 목적

Academy API는 교육기관에서 반복적으로 발생하는 운영 업무를 하나의 백엔드 시스템에서 처리하기 위해 만들어졌습니다.

주요 사용 시나리오는 다음과 같습니다.

- 지점별 학생 및 상담 정보 관리
- 관리자/직원 계정과 권한 관리
- 수강생 등록 및 수강 결제 관리
- 강의, 과정, 출결 정보 관리
- 상담 메모, 학생 메모, 취업 관련 기록 관리
- 문자 발송 및 메시지 보관
- 실시간 알림 전송
- 업무 보드와 업무 일지 관리
- 파일 업로드 및 S3 연동
- 대시보드 통계 조회

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| Runtime | Node.js |
| Framework | NestJS |
| API | GraphQL, 일부 REST API |
| GraphQL Driver | Apollo Server |
| ORM | Prisma |
| Database | PostgreSQL |
| Authentication | Passport JWT, jsonwebtoken, bcrypt |
| Realtime | Socket.IO, NestJS WebSocket Gateway |
| File Upload | Multer, S3 SDK |
| Cache/Queue 준비 | Nest CacheModule, cache-manager |
| Container | Docker, Docker Compose |
| Test | Jest, ts-jest |
| Language | TypeScript |

## 핵심 기능

### 1. 계정 및 권한 관리

관리자/직원 계정을 관리하고, 권한 정보를 기준으로 기능 접근을 제어합니다.

관련 도메인:

- `manage-user`
- `permissions-granted`
- `login`
- `refresh-token`
- `auth`
- `m-me`

### 2. 학생 및 상담 관리

학생 기본 정보, 상담 상태, 상담 메모, 즐겨찾기, 상담 분야 등을 관리합니다.

관련 도메인:

- `student`
- `student-state`
- `student-memo`
- `advice-type`
- `consultation-memo`

### 3. 수강 및 결제 관리

학생의 수강 결제 정보, 결제 상세, 환불 요청 및 승인 흐름을 관리합니다.

관련 도메인:

- `student-payment`
- `payment-detail`
- `refund`

### 4. 강의 및 출결 관리

과정, 강의, 출결, 출퇴근 기록을 관리합니다.

관련 도메인:

- `subject`
- `lecture`
- `attendance`
- `attendance-record`
- `work-log`

### 5. 학생 관리 세부 정보

직업훈련기관 운영에 필요한 학생 세부 이력을 관리합니다.

관련 도메인:

- `student-management/career`
- `student-management/certificate`
- `student-management/edu-infomation`
- `student-management/employment-status`
- `student-management/employment-recommendation`
- `student-management/hope-for-employment`
- `student-management/pre-inspection`
- `student-management/regular-evaluation-set`
- `student-management/student-consultation`
- `student-management/student-portfolio`

### 6. 알림, 문자, 실시간 기능

알림과 문자 발송 기록을 관리하고, Socket.IO 기반 실시간 알림을 제공합니다.

관련 도메인:

- `alarm`
- `sms`
- `websocket`

### 7. 파일 및 게시판 업무 관리

파일 업로드, S3 업로드, 업무 보드, 업무 요청 관련 기능을 제공합니다.

관련 도메인:

- `file-upload`
- `s3`
- `board`
- `business-account-req`

## 프로젝트 구조

```text
src/
  app.module.ts
  main.ts
  auth/
  login/
  refresh-token/
  branch/
  manage-user/
  permissions-granted/
  student/
  student-state/
  student-management/
  student-payment/
  payment-detail/
  subject/
  lecture/
  attendance/
  attendance-record/
  work-log/
  sms/
  alarm/
  websocket/
  board/
  file-upload/
  s3/
  dashboard/
  prisma/
  common-entity/
prisma/
  schema.prisma
  migrations/
test/
  jest-e2e.json
  *.e2e-spec.ts
md/
  project-overview.md
  development-rules.md
  development-progress.md
```

## GraphQL 구조

이 프로젝트는 GraphQL Code First 방식을 사용합니다.

`src/app.module.ts`에서 GraphQL schema를 자동 생성합니다.

```ts
autoSchemaFile: join(process.cwd(), "src/schema.gql")
```

GraphQL 타입은 주로 다음 데코레이터를 사용합니다.

- `@ObjectType()` 서버가 클라이언트에게 반환하는 응답 타입
- `@Field()` GraphQL 필드 정의
- `@Args()` resolver에서 GraphQL 인자 정의
- `@Mutation()` 데이터 변경 요청
- `@Query()` 데이터 조회 요청

현재 프로젝트는 많은 resolver에서 DTO 파일을 따로 분리하기보다 `@Args()`를 직접 사용합니다. 입력값이 단순한 경우에는 이 방식이 명확하고 읽기 쉽습니다. 입력값이 많거나 검증 규칙이 복잡해지는 경우에는 `@InputType()` 기반 DTO 분리를 고려할 수 있습니다.

## Prisma 구조

실제 데이터베이스 모델은 `prisma/schema.prisma`에서 관리합니다.

Prisma는 PostgreSQL과 연결되며, 주요 모델은 다음과 같습니다.

- `Branch`
- `ManageUser`
- `PermissionsGranted`
- `Student`
- `StudentState`
- `StudentPayment`
- `PaymentDetail`
- `Subject`
- `Lectures`
- `Attendance`
- `AttendanceRecord`
- `WorkLogs`
- `Sms`
- `MessageStorage`
- `Alarm`
- `WorkBoard`
- `StudentMemo`
- `EmploymentStatus`
- `EduInfomation`
- `Career`
- `Certificate`
- `StudentConsultation`
- `HopeForEmployment`
- `EmploymentRecommendation`
- `PreInspection`
- `RegularEvaluationSet`
- `StudentPortfolio`

Prisma schema는 DB 모델의 기준이고, `src/**/entity/*.entity.ts` 파일은 GraphQL 응답 타입을 정의하는 용도로 사용됩니다.

## Entity, DTO, Args 기준

현재 프로젝트의 기본 기준은 다음과 같습니다.

```text
prisma/schema.prisma
  실제 DB 모델 정의

src/**/entity/*.entity.ts
  GraphQL 응답 ObjectType 정의

resolver.ts의 @Args()
  GraphQL 입력 인자 정의

src/**/dto/*.dto.ts
  입력값이 많거나 검증 규칙이 필요한 경우 사용하는 입력 DTO
```

즉 `@ObjectType()`은 응답 타입이고, `@Args()` 또는 `@InputType()`은 입력값 정의에 사용됩니다.

## 인증 구조

JWT 기반 인증을 사용합니다.

관련 파일:

- `src/auth/jwt.strategy.ts`
- `src/auth/jwt-auth.guard.ts`
- `src/auth/gql-auth.guard.ts`
- `src/public-decorator/public-decorator.decorator.ts`

현재 JWT는 일반적인 `Authorization: Bearer` 헤더가 아니라 `token` 헤더에서 추출합니다.

```ts
ExtractJwt.fromHeader("token")
```

공개 resolver는 `@Public()` 데코레이터를 통해 인증을 우회할 수 있습니다.

## WebSocket

실시간 알림은 Socket.IO 기반 WebSocket Gateway를 사용합니다.

주요 역할:

- 신규 학생 등록 알림
- 업무/알림 이벤트 전송
- 클라이언트와 서버 간 실시간 메시지 전달

Kafka나 Redis 같은 메시지 브로커와 달리, WebSocket은 브라우저 클라이언트와 서버 간 실시간 통신에 사용됩니다.

## Docker 구성

`docker-compose.yml`은 다음 서비스를 포함합니다.

- `app` NestJS 애플리케이션
- `db` PostgreSQL
- `zookeeper` Kafka용 Zookeeper
- `kafka` Kafka broker

현재 Kafka/Zookeeper는 실험 또는 확장 목적의 구성으로 볼 수 있습니다. 현재 핵심 API 실행만 필요하다면 NestJS app과 PostgreSQL이 가장 중요합니다.

Docker 실행 예시:

```bash
docker compose up --build
```

주의할 점:

- 앱은 `src/main.ts`에서 `4000` 포트로 실행됩니다.
- `docker-compose.yml`은 `${DEV_PORT}:${DEV_PORT}`를 사용합니다.
- `.env`의 `DEV_PORT`가 `4000`과 다르면 외부 접속 포트와 실제 앱 포트가 어긋날 수 있습니다.

## 로컬 실행

의존성 설치:

```bash
npm install
```

개발 서버 실행:

```bash
npm run start:dev
```

프로덕션 빌드:

```bash
npm run build
```

프로덕션 실행:

```bash
npm run start:prod
```

## 테스트

전체 테스트:

```bash
npm run test
```

학생 관련 테스트:

```bash
npm run test:student
```

브랜치 관련 테스트:

```bash
npm run test:branch
```

관리자 관련 테스트:

```bash
npm run test:manageUser
```

E2E 테스트:

```bash
npm run test:e2e
```

빌드 검증:

```bash
npm run build
```

## 주요 npm scripts

| 명령어 | 설명 |
| --- | --- |
| `npm run start` | NestJS 앱 실행 |
| `npm run start:dev` | watch 모드 개발 서버 실행 |
| `npm run start:debug` | debug watch 모드 실행 |
| `npm run build` | TypeScript 빌드 |
| `npm run start:prod` | `dist/main` 실행 |
| `npm run lint` | ESLint 실행 및 자동 수정 |
| `npm run format` | Prettier 포맷팅 |
| `npm run test` | Jest 테스트 실행 |
| `npm run test:e2e` | E2E 테스트 실행 |
| `npm run test:student` | student 도메인 테스트 실행 |
| `npm run install:all` | 의존성 설치 후 Prisma migration deploy |

## 환경 변수

프로젝트는 `.env`를 사용합니다.

대표적으로 필요한 값은 다음과 같습니다.

```text
DATABASE_URL=
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_DB_NAME=
DB_PORT=
DEV_PORT=
SECRET_KEY=
REFRESH_KEY=
KAFKA_PORT=
ZOOKEEPER_PORT=
```

S3, SMS, 외부 API를 사용하는 경우 관련 환경 변수도 필요합니다.

보안상 `.env` 파일은 GitHub에 업로드하지 않는 것이 좋습니다.

## 개발 시 주의사항

### 1. GraphQL 설정

현재 GraphQL 설정은 개발 환경에 가까운 상태입니다.

```ts
debug: true
csrfPrevention: false
```

운영 환경에서는 환경 변수에 따라 분리하는 것이 좋습니다.

### 2. 입력값 검증

현재 많은 resolver가 `@Args()`를 직접 사용합니다.

간단한 입력값은 이 방식이 명확하지만, 입력값이 많거나 검증 규칙이 복잡한 경우에는 `@InputType()` DTO와 `class-validator` 사용을 고려할 수 있습니다.

### 3. 파일 업로드

`file-upload` 모듈은 로컬 `temp`, `files` 폴더를 사용합니다.

파일 업로드 기능을 운영 환경에서 사용할 경우 다음 검증이 필요합니다.

- 파일 크기 제한
- MIME type 검증
- 확장자 제한
- 파일명 path traversal 방어
- temp 파일 정리 정책

### 4. Kafka 구성

현재 Docker Compose에는 Kafka와 Zookeeper가 포함되어 있습니다. 다만 현재 프로젝트의 실시간 알림은 Socket.IO가 담당합니다.

Kafka는 서버 간 이벤트 스트리밍이 필요할 때 적합합니다. 단일 API 서버 중심의 개발/시연에서는 필수 구성이 아닐 수 있습니다.

## 문서

추가 문서는 `md` 폴더에서 관리합니다.

- `md/project-overview.md` 프로젝트 분석 문서
- `md/development-rules.md` 개발 규칙 문서
- `md/development-progress.md` 개발 진행 및 수정 이력

## 현재 상태 요약

Academy API는 교육기관 운영을 위한 GraphQL 중심 백엔드입니다. Prisma와 PostgreSQL을 기반으로 데이터를 관리하고, Socket.IO를 통해 실시간 알림을 처리합니다. Docker Compose를 통해 로컬에서 앱과 DB, Kafka/Zookeeper를 함께 실행할 수 있지만, 핵심 API 개발에는 NestJS app과 PostgreSQL 구성이 가장 중요합니다.
