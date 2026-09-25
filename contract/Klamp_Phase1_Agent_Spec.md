# Klamp 1단계 — 코딩 에이전트 구현 명세

작성일: 2026-09-25  
기준: 팀 공유 문서 「1단계 설계: 런칭과 대표 풀 기록 (ENSv2)」  
목표: 기존 코드 예시를 출발점으로 삼아 작은 diff와 독립적으로 검증 가능한 커밋으로 1단계를 구현한다.

## 0. 에이전트에게 전달할 작업 지시

이 문서의 순서대로 기존 저장소를 수정하라. 먼저 AGENTS.md, 현재 브랜치와 변경사항, 기존 컨트랙트·테스트·SDK·배포 스크립트를 확인하라. 이미 구현된 기능은 재작성하지 말고 완료 조건만 검증하라. 사용자의 미커밋 변경을 덮어쓰지 않는다.

원문 Solidity·셋업·TypeScript 코드는 부록에 포함되어 있다. 구조, 이름, 기록 형식, 두 등록 경로를 유지하되 본문에서 지정한 최소 수정만 적용하라. 본문 요구사항이 부록 원문보다 우선한다. 부록은 완성 코드가 아니라 기준 코드다.

각 커밋은 하나의 목적과 관련 테스트만 포함한다. 전체 폴더 재배치, 일괄 포맷 변경, 도구 체인 교체, 불필요한 추상화, 의존성 일괄 업그레이드는 하지 않는다. 파일 경로는 아래 예시보다 기존 저장소 구조를 우선한다. 구현이 없는 빈 저장소에만 Foundry와 기존 예시를 실행할 최소 TypeScript 구성을 추가한다.

커밋마다 변경 이유, 변경 파일, 실행한 검증과 결과, 남은 제약을 보고하라. 기존 완료 항목은 빈 커밋을 만들지 말고 건너뛴 근거를 남긴다. 아래 커밋 메시지는 권장값이며 커밋 순서와 책임 경계가 핵심이다. 원격 push나 실제 네트워크 broadcast는 저장소 및 사용자에게 이미 부여된 권한 범위를 따른다. 자격증명 없이 실행 가능한 로컬 구현·통합 테스트·배포 dry-run까지 완성한다.

## 1. 이번 구현에서 확정하는 MVP 정책

이 절은 원문의 미결정 부분에 대한 이번 구현의 기본 결정이다. 기존 저장소에 충돌하는 확정 요구사항이 있다면 조용히 덮어쓰지 말고 차이를 기록한다.

| 항목 | 결정 |
| --- | --- |
| 대표 풀의 의미 | 검증된 배포 주체 또는 지원되는 런처의 크리에이터가 지정한 풀. 원래 런칭 풀 또는 안전한 풀이라는 인증은 아님 |
| 대상 체인 | 한 배포당 한 체인. 로컬과 Sepolia를 우선하며 크로스체인 쓰기는 제외 |
| 풀 식별 | `(chainId, configured PoolManager, PoolId)`. text 형식은 원문대로 유지하고 PoolManager는 배포 설정으로 고정 |
| 등록 시점 | 토큰 배포와 풀 초기화가 끝난 뒤. 같은 런칭 트랜잭션 안에서 호출해도 순서는 동일 |
| 등록 횟수 | 토큰당 한 번. 수정·삭제·버전 추가·풀 이전은 이번 단계에서 구현하지 않음 |
| 등록 전 검증 | CREATE2 또는 LiquidityLauncher 증명, 토큰 코드 존재, currency 정렬·포함, 지정된 PoolManager에서 풀 초기화 완료 |
| 이름 | `0x`를 포함한 소문자 주소 + `.tokens.klamp.eth`. 조회와 쓰기에 같은 이름 사용 |
| 데이터 | `text("pool") = eip155:<chainId>:<poolId>` 및 `data("pool") = abi.encode(chainId, PoolKey)` 유지 |
| 메타데이터 권한 | description·url만 지정 편집자에게 부여. pool 편집 권한은 부여하지 않음 |
| 미등록 | 악성으로 판정하지 않음. 대표 풀 미확인 상태 |
| 조회 실패 | 미등록과 별도 상태. 이벤트 fallback을 실행하지 않음 |
| 데모 정책 | 대표 풀 검증 모드에서는 검증된 일치 경로만 진행 가능. 이것은 거래 클라이언트 정책이지 전역 차단 기능이 아님 |
| 이벤트 fallback | 지원하는 런처/전략의 검증된 TokenLaunched 로그에 한정. ENS의 실제 미등록 시만 사용하며 출처를 별도로 표시 |
| 확장 | hooks 이름공간은 권한 봉인 전에 예약. CappedHookProxy 및 수수료 상한 로직은 구현하지 않음 |

보장하지 않는 것: 사칭 토큰 방지, 배포자의 정직성, 훅 안전성, 유동성 보장, 수익성, MEV 방지, 모든 라우터의 자동 적용, ENS 상위 이름의 영구 존속.

## 2. 유지할 구조와 최소 변경

### 유지

- `CanonicalPoolRegistrar` 하나가 두 등록 경로에서 공통 `_record`를 호출한다.
- `PoolKey`의 필드 순서와 `keccak256(abi.encode(key))`를 유지한다.
- `canonicalPoolOf`, `tokensNode`, `tokensName`, `isLiquidityLauncher`, `uerc20Factory`와 기존 이벤트를 유지한다.
- `UserRegistry`·`PermissionedResolver` 표준 구현과 `VerifiableFactory`를 사용한다.
- tokens 라벨 하나와 와일드카드 조회를 사용하며 토큰마다 ENS 이름을 등록하지 않는다.
- SDK의 레코드 읽기는 viem `getEnsText`를 사용한다. 전용 registrar 조회 ABI를 필수로 만들지 않는다.
- `_hex`, `_dec`, `_namehash`는 정상 입력에서의 동작을 유지한다. 헬퍼 전면 교체는 하지 않는다.

### 필요한 변경

1. 등록 전에 실제 토큰·풀 상태를 검증한다.
2. CREATE2 경로에 메타데이터 편집자 지정용 오버로드를 추가한다.
3. 셋업 권한을 최소화하고 hooks 예약·봉인 검증을 추가한다.
4. SDK의 값 검증·결과 상태·fallback·경로 비교를 명시한다.
5. 실제 ENS 통합 및 네트워크 셋업의 검증 근거를 남긴다.

원문의 “외부 라이브러리 없이 파일 하나로 컴파일” 형태는 가능한 한 유지한다. 필요한 StateView 인터페이스는 같은 파일에 최소 선언할 수 있다. 테스트와 스크립트는 실제 의존성 구현을 import한다. ABI는 추측하지 말고 고정한 버전에서 확인한다.

## 3. 커밋별 실행 계획

| 순서 | 권장 커밋 메시지 | 단일 목표 | 의존 |
| --- | --- | --- | --- |
| C01 | `chore: pin phase1 contract and sdk dependencies` | 원문과 실행 환경의 버전 차이 고정 | 없음 |
| C02 | `feat: add baseline canonical pool registrar` | 원문 등록 흐름 재현 | C01 |
| C03 | `fix: validate deployed tokens and initialized pools` | 잘못된 영구 등록 방지 | C02 |
| C04 | `fix: delegate metadata editing to explicit recipients` | 배포 주체와 편집자 분리 | C02 |
| C05 | `feat: configure least-privilege ens namespaces` | tokens·hooks 셋업과 봉인 | C03, C04 |
| C06 | `test: verify canonical registration through ens resolution` | 실제 ENS 경로 및 권한 검증 | C05 |
| C07 | `feat: add validated canonical pool resolution` | 표준 ENS 조회와 엄격한 상태 처리 | C06 |
| C08 | `feat: add verified launch event fallback` | 제한된 이벤트 대체 조회 | C07 |
| C09 | `feat: compare swap routes with canonical pools` | 라우트 판정·최소 데모 표시 | C07, C08 |
| C10 | `feat: add reproducible sepolia deployment checks` | 실제 배포 가능한 스크립트·smoke test | C06, C09 |
| C11 | `docs: record phase1 guarantees and verification evidence` | 구현과 일치하는 인계 문서 | C10 |

각 커밋은 관련 테스트까지 함께 포함하여 그 시점에 빌드가 통과해야 한다. C06은 앞 커밋의 테스트를 미루는 단계가 아니라 실제 의존성 전체를 묶는 통합 검증 단계다.

### C01 — 의존성과 기준 고정

예상 파일: 기존 `foundry.toml`, 의존성 lock/submodule 설정, `package.json`·lockfile, `docs/phase1-dependencies.md`.

- 원문의 `contracts-v2 2026-07-03`은 날짜만으로 정확한 SHA가 아니다. 기존 테스트/저장소에서 실제 SHA를 우선 복구한다. 식별할 수 없으면 이를 명시하고 호환되는 한 SHA를 선택하여 고정한다.
- ENSv2, v4-core, v4-periphery/StateView, UERC20Factory, LiquidityLauncher와 viem 버전을 기록한다. 원문 버전 재현을 우선하며 최신 버전 전체로 옮기지 않는다.
- `authorizeTextRoles`, `authorizeDataRoles`, `authorizeNameRoles`, resolver 초기화, UserRegistry 등록, ETHRegistrar 등록·갱신, UniversalResolver ABI를 확인한다.
- LiquidityLauncher의 graffiti와 UERC20Factory의 주소 계산이 원문과 일치하는지 확인한다. 허용된 런처가 업그레이드 가능한지도 기록한다.
- 원문 Sepolia 주소는 후보 값이다. 체인·코드 존재·구현 버전·프로토콜 역할을 확인하기 전 검증된 배포값으로 표기하지 않는다.

완료 조건: 기존 테스트 기준선 결과와 고정 버전 표가 있고, 이후 커밋이 같은 환경에서 재현 가능하다. ENS 라이브러리 버전 불일치를 해결하기 위해 임의의 selector/role 비트를 만들어내지 않는다.

### C02 — 원문 registrar 재현

예상 파일: `src/CanonicalPoolRegistrar.sol`, `test/CanonicalPoolRegistrar.t.sol`, 필요한 최소 fixture.

- 부록 Solidity를 기존 구현에 대조해 누락된 부분만 추가한다.
- CREATE2 경로는 실제 CREATE2를 실행하는 fixture 컨트랙트가 호출한다. 임의 EOA를 배포자로 꾸민 테스트만으로 통과 처리하지 않는다.
- LiquidityLauncher 경로는 고정한 실제 UERC20Factory와 호환되는 토큰으로 검증한다. 런처의 graffiti 생성 규칙까지 증명하는 fixture 또는 실제 런처 통합 테스트를 둔다.
- `isLiquidityLauncher`는 생성자에서만 설정하며 변경용 관리 함수를 추가하지 않는다.
- factory 주소가 0이면 경로 B가 명시적으로 실패하도록 작은 custom error를 추가할 수 있다.

완료 조건: 원문의 다섯 시나리오(정상 기록, 비배포자 거절, 덮어쓰기 거절, 런처 경로, 토큰 미포함 거절)가 재현된다. 이 단계에서 미배포 토큰·풀 검증까지 완료했다고 보고하지 않는다.

### C03 — 실제 토큰·풀 검증

예상 파일: registrar, 해당 테스트, constructor 호출 fixture.

- 생성자에 신뢰할 StateView를 immutable로 추가한다. 기존 배포 스크립트와 fixture의 생성자 호출만 함께 수정한다.
- StateView가 기대한 PoolManager에 연결되어 있는지 실제 버전의 getter 또는 배포 근거로 검증한다. 단순히 주소에 코드가 있다는 것만으로 신뢰하지 않는다.
- 등록 토큰은 `token != address(0)` 및 `token.code.length > 0`이어야 한다. currency0의 0 주소는 네이티브 ETH를 나타내므로 허용한다.
- currency0 < currency1, 토큰 포함, 동일 PoolManager에서 해당 PoolId의 `sqrtPriceX96 != 0`을 확인한다.
- 초기화된 실제 v4 풀 조회를 검증의 기준으로 삼는다. fee·tickSpacing·hook 규칙 전체를 registrar에 중복 구현하지 않는다.
- 검증 실패 시 mapping, text/data, 권한, 이벤트 어느 것도 남지 않아야 한다. resolver 쓰기 실패도 전체 트랜잭션을 revert시켜야 한다.

삽입 방향 예시(인터페이스는 고정한 실제 ABI로 확인):

```solidity
interface IStateView {
    function getSlot0(bytes32 poolId) external view returns (
        uint160 sqrtPriceX96,
        int24 tick,
        uint24 protocolFee,
        uint24 lpFee
    );
}

// _record에서 저장 전에 실행
if (token == address(0) || token.code.length == 0) revert TokenNotDeployed();
if (key.currency0 >= key.currency1) revert InvalidCurrencyOrder();
if (key.currency0 != token && key.currency1 != token) revert TokenNotInPool();
if (canonicalPoolOf[token] != bytes32(0)) revert AlreadyRecorded();
bytes32 poolId = keccak256(abi.encode(key));
(uint160 sqrtPriceX96,,,) = stateView.getSlot0(poolId);
if (sqrtPriceX96 == 0) revert PoolNotInitialized();
// 이후 원문의 mapping → text → data → 권한 → 이벤트 흐름 유지
```

완료 조건: 미배포 주소·역순/동일 currency·미초기화 풀은 실패하며, 실제 초기화된 풀은 성공한다. 초기화만 되고 유동성이 없는 풀은 등록 가능하다는 정책을 테스트·문서에 명시한다. 유동성 검사는 견적 단계의 책임이다.

### C04 — 메타데이터 편집자 분리

예상 파일: registrar, 편집 권한 테스트, 경로 A 호출 fixture.

기존 4인자 진입점을 보존하고 오버로드만 추가한다.

```solidity
function recordByCreate2(
    address token, PoolKey calldata key, bytes32 salt, bytes32 initCodeHash
) external; // 기존: editor = msg.sender

function recordByCreate2(
    address token, PoolKey calldata key, bytes32 salt,
    bytes32 initCodeHash, address metadataEditor
) external; // 신규: 증명 주체는 여전히 msg.sender

// 공통 기록 함수의 변경 방향
function _record(address token, PoolKey calldata key, address metadataEditor) internal;
```

- 증명 로직은 작은 internal 함수로 공통화해도 되지만 권한 체계 전면 리팩터링은 하지 않는다.
- 신규 경로의 editor는 0 주소를 거절한다. 런처 경로 B는 editor = msg.sender로 유지한다.
- editor에게 description·url만 준다. pool text/data 또는 관리자 권한을 주지 않는다.
- 기존 `CanonicalRecorded`의 ABI를 유지한다. 마지막 인자는 A에서는 직접 CREATE2 실행자, B에서는 검증된 크리에이터임을 명시한다. 필요하면 `MetadataEditorAssigned(token, editor)` 이벤트 하나를 추가한다.
- 기존 경로 A의 4인자 함수는 컨트랙트 자신에게 편집 권한이 간다는 호환 동작이다. 실제 런치패드 데모는 5인자 함수를 사용한다.

완료 조건: 지정 editor는 자기 토큰 description·url을 수정할 수 있고 pool 및 타 토큰 메타데이터는 수정할 수 없다. editor 지정이 등록 권한을 이전시키지 않는다.

### C05 — ENS 셋업·hooks 예약·권한 봉인

예상 파일: `script/DeployPhase1.s.sol`, `script/SealPhase1.s.sol`, 권한 테스트, 배포 설정.

- 원문의 UserRegistry·PermissionedResolver 배포와 tokens 라벨 등록 순서를 유지한다.
- registrar는 전체 이름의 pool text/data 쓰기 권한을 갖는다.
- description·url 위임은 가능하면 전체 이름의 각 키에 한정된 TEXT_ADMIN 권한 두 개만 부여한다. 실제 API의 resource 계산·grant 함수를 사용한다.
- 위 키별 admin이 고정한 버전에서 지원되지 않으면 원문의 root TEXT_ADMIN을 유지할 수 있다. 이 경우 컨트랙트 코드로 위임 키가 두 개에 고정된다는 잔여 신뢰 가정과 테스트를 기록한다. 무관한 setter를 추가하지 않는다.
- tokens 라벨은 resolver/subregistry 변경 권한 및 이를 재부여할 admin 경로까지 제거된 상태여야 한다. 단순히 owner 값이나 roleBitmap=0만 보고 봉인 성공으로 간주하지 않는다.
- `hooks` 라벨을 registrar 권한 회수 전에 등록한다. hooks만을 관리할 지정 관리자에게 미래 resolver/subregistry 설정에 필요한 역할과 대응 admin을 부여한다. 해당 관리자는 tokens와 klamp 상위 연결을 변경할 수 없어야 한다.
- hooks에 남은 역할 때문에 “셋업 후 모든 관리 역할이 사라짐”이라고 쓰지 않는다. 정확한 주장: tokens의 기록 경로는 봉인하고 hooks의 별도 확장 권한은 유지한다.
- registrar 및 resolver/registry proxy의 업그레이드 역할과 대응 admin을 포함해 실질적인 재권한 부여 경로를 점검한다. ENS 프로토콜 자체의 상위 권한까지 제거했다고 주장하지 않는다.
- 루트 klamp.eth의 만료·갱신·재등록과 조회 경로의 관계를 문서화한다.
- 새 배포에서는 namespace와 정상 왕복 조회를 확인한 뒤 봉인한다. Seal 스크립트는 잘못된 네트워크나 이미 봉인된 상태를 구분하고 재실행 시 불필요한 쓰기를 하지 않는다.

완료 조건: 프로젝트 운영자는 tokens resolver 교체·pool 직접 수정·registrar 우회 권한 부여를 할 수 없다. hooks 관리자는 hooks를 설정할 수 있지만 tokens에는 영향을 주지 못한다. 구체적인 허용/거절 호출 테스트로 증명한다.

### C06 — 실제 ENS 통합 테스트

예상 파일: `test/CanonicalPoolEnsIntegration.t.sol`와 기존 통합 fixture.

- 실제 고정 버전의 레지스트리·PermissionedResolver·UniversalResolverV2·v4 PoolManager/StateView를 사용한다.
- 배포 → 토큰 발행 → 풀 초기화 → 등록 → 와일드카드 조회 → text/data 대조 흐름을 검증한다.
- 토큰 라벨이 개별 등록되지 않아도 상위 tokens resolver가 응답하는지 검증한다.
- text의 PoolId와 data를 디코딩한 PoolKey의 해시, chainId가 일치해야 한다.
- registrar 조회가 아니라 실제 UniversalResolver 경로를 사용한다. Solidity에서 `resolveWithGateways`를 호출한 것만으로 실제 viem 실행 완료라고 쓰지 않는다. viem 호출은 C07에서 별도로 수행한다.
- resolver의 두 번째 쓰기 또는 권한 위임이 실패할 때 canonicalPoolOf와 첫 번째 레코드 쓰기도 rollback되는지 검증한다.
- 권한 봉인 이후에도 두 등록 경로의 새 토큰 등록이 계속 가능한지 검증한다.

완료 조건: mock resolver만으로는 드러나지 않는 권한·와일드카드·ABI 문제가 실제 구현 위에서 검증된다. 원문 테스트 통과 주장을 새로운 실행 로그로 대체한다.

### C07 — SDK의 표준 조회·검증

예상 파일: 기존 SDK의 `canonicalPool.ts`, 네트워크 설정, 해당 테스트.

- 원문의 `createPublicClient`, `normalize`, `getEnsText` 흐름을 유지한다.
- root 기본값은 klamp.eth, token 라벨은 소문자로 통일한다.
- resolver 주소는 환경 설정에서 관리한다. 명시 주소 사용 여부는 고정한 viem/ENS 배포 버전과 실제 통합 결과에 맞춘다.
- chainId는 bigint, poolId는 검증된 32바이트 hex로 다룬다. TypeScript `as Hex`만으로 검증을 대체하지 않는다.
- 정상 빈 레코드와 명확한 name/record 부재만 missing이다. RPC 실패, 해석 오류, 알 수 없는 revert는 unavailable이다.
- ENS 이름 경로·resolver가 배포 manifest와 맞는지 초기화/smoke 검사한다. 기존 보호 대상에서 namespace 만료·교체가 발견되면 missing으로 fallback하지 않고 unavailable/namespace 오류로 처리한다.
- 읽은 chainId가 대상 체인과 일치해야 하고, 설정된 StateView에서 풀 초기화를 재확인한다.

권장 결과 형태:

```ts
type CanonicalPoolResult =
  | { status: 'found'; source: 'ens' | 'launch-event';
      chainId: bigint; poolManager: Address; poolId: Hex }
  | { status: 'missing' }
  | { status: 'invalid'; reason: 'format' | 'chain' | 'pool-uninitialized' }
  | { status: 'unavailable'; reason: 'rpc' | 'resolution' | 'namespace' }
  | { status: 'ambiguous'; reason: 'multiple-launch-pools' };

function parsePoolRecord(value: string) {
  const match = /^eip155:([1-9][0-9]*):(0x[0-9a-fA-F]{64})$/.exec(value);
  if (!match) return null;
  return { chainId: BigInt(match[1]), poolId: match[2].toLowerCase() as Hex };
}
```

기존 호출부가 `getCanonicalPool(): value | null`에 의존하면 내부에 detailed 함수와 위 타입을 추가하고 기존 함수는 missing만 null로 변환한다. invalid/unavailable/ambiguous는 typed error로 남긴다. 신규 호출부는 detailed 함수를 사용한다. 불필요한 기존 호출부 전체 변경을 피한다.

완료 조건: 정상·빈 값·잘못된 형식·다른 체인·미초기화·RPC 오류가 구분되고 실제 viem getEnsText가 로컬 ENSv2 배포의 레코드를 읽는다.

### C08 — 검증된 이벤트 fallback

예상 파일: SDK의 `launchEventFallback.ts`, 체인별 emitter 설정, 해당 테스트.

- ENS 결과가 missing일 때만 실행한다. found/invalid/unavailable은 이벤트로 덮어쓰지 않는다.
- `TokenLaunched`의 정확한 ABI, 실제 emitting contract(런처인지 전략인지), 토큰/PoolKey 필드 위치를 C01에서 고정한 소스로 확인한다. 이벤트 필드를 임의로 만들어내지 않는다.
- 지원 체인·신뢰 emitter·검색 시작 블록을 설정한다. 토픽 문자열만 같은 임의 이벤트는 인정하지 않는다.
- 찾은 키에 토큰 포함, PoolId 계산, 올바른 PoolManager, 초기화 상태를 검증한다. 로그가 필요한 키/식별 정보를 제공하지 않으면 문서화된 실제 상태 조회로 보완한다. 증명할 수 없으면 미지원으로 남긴다.
- 서로 다른 여러 후보는 ambiguous로 반환한다. 마지막 로그를 무조건 선택하지 않는다. 재조직된 로그/removed 로그를 인정하지 않고 설정된 확인 블록 기준을 적용한다.
- fallback 결과는 source=launch-event이며 ENS에 자동 등록하지 않는다. 인덱서·DB를 새로 도입하지 않고 제한된 eth_getLogs 범위로 시작한다.

완료 조건: 믿을 수 있는 정상 로그만 fallback을 만들고, 가짜 emitter·타 토큰·충돌 후보·조회 오류는 성공 처리되지 않는다. 지원 ABI를 확보하지 못했으면 adapter를 disabled로 두고 근거를 남기며 나머지 작업을 계속한다.

### C09 — 경로 판정 및 최소 데모 연결

예상 파일: SDK route 비교 함수, 기존 데모 화면의 해당 패널과 호출부, 정책 테스트.

- 경로의 hop마다 chainId·PoolManager·PoolId를 비교한다. PoolId만 비교하지 않는다.
- 검증 대상은 사용자가 선택한 런칭 토큰과 그 토큰을 직접 포함하는 hop이다. ETH/USDC 같은 공통 자산의 모든 hop에 각자의 대표 풀을 강제하지 않는다.
- 분할 경로에서는 보호 대상 토큰을 포함하는 모든 branch/hop을 확인한다. 하나라도 다른 풀이라면 mismatch이다. 대상 hop이 없는 잘못된 입력도 성공으로 처리하지 않는다.
- ENS에서 받은 값과 외부 quote가 주장하는 pool 정보를 비교하는 것만으로 calldata의 실제 실행 풀을 보장하지 못한다. 기존 quote builder가 동일한 route 객체에서 실행 calldata를 구성하는지 확인한다. 불투명한 외부 calldata는 “경로 검증 완료” 범위에 포함하지 않는다.
- 온체인 강제 guard는 이번 단계에서 새로 만들지 않는다. UI 차단이 직접 컨트랙트 호출을 막는다는 표현을 사용하지 않는다.

| 입력 상태 | 표시 | 대표 풀 검증 모드 |
| --- | --- | --- |
| found + 일치 | 대표 풀 일치 / ENS 또는 이벤트 출처 | 기존 견적·슬리피지 등 검증 후 진행 |
| found + 불일치 | 지정 대표 풀과 다름 | 진행 차단 |
| missing | 대표 풀 기록 없음 | 진행 차단 |
| invalid / ambiguous | 검증 불가 및 이유 | 진행 차단 |
| unavailable | 조회 실패, 재시도 가능 | 진행 차단; 미등록으로 표시 금지 |

- 이 차단 정책은 해당 모드에만 적용한다. 기존 일반 거래 모드를 일괄 변경하지 않는다.
- 화면은 기존 UI에 토큰 주소, ENS 이름, 출처, 대표 PoolId, 후보 PoolId, 판정만 추가한다. 새 디자인 시스템이나 전체 프론트 재작성은 하지 않는다.
- 아직 데모가 없다면 이 값과 조회/비교 버튼만 있는 최소 화면을 만든다. 실제 거래 전송 없이도 조회·판정 데모는 가능하다.

완료 조건: 정상 대표 풀과 동일 토큰의 다른 풀을 같은 화면에서 구분하고, 미등록 및 RPC 실패도 다른 상태로 보여준다. “안전한 풀”이나 “악성 확정” 배지를 붙이지 않는다.

### C10 — Sepolia 배포와 smoke test

예상 파일: 배포·봉인·검증 스크립트, `.env.example`, `deployments/sepolia.phase1.json` 또는 기존 manifest 형식.

- 원문의 등록 commit → 대기 → register → setParent 순서를 실제 고정 버전 ABI로 구현한다. MockUSDC 잔액/allowance, 가격 조회, commitment 시간 조건은 실제 API에 맞춰 처리한다.
- 단계 사이 재실행을 지원한다. klamp.eth가 이미 타인에게 등록되어 있으면 임의로 다른 root를 사용했다고 숨기지 않는다. 로컬 검증을 완료하고 이름 충돌을 보고한다.
- 배포 전 chainId, 프로토콜 주소, 코드, wallet, 역할과 자금 조건을 검사한다. private key나 RPC 비밀값을 manifest·로그에 남기지 않는다.
- roots/registries/resolvers/registrar/StateView/PoolManager/런처 목록/구현 버전/배포 블록/공개 트랜잭션 해시/expiry/봉인 상태를 기록한다.
- 후보 프로토콜 주소에 맞는 ENS 버전인지 확인한다. 로컬 테스트의 구현과 네트워크 구현이 다른 경우 차이를 숨기지 않는다.
- 실제 네트워크에서는 1개 토큰·초기화 풀을 등록하고 viem 왕복 조회, 편집자 권한, 덮어쓰기 거절, 봉인 후 운영자 쓰기 거절을 검증한다. 가능한 revert 검증은 eth_call로 수행한다.
- ENS 앱의 이름 표시 여부는 별도의 수동 smoke 항목이다. getEnsText 성공으로 앱 UI 지원을 확인했다고 쓰지 않는다. 앱 표시 실패 때문에 주소 라벨을 즉흥적으로 바꾸지 않는다.

완료 조건: 자격증명이 있으면 허용된 범위의 실배포 증거를 남긴다. 없으면 로컬 E2E·dry-run 가능한 스크립트·정확한 실행 방법을 완성하고 Sepolia는 미실행으로 표시한다. 네트워크 대기 때문에 로컬 구현을 미완료로 남기지 않는다.

### C11 — 문서와 인계

예상 파일: 기존 README/설계 문서의 관련 절, `docs/phase1-verification.md`.

- 대표 풀 정의, 통합 클라이언트의 역할, 다른 풀/악성 구분, 초기화/유동성 구분을 실제 구현과 맞춘다.
- 자체 매핑도 온체인에 남는다는 점을 반영한다. ENS의 가치는 표준 조회·이름공간·공유 가능한 레코드에 있다.
- wildcard는 토큰별 이름 등록을 생략하지만 resolver 레코드 쓰기 가스는 발생한다고 명시한다.
- 불변성은 mapping/레코드 쓰기 권한/이름의 조회 경로/상위 만료를 나눠 설명한다.
- 한 번 등록 후 변경 불가, 단일 체인, 고정 PoolManager, 지원 팩토리·런처만 가능, hooks 역할 잔존을 명시한다.
- 수수료 상한, 공격 손실, 훅 분류와 시장 점유율은 이번 1단계의 검증 결과에 포함하지 않는다.
- 각 검증 항목을 `로컬 통과 / Sepolia 통과 / 수동 확인 / 미실행 / 차단됨` 중 하나로 표시한다. 실행 명령·고정 버전·증거 위치를 연결한다.

완료 조건: 새 팀원이 문서만으로 로컬 데모를 재현하고 미검증 항목을 식별할 수 있다. 임의로 “감사 완료”, “전역 보호”, “영구 보장”을 표기하지 않는다.

## 4. 전체 완료 체크리스트

- [ ] 기존 예시 구조와 두 등록 경로가 유지된다.
- [ ] 실제 CREATE2 실행 주체만 경로 A의 검증을 통과한다.
- [ ] 경로 B의 팩토리·런처·graffiti 버전이 고정되어 있다.
- [ ] 미배포 토큰·잘못된 currency·미초기화 풀은 등록되지 않는다.
- [ ] 한 번 기록된 토큰의 PoolId는 덮어쓸 수 없다.
- [ ] resolver 오류 시 모든 상태가 rollback된다.
- [ ] description·url 편집 권한은 원하는 편집자에게만 간다.
- [ ] 토큰별 ENS 등록 없이 실제 UniversalResolver/viem 조회가 된다.
- [ ] text와 data의 chainId·PoolId·PoolKey가 일치한다.
- [ ] tokens 봉인과 hooks 향후 설정 권한이 분리되어 있다.
- [ ] 조회 실패·미등록·불일치·invalid·ambiguous가 구분된다.
- [ ] 이벤트 fallback의 출처·범위·충돌 정책이 검증된다.
- [ ] 경로 비교가 체인·PoolManager·PoolId와 분할 경로를 다룬다.
- [ ] Sepolia 실배포 여부와 ENS 앱 UI 확인 여부를 각각 기록한다.

## 5. 작업 종료 보고 형식

```text
완료 커밋: SHA / 제목 / 핵심 변경
건너뛴 커밋: 기존 충족 근거
검증: 실행 명령 / 결과 / 환경
원문 대비 diff: 추가·변경한 API와 이유
배포: local / Sepolia 상태, 공개 주소와 manifest
미완료: 구체적 원인, 완료에 필요한 입력, 재개 명령
남은 제약: 이번 단계가 보장하지 않는 것
```

## 6. 참고 근거

원문의 코드·주소·검증 주장은 제공 자료이며 이번 명세 작성 과정에서 재컴파일하거나 네트워크에 배포한 결과가 아니다. 구현 에이전트는 C01과 후속 테스트에서 확인한다.

- ENSv2 앱 연동: https://docs.ens.domains/ensv2/tutorial-app-developers/
- ENSv2 권한: https://docs.ens.domains/ensv2/enhanced-access-control/
- ENSv2 저장소: https://github.com/ensdomains/contracts-v2
- LiquidityLauncher 소스: https://github.com/Uniswap/liquidity-launcher/blob/main/src/LiquidityLauncher.sol

main 브랜치 링크는 탐색 출발점이다. 구현 결과에는 실제 사용한 commit SHA의 permalink를 기록한다.

## 부록 A. 원문 기준 코드

아래 코드는 제공 문서에서 그대로 옮긴 기준 코드다. C03/C04의 constructor·오버로드·검증 수정 및 C05의 셋업 변경을 적용해야 한다. 원문 코드 그대로 배포하라는 지시가 아니다.

### A1. Solidity 원문

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @dev Uniswap v4 PoolKey. v4-core의 PoolKey와 ABI가 같다 (Currency, IHooks = address).
struct PoolKey {
    address currency0; // 0x0 = ETH
    address currency1;
    uint24 fee;
    int24 tickSpacing;
    address hooks;
}

/// @dev ENSv2 PermissionedResolver 중 쓰는 함수만.
interface IPermissionedResolver {
    function setText(bytes32 node, string calldata key, string calldata value) external;
    function setData(bytes32 node, string calldata key, bytes calldata value) external;
    function authorizeTextRoles(bytes calldata name, string calldata key, address account, bool grant)
        external
        returns (bool);
}

/// @dev Uniswap UERC20Factory. 토큰 주소 = CREATE2(salt = keccak256(name, symbol, decimals, creator, graffiti)).
interface IUERC20Factory {
    function getUERC20Address(
        string memory name,
        string memory symbol,
        uint8 decimals,
        address creator,
        bytes32 graffiti
    ) external view returns (address);
}

interface IERC20Metadata {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
}

/// @title CanonicalPoolRegistrar
/// @notice 토큰을 만든 주체만 그 토큰의 대표 풀을 ENS에 한 번 기록할 수 있다.
///         기록 위치: <토큰주소>.tokens.klamp.eth 의 text("pool"), data("pool")
contract CanonicalPoolRegistrar {
    IPermissionedResolver public immutable resolver; // tokens.klamp.eth 의 resolver
    bytes32 public immutable tokensNode; // namehash("tokens.klamp.eth")
    bytes public tokensName; // DNS 인코딩된 "tokens.klamp.eth"
    IUERC20Factory public immutable uerc20Factory; // 0x0이면 경로 B 끔
    mapping(address => bool) public isLiquidityLauncher; // 배포 시 고정, 이후 변경 불가

    mapping(address token => bytes32 poolId) public canonicalPoolOf;

    event CanonicalRecorded(address indexed token, bytes32 indexed poolId, address indexed deployer);

    error NotDeployer();
    error TokenNotInPool();
    error AlreadyRecorded();

    constructor(
        IPermissionedResolver resolver_,
        bytes memory tokensName_,
        IUERC20Factory uerc20Factory_,
        address[] memory liquidityLaunchers
    ) {
        resolver = resolver_;
        tokensName = tokensName_;
        tokensNode = _namehash(tokensName_, 0);
        uerc20Factory = uerc20Factory_;
        for (uint256 i; i < liquidityLaunchers.length; i++) {
            isLiquidityLauncher[liquidityLaunchers[i]] = true;
        }
    }

    /// @notice 경로 A: CREATE2로 토큰을 배포한 컨트랙트(런치패드)가 런칭 트랜잭션 안에서 호출.
    function recordByCreate2(address token, PoolKey calldata key, bytes32 salt, bytes32 initCodeHash)
        external
    {
        address predicted = address(
            uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), msg.sender, salt, initCodeHash))))
        );
        if (predicted != token) revert NotDeployer();
        _record(token, key);
    }

    /// @notice 경로 B: Uniswap LiquidityLauncher(Pools.trade)로 만든 토큰의 크리에이터가 런칭 후 직접 호출.
    /// @dev LiquidityLauncher는 graffiti = keccak256(abi.encode(원래 호출자))를 넣어 토큰을 만든다.
    function recordByLiquidityLauncher(address token, PoolKey calldata key, address launcher) external {
        if (!isLiquidityLauncher[launcher]) revert NotDeployer();
        IERC20Metadata t = IERC20Metadata(token);
        address predicted = uerc20Factory.getUERC20Address(
            t.name(), t.symbol(), t.decimals(), launcher, keccak256(abi.encode(msg.sender))
        );
        if (predicted != token) revert NotDeployer();
        _record(token, key);
    }

    function _record(address token, PoolKey calldata key) internal {
        if (key.currency0 != token && key.currency1 != token) revert TokenNotInPool();
        if (canonicalPoolOf[token] != bytes32(0)) revert AlreadyRecorded();

        bytes32 poolId = keccak256(abi.encode(key)); // v4 PoolIdLibrary와 같은 값
        canonicalPoolOf[token] = poolId;

        string memory label = _hex(abi.encodePacked(token)); // "0x" + 소문자 40자
        bytes32 node = keccak256(abi.encodePacked(tokensNode, keccak256(bytes(label))));
        bytes memory name = abi.encodePacked(uint8(bytes(label).length), label, tokensName);

        resolver.setText(
            node, "pool", string.concat("eip155:", _dec(block.chainid), ":", _hex(abi.encodePacked(poolId)))
        );
        resolver.setData(node, "pool", abi.encode(block.chainid, key));
        resolver.authorizeTextRoles(name, "description", msg.sender, true);
        resolver.authorizeTextRoles(name, "url", msg.sender, true);

        emit CanonicalRecorded(token, poolId, msg.sender);
    }

    // ---------- utils ----------

    function _namehash(bytes memory dns, uint256 offset) internal pure returns (bytes32) {
        uint256 len = uint8(dns[offset]);
        if (len == 0) return bytes32(0);
        bytes memory label = new bytes(len);
        for (uint256 i; i < len; i++) {
            label[i] = dns[offset + 1 + i];
        }
        return keccak256(abi.encodePacked(_namehash(dns, offset + 1 + len), keccak256(label)));
    }

    function _hex(bytes memory b) internal pure returns (string memory) {
        bytes16 digits = "0123456789abcdef";
        bytes memory s = new bytes(2 + b.length * 2);
        s[0] = "0";
        s[1] = "x";
        for (uint256 i; i < b.length; i++) {
            s[2 + i * 2] = digits[uint8(b[i]) >> 4];
            s[3 + i * 2] = digits[uint8(b[i]) & 0x0f];
        }
        return string(s);
    }

    function _dec(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        uint256 n;
        for (uint256 t = v; t != 0; t /= 10) n++;
        bytes memory s = new bytes(n);
        for (; v != 0; v /= 10) s[--n] = bytes1(uint8(48 + (v % 10)));
        return string(s);
    }
}
```

### A2. 셋업 원문

```solidity
// 셋업 스크립트 (me = 우리 배포 계정). 1, 3, 4, 5의 앞 두 줄은 로컬 테스트 setUp과 같다
uint256 REG_ROLES = ROLE_REGISTRAR | ROLE_REGISTRAR_ADMIN | ROLE_SET_PARENT | ROLE_SET_PARENT_ADMIN;
uint256 RES_ROLES = ROLE_SET_TEXT_ADMIN | ROLE_SET_DATA_ADMIN;
bytes memory ANY = NameCoder.encode("");   // "모든 이름" (namehash 0)

// 1. 우리 레지스트리와 resolver를 ENS 표준 구현으로 배포
//    나중에 회수하려면 _ADMIN 역할도 같이 받아야 한다 (회수에도 ADMIN 필요)
UserRegistry reg = UserRegistry(VERIFIABLE_FACTORY.deployProxy(
    USER_REGISTRY_IMPL, salt1, abi.encodeCall(UserRegistry.initialize, (me, REG_ROLES))));
PermissionedResolver res = PermissionedResolver(VERIFIABLE_FACTORY.deployProxy(
    PERMISSIONED_RESOLVER_IMPL, salt2,
    abi.encodeCall(PermissionedResolver.initialize, (me, RES_ROLES, new bytes[](0)))));

// 2. klamp.eth 등록. subregistry에 우리 레지스트리를 바로 지정 (commit 후 대기 → register)
ETH_REGISTRAR.commit(ETH_REGISTRAR.makeCommitment("klamp", me, secret, reg, address(0), 365 days, bytes32(0)));
ETH_REGISTRAR.register("klamp", me, secret, reg, address(0), 365 days, MOCK_USDC, bytes32(0));
reg.setParent(ETH_REGISTRY, "klamp");

// 3. tokens 라벨: resolver 지정, 역할 0, 만료 최대
reg.register("tokens", me, IRegistry(address(0)), address(res), 0, type(uint64).max);

// 4. 등록 컨트랙트 배포와 권한 부여
CanonicalPoolRegistrar registrar = new CanonicalPoolRegistrar(
    res, NameCoder.encode("tokens.klamp.eth"), UERC20_FACTORY, launchers);
res.authorizeTextRoles(ANY, "pool", address(registrar), true);            // 모든 이름의 text(pool)
res.authorizeDataRoles(ANY, "pool", address(registrar), true);            // 모든 이름의 data(pool)
res.authorizeNameRoles(ANY, ROLE_SET_TEXT_ADMIN, address(registrar), true); // description·url 위임용

// 5. 우리 권한 전부 회수
res.authorizeNameRoles(ANY, RES_ROLES, me, false);
reg.revokeRootRoles(REG_ROLES, me);
ETH_REGISTRY.revokeRoles(rootTokenId, ROLE_SET_SUBREGISTRY | ROLE_SET_SUBREGISTRY_ADMIN
    | ROLE_SET_RESOLVER | ROLE_SET_RESOLVER_ADMIN, me);                   // klamp.eth의 하위 레지스트리 교체 봉인
```

### A3. TypeScript 원문

```ts
import { createPublicClient, http, type Address, type Hex } from 'viem'
import { sepolia } from 'viem/chains'
import { normalize } from 'viem/ens'

const client = createPublicClient({ chain: sepolia, transport: http() })
const UNIVERSAL_RESOLVER_V2 = '0x85edf8b6b7d4211e2b07aa687506b746357b92cf'

/** 토큰의 대표 풀. 기록이 없으면 null */
export async function getCanonicalPool(token: Address, root = 'klamp.eth') {
  const value = await client.getEnsText({
    name: normalize(`${token.toLowerCase()}.tokens.${root}`),
    key: 'pool',
    universalResolverAddress: UNIVERSAL_RESOLVER_V2,
  })
  if (!value) return null
  const [, chainId, poolId] = value.split(':') // eip155:<chainId>:<poolId>
  return { chainId: Number(chainId), poolId: poolId as Hex }
}
```

### A4. 원문 Sepolia 주소 — 검증 전 후보

| 컨트랙트 | 원문 주소 |
| --- | --- |
| ENSv2 ETHRegistrar | `0xa4449a0dd2b83007553d9b1d28b583a46a805a30` |
| ENSv2 ETHRegistry | `0x67b728a792e789a8978b30cf1b3b641f19354b43` |
| VerifiableFactory | `0x118bc31a50d559f7015a8da26d54b3b030cdb70f` |
| UserRegistry 구현 | `0x840fa461059862ea466a711e8c98c8de732061c0` |
| PermissionedResolver 구현 | `0x7e4b2d59938930168024201752ee5503df402303` |
| UniversalResolverV2 | `0x85edf8b6b7d4211e2b07aa687506b746357b92cf` |
| MockUSDC (등록비 결제) | `0xd3322b29a7bdee707d1684676f149bf41aa3422f` |
| Uniswap v4 PoolManager | `0xE03A1074c86CFeDd5C142C4F04F1a1536e203543` |
| Uniswap v4 StateView | `0xe1dd9c3fa50edb962e442f60dfbc432e24537e4c` |
