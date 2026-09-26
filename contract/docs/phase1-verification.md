# Phase 1 검증 인계

검증일: 2026-09-26 (Asia/Tokyo). 실행 주체: Codex. 사람 직접 검증: **대기**.
실행 환경·고정 SHA는 [의존성 문서](phase1-dependencies.md)와 [versions.json](../deployments/versions.json)을 따른다.

## 요구사항별 상태

| 요구사항 | 상태 | 근거 |
| --- | --- | --- |
| 실제 CREATE2 증명, 비배포자·덮어쓰기 거절 | 로컬 통과 | CanonicalPoolRegistrarTest |
| 실제 LiquidityLauncher/UERC20Factory와 graffiti 증명 | 로컬 통과 | CanonicalPoolRegistrarTest |
| 토큰 코드·currency 정렬·동일 PoolManager의 풀 초기화 | 로컬 통과 | PoolValidationTest |
| 두 번째 쓰기 및 편집자 위임 실패 시 원자적 rollback | 로컬 통과 | PoolValidationTest, CanonicalPoolEnsIntegrationTest |
| 명시 editor의 자기 description/url만 허용 | 로컬 통과 | MetadataEditorTest, deployment-smoke |
| tokens 봉인·업그레이드 및 재위임 거절·hooks 분리 | 로컬 통과 | NamespacePermissionsTest |
| 봉인 전 실제 조회, 봉인 후 두 등록 경로 계속 동작 | 로컬 통과 | CanonicalPoolEnsIntegrationTest |
| 토큰별 이름 등록 없는 ENS text/data 일치 | 로컬 통과 | 실제 UniversalResolver 통합, viem E2E |
| registered/not_registered/lookup_failed 분리 (C12) | 로컬 통과 | SDK 테스트·local-smoke |
| 이벤트 emitter·키·초기화·reorg·충돌 처리 | 로컬 통과 | SDK의 ABI 기반 mock RPC 테스트. 실제 공개 strategy 로그 검증은 미실행 |
| 체인·manager·pool과 모든 분할 branch 비교 | 로컬 통과 | compareRoutes.test.ts |
| 조회·비교 데모의 HTTP 응답 | 로컬 통과 | C09 match/mismatch/not_registered/HTML 확인. 브라우저 육안 확인은 미실행 |
| commit/wait/register/setParent, 재개·가격·잔액·이름 충돌 | 로컬 통과 | 실제 ETHRegistrar + fixture oracle/token의 RegistrationFlowTest |
| 배포 재개·실제 ERC20 probe·권한 eth_call·공개 manifest | 로컬 통과 | ProbeLauncherTest, NamespacePermissionsTest, 전체 E2E |
| Sepolia 주소·코드·버전 확인 | 팀 확인 + AI 읽기 확인 | ENSv2 Beta 세트·LiquidityLauncher·UERC20Factory·POOLS_SLOT. 이 저장소의 preflight 스크립트는 Beta 세트로 실행하지 않음 |
| Sepolia 실배포·대표 풀 등록·왕복 조회 | 팀 배포 + AI 읽기 확인 | registrar `0x820bE7…`(Sourcify 검증), KDEMO Via 선언. 저장소 SDK로 registered/not_registered 재현. 저장소 `src/`와 소스 동일·바이트코드 일치(C14) ([Sepolia 기록](phase1-deployment.md#sepolia-팀-배포-2026-09-26)) |
| ENS 앱 UI 이름 표시 | 미실행 | 별도 사람 수동 확인 필요 |
| SDK 공식 문서 사람 열람·직접 테스트 실행 | 미실행 | 사람 검증 대기 |
| 팀원·멘토 피드백 반영 | 미실행 | 아직 실제 피드백을 전달받지 않음 |

## 실제 실행 명령과 결과

`contract/`에서 실행했다.

| 명령 | 결과 |
| --- | --- |
| `forge test` | 29 통과, 0 실패, 0 skipped |
| `forge build` | 통과. 상위 VerifiableFactory의 receive 함수 부재 경고는 남음 |
| `npm test` | 17 통과, 0 실패 |
| `npm run typecheck` | 통과 |
| `npm run test:e2e` / `./scripts/local-e2e.sh` | 새 체인 배포·등록·봉인·viem registered/not_registered/namespace·권한 smoke 통과 |
| 기존 RPC 포트로 E2E 시작 | 배포 전에 명시적 거절 확인 |
| 미기입 Sepolia 후보로 preflight 시작 | 설정 오류로 RPC 접근 전에 거절 확인. 실제 네트워크 preflight 통과를 의미하지 않음 |

[로컬 실행 증거](evidence/local-phase1.json)는 실제 생성된 보고서 사본이다. 로컬 주소·트랜잭션 해시는 Sepolia에서 조회할 수 없으며, 원본 generated artifact는 `deployments/local.verification.json`이다. 재현할 때마다 새 보고서를 만든다. 주요 실패와 해결 이력은 [WORKLOG](WORKLOG.md)에 보존했다.

## 사람이 직접 확인할 항목

1. [viem getEnsText 공식 문서](https://viem.sh/docs/ens/actions/getEnsText)와 고정 버전 2.56.9의 strict 옵션·UniversalResolver 주소 처리를 읽는다. [고정 ENSv2 소스](https://github.com/ensdomains/contracts-v2/tree/48b3e2d39513b9dd32ef1850877a29009bc807b9)에서 권한·와일드카드 경로를 대조한다.
2. 위 명령을 직접 실행해 결과를 확인한다. AI 실행 기록을 복사해 사람 검증으로 바꾸지 않는다.
3. [데모 절차](phase1-deployment.md)로 화면에서 일치/다른 풀/미등록/RPC 실패 표시를 확인한다. 실제 거래 전송이 없는 비교 데모임을 확인한다.
4. WORKLOG에 검증자 식별명, 날짜, 문서·명령, 실제 결과·증거 위치를 추가한다. 실제 받은 피드백만 FEEDBACK에 기록한다.

Sepolia 재개에 필요한 입력은 RPC, 검증된 프로토콜 구현/코드 해시, 운영자, 등록비/가스 자금, 서명 수단과 로컬 보관 registration secret이다. 공개 배포 전 dry-run과 sender/gas를 확인하고, 배포 후 읽기 전용 smoke 및 ENS 앱 수동 검증을 별도로 수행한다.
