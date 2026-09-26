# C12 — 최종 설계 문서에 기준 코드 정렬

- 작성: 2026-09-26, Claude Code (Opus 5.5)
- 근거 문서: `final_klamp_with_code.md`(1단계 설계 최종), `final_klamp_organized.md`(개발 기획·명세 최종)
- 사람 결정: "새 문서 2개에 기준 코드를 맞춰 수정하자"(대화 요청). 아래 세부 선택 중 문서에 없는 것은 AI 제안이며 검토 대기다.

## 기존 계획(C01~C11)과 달라지는 부분

| 항목 | 기존 (Agent Spec) | 변경 (설계 문서) |
| --- | --- | --- |
| 경로 A | 4인자(편집자 = 실행 컨트랙트) + 5인자(편집자 0 거절) | 5인자 하나. creator = 0이면 설명·링크 권한 없음. 발행자 컨트랙트는 메타데이터 권한 없음 |
| 경로 B | PoolKey 인자를 받음 | PoolKey를 받지 않고 런칭 풀 `(ETH, 토큰, 2500, 25, 훅 없음)`로 고정 |
| 경로 B 경유 | 없음 | `recordByLiquidityLauncherVia(token, launcher, nonce)`: 일회용 컨트랙트를 배포한 크리에이터. 코드가 남은 주소는 거절 |
| 풀 초기화 검사 | 생성자에 StateView, `getSlot0` | PoolManager `extsload(keccak256(poolId, POOLS_SLOT))`. POOLS_SLOT = 6을 실제 PoolManager에서 테스트 |
| 에러·이벤트 | `NotDeployer`, `CanonicalRecorded(token, poolId, deployer)` | `NotIssuer`, `CanonicalRecorded(token, poolId, issuer, creator, key)` — `key`(PoolKey)는 사람 결정(2026-09-26)으로 추가하고 설계 문서도 함께 수정 |
| 봉인 | hooks를 셋업 때 등록하고 hooksAdmin에게 역할 부여 | 운영자가 REGISTRAR(+admin)만 남기고 봉인. 2단계에서 hooks를 역할 0으로 등록한 뒤 회수(`finalizeHooks`) |
| SDK 조회 | text + StateView 초기화 | 추가로 data 레코드의 chainId·PoolKey로 PoolId 재계산, 토큰 포함 확인 (`invalid: record-mismatch`) |
| SDK 판정 | `compareRoutes` (match/mismatch/blocked) | 추가로 `judge()` (allow / requote_canonical / requote_static / hold), 정적 풀 항상 허용 |
| 이벤트 대체 | 모든 PoolKey 허용, 충돌 경고 없음 | 런칭 풀 모양만 인정, ENS와 다르면 ENS 유지 + `warning: launch-pool-differs` |

## 문서와 다르게 둔 것 (AI 판단, 검토 대기)

- ~~조회 상태 5개 유지~~ → 사람 결정(2026-09-26): 설계 문서대로 `registered | not_registered | lookup_failed` 3개로 바꾸고 루트 AGENTS.md보다 우선한다. 루트 AGENTS.md도 같이 고쳤다. 세부 원인은 `lookup_failed.reason`에 남기고, `registered`에는 문서처럼 `key`(PoolKey)를 포함한다.
- `compareRoutes`는 데모 서버가 쓰므로 남겼다. 정책 판정은 `judge()`를 기준으로 한다.
- Robinhood InstantLaunchStrategy 주소(`0x23f8…`)는 상수로만 노출했다. runtime code hash·launcher·시작 블록을 검증하지 않았으므로 기본 신뢰 목록에 넣지 않았다.
- LiquidityLauncher v3.0.0·v3.2.0 주소는 Sepolia 후보 파일에 "미검증"으로만 넣었다. 문서의 "Sepolia에 같은 바이트코드" 주장은 이번 작업에서 확인하지 않았다.
- POOLS_SLOT 주석은 문서의 v4-core 46c6834 대신 저장소가 고정한 59d3ecf를 적었다. 두 커밋 모두 값은 6이며 고정 버전은 테스트로 확인했다.

## 범위 밖

2~4단계(CappedHookProxy·팩토리, getCap, 재견적, verifySwapCalldata/buildSwap), D형 데모 런치패드, 공격 재현, 터미널 두 모드, Sepolia 배포.

## 검증

`forge test`, `npm test`, `npm run typecheck`, `npm run test:e2e`. 결과는 WORKLOG C12 참조.
