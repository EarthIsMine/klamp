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
