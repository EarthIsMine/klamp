# Klamp Phase 1

검증된 CREATE2 배포 주체 또는 지원 LiquidityLauncher의 크리에이터가 토큰의 대표 Uniswap v4 풀을 한 번 기록한다. 레코드는 `<소문자 토큰 주소>.tokens.klamp.eth`의 ENS text/data에 저장하고, SDK는 viem의 표준 `getEnsText`로 조회한다.

대표 풀은 지정한 풀이라는 뜻이다. 원래 런칭 풀, 안전한 토큰·훅, 충분한 유동성, 수익성, 사칭 방지 또는 MEV 보호를 인증하지 않는다. 풀 초기화만 되어도 등록되며, 실제 견적·슬리피지·유동성 검증은 거래 클라이언트의 책임이다.

## 시작

이 디렉터리가 프로젝트 루트다. Git 저장소 루트에서는 먼저 `cd contract`를 실행한다. Foundry 1.7.1과 Node 24 환경에서 검증했다.

```sh
./scripts/setup-dependencies.sh
forge test
npm test
npm run typecheck
npm run test:e2e
```

E2E는 새 Anvil에서 실제 ENSv2·PoolManager·StateView·ERC20 probe를 배포하고 등록·봉인·viem 조회 및 권한 eth_call을 확인한다. 끝나면 테스트 체인을 종료한다. 사용 중인 RPC 포트에는 배포하지 않는다. 데모를 켜둔 채 사용하려면 [배포 문서의 로컬 실행 절차](docs/phase1-deployment.md)를 따른다.

## 구조와 책임

| 경로 | 책임 |
| --- | --- |
| `src/CanonicalPoolRegistrar.sol` | CREATE2/런처 증명, 코드·currency·풀 초기화 검증, 단회 기록, description/url 위임 |
| `script/` | namespace 배포·등록·probe·봉인, 중단 후 재개 |
| `sdk/canonicalPool.ts` | namespace 확인, ENS 표준 조회, 엄격한 결과 상태 |
| `sdk/launchEventFallback.ts` | 신뢰한 InstantLaunchStrategy의 확인된 로그만 대체 조회 |
| `sdk/compareRoutes.ts` | 체인·PoolManager·PoolId와 분할 경로 비교 |
| `demo/`, `scripts/demo-server.ts` | 조회·판정 데모; 거래 전송 없음 |
| `test/`, `sdk/*.test.ts` | Solidity 실제 의존성 통합 및 SDK 테스트 |

## 조회 결과와 클라이언트 정책

SDK 결과는 `found`, `missing`, `invalid`, `unavailable`, `ambiguous`로 나뉜다. 조회 실패를 미등록으로 표시하지 않는다. ENS의 실제 빈 레코드일 때만 이벤트 fallback을 시도한다. 기본 외부 이벤트 소스는 미설정이며 임의 런처 로그를 신뢰하지 않는다.

대표 풀 검증 모드는 `found`이고 대상 토큰을 포함하는 모든 branch/hop의 체인·PoolManager·PoolId가 일치해야 한다. 공통 자산만 포함하는 hop에는 대표 풀을 강제하지 않는다. 화면의 경로 정보 일치는 불투명한 외부 calldata의 실행 풀을 보장하지 않으며 직접 컨트랙트 호출을 막지 않는다.

## 보장과 제약

- 토큰당 최초 등록만 가능하며 수정·삭제·풀 이전 API가 없다. 한 배포는 한 체인과 고정 PoolManager를 사용한다.
- 자체 `canonicalPoolOf` mapping도 온체인에 남는다. ENS는 표준 조회와 공유 가능한 이름·레코드를 제공한다.
- 와일드카드는 토큰별 이름 등록을 생략하지만 resolver text/data 저장 가스는 발생한다.
- 토큰 레코드의 쓰기 경로와 운영자의 tokens 변경 권한을 제한한다. hooks에는 별도 확장 권한이 남는다.
- ENS root/klamp의 상위 권한과 만료·재등록은 별도 신뢰·운영 가정이다. mapping의 단회성과 이름 경로의 영구 존속은 같은 보장이 아니다.
- registrar의 root TEXT_ADMIN은 고정 resolver의 위임 API 제약으로 필요하다. registrar 코드가 description/url 위임만 노출하는 것이 잔여 신뢰 가정이다.
- hooks 프록시·수수료 상한, 훅 위험 분류, 공격 손실·시장 점유율, 전역 라우터 보호는 이번 구현에 없다.

## 검증과 인계

[검증 표](docs/phase1-verification.md), [고정 버전·ABI](docs/phase1-dependencies.md), [권한](docs/phase1-permissions.md), [fallback 설정](docs/phase1-fallback.md), [배포·재개 절차](docs/phase1-deployment.md)를 참고한다.

현재 로컬 검증은 통과했으며 Sepolia 실배포, ENS 앱 UI 표시, 사람의 SDK 문서 열람·직접 재현은 아직 확인하지 않았다. 감사 완료나 영구 보장을 주장하지 않는다. 작업별 변경·실패·수정·명령 결과는 [WORKLOG](docs/WORKLOG.md)에 기록했다. 실제 전달받은 외부 피드백만 [FEEDBACK](docs/FEEDBACK.md)에 추가한다.
