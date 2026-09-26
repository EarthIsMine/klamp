# C14 — ENSv2 Beta 전환 (Sepolia 배포본과 저장소 일치)

- 작성: 2026-09-26, Claude Code (Opus 5.5)
- 사람 결정: Sepolia 배포본 소스를 저장소 기준으로 가져오고, ENS 의존성을 Beta로 재고정하고, 로컬 테스트·셋업을 Beta 기준으로 맞추며, 이벤트 PoolKey 변경은 되돌린다(대화 요청).

## 변경

| 항목 | 이전 | 이후 |
| --- | --- | --- |
| ENS 의존성 | contracts-v2 `48b3e2d` (2026-07-03) | `f2f0a05` (태그 `sepolia-deployment-2026-09-15`). 공식 Sepolia 주소표(`contracts/deployments/sepolia/addresses.md`)가 Beta 세트와 일치 |
| registrar 소스 | C12 설계 문서 코드 + 이벤트 PoolKey | Sourcify에 검증된 Sepolia `0x820bE7…` 소스 그대로. 이름 기반 resolver 쓰기, `creatorOf`·`setTokenText`, `NotCreator`·`KeyNotAllowed` |
| resolver 권한 | `authorizeTextRoles`(이름×키), registrar root TEXT_ADMIN | `grantSetterRoles(setText/setData("", key, ""), registrar)` 4건. 봉인 후 resolver 루트 역할 0 |
| 레코드 읽기 | `resolver.text/data(node, key)` | `resolver.resolve(name, …)` 또는 UniversalResolver |
| 컴파일 | 단일 0.8.26 | ENS 구현은 `=0.8.25`라 `script/EnsArtifacts.sol`로 따로 컴파일하고 `vm.deployCode`로 배포(`script/EnsDeploy.sol`). 우리 코드는 ENS 인터페이스만 import. `src/**`는 0.8.26으로 제한 |
| 로컬 namer | 0 주소 | Beta 생성자가 0 주소 역할 부여를 거절하므로 로컬 전용 비영 주소 |

## 검증

`forge test`, `npm test`, `npm run typecheck`, `npm run test:e2e`, 저장소 registrar 0.8.26 빌드와 Sepolia 런타임 바이트코드 비교(immutable·메타데이터 제외). 결과는 WORKLOG C14.

## 남은 것

- 저장소 셋업 스크립트로 Sepolia에 새로 배포해 본 적은 없다(팀 배포를 재현하도록 작성하고 로컬에서만 검증).
- 이벤트에 PoolKey가 없으므로 인덱서는 `Initialize` 이벤트나 data 레코드로 PoolKey를 얻는다.
