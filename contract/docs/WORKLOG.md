# 작업 기록

AI 수행과 사람의 결정·직접 검증을 구분한다. 빈 양식과 예상 결과는 실행 증거가 아니다.
구현 상태와 사람 검증 상태를 별도로 관리하며, 각 단계 상태는 아래 작업별 기록을 따른다.

## 기록 양식

```markdown
## Cxx — 작업 제목

- 날짜 / 환경:
- 상태: 진행 중 / AI 구현·검증 완료 / 차단됨
- 사용 AI 도구:
- 읽은 지침:
- AI 수행 / 변경 파일:
- 사람의 결정/수정: 확인된 내용만 기재, 없으면 확인된 사항 없음
- 참고 공식 문서 및 버전/SHA: 실제 열람한 URL과 사용 버전
- 계획 변경: 없음 또는 docs/plans/ 문서 링크
- AI 실행 검증: 실제 명령 / 결과 / 필요한 증거 위치
- 사람 직접 검증: 사람 검증 대기
- 사람 재현 안내: 읽을 문서 / 명령 또는 절차 / 예상 결과
- 남은 문제 / 재개 방법:
```

## GOV01 — 작업 규칙과 기록 양식 마련

- 날짜 / 환경: 2026-09-25 / `/home/user/klamp`, bash, main 브랜치
- 사용 AI 도구: Codex
- 읽은 지침: 기존 상위·루트 AGENTS.md 없음. `Klamp_Phase1_Agent_Spec.md`를 읽고 이번 작업에서 루트 `AGENTS.md`를 작성했다.
- AI 수행 / 변경 파일: `AGENTS.md`, 이 기록, `FEEDBACK.md`, `plans/README.md` 작성. 기존 명세와 구현 계획은 수정하지 않았다.
- 사람의 결정/수정: 사용자가 작업 규칙·계획·기록을 저장소에 남기는 방안을 제시하고 규칙 정리를 요청했다. 명세 작성자, 팀 검토 완료, SDK 문서 열람, 직접 테스트 실행 여부는 확인되지 않았다.
- 참고 문서 및 버전: 로컬 `Klamp_Phase1_Agent_Spec.md`(문서 작성일 2026-09-25, 미커밋). 외부 공식 문서는 이번 문서 정리에서 열람하지 않았다. SDK 버전 고정은 C01에서 수행할 예정이다.
- AI 실행 확인:
  - `rg --files -g 'AGENTS.md' -g '*Spec*' -g '*spec*' -g 'WORKLOG.md' -g 'FEEDBACK.md' -g '!node_modules' -g '!vendor'`: 기존 명세 한 개 확인.
  - `git status --short`: 작업 시작 시 `?? Klamp_Phase1_Agent_Spec.md` 확인.
  - `git branch --show-current`: `main`.
  - `git log -1 --oneline`: 종료 코드 128, 아직 커밋이 없다는 오류 확인. 테스트 실패가 아닌 초기 저장소 상태 확인 결과다.
- AI 실행 테스트: 미실행. 문서만 작성했으며 구현 코드·테스트 환경이 없다.
- 사람 직접 검증: 사람 검증 대기.
- 사람 재현 안내: 네 문서의 규칙과 양식을 읽고 `git status --short`로 추가 파일을 확인한다. SDK 문서 검증은 이번 작업에 해당 없음.
- 남은 문제: 명세 작성 출처와 팀 검토 상태 확인 필요. IDE 탭의 `canonical-pool-registry-v1-spec.md`는 현재 저장소에서 발견되지 않았다. C01 구현·커밋은 이번 작업 범위에 포함하지 않았다.


## GOV02 — contract 디렉터리로 프로젝트 범위 이동

- 날짜 / 환경: 2026-09-25 / 저장소 루트, main
- 사용 AI 도구: Codex
- 읽은 지침: 기존 루트 AGENTS.md와 구현 명세. 이동 후 루트 안내와 contract/AGENTS.md 적용.
- 사람의 결정/수정: 사용자가 전체 프로젝트 내용을 루트 contract 디렉터리로 옮기고 그 안에서 구현하도록 지시했다.
- AI 수행: 명세·상세 지침·docs를 contract/로 이동. 루트 AGENTS.md는 프로젝트 위치 안내만 유지. 명세 본문은 변경하지 않았다.
- 참고 문서: 기존 로컬 명세. 외부 SDK 문서 해당 없음.
- 계획 변경: docs/plans/project-location.md.
- AI 실행 검증: 이동 후 파일 존재·기본 계획 상대 링크 확인 통과. `git diff --cached --check`는 기존 명세의 Markdown 줄바꿈용 후행 공백 2곳만 보고(종료 2). 원문 보존을 위해 유지했다.
- 사람 직접 검증: 사람 검증 대기.
- 사람 재현 안내: 저장소 루트에서 git status --short, contract/docs/plans/README.md의 명세 링크 확인.
- 남은 문제: C01부터 구현 예정. 이전 GOV01의 경로는 당시 실행 위치를 나타내므로 보존한다.

## C01 — 의존성과 ABI 기준 고정

- 날짜 / 환경: 2026-09-26 / Linux, Node 24.14.1, Foundry 1.7.1, Solidity 0.8.26/Cancun
- 상태 / 사용 AI 도구: AI 구현·검증 완료 / Codex
- 읽은 지침: 루트 AGENTS.md, contract/AGENTS.md, 구현 명세.
- AI 수행: ENSv2·런처 및 하위 gitlink 고정, npm lock, 최소 Foundry/TypeScript 설정, 재설치 스크립트, 실제 ENS resolver 프록시 ABI 테스트 추가.
- 사람의 결정/수정: 명세 순서대로 작은 커밋으로 구현하고 contract/에서 작업하도록 요청. 추가 사람 검증 확인 없음.
- 참고 공식 문서 및 버전: [고정 SHA 및 소스 확인 내역](phase1-dependencies.md).
- AI 실행 검증: `forge test` 1 통과/0 실패; `npm run typecheck` 통과. 기존 프로젝트 테스트는 없었다. 상위 의존성 UUPSProxyLogic의 receive 부재 경고는 그대로 남아 있다.
- 사람 직접 검증: 사람 검증 대기.
- 사람 재현 안내: `./scripts/setup-dependencies.sh`, `forge test`, `npm run typecheck`. 예상: resolver 실제 text/data 쓰기·읽기 성공.
- 남은 문제: Sepolia 후보 주소 미검증. SDK 실제 ENS 호출은 C07. 원문 SHA는 확정할 수 없어 날짜가 일치하는 호환 소스를 선택했다.

## C02 — 원문 registrar와 두 등록 경로 재현

- 날짜 / 환경 / 도구: 2026-09-26 / C01 고정 환경 / Codex
- AI 수행: 부록 registrar 유지, factory=0 명시 오류 추가, 실제 CREATE2 실행 컨트랙트·실제 LiquidityLauncher/UERC20Factory·실제 PermissionedResolver 프록시 fixture 추가.
- 사람의 결정/수정: 추가 확인 사항 없음.
- 참고 문서 및 버전: [C01 고정 소스](phase1-dependencies.md), 명세 부록 A1.
- AI 실행 검증: `forge test` 7 통과/0 실패. 정상 text/data, 비배포자·덮어쓰기·토큰 미포함·잘못된 크리에이터 거절, 런처 실제 발행 검증.
- 사람 직접 검증: 사람 검증 대기.
- 사람 재현: `forge test --match-contract CanonicalPoolRegistrarTest -vv`; 6개 통과 예상.
- 남은 문제: C03의 실제 토큰·풀 상태 검증, C04 편집자 분리는 아직 미구현.

## C03 — 배포 토큰·실제 초기화 풀 검증

- 날짜 / 환경 / 도구: 2026-09-26 / C01 고정 환경 / Codex
- AI 수행: StateView·PoolManager immutable과 연결 getter 검증, 토큰 코드·currency 정렬·풀 초기화 검사 추가. 실제 v4 PoolManager 테스트와 data 쓰기 실패 rollback 검증 추가.
- 사람의 결정/수정: 추가 확인 사항 없음.
- 참고 문서 및 버전: C01 StateView/PoolManager 소스. v4-core 고정 gitlink의 solmate 4b47a19038b798b4a33d9749d25e570443520647 추가 초기화.
- AI 실행 검증: 최초 `forge test`는 solmate 누락으로 컴파일 실패. 설치·remapping·재설치 스크립트 보완 후 `forge test` 13 통과/0 실패.
- 사람 직접 검증: 사람 검증 대기.
- 사람 재현: `forge test --match-contract PoolValidationTest -vv`, 6 통과 예상. 초기화만 하고 유동성이 없어도 등록 가능.
- 남은 문제: StateView 코드 자체의 신뢰는 배포 설정의 책임이며 getter 일치만으로 악의적 구현을 인증하지 않는다.

## C04 — 명시적 메타데이터 편집자

- 날짜 / 환경 / 도구: 2026-09-26 / C01 고정 환경 / Codex
- AI 수행: 기존 4인자 CREATE2 함수 보존, editor를 받는 5인자 오버로드와 공통 증명 함수 추가. CanonicalRecorded ABI·증명 주체 유지.
- 사람의 결정/수정: 추가 확인 사항 없음.
- 참고 문서 및 버전: 명세 C04, C01 PermissionedResolver 고정 소스.
- AI 실행 검증: `forge test` 17 통과/0 실패. editor의 자기 description/url 허용, pool·타 이름·권한 위임 거절, 0 editor·잘못된 증명자 거절, 기존 실행자 편집 동작 확인.
- 사람 직접 검증: 사람 검증 대기.
- 사람 재현: `forge test --match-contract MetadataEditorTest -vv`, 4 통과 예상.
- 남은 문제: namespace 구성·권한 봉인은 C05에서 구현.

## C05 — namespace 셋업과 권한 봉인

- 날짜 / 환경 / 도구: 2026-09-26 / C01 고정 환경 / Codex
- AI 수행: 실제 ENS UserRegistry·resolver 프록시 셋업, hooks 분리, 봉인 라이브러리와 Deploy/Seal 스크립트, 호출 기반 권한 테스트 추가.
- 사람의 결정/수정: 추가 확인 사항 없음.
- 참고 문서 및 버전: C01 고정 RegistryRolesLib/PermissionedResolver/VerifiableFactory 소스, [권한 제약](phase1-permissions.md).
- AI 실행 검증: 최초 컴파일 stack-too-deep를 지역변수 수명 분리로 해결. 프록시 동일 salt 충돌을 별도 salt로 해결. 테스트의 동일 호출 깊이 expectRevert 오류를 외부 wrapper로 수정. 최종 `forge test` 20 통과/0 실패, `forge build` 통과.
- 사람 직접 검증: 사람 검증 대기.
- 사람 재현: `forge test --match-contract NamespacePermissionsTest -vv`, 운영자 변경·재위임·업그레이드 거절, hooks 격리, 잘못된 체인 거절 및 재봉인 확인.
- 남은 문제: 네트워크 프로토콜 코드 신뢰·root 만료·상위 권한은 별도 운영 가정. 네트워크 broadcast 미실행.

## C06 — 실제 ENS 와일드카드 통합

- 날짜 / 환경 / 도구: 2026-09-26 / C01 고정 환경 / Codex
- AI 수행: 실제 UserRegistry·PermissionedResolver·UniversalResolverV2·v4 상태를 통합한 와일드카드 text/data 대조, 봉인 후 두 등록 경로, 편집 권한 위임 실패 rollback 테스트 추가.
- 사람의 결정/수정: 추가 확인 사항 없음.
- 참고 문서 및 버전: C01 고정 UniversalResolverV2/AbstractUniversalResolver/NameCoder 소스.
- AI 실행 검증: `forge test --match-contract CanonicalPoolEnsIntegrationTest -vv` 3 통과/0 실패. text/data의 chainId·PoolKey hash 일치, 토큰 라벨 미등록, 양 경로 봉인 후 성공, 위임 실패 시 mapping·두 레코드·편집 권한 부재 확인. C03의 data 쓰기 실패 rollback도 유지.
- 사람 직접 검증: 사람 검증 대기.
- 사람 재현: 위 명령 실행. 이것은 Solidity 통합 검증이며 viem 실행 완료를 뜻하지 않는다.
- 남은 문제: viem 실제 왕복 호출은 C07에서 실행.

## C07 — viem 기반 표준 조회와 명확한 상태

- 날짜 / 환경 / 도구: 2026-09-26 / C01 고정 환경, Anvil chain 31337 / Codex
- AI 수행: bigint·32바이트 PoolId 파싱, strict getEnsText, namespace 연결·EIP-1967 구현 주소·StateView 연결 검사, 상태별 결과, 전체 로컬 배포 및 viem smoke 재현 스크립트 추가.
- 사람의 결정/수정: 추가 확인 사항 없음.
- 참고 문서 및 버전: [viem getEnsText](https://viem.sh/docs/ens/actions/getEnsText), viem 2.56.9 소스 actions/ens/getEnsText.ts. 문서 웹 도구의 content-type 오류 후 curl로 공식 문서 열람.
- AI 실행 검증: SDK 조회 테스트 7 통과, `npm run typecheck` 통과. `forge script script/LocalPhase1.s.sol:LocalPhase1 --rpc-url http://127.0.0.1:18545 --broadcast --unlocked`로 로컬 배포 성공 후 `npx tsx scripts/local-smoke.ts` 통과. 새 체인 재현 중 병렬 전송 nonce 대기로 중단 후 `--slow` 순차 전송으로 변경하여 `./scripts/local-e2e.sh` 통과.
- 결과: 실제 viem getEnsText found, 빈 와일드카드 레코드 missing, 구현 주소 불일치 unavailable/namespace. 로컬 풀 ID: 0xee6e9c6deca57a017d87d370cc25678eb55fa99ab546fcffb94024b3aaf8f350.
- 사람 직접 검증: 사람 검증 대기.
- 사람 재현: `./scripts/local-e2e.sh`는 독립 Anvil을 시작·종료하고 위 세 결과를 검증한다. RPC 실패와 알 수 없는 revert는 missing으로 처리하지 않는다.
- 남은 문제: 공개 네트워크 검증 미실행. 로컬 manifest는 실행마다 생성되며 Git에서 제외한다.

## C08 — 검증된 전략 이벤트 fallback

- 날짜 / 환경 / 도구: 2026-09-26 / C01 고정 환경 / Codex
- AI 수행: 실제 InstantLaunchStrategy TokenLaunched ABI, 명시적 신뢰 소스·코드 해시·확인 블록·범위 제한, 토큰/키/풀 초기화/블록 해시 검사와 ambiguous 처리 추가.
- 사람의 결정/수정: 추가 확인 사항 없음.
- 참고 문서 및 버전: [고정 소스와 설정 설명](phase1-fallback.md). 원문 이벤트의 emitter는 런처가 아닌 전략임을 반영.
- AI 실행 검증: `npm test` 조회 7개+fallback 6개=13 통과/0 실패, `npm run typecheck` 통과. 정상 로그, 충돌 풀, 가짜 emitter·타 토큰·removed·불일치 hash 거절, 코드 불일치·reorg·RPC 오류, disabled 경로 확인.
- 사람 직접 검증: 사람 검증 대기.
- 사람 재현: `npm test`. 외부 배포 검증 전 sources는 빈 목록을 사용한다.
- 남은 문제: 실제 Sepolia strategy 주소·배포 블록·runtime code hash 검증 미실행. 이벤트 테스트는 mock RPC 입력으로 수행했고 공개 체인 성공으로 기록하지 않는다.

## C09 — 경로 비교와 최소 조회 데모

- 날짜 / 환경 / 도구: 2026-09-26 / C01 고정 환경, 로컬 HTTP/Anvil / Codex
- AI 수행: 체인·PoolManager·PoolId 비교, 모든 분할 branch의 대상 hop 검사, 공통 자산 hop 제외, 상태별 차단, 토큰/ENS 이름/출처/대표·후보 ID를 보여주는 최소 HTML 데모 추가. 거래 전송 기능은 없으며 선언된 경로 비교 범위를 화면에 명시.
- 사람의 결정/수정: 추가 확인 사항 없음.
- 참고 문서 및 버전: 명세 C09와 C07/C08 SDK.
- AI 실행 검증: `npm test` 17 통과/0 실패, `npm run typecheck` 통과. `npm run demo` 후 Node fetch/assert로 `/api/check`의 match·mismatch·missing 및 HTML 응답 확인 통과. 브라우저 육안 검사는 미실행.
- 사람 직접 검증: 사람 검증 대기.
- 사람 재현: Anvil과 로컬 배포를 준비한 상태에서 `npm run demo`, http://127.0.0.1:4173 접속. 기본 경로 일치, poolId 변경 시 불일치, 미등록 토큰은 기록 없음 예상. RPC 중단 시 조회 실패 표시.
- 남은 문제: 실제 quote builder/거래 calldata와 결합하지 않았으므로 거래 실행 풀의 보장으로 사용하지 않는다. 일반 거래 모드는 구현되어 있지 않다.

## C10a — 재개 가능한 ENS 등록 절차

- 날짜 / 환경 / 도구: 2026-09-26 / C01 고정 환경 / Codex
- AI 수행: ETHRegistrar의 실제 commitment 시간·등록 가격·결제 balance/allowance를 사용하는 등록 상태 머신과 스크립트 추가. 타인 소유 이름·다른 기존 namespace를 덮어쓰지 않음.
- 사람의 결정/수정: 작은 책임의 커밋 요구를 반영해 [C10 분할 계획](plans/C10-deployment-steps.md) 작성.
- 참고 문서 및 버전: C01 고정 ETHRegistrar/IETHRegistrar/AbstractETHRegistrar 소스.
- AI 실행 검증: `forge test --match-contract RegistrationFlowTest -vv` 4 통과/0 실패, `forge build` 통과. 실제 registrar와 registry 사용, 결제 토큰·가격 oracle만 테스트 fixture. commit/wait/register/setParent/이미 등록/만료 commitment/타인 소유/가격 상한/잔액 부족 검증.
- 사람 직접 검증: 사람 검증 대기.
- 사람 재현: 위 Foundry 명령. 공개 체인에서는 동일 secret과 설정으로 RegisterRoot 스크립트를 readyAt 이후 재실행한다.
- 남은 문제: Sepolia 실실행 미실행. 재배포 중복 방지·manifest/preflight/smoke는 다음 C10 단위.

## C10b — namespace 배포 재개와 봉인 probe 강화

- 날짜 / 환경 / 도구: 2026-09-26 / C01 고정 환경 / Codex
- AI 수행: 고정 VerifiableFactory 생성 코드로 예상 프록시 주소를 계산해 이미 존재하면 구현을 검증하고 재사용. 기존 registrar를 REGISTRAR로 지정해 상태 확인 후 누락된 설정만 적용. 봉인 probe는 mapping의 PoolId·text·data를 서로 대조.
- 사람의 결정/수정: 추가 확인 사항 없음.
- 참고 문서 및 버전: C01 VerifiableFactory/CloneProxyBytecode 소스, C10 분할 계획.
- AI 실행 검증: `forge test --match-contract NamespacePermissionsTest -vv` 4 통과/0 실패. 봉인 후 재배포 호출에서 주소 동일·발생 로그 0 확인. `forge build` 통과.
- 사람 직접 검증: 사람 검증 대기.
- 사람 재현: 위 테스트. 실제 재개는 원래 DEPLOYMENT_SALT와 broadcast receipt의 REGISTRAR 주소를 유지한다. registrar 권한이 이미 부여되었는데 주소를 생략하면 중복 배포 대신 중단한다.
- 남은 문제: registrar 배포 직후 권한 부여 전 중단된 경우에도 receipt에서 주소를 복구해 지정해야 불필요한 새 registrar 배포를 피한다. 운영자와 설정은 최초 배포와 같아야 한다.

## C10c — 배포 preflight·ERC20 probe·검증 manifest

- 날짜 / 환경 / 도구: 2026-09-26 / C01 고정 환경, 새 Anvil 31337 / Codex
- AI 수행: 검증 전 Sepolia 후보 설정, 코드 해시·체인·역할·연결·등록비·잔액 사전 점검, 테스트넷 전용 실제 ERC20 probe와 재개, eth_call smoke 및 공개 검증 보고서 생성 추가. 로컬 E2E도 실제 ERC20 probe 사용으로 변경.
- 사람의 결정/수정: 추가 확인 사항 없음.
- 참고 문서 및 버전: C01 고정 ENS Sepolia 배포 JSON과 계약 소스, [배포 재현 문서](phase1-deployment.md), deployments/versions.json.
- AI 실행 검증: preflight TypeScript unknown 반환 비교 오류를 bigint 타입으로 수정. 최종 `forge test` 29 통과/0 실패, `forge build` 통과, `npm test` 17 통과/0 실패, `npm run typecheck` 통과. `./scripts/local-e2e.sh` 새 체인 배포·viem·권한 smoke 통과. Node spawn/assert로 미설정 후보가 tokenFactory 누락 오류로 RPC 접근 전에 거절됨을 확인.
- 로컬 결과: 실제 ERC20 probe 풀 ID 0xe703bcf882198060d40e34384b820d425dac4359d6869fef2e5619e517c1a709. 생성된 deployments/local.verification.json에 공개 주소·버전·배포 블록·tx 해시·만료·코드 해시·봉인 상태 기록. 개인키/registration secret은 보고서에 포함하지 않는다.
- 사람 직접 검증: 사람 검증 대기.
- 사람 재현: `npm run test:e2e`, 예상: found/missing/namespace 구분과 ENS text/data·editor·overwrite·operator denial·sealed roles 모두 통과. Sepolia는 문서의 preflight와 단계별 dry-run부터 실행.
- 남은 문제: Sepolia 주소·프로토콜 버전 실조회와 서명/broadcast 미실행, ENS 앱 UI 미확인. RPC/검증 코드 해시/자금·서명 계정이 준비되어야 공개 체인 검증 가능. 로컬 fixture oracle을 실제 Sepolia 가격 검증으로 간주하지 않는다.

## C10 보완 — 기존 로컬 RPC 보호

- 날짜 / 도구: 2026-09-26 / Codex
- AI 수행: E2E의 선택 포트에 기존 Ethereum RPC가 있으면 새 테스트 체인으로 오인하여 배포하지 않도록 시작 전에 거절.
- 사람의 결정/수정: 추가 확인 사항 없음.
- 참고: C10 로컬 재현 스크립트 자체 리뷰.
- AI 실행 검증: 기존 테스트 Anvil(18545)이 켜진 상태에서 Node spawn/assert로 `KLAMP_LOCAL_PORT=18545 ./scripts/local-e2e.sh`가 종료 1과 거절 메시지를 반환함을 확인. 배포 호출 전 종료.
- 사람 직접 검증: 사람 검증 대기.
- 사람 재현: 이미 사용 중인 RPC 포트를 KLAMP_LOCAL_PORT로 지정하면 실행을 거절해야 한다.

## C11 — 보장 범위와 검증 인계

- 날짜 / 환경 / 도구: 2026-09-26 / C01 고정 환경 / Codex
- AI 수행: README, 요구사항별 검증 표, 사람 재현·SDK 문서 안내, 실제 로컬 검증 보고서 사본 추가. 계획 인덱스의 미착수 상태를 실제 구현 상태로 갱신. 원문 명세는 보존.
- 사람의 결정/수정: 추가 확인 사항 없음. 명세 작성자·팀 검토 여부도 확인 대기로 유지.
- 참고 문서 및 버전: C01 고정 문서/소스, viem getEnsText 2.56.9, C10 배포 문서.
- AI 실행 검증: 최종 로컬 포트 보호 변경 후 `./scripts/local-e2e.sh` 재실행 통과. 생성한 실제 보고서를 docs/evidence/local-phase1.json에 복사. 전체 코드 검증 기준은 C10c의 Foundry 29개·SDK 17개·타입 검사 통과 결과이며 문서 변경 때문에 동일 코드 테스트를 불필요하게 반복하지 않았다.
- 사람 직접 검증: 사람 검증 대기.
- 사람 재현: README의 설치·테스트 명령과 docs/phase1-verification.md의 수동 확인 절차. 예상 결과와 공개 네트워크 미실행 사항을 분리해 기재.
- 남은 문제: Sepolia 실배포·실제 strategy 로그·ENS 앱 UI·사람 직접 검증·팀/멘토 피드백은 미실행/미수신. 로컬 통과를 이 항목의 완료로 대체하지 않는다.

## WEB01 — 프로토콜 터미널 이식과 SDK 상태 모델 동기화

- 날짜 / 환경 / 도구: 2026-09-26 / Next.js 15, pnpm 12.6.0 / Codex
- AI 수행: 별도 프론트 작업본을 저장소의 `web/`으로 이식하고, 대표 풀 조회를 `found | missing | invalid | unavailable | ambiguous`, 경로 비교를 `match | mismatch | blocked`로 맞췄다. UI·Zustand 상태와 온체인 데이터 어댑터 경계를 분리하고 2단계 수수료 상한 장면을 mock으로 명시했다. 루트 작업 지침과 README에 두 워크스페이스의 책임과 도구를 기록했다.
- 사람의 결정/수정: 프론트를 컨트랙트 저장소에 합치되 컨트랙트 작업은 건너뛰고, 프론트 명세와 실제 상태 모델부터 동기화하도록 요청함.
- 참고 문서 및 버전: `sdk/canonicalPool.ts`, `sdk/compareRoutes.ts`, C09·C11 기록, pnpm 12.6.0.
- AI 실행 검증: 이식 전후 각각 `pnpm lint`, `pnpm build` 통과. `pnpm install --frozen-lockfile`도 이식된 워크스페이스에서 통과했다. 컨트랙트 소스와 npm 잠금 파일은 변경하지 않았다.
- 사람 직접 검증: 사람 검증 대기.
- 사람 재현: `cd web && pnpm install --frozen-lockfile && pnpm lint && pnpm build`, 이후 `pnpm dev`에서 Run demo 실행.
- 남은 문제: 현재 `ProtocolClient`는 mock이다. viem 어댑터와 실제 배포 manifest 연결, Sepolia UI 육안 검증, 2단계 수수료 상한 컨트랙트 구현은 미실행이다.

## WEB02 — klamp.kro.kr GitHub Pages 배포 준비

- 날짜 / 환경 / 도구: 2026-09-26 / Next.js 15.5.26, pnpm 12.6.0, GitHub Pages Actions / Codex
- AI 수행: Next.js static export와 trailing slash를 활성화하고, `main`의 웹 변경을 lint·build한 뒤 `web/out`을 GitHub Pages에 배포하는 workflow를 추가했다. 커스텀 도메인 `klamp.kro.kr`을 루트 경로로 사용하는 운영 절차를 README에 기록했다.
- 사람의 결정/수정: 배포 도메인을 `klamp.kro.kr`로 결정하고 코드에서 배포 준비를 요청함.
- 참고 문서 및 버전: Next.js static export/basePath 공식 문서, GitHub Pages custom workflow/custom domain 공식 문서, `actions/configure-pages@v5`, `actions/upload-pages-artifact@v4`, `actions/deploy-pages@v5`, `pnpm/setup@v3`.
- AI 실행 검증: `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm build` 통과. `web/out/index.html`과 `web/out/_next/static` 생성, HTML의 `/_next/` 루트 asset 경로, workflow YAML 파싱을 확인했다.
- 사람 직접 검증: 사람 검증 대기.
- 사람 재현: `cd web && pnpm install --frozen-lockfile && pnpm lint && pnpm build`; `out/index.html`이 생성되어야 한다. GitHub에서는 Pages source를 GitHub Actions로 지정하고 custom domain과 DNS/HTTPS 상태를 확인한다.
- 남은 문제: 조직 도메인 TXT 검증, 저장소 Pages custom domain 등록, DNS CNAME, 실제 Actions 실행과 공개 URL 육안 검증은 GitHub/DNS 외부 설정이 필요해 미실행이다.

## WEB03 — 클램프 브랜드 아이콘 적용

- 날짜 / 환경 / 도구: 2026-09-26 / Next.js 15.5.26, pnpm 12.6.0, Chrome 로컬 반응형 검증 / Codex
- AI 수행: `public/klamp.svg`의 과한 외곽 여백을 viewBox에서 줄이고 기존 임시 사각 마크를 대표 클램프 자산으로 교체했다. 같은 벡터를 헤더, 히어로, 푸터와 favicon metadata에 적용하고 모바일에서는 큰 히어로 마크를 숨겨 정보 밀도를 유지했다.
- 사람의 결정/수정: public의 대표 아이콘을 검토하고 적합하면 수정해 적절한 위치에 배치하도록 요청함.
- 참고 문서 및 버전: 저장소의 `web/public/klamp.svg`, Next.js 15 Metadata/Image API.
- AI 실행 검증: `pnpm lint`, `pnpm build` 통과. 로컬 Chrome에서 데스크톱과 390×844 모바일 배치를 확인하고 페이지 내 세 개의 `/klamp.svg` 이미지가 256×256 자연 크기로 정상 로드됨을 확인했다. Chrome 자동 번역 확장이 `lang`과 DOM을 바꿔 발생시킨 hydration 경고는 앱 소스 오류가 아니다.
- 사람 직접 검증: 사람 검증 대기.
- 사람 재현: `cd web && pnpm dev`, 헤더·데스크톱 히어로·푸터 및 브라우저 탭 아이콘 확인. 900px 이하에서는 히어로 대형 아이콘이 숨고 헤더 아이콘은 유지되어야 한다.
- 남은 문제: 실제 GitHub Pages 배포 후 favicon 캐시 갱신과 다양한 브라우저의 육안 검증은 미실행이다.

## WEB04 — 마케팅 랜딩 패턴 제거와 프로토콜 정보 구조 정리

- 날짜 / 환경 / 도구: 2026-09-26 / Next.js 15.5.26, pnpm 12.6.0, Chrome 로컬 반응형 검증 / Codex
- AI 수행: 반복되는 올캡스 눈썹 문구, 오렌지 강조 슬로건, 3열 장점 스트립, 대형 둥근 카드와 소프트 섀도를 제거했다. 히어로를 프로토콜 요약과 phase 범위 표로 바꾸고, 보장 범위를 기술 문서형 행으로 재구성했다. 터미널의 눈썹 상태 문구는 단계 코드로, 컬러 카드는 평면 데이터 패널로 변경했다. 검증 과정에서 63 hex였던 mock PoolId를 32바이트로 수정해 해피패스의 `match · ens`를 복구했다.
- 사람의 결정/수정: frontend 스킬을 사용해 AI slop으로 보이는 디자인, 특히 눈썹형 타이틀을 찾아 제거하도록 요청함. 해당 이름의 스킬은 현재 환경에 없어 코드 감사와 Browser 시각 검증으로 대체함.
- 참고 문서 및 버전: 저장소 UI와 C09 SDK 상태 정책, Next.js 15.5.26.
- AI 실행 검증: `pnpm lint`, `pnpm build` 통과. 로컬 Chrome 데스크톱 전체 화면과 390×844 모바일을 확인하고, Run demo 완료 후 `route match · ens`, 30% 요청, 1% mock 적용 상태를 확인했다.
- 사람 직접 검증: 사람 검증 대기.
- 사람 재현: `cd web && pnpm dev`; 히어로, Protocol boundary, Protocol trace를 데스크톱/모바일에서 확인하고 Run demo 실행 후 route가 `match · ens`인지 확인한다.
- 남은 문제: 실제 배포 화면의 사람 육안 검증과 후속 문구·상호작용 개선은 미실행이다.

## WEB05 — 100dvh 랜딩과 데모 라우트 분리

- 날짜 / 환경 / 도구: 2026-09-26 / Next.js 15.5.26 static export, Chrome 로컬 반응형 검증 / Codex
- AI 수행: 랜딩 헤더에서 `Sepolia ready`를 제거하고 헤더를 full-height 히어로 위에 배치했다. 히어로를 `100dvh`로 고정하고 CTA와 헤더 Demo 링크를 별도 `/demo/` 라우트로 연결했다. 홈에서 터미널을 제거하고 데모 전용 소개, 범위 표기, 터미널, overview 복귀 링크와 전용 metadata를 구성했다.
- 사람의 결정/수정: `Sepolia ready` 제거, 히어로 100dvh, CTA의 별도 데모 페이지 이동을 요청함.
- 참고 문서 및 버전: Next.js 15.5.26 App Router와 static export.
- AI 실행 검증: `pnpm lint`, `pnpm build` 통과, `out/demo/index.html` 생성 확인. Chrome에서 데스크톱 히어로 높이 754px/viewport 754px 일치, CTA의 `/demo/` 이동, 데모 제목과 Run demo 표시, 390×844 모바일 레이아웃을 확인했다.
- 사람 직접 검증: 사람 검증 대기.
- 사람 재현: `cd web && pnpm dev`; `/` 첫 화면이 한 viewport를 채우고 CTA가 `/demo/`로 이동하는지, `/demo/`에서 터미널 실행과 overview 복귀가 가능한지 확인한다.
- 남은 문제: 실제 GitHub Pages 배포 후 두 정적 경로와 새 metadata의 브라우저 캐시 갱신은 미검증이다.

## WEB06 — 랜딩과 데모의 프로토콜 중심 시각 체계 개선

- 날짜 / 환경 / 도구: 2026-09-26 / Next.js 15.5.26 static export, pnpm 12.6.0, Chrome 로컬 검증 / Codex, Anthropic `frontend-design` skill
- AI 수행: Warm White, Charcoal, Clamp Orange 팔레트를 유지하면서 Inter를 IBM Plex Sans로 교체하고 mono 서체를 주소와 실행 값으로 제한했다. 랜딩 히어로를 ENSv2 record와 proposed route의 직접 비교로 바꾸고 클램프 마크를 두 값을 결합하는 의미 있는 장치로 배치했다. 계약과 클라이언트의 책임 경계를 두 열로 재구성하고 Phase 2를 별도 simulation으로 분리했다. 데모에서는 장식적인 터미널 카드와 대문자·중점·화살표 표기를 제거하고 단계 진행, canonical route 비교, fee-cap simulation, 실행 readout을 하나의 계측 화면으로 재구성했다.
- 사람의 결정/수정: Clamp Orange와 Warm White 조합을 유지하고, 앞서 합의한 AI 생성형 디자인 흔적 제거 지침을 랜딩과 데모에 함께 적용하도록 요청함.
- 참고 문서 및 버전: Next.js 15.5.26, Emotion 11.14.1, Zustand 5.0.8, `@fontsource-variable/ibm-plex-sans` 5.3.0, `@fontsource/ibm-plex-mono` 5.3.0.
- AI 실행 검증: `pnpm lint`, `pnpm build` 통과. static export의 `/`와 `/demo` 생성을 확인했다. Chrome에서 랜딩 전체 흐름, 데모 초기 상태, `Run trace` 실행 후 ENS route match와 30% requested / 1% applied 결과를 확인했다.
- 사람 직접 검증: 사람 검증 대기.
- 사람 재현: `cd web && pnpm dev`; `/`에서 비교 도식과 책임 경계를 확인하고 `/demo/`에서 `Run trace`를 실행해 route match와 Phase 2 simulation 표기가 분리되는지 확인한다.
- 남은 문제: 실제 GitHub Pages 배포 화면과 사람의 모바일 실기기 검증은 미실행이다.

## WEB07 — 히어로 프로토콜 콘솔과 면 강조 전환

- 날짜 / 환경 / 도구: 2026-09-26 / Next.js 15.5.26 static export, Chrome 로컬 검증 / Codex, Anthropic `frontend-design` skill
- AI 수행: 랜딩 히어로 우측 비교 도식을 실제 `klamp verify` 명령, ENSv2 조회, chain/manager/PoolId 비교, route match 결과가 보이는 라이트 프로토콜 콘솔로 교체했다. 운영체제 창 장식, 다크 터미널, 트래픽 라이트는 사용하지 않았다. CTA의 세로 오렌지 보더 조각과 데모 Phase 2 영역의 두꺼운 좌측 보더를 제거하고, CTA 전체 면과 검증 결과 배경색으로 강조 방식을 변경했다.
- 사람의 결정/수정: 히어로 우측을 터미널처럼 구성하고 손톱형 보더 강조를 제거하며 필요한 강조는 다른 방식으로 바꾸도록 요청함.
- 참고 문서 및 버전: Next.js 15.5.26, Emotion 11.14.1, `frontend-design` skill.
- AI 실행 검증: `pnpm lint`, `pnpm build` 통과. Chrome에서 랜딩 전체 화면의 라이트 터미널, CTA 면 강조, 데모의 Phase 2 영역에서 좌측 강조 보더 제거를 확인했다.
- 사람 직접 검증: 사람 검증 대기.
- 사람 재현: `cd web && pnpm dev`; `/`의 우측 콘솔 데이터와 결과 행을 확인하고 `/demo/`의 Phase 2 simulation 영역에 두꺼운 좌측 보더가 없는지 확인한다.
- 남은 문제: 실제 GitHub Pages 배포와 모바일 실기기 검증은 미실행이다.

## WEB08 — 히어로 검증 콘솔의 TUI 문법 강화

- 날짜 / 환경 / 도구: 2026-09-26 / Next.js 15.5.26 static export, Chrome 로컬 검증 / Codex, Anthropic `frontend-design` skill
- AI 수행: 히어로 우측 콘솔을 고정 열, 순차 섹션, 상태 토큰, 하단 상태 바로 구성된 라이트 TUI로 재설계했다. canonical record resolution과 proposed route comparison을 실제 순서인 01/02로 구분하고 chain, PoolManager, PoolId 판정과 종료 상태를 한 화면에 표시했다. 전체 다크 테마, CRT 효과, 스캔라인, 깜빡이는 커서는 사용하지 않았다.
- 사람의 결정/수정: 히어로 우측 영역을 일반 터미널보다 TUI에 가까운 표현으로 강화하도록 요청함.
- 참고 문서 및 버전: Next.js 15.5.26, Emotion 11.14.1, `frontend-design` skill.
- AI 실행 검증: `pnpm lint`, `pnpm build` 통과. Chrome에서 라이트 TUI의 resolution/compare 섹션, `ok` 상태, `MATCH` 상태 바, 전체 랜딩 흐름을 확인했다.
- 사람 직접 검증: 사람 검증 대기.
- 사람 재현: `cd web && pnpm dev`; `/` 히어로 우측에서 01 resolve, 02 compare, MATCH 순으로 읽히는지 확인한다.
- 남은 문제: 실제 GitHub Pages 배포와 모바일 실기기 검증은 미실행이다.

## WEB09 — 히어로 TUI 전용 Oh My Zsh 계열 팔레트

- 날짜 / 환경 / 도구: 2026-09-26 / Next.js 15.5.26 static export, Chrome 로컬 검증 / Codex, Anthropic `frontend-design` skill
- AI 수행: 히어로 TUI 내부에만 Solarized Dark 기반의 Oh My Zsh `agnoster`/기본 prompt 색상 의미 체계를 적용했다. 배경과 패널은 Solarized base 계열, resolution 단계는 yellow, network는 blue, 경로·상태 정보는 cyan, 성공과 MATCH는 green으로 구분했다. 작은 데이터 값의 가독성을 위해 밝은 foreground와 base0를 사용했고, 랜딩과 데모의 기존 Warm White/Clamp Orange 토큰은 변경하지 않았다.
- 사람의 결정/수정: 히어로 TUI 영역에만 Oh My Zsh 컬러 팔레트를 적용하도록 요청함.
- 참고 문서 및 버전: Oh My Zsh `agnoster.zsh-theme` master, `robbyrussell.zsh-theme` master, Next.js 15.5.26.
- AI 실행 검증: `pnpm lint`, `pnpm build` 통과. Chrome에서 TUI 외부의 기존 팔레트가 유지되고 TUI 내부에만 Solarized/ANSI 상태색이 적용되는지 확인했다.
- 사람 직접 검증: 사람 검증 대기.
- 사람 재현: `cd web && pnpm dev`; `/`에서 TUI만 dark Solarized 계열인지, 성공 상태가 green이고 외부 CTA는 Clamp Orange를 유지하는지 확인한다.
- 남은 문제: 실제 GitHub Pages 배포와 모바일 실기기 검증은 미실행이다.

## WEB10 — 히어로 TUI의 macOS 터미널 창 프레임

- 날짜 / 환경 / 도구: 2026-09-26 / Next.js 15.5.26 static export, Chrome 로컬 검증 / Codex, Anthropic `frontend-design` skill
- AI 수행: 히어로 TUI에 macOS Terminal 형태의 외곽 프레임을 추가했다. 30px 높이의 밝은 타이틀바, 10px red/yellow/green window control, 중앙 세션 제목, 얇은 회색 외곽선, 10px 코너 반경과 절제된 두 단계 창 그림자를 적용했다. 컨트롤은 비기능 장식으로 두어 가짜 버튼 접근성을 만들지 않았고 내부 Oh My Zsh/Solarized TUI는 유지했다.
- 사람의 결정/수정: 히어로 TUI 보더를 실제 Mac 창처럼 구성하도록 요청함.
- 참고 문서 및 버전: Next.js 15.5.26, Emotion 11.14.1, `frontend-design` skill.
- AI 실행 검증: `pnpm lint`, `pnpm build` 통과. Chrome에서 macOS title bar, traffic-light controls, border radius, shadow와 기존 TUI 내용의 결합을 확인했다.
- 사람 직접 검증: 사람 검증 대기.
- 사람 재현: `cd web && pnpm dev`; `/` 히어로 우측 창의 타이틀바, 세 control, 둥근 외곽선과 내부 TUI가 자연스럽게 연결되는지 확인한다.
- 남은 문제: 실제 GitHub Pages 배포와 모바일 실기기 검증은 미실행이다.

## WEB11 — 100dvh 단계형 프로토콜 데모

- 날짜 / 환경 / 도구: 2026-09-26 / Next.js 15.5.26 static export, Chrome 754px viewport 검증 / Codex, Anthropic `frontend-design` skill
- AI 수행: 데모 페이지의 대형 인트로와 하단 푸터를 제거하고 헤더와 프로토콜 도구가 정확히 한 viewport를 사용하는 100dvh 화면으로 재구성했다. 상태 저장소의 일괄 자동 재생을 `Declare canonical pool` → `Verify proposed route` → `Request 30% fee` → `Apply 1% cap` 네 개의 사용자 입력으로 분리했다. 각 입력은 한 가지 상태 변화와 비동기 작업만 수행하며, 완료 후 `Start over`로 초기화한다. 비교 결과와 fee simulation을 데스크톱에서 좌우로 배치하고 낮은 화면과 모바일에서는 세로 스크롤로 전환했다.
- 사람의 결정/수정: 시연 편의를 위해 데모를 100dvh로 만들고 과도한 타이틀을 제거하며 상호작용을 단계별로 구성하도록 요청함.
- 참고 문서 및 버전: Next.js 15.5.26, Zustand 5.0.8, Emotion 11.14.1, `frontend-design` skill.
- AI 실행 검증: `pnpm lint`, `pnpm build` 통과. Chrome 1440×754에서 초기/완료 화면이 한 viewport에 들어오는지 확인했다. 네 단계 버튼을 순서대로 실행해 canonical record, ENSv2 route match, 30% request, 1% applied 결과를 확인하고 `Start over`가 첫 단계로 복귀하는지 확인했다.
- 사람 직접 검증: 사람 검증 대기.
- 사람 재현: `cd web && pnpm dev`; `/demo/`에서 네 버튼을 순서대로 누르고 각 단계가 한 번에 하나씩 진행되는지, 완료 상태에서도 전체 화면이 한 viewport에 들어오는지 확인한다.
- 남은 문제: 실제 GitHub Pages 배포와 모바일 실기기 검증은 미실행이다.

## WEB12 — 단계별 장면과 상호작용 애니메이션

- 날짜 / 환경 / 도구: 2026-09-26 / Next.js 15.5.26 static export, Chrome 1440×756 검증 / Codex, Anthropic `frontend-design` skill
- AI 수행: 한 화면에 동시에 노출되던 route, fee, 실행 readout을 제거하고 현재 단계에 필요한 정보만 보여주는 단일 장면 구조로 데모를 재구성했다. 주요 제목과 결과 수치를 확대하고 Declare receipt, Verify 비교, 30% request, 1% cap 결과가 순서대로 교체되도록 했다. 버튼 입력 후에만 장면 진입, 진행선, route 결합, fee 값 변화 애니메이션이 실행되며 `prefers-reduced-motion` 환경에서는 모든 전환을 제거한다. Phase 2 결과는 계속 simulation으로 명시했다.
- 사람의 결정/수정: 데모의 작은 글자와 과도한 정보량을 줄이고 버튼 상호작용에 반응하는 동적 애니메이션을 추가하도록 요청함.
- 참고 문서 및 버전: Next.js 15.5.26, Emotion 11.14.1, Zustand 5.0.8, `frontend-design` skill.
- AI 실행 검증: `pnpm lint`, `pnpm build` 통과. Chrome 1440×756에서 Declare, Verify, Request 30%, Apply 1% 네 장면을 순서대로 확인했으며 완료 화면과 초기 화면 모두 viewport 높이와 문서 높이가 756px로 일치했다. `Start over` 이후 첫 단계 버튼이 복구되는 것도 확인했다.
- 사람 직접 검증: 사람 검증 대기.
- 사람 재현: `cd web && pnpm dev`; `/demo/`에서 네 버튼을 순서대로 누르며 한 번에 한 장면만 보이는지, 전환 애니메이션이 클릭 직후 실행되는지, 완료 후 `Start over`가 초기 장면으로 복귀하는지 확인한다.
- 남은 문제: 실제 GitHub Pages 배포 화면과 모바일 실기기에서의 동작 검증은 미실행이다.

## WEB13 — 개발 페이즈 대신 현재 동작을 설명하는 문구 체계

- 날짜 / 환경 / 도구: 2026-09-26 / Next.js 15.5.26 static export, Chrome 1440×756 검증 / Codex, Anthropic `frontend-design` skill
- AI 수행: 랜딩, 데모 헤더, 단계 설명, 상태 요약, metadata에서 `Phase 1`과 `Phase 2` 구분을 제거했다. 랜딩은 route verification 이후의 `Fee cap preview`, 데모는 `Canonical route`, `Pool verification`, `Fee cap preview`처럼 사용자가 현재 보고 있는 동작을 직접 설명하도록 변경했다. 아직 컨트랙트에 포함되지 않은 fee cap은 개발 페이즈 대신 simulation과 preview라는 실행 범위로 명시했다.
- 사람의 결정/수정: 웹페이지 전반에서 1·2 페이즈 구분을 하지 말고 현재 수행 중인 단계를 설명하도록 요청함.
- 참고 문서 및 버전: Next.js 15.5.26, Emotion 11.14.1, `frontend-design` skill.
- AI 실행 검증: `pnpm lint`, `pnpm build` 통과. `web/src`와 정적 export에서 phase 문구가 남지 않은지 검색했다. Chrome 1440×756에서 랜딩의 fee cap 설명과 데모의 context/status 문구를 확인했으며 데모 문서 높이가 viewport 높이와 동일한 756px인지 확인했다.
- 사람 직접 검증: 사람 검증 대기.
- 사람 재현: `cd web && pnpm dev`; `/`의 Fee cap preview와 `/demo/`의 Canonical route, Pool verification, Fee cap preview 문구를 확인하고 개발 페이즈 번호가 노출되지 않는지 확인한다.
- 남은 문제: 실제 GitHub Pages 배포 화면과 모바일 실기기 검증은 미실행이다.

## WEB14 — 공격 payload와 clamp 충돌 애니메이션

- 날짜 / 환경 / 도구: 2026-09-26 / Next.js 15.5.26 static export, Chrome 1440×756 검증 / Codex, Anthropic `frontend-design` skill
- AI 수행: 30% 요청 장면을 단순 수치 확대에서 `Malicious hook`이 `feeOverride(3000)` payload를 pool 방향으로 전송하는 공격 시퀀스로 변경했다. 요청선과 세 개의 이동 packet, 30% payload 충돌과 짧은 화면 반동을 사용자 입력 직후 한 번만 실행한다. cap 적용 장면에서는 incoming 30%가 중앙 클램프에 충돌하고 반동한 뒤 1% 결과가 나타나도록 동작을 연결했다. 공격은 Brick Red, 방어는 Clamp Orange로 역할을 구분했으며 reduced-motion 환경에서는 기존과 같이 모든 애니메이션을 제거한다.
- 사람의 결정/수정: 수치 변화만으로는 공격자의 공격이 충분히 역동적으로 느껴지지 않으므로 공격과 방어 애니메이션을 강화하도록 요청함.
- 참고 문서 및 버전: Next.js 15.5.26, Emotion 11.14.1, Zustand 5.0.8, `frontend-design` skill.
- AI 실행 검증: `pnpm lint`, `pnpm build` 통과. Chrome 1440×756에서 Request 30% 입력 직후 payload 이동·충돌 프레임과 Apply 1% 입력 직후 clamp 충돌·반동 프레임, 최종 1% 결과를 확인했다. 완료 화면의 문서 높이와 viewport 높이가 756px로 일치했다.
- 사람 직접 검증: 사람 검증 대기.
- 사람 재현: `cd web && pnpm dev`; `/demo/`의 세 번째 버튼을 눌러 공격 packet과 30% 충돌을 확인하고, 네 번째 버튼에서 30%가 clamp에 부딪힌 뒤 1%가 나타나는지 확인한다. OS의 동작 줄이기를 켰을 때는 전환이 즉시 완료되어야 한다.
- 남은 문제: 실제 GitHub Pages 배포 화면과 모바일 실기기의 애니메이션 검증은 미실행이다.

## WEB15 — cap 적용 장면의 이중 전환 제거

- 날짜 / 환경 / 도구: 2026-09-26 / Next.js 15.5.26 static export, Chrome 1440×756 검증 / Codex, Anthropic `frontend-design` skill
- AI 수행: 4번 입력에서 `enforce-busy`가 `complete-ready`로 바뀔 때 React가 Scene 전체를 다시 마운트하던 원인을 제거했다. `enforce`와 `complete` 상태에는 동일한 `fee-enforcement` key를 사용해 공격 충돌 애니메이션은 최초 진입 시 한 번만 실행하고, mock 결과 도착 후에는 같은 장면 안에서 1% 결과와 완료 문구만 갱신되도록 했다.
- 사람의 결정/수정: 4번 동작 중간에 화면이 한 번 교체되어 보이는 현상을 확인한 뒤 동일 장면 내 결과 갱신 방식으로 수정하도록 요청함.
- 참고 문서 및 버전: Next.js 15.5.26, React 19, Emotion 11.14.1, `frontend-design` skill.
- AI 실행 검증: `pnpm lint`, `pnpm build` 통과. Chrome 1440×756에서 클릭 직후 `Applying the 1% cap`, 완료 후 `The request was capped`와 `1.00%`가 순서대로 나타나는지 확인했다. 완료 화면의 문서 높이와 viewport 높이는 모두 756px였다.
- 사람 직접 검증: 사람 검증 대기.
- 사람 재현: `cd web && pnpm dev`; `/demo/`의 네 번째 버튼을 누르고 clamp 충돌 애니메이션이 한 번만 실행되며 동일한 화면에서 1% 결과가 나타나는지 확인한다.
- 남은 문제: 실제 GitHub Pages 배포 화면과 모바일 실기기의 애니메이션 검증은 미실행이다.

## WEB16 — klamp.eth 기반 5단계 mock 검증 흐름

- 날짜 / 환경 / 도구: 2026-09-26 / Next.js 15.5.26 static export, Chrome 1470×700 검증 / Codex, `frontend-design` skill
- AI 수행: 데모를 `Launch + ENS record` → `Verify route` → `Verify hook` → `Request 30%` → `Enforce 1%`의 다섯 단계로 재구성했다. 런처가 토큰과 풀을 만든 뒤 `tokens.klamp.eth`에 canonical pool을 기록하는 과정, route 재계산, `hooks.klamp.eth`에서 확인한 hook code hash와 1% 상한, verified proxy 내부 악성 로직의 3,000 bps 요청, 최종 1% 적용과 quoted/received output 일치를 각 장면에 반영했다. 기존 공격 payload와 clamp 충돌 애니메이션은 유지했고, 화면 상단과 계측기 안에 local mock 및 wallet/RPC 미연결 상태를 명시했다.
- 사람의 결정/수정: 실제 컨트랙트 연결은 보류하고, 기존 상호작용과 애니메이션 수준을 유지하면서 컨트랙트 연결 및 mock 여부 표시 직전까지의 프론트 데모 구성을 우선 진행하도록 요청함.
- 참고 문서 및 버전: Next.js 15.5.26, Emotion 11.14.1, Zustand 5.0.8, `frontend-design` skill.
- AI 실행 검증: `pnpm lint`, `pnpm build`를 통과했다. Chrome에서 다섯 단계의 상태와 버튼을 순서대로 실행해 ENS record, canonical route, hook cap, 30% request, 1% applied 및 quoted/received output 일치를 확인했다. `Start over` 복귀와 1470×700 화면에서 document/viewport 높이가 모두 700px인 것도 확인했다.
- 사람 직접 검증: 사람 검증 대기.
- 사람 재현: `cd web && pnpm dev`; `/demo/`에서 다섯 버튼을 순서대로 누르며 각 ENS namespace와 검증 결과, 공격/방어 애니메이션, 최종 output 일치, `Mock data`와 `No wallet or RPC` 표기를 확인한다.
- 남은 문제: 실제 wallet/RPC/ENS 및 배포 컨트랙트 연결, Sepolia live data 전환, 모바일 실기기 검증은 미실행이다.

## WEB17 — Launch 장면의 이중 재생 제거

- 날짜 / 환경 / 도구: 2026-09-26 / Next.js 15.5.26 static export, Chrome 1470×756 검증 / Codex, `frontend-design` skill
- AI 수행: 첫 번째 Launch 입력에서 `idle`, `launch-busy`, `launch-ready`마다 Scene key가 달라져 같은 화면이 다시 마운트되던 원인을 제거했다. 세 상태가 하나의 `launch-flow` 장면을 유지하도록 하고, 연결선 애니메이션은 입력 시 한 번만 시작하도록 상태에 연결했다. 비동기 실행 중에는 별도의 진행 제목과 Deploying/Initializing/Writing 상태를 표시하고 완료 시 같은 위치에서 실제 mock 값만 갱신한다.
- 사람의 결정/수정: 1번 동작 중간의 화면 깜빡임을 제거하되 기존 상호작용과 애니메이션 수준은 유지하도록 요청함.
- 참고 문서 및 버전: Next.js 15.5.26, React 19, Emotion 11.14.1, `frontend-design` skill.
- AI 실행 검증: `pnpm lint`, `pnpm build` 통과. Chrome에서 초기 상태, 입력 120ms 후 진행 상태, 520ms 후 완료 상태를 확인했으며 Launch actor와 receipt 구조가 유지된 채 문구와 값만 갱신되는 것을 확인했다. 완료 화면의 document/viewport 높이는 모두 756px였다.
- 사람 직접 검증: 사람 검증 대기.
- 사람 재현: `cd web && pnpm dev`; `/demo/`에서 첫 번째 버튼을 누르고 장면 전체가 사라졌다 다시 나타나지 않는지, 연결선은 한 번만 실행되고 진행 문구가 같은 자리에서 완료 값으로 바뀌는지 확인한다.
- 남은 문제: 실제 GitHub Pages 배포 환경과 모바일 실기기의 전환 검증은 미실행이다.
