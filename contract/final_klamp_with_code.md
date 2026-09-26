
Klamp 1단계 설계 (최종): 런칭과 대표 풀 기록 (ENSv2)
2026년 9월 25일
 · 
@Someone


Klamp는 토큰 발행자가 선언한 대표 풀을 ENSv2에 기록하고, 라우터·터미널이 표준 ENS 도구로 읽어 제3자가 만든 복제 풀과 구분하게 한다. 설계의 핵심은 한 줄이다: 토큰 주소가 가리키는 발행자만 대표 풀을 한 번 선언할 수 있다. 전체 흐름(런칭 → 풀 생성 → 견적 → 체결)의 첫 단계다.

범위 밖: 수수료 상한(2단계, CappedHookProxy), 사칭 토큰, 트랜잭션 바깥의 MEV.

현재 상태: 등록 컨트랙트, SDK, 셋업 스크립트, 공격 재현까지 끝났다 (로컬 테스트 13개 통과). Sepolia 배포와 데모는 남았다 (맨 아래 체크리스트).

공격이 성립하는 조건
복제 풀 공격의 피해는 사용자의 슬리피지 허용치가 정한다. 허용치가 체결 수수료보다 크면 그만큼 잃고, 작으면 거래가 실패한다. Uniswap v4 실제 코드(v4-core)로 재현했다. 같은 페어에 대표 풀(0.25% 고정, 훅 없음)과 복제 풀(dynamic fee + 훅)을 만들고, 훅은 견적 호출자에게 0.05%, 실제 라우터에게는 높은 수수료를 매긴다.

체결 수수료

견적 대비 실제 수령량

슬리피지 0.5%·1%·5%

10%

20%

30%

10%

−9.94%

체결 실패

체결, 손실

체결, 손실

체결, 손실

30%

−29.94%

체결 실패

체결 실패

체결 실패

체결, 손실

두 경우 모두 복제 풀의 견적(0.05%)이 대표 풀(0.25%)보다 좋아 보여 라우터가 복제 풀을 고른다.

허용치 ≥ 체결 수수료: 거래가 체결되고 수수료만큼 잃는다. 공격자는 수수료를 흔한 허용치 바로 아래로 맞춘다.

허용치 < 체결 수수료: 거래가 실패하고 가스를 잃는다. 실패한 사용자가 허용치를 올려 재시도하면 첫 번째 경우가 된다.

밈 거래는 가격 변동이 커서 허용치를 높게 잡기 쉽다. 반대로 수수료가 PoolKey에 고정된 풀(훅 없음 + 정적 수수료)에서는 이 공격이 불가능하다. 이하 이런 풀을 정적 풀이라 부른다.

대표 풀은 누가 정하나
대표 풀 = 그 토큰의 발행자가 선언한, 이미 초기화된 풀. 경로 A는 런칭 트랜잭션 안에서 선언하므로 런칭 때 생성된 풀과 같다. Klamp는 풀이 좋은지 판단하지 않는다. 누가 선언했는지, 토큰과 풀이 실제로 있는지만 온체인에서 검증하고, 한 번 선언되면 아무도 바꾸지 못하게 한다. 남의 토큰의 대표 풀은 아무도 선언할 수 없다.

역할은 세 가지로 나눈다.

역할

뜻

할 수 있는 것

발행자 (issuer)

토큰 주소가 암호학적으로 가리키는 주소. 토큰마다 정확히 하나

대표 풀을 한 번 선언

크리에이터 (creator)

토큰을 런칭한 사람

토큰 설명·링크(description, url) 관리. 대표 풀은 못 바꿈

배포 컨트랙트 (deployer)

CREATE2를 실제로 실행한 컨트랙트. 경로 A에서는 등록 호출자가 반드시 이 컨트랙트여야 한다

없음. 발행자일 수도, 아닐 수도 있다

발행자가 누구인지는 토큰이 만들어진 방식이 정한다.



경로 A: CREATE2 런치패드

경로 B: Uniswap Pools.trade

토큰을 배포한 컨트랙트

런치패드

UERC20Factory

토큰 주소가 묶고 있는 것

런치패드 주소 + salt + 코드

LiquidityLauncher 주소 + graffiti = keccak256(abi.encode(LiquidityLauncher를 부른 주소))

발행자

런치패드 컨트랙트. 그 코드가 선언한다

LiquidityLauncher를 직접 부른 주소. 일회용 컨트랙트로 불렀으면 그 컨트랙트를 배포한 주소

크리에이터

런치패드가 넘겨주는 사람 주소

발행자와 같음

선언할 수 있는 풀

발행자가 고른 초기화된 풀. 런칭 트랜잭션 안에서 선언

런칭 풀 (ETH, 토큰, 2500, 25, 훅 없음) 하나. 런칭 후 크리에이터가 선언

경로 B는 가상의 런치패드가 아니다. Uniswap LiquidityLauncher가 지금 UERC20Factory에 graffiti로 LiquidityLauncher를 부른 주소를 새기고 있고, Klamp는 그 값을 그대로 증명에 쓴다. Pools.trade 코드는 바뀌지 않는다.

행동

가능한 주체

대표 풀 선언

그 토큰의 발행자, 한 번

대표 풀 변경·삭제

아무도 없음 (발행자와 Klamp 팀 포함)

설명·링크 수정

그 토큰의 크리에이터

규칙(등록 컨트랙트) 변경

아무도 없음. 업그레이드 불가, 셋업 후 관리 역할 회수

남는 신뢰 가정

ENS 자체의 루트·.eth 레지스트리. ENS를 읽는 모든 곳과 같은 가정

심사에서 나올 질문과 답:

발행자가 나쁜 풀을 선언하면? 막지 않는다. 그 토큰은 발행자의 것이고, 트레이더가 사려는 것도 발행자의 토큰이다. Klamp가 막는 건 제3자가 남의 토큰에 붙이는 복제 풀이다. 대표 풀 자체의 수수료 조작은 2단계(수수료 상한)가 따로 본다.

크리에이터 키가 나중에 털리면? 이미 선언된 대표 풀은 바꿀 수 없다. 한 번만 쓰기를 택한 이유다. 바뀌는 건 설명·링크뿐이다.

선언을 안 하면? 기록이 없으면 대표 풀을 모르는 토큰이다. 기존 Pools.trade 토큰은 TokenLaunched 이벤트로 대신 조회한다.

경로 B에서 런칭 풀이 아닌 다른 풀을 선언하면? 할 수 없다. 경로 B는 PoolKey를 받지 않고 런칭 풀로 고정한다.

경로 A의 발행자 컨트랙트에 임의 호출 기능이 있으면? 제3자가 그 기능(execute, multicall 등)으로 recordByCreate2를 부를 수 있다. 그래서 경로 A는 "발행자 컨트랙트가 임의 외부 호출을 막는다"를 런치패드 연동 조건으로 둔다.

여러 사람이 쓰는 공용 런처 컨트랙트로 런칭하면? 그 컨트랙트에는 코드가 남아 있어 Via 진입점이 거절한다. 그래서 런처를 배포한 사람이 남의 런칭을 가로채지 못한다. 이런 토큰은 런처가 직접 recordByLiquidityLauncher를 부르는 기능을 갖춰야 선언할 수 있다.

라우터·터미널 판정 정책
Klamp SDK는 견적 경로에서 이 토큰이 들어 있는 풀만 본다. 대표 풀과 정적 풀은 위 공격이 불가능하므로 통과시키고, 그 외 풀(훅·dynamic fee)이 경로에 있을 때만 조회 결과에 따라 다르게 처리한다.

조회 결과

판정 기준

경로에 그 외 풀이 있을 때

등록됨

ENS 기록이 검증을 통과

대표 풀·정적 풀로만 재견적. 사용자 우회 없음

미등록

레코드가 비어 있고, 신뢰하는 런칭 이벤트도 없음

정적 풀로만 재견적. 정적 경로가 없으면 경고 후 사용자 확인

조회 실패

RPC 오류, 고정한 resolver가 아님, 형식·chainId·PoolId 불일치

정적 풀로만 재견적. 확인으로 우회 불가, 재시도

경로가 대표 풀과 정적 풀만 쓰면 세 경우 모두 허용한다. 대표 풀 자체가 훅 풀(D형)이면 허용하고, 그 훅의 수수료 조작은 2단계(수수료 상한)가 막는다.

보호 효과가 생기는 곳. 대표 풀이 정적 풀이면 "정적 풀만 허용" 규칙만으로도 판정이 같다. Pools.trade 런칭 풀이 그렇다. 기록이 판정을 바꾸는 건 대표 풀에 훅이 붙은 토큰(D형)이다. 기록이 없으면 정당한 훅 풀도 복제 풀과 구별되지 않아 막히고, 기록이 있으면 대표 훅 풀은 통과하고 같은 페어의 다른 훅 풀만 막힌다. hooklist 기준 런치패드 훅의 다수(Robinhood 86%)가 D형이다. 그래서 방어 데모는 경로 A의 D형 런치패드로 보여주고, 경로 B는 발행자 증명·표준 ENS 조회·설명과 링크를 보여준다.

ENS 기록이 없는 Pools.trade 토큰은 런칭 이벤트를 대신 쓴다. 이벤트로 얻은 풀은 등록됨과 같이 취급한다.

이벤트 대체

정책

신뢰하는 발생 주소

InstantLaunchStrategy 0x23f8209572b4a1C2AD88A42749E830791Fb027f1 (liquidity-launcher README의 v3.2.0 Robinhood 표, 최근 364건 중 294건). 같은 표의 0xAD44D55E7f8337C3cE113fBb591486E85be104b2는 최근 약 200만 블록 동안 0건. 활동 중인 미확인 주소 3개(0x7c48dde3…, 0xc9566675…, 0x60d73b21…)는 Pools.trade 공식 전략인지 확인한 뒤 추가. 목록은 SDK에 고정

검증

topic0 = TokenLaunched, topic2 = 그 토큰, 디코딩한 PoolKey로 계산한 PoolId = topic1, PoolKey = (ETH, 토큰, 2500, 25, 훅 없음)

조회 방법

인덱서나 자체 캐시로 조회. 공개 RPC의 블록 범위 제한 등으로 조회가 끝나지 않으면 조회 실패

ENS 기록과 충돌

ENS 기록이 우선. 다르면 ENS 값을 대표 풀로 쓰고 "런칭 풀과 다름" 경고

바뀌는 것
대표 풀은 그대로 두고 기록 하나만 추가한다. 

기준은 Pools.trade Instant Launch(InstantLaunchStrategy)다.



현재

바꾼 뒤

런칭

토큰 발행 → 풀 생성(ETH/토큰, 0.25% 고정, 훅 없음) → 유동성 영구 잠금 → TokenLaunched 이벤트

동일 + 등록 컨트랙트 호출 1번 (런칭 중 또는 직후)

대표 풀 정보

이벤트에만 있고 라우터는 안 봄

ENSv2 레코드, 누구나 조회

복제 풀

누구나 생성 가능

여전히 가능. 라우터가 걸러냄

대표 풀 기록은 런치패드 유형과 무관하게 공통이다. 수수료 상한은 C·D형에만 필요하다.

유형

대표 풀 모양

예시

A. 훅 없음

훅 없음, 고정 수수료

Pools.trade Instant Launch

B. 스왑 훅, 수수료 조작 없음

beforeSwap만 (거래 게이트 등)

GatedSwapHook, ZoraV4CoinHook

C. dynamic fee 훅

LP 수수료를 훅이 바꿈

Clanker dynamic fee 계열

D. delta 수수료 훅

매 스왑 delta로 수수료 취득

LaunchHook, LaunchpadHook, TokenFab

E. 졸업형

졸업 전엔 자체 커브, 졸업 후 v4 풀

본딩 커브형

D형이 다수다: hooklist 기준 Robinhood 86%, Base 76% (키워드 필터 근사치). E형은 졸업 때 기록한다.

왜 매핑이 아니라 ENSv2인가
기록의 가치는 몇 곳이 읽느냐에 비례한다. 그래서 쓰는 규칙은 우리 컨트랙트, 읽는 곳은 ENS로 나눈다.



자체 매핑

ENSv2

읽는 곳

우리 ABI를 아는 곳만

ENS를 읽는 모든 클라이언트 (getEnsText, ENS 앱)

쓰기 권한

직접 구현

Enhanced Access Control 기본 제공

토큰 정보

별도 시스템

같은 이름에 설명·링크 (발행자가 증명한 토큰 리스트)

다음 단계

새 컨트랙트, 새 연동

hooks.klamp.eth로 같은 트리에 추가

우리가 사라지면

같이 사라짐

표준 도구로 계속 읽힘

발표용: 매핑은 우리 터미널 하나를 지킨다. ENS 기록은 ENS를 읽는 모든 곳을 지킨다. 데모에서는 우리 코드 없이 viem getEnsText(가능하면 ENS 앱)로 같은 pool 값이 나오는 장면을 보여준다.

ENSv2: 새 기능과 우리가 쓰는 방식
ENS는 이름(vitalik.eth)을 주소·텍스트 같은 레코드로 풀어주는 이더리움 표준 이름 시스템이다. v1은 모든 이름이 레지스트리 컨트랙트 하나에 namehash → 소유자로 들어 있었고, 소유자가 모든 권한을 가졌다. v2는 이름마다 자기 레지스트리를 갖는 트리 구조이고, 권한을 역할 단위로 쪼갤 수 있다.

우리 이름 트리는 이렇다. 런치패드별 이름공간이나 신뢰 목록 없이, 발행자 증명으로 모든 토큰을 한 공간에 기록한다.

klamp.eth                              ← 루트. 하위 이름은 우리 UserRegistry가 관리
 ├ tokens.klamp.eth                    ← 1단계. 역할 0, 만료 최대. resolver 하나가 모든 토큰에 답함
 │   └ 0x<토큰주소>.tokens.klamp.eth   ← 토큰별 기록. 등록하지 않음 (와일드카드)
 └ hooks.klamp.eth                     ← 2단계 (수수료 상한)
v2 기능

무엇인가

우리가 쓰는 곳

계층형 레지스트리

이름마다 하위 이름을 관리하는 레지스트리를 따로 둔다 (root → eth → klamp.eth → …). 하위 라벨은 register(label, owner, subregistry, resolver, roleBitmap, expiry)로 만든다

klamp.eth 아래 우리 UserRegistry를 두고 tokens 라벨 하나만 등록

역할 기반 권한 (Enhanced Access Control)

소유권 대신 역할 비트맵. ROLE_SET_RESOLVER, ROLE_SET_SUBREGISTRY, ROLE_CAN_TRANSFER_ADMIN 등을 따로 주고 회수한다. 역할을 남에게 주려면 그 역할의 _ADMIN이 있어야 한다

tokens 라벨을 역할 0으로 등록 → resolver 교체·전송·삭제를 아무도 못 함

레코드 단위 권한 (PermissionedResolver)

resolver 쓰기 권한을 (이름, 레코드 키) 조합으로 준다. 아래 4칸 표

등록 컨트랙트 = 모든 이름의 pool, 크리에이터 = 자기 토큰 이름의 description·url

와일드카드 해석

등록되지 않은 하위 이름을 물으면 가장 가까운 상위 이름의 resolver가 답한다 (LibRegistry.findResolver)

토큰 이름은 등록하지 않는다. 토큰당 등록 비용 0

UniversalResolverV2

클라이언트가 이름만 넘기면 레지스트리 트리를 따라가 resolver를 찾아 호출해 주는 진입점

viem getEnsText가 이걸 부른다 → 우리 ABI 없이 읽힘

VerifiableFactory

ENS 표준 구현(UserRegistry, PermissionedResolver)을 프록시로 배포한다. 누구나 표준 코드인지 확인 가능

우리 레지스트리·resolver가 임의 코드가 아님을 증명

data 레코드 (ENSIP-24)

텍스트 외에 임의 바이트를 저장하는 새 표준

abi.encode(chainId, PoolKey)를 그대로 저장 → 컨트랙트도 디코딩해 쓸 수 있음

PermissionedResolver는 setText(node, key, value)를 받으면 아래 네 resource 중 하나에 ROLE_SET_TEXT가 있는지 본다. resource는 keccak256(node, keccak256(key))이고, 자리가 0이면 "모든"이다. 루트 resource(0, 0)에 있는 역할은 모든 resource에 적용된다.



모든 키

특정 키

모든 이름

resource(0, 0) = 루트. 셋업 후 비움

resource(0, pool) ← 등록 컨트랙트

특정 이름

resource(node, 0). 아무에게도 안 줌

resource(node, description), resource(node, url) ← 그 토큰의 크리에이터

기준 코드: ensdomains/contracts-v2 (2026-07-03 커밋).

CanonicalPoolRegistrar
우리가 만드는 컨트랙트는 하나다. 진입점은 세 개(발행자 증명 방식은 CREATE2와 graffiti 두 가지)이고, 증명을 통과하면 같은 _record로 기록한다. 세 진입점 모두 호출자 = 발행자다.

진입점

호출자 (= 발행자)

발행자 증명

대표 풀

recordByCreate2(token, key, salt, initCodeHash, creator)

토큰을 CREATE2로 배포한 컨트랙트, 런칭 트랜잭션 안에서

CREATE2(msg.sender, salt, initCodeHash) == token

인자 key

recordByLiquidityLauncher(token, launcher)

LiquidityLauncher를 직접 부른 주소 (EOA·스마트 계정)

getUERC20Address(name, symbol, decimals, launcher, keccak256(msg.sender)) == token

런칭 풀로 고정

recordByLiquidityLauncherVia(token, launcher, nonce)

일회용 런칭 컨트랙트를 배포한 크리에이터

위 식의 graffiti 자리에 CREATE(msg.sender, nonce). 그 주소에 코드가 남아 있으면 거절

런칭 풀로 고정

경로 B의 런칭 풀은 InstantLaunchStrategy가 만드는 (ETH, 토큰, 2500, 25, 훅 없음)이다. PoolKey를 받지 않으므로 잘못 선언할 수 없다. Robinhood 최근 런칭 샘플 12건 중 10건이 일회용 컨트랙트 방식이라 Via 진입점이 없으면 대부분 선언할 수 없다.

launcher는 배포 때 고정한 LiquidityLauncher 두 버전만 받는다: v3.0.0 0x00004c4ccc709Ef590F7C81102C0689F0263D4e9, v3.2.0 0x0000FffFBE8efE702c8703aE3477FF5dE3d319C0. 둘 다 graffiti에 LiquidityLauncher를 부른 주소를 넣는다는 게 검증된 소스로 확인됐고, Sepolia와 Robinhood에 같은 바이트코드로 있다. 런치패드 심사가 아니라 증명 방식의 조건이다.

기록 전에 네 가지를 본다. 토큰이 이미 배포돼 있는지(TokenNotDeployed), PoolKey에 토큰이 들어 있는지(TokenNotInPool), 이미 선언됐는지(AlreadyRecorded), 지정한 PoolManager에서 초기화된 풀인지(PoolNotInitialized). 통과하면 아래를 쓰고 CanonicalRecorded(token, poolId, issuer, creator, key)를 낸다. key(PoolKey)는 공개 정보(PoolManager Initialize 이벤트, data 레코드)와 같지만, 어그리게이터 인덱서가 이 이벤트 하나만 구독해 token → PoolKey를 얻도록 넣는다. creator가 0이면 설명·링크 권한은 아무에게도 주지 않는다.

키

값

쓰는 주체

pool (text)

eip155:<chainId>:<poolId>

등록 컨트랙트

pool (data, ENSIP-24)

abi.encode(chainId, PoolKey)

등록 컨트랙트

description, url (text)

토큰 설명, 링크

크리에이터 (기록 시 위임)

전체 코드다. 외부 라이브러리 없이 이 파일 하나로 컴파일된다.

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

/// @dev Uniswap UERC20Factory. 토큰 주소 = CREATE2(salt = keccak256(name, symbol, decimals, factoryCaller, graffiti)).
///      factoryCaller는 팩토리를 부른 컨트랙트(Uniswap 코드의 `creator` 인자, Pools.trade에서는 LiquidityLauncher)다.
///      LiquidityLauncher를 부른 주소는 graffiti 쪽에 들어간다.
interface IUERC20Factory {
    function getUERC20Address(
        string memory name,
        string memory symbol,
        uint8 decimals,
        address factoryCaller,
        bytes32 graffiti
    ) external view returns (address);
}

/// @dev Uniswap v4 PoolManager 중 쓰는 함수만. 풀 상태는 extsload로 읽는다.
interface IPoolManager {
    function extsload(bytes32 slot) external view returns (bytes32);
}

interface IERC20Metadata {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
}

/// @title CanonicalPoolRegistrar
/// @notice 토큰의 발행자(issuer)만 그 토큰의 대표 풀을 한 번 선언할 수 있다.
///         발행자 = 토큰 주소가 암호학적으로 가리키는 주소. 남의 토큰의 대표 풀은 아무도 선언할 수 없다.
///         기록 위치: <토큰주소>.tokens.klamp.eth 의 text("pool"), data("pool")
contract CanonicalPoolRegistrar {
    IPermissionedResolver public immutable resolver; // tokens.klamp.eth 의 resolver
    bytes32 public immutable tokensNode; // namehash("tokens.klamp.eth")
    bytes public tokensName; // DNS 인코딩된 "tokens.klamp.eth"
    IPoolManager public immutable poolManager; // 이 체인의 Uniswap v4 PoolManager
    IUERC20Factory public immutable uerc20Factory; // 0x0이면 경로 B 끔
    mapping(address => bool) public isLiquidityLauncher; // 배포 시 고정, 이후 변경 불가

    mapping(address token => bytes32 poolId) public canonicalPoolOf;

    uint24 public constant LAUNCH_FEE = 2500; // InstantLaunchStrategy.LP_FEE
    int24 public constant LAUNCH_TICK_SPACING = 25; // InstantLaunchStrategy.TICK_SPACING
    /// @dev v4 StateLibrary.POOLS_SLOT (v4-core 46c6834). 배포된 PoolManager에서 같은 값인지 테스트로 확인한다
    bytes32 public constant POOLS_SLOT = bytes32(uint256(6));

    /// @param issuer 대표 풀을 선언한 주소 (경로 A: 런치패드 컨트랙트, 경로 B: 크리에이터)
    /// @param creator description·url을 관리할 사람 주소 (경로 B에서는 issuer와 같다)
    /// @param key 대표 풀의 PoolKey. 인덱서가 이 이벤트 하나로 token → PoolKey를 얻는다 (poolId = keccak256(abi.encode(key)))
    event CanonicalRecorded(
        address indexed token, bytes32 indexed poolId, address indexed issuer, address creator, PoolKey key
    );

    error NotIssuer();
    error TokenNotDeployed();
    error PoolNotInitialized();
    error TokenNotInPool();
    error AlreadyRecorded();

    constructor(
        IPermissionedResolver resolver_,
        bytes memory tokensName_,
        IPoolManager poolManager_,
        IUERC20Factory uerc20Factory_,
        address[] memory liquidityLaunchers
    ) {
        resolver = resolver_;
        tokensName = tokensName_;
        tokensNode = _namehash(tokensName_, 0);
        poolManager = poolManager_;
        uerc20Factory = uerc20Factory_;
        for (uint256 i; i < liquidityLaunchers.length; i++) {
            isLiquidityLauncher[liquidityLaunchers[i]] = true;
        }
    }

    /// @notice 경로 A. issuer = 토큰을 CREATE2로 배포한 컨트랙트(런치패드) 자신.
    ///         런칭 트랜잭션 안에서, 방금 만든 풀을 선언한다. creator는 런치패드가 넘겨주는 사람 주소.
    ///         호출자는 CREATE2를 실제로 실행한 컨트랙트여야 한다. 런치패드가 별도 토큰 팩토리를 쓰면
    ///         그 팩토리가 호출해야 한다 (런치패드가 대신 부르면 NotIssuer).
    ///         전제: 발행자 컨트랙트에 임의 외부 호출 기능(execute, multicall 등)이 없어야 한다.
    ///         있으면 제3자가 그 기능을 통해 이 함수를 부를 수 있다.
    function recordByCreate2(
        address token,
        PoolKey calldata key,
        bytes32 salt,
        bytes32 initCodeHash,
        address creator
    ) external {
        if (token.code.length == 0) revert TokenNotDeployed();
        address predicted = address(
            uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), msg.sender, salt, initCodeHash))))
        );
        if (predicted != token) revert NotIssuer();
        _record(token, key, creator);
    }

    /// @notice 경로 B. Uniswap LiquidityLauncher(Pools.trade)로 만든 토큰.
    ///         LiquidityLauncher는 graffiti = keccak256(abi.encode(LiquidityLauncher를 부른 주소))를 넣는다.
    ///         그 주소를 직접 부른 경우: 그 주소가 발행자이자 크리에이터다. 런칭 후 직접 호출한다.
    ///         PoolKey는 받지 않는다. InstantLaunchStrategy가 만드는 풀 하나로 고정해 잘못된 선언을 막는다.
    function recordByLiquidityLauncher(address token, address launcher) external {
        _recordLaunched(token, launcher, msg.sender);
    }

    /// @notice 경로 B, 일회용 컨트랙트 경유. 크리에이터가 일회용 컨트랙트를 배포하고, 그 생성자가
    ///         LiquidityLauncher를 부른 뒤 사라진 경우. graffiti는 일회용 주소를 가리키고, 그 주소는
    ///         CREATE(크리에이터, nonce)로 다시 계산된다. 발행자 = 그 컨트랙트를 배포한 크리에이터.
    /// @dev 일회용 주소에 코드가 남아 있으면 거절한다. 여러 사람이 쓰는 공용 컨트랙트의 배포자가
    ///      남의 런칭을 가로채지 못하게 하기 위해서다.
    function recordByLiquidityLauncherVia(address token, address launcher, uint256 nonce) external {
        address disposable = _createAddress(msg.sender, nonce);
        if (disposable.code.length != 0) revert NotIssuer();
        _recordLaunched(token, launcher, disposable);
    }

    function _recordLaunched(address token, address launcher, address graffitiOwner) internal {
        if (!isLiquidityLauncher[launcher]) revert NotIssuer();
        if (token.code.length == 0) revert TokenNotDeployed();
        IERC20Metadata t = IERC20Metadata(token);
        address predicted = uerc20Factory.getUERC20Address(
            t.name(), t.symbol(), t.decimals(), launcher, keccak256(abi.encode(graffitiOwner))
        );
        if (predicted != token) revert NotIssuer();
        // InstantLaunchStrategy의 풀: ETH / 토큰, LP_FEE 2500, TICK_SPACING 25, 훅 없음 (liquidity-launcher v3.2.0)
        _record(token, PoolKey(address(0), token, LAUNCH_FEE, LAUNCH_TICK_SPACING, address(0)), msg.sender);
    }

    function _record(address token, PoolKey memory key, address creator) internal {
        if (key.currency0 != token && key.currency1 != token) revert TokenNotInPool();
        if (canonicalPoolOf[token] != bytes32(0)) revert AlreadyRecorded();

        bytes32 poolId = keccak256(abi.encode(key)); // v4 PoolIdLibrary와 같은 값
        // 풀 상태 slot0 = pools[poolId]. sqrtPriceX96 == 0이면 미초기화.
        // PoolManager가 initialize 때 PoolKey를 검증하므로, 초기화된 풀이면 PoolKey도 유효하다.
        bytes32 slot0 = poolManager.extsload(keccak256(abi.encodePacked(poolId, POOLS_SLOT)));
        if (uint160(uint256(slot0)) == 0) revert PoolNotInitialized();
        canonicalPoolOf[token] = poolId;

        string memory label = _hex(abi.encodePacked(token)); // "0x" + 소문자 40자
        bytes32 node = keccak256(abi.encodePacked(tokensNode, keccak256(bytes(label))));
        bytes memory name = abi.encodePacked(uint8(bytes(label).length), label, tokensName);

        resolver.setText(
            node, "pool", string.concat("eip155:", _dec(block.chainid), ":", _hex(abi.encodePacked(poolId)))
        );
        resolver.setData(node, "pool", abi.encode(block.chainid, key));
        if (creator != address(0)) {
            resolver.authorizeTextRoles(name, "description", creator, true);
            resolver.authorizeTextRoles(name, "url", creator, true);
        }

        emit CanonicalRecorded(token, poolId, msg.sender, creator, key);
    }

    // ---------- utils ----------

    /// @dev CREATE 주소 = keccak256(rlp([deployer, nonce]))의 끝 20바이트. nonce < 2^64 (EIP-2681)
    function _createAddress(address deployer, uint256 nonce) internal pure returns (address) {
        bytes memory rlp;
        if (nonce == 0) {
            rlp = abi.encodePacked(bytes1(0xd6), bytes1(0x94), deployer, bytes1(0x80));
        } else if (nonce <= 0x7f) {
            rlp = abi.encodePacked(bytes1(0xd6), bytes1(0x94), deployer, uint8(nonce));
        } else {
            uint256 len;
            for (uint256 t = nonce; t != 0; t >>= 8) len++;
            bytes memory n = new bytes(len);
            for (uint256 i; i < len; i++) n[len - 1 - i] = bytes1(uint8(nonce >> (8 * i)));
            rlp = abi.encodePacked(bytes1(uint8(0xd6 + len)), bytes1(0x94), deployer, bytes1(uint8(0x80 + len)), n);
        }
        return address(uint160(uint256(keccak256(rlp))));
    }

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
검증: ENSv2 실제 컨트랙트(contracts-v2 48b3e2d, 2026-07-03), Uniswap v4 PoolManager(v4-core 46c6834), Uniswap UERC20Factory 원본 위에서 로컬 Foundry 테스트 13개가 통과했다 (CREATE 주소 계산은 무작위 4,096회).

테스트

확인한 것

CREATE2 경로 선언과 조회

런치패드가 런칭 중 풀 초기화 후 선언 → 와일드카드로 tokens resolver가 답함 → viem이 부르는 resolveWithGateways로 같은 값. data(node, "pool")도 실제 resolver에서 읽어 PoolKey 디코딩. creator는 description을 쓰고 pool은 못 씀. 발행자(런치패드)는 메타데이터 권한 없음

발행자 아닌 호출 거절

공격자가 같은 salt로 호출하면 NotIssuer

덮어쓰기 거절

발행자가 다른 fee의 풀로 다시 선언하면 AlreadyRecorded

LiquidityLauncher 직접 호출 경로

크리에이터는 선언 성공, 공격자는 NotIssuer

일회용 컨트랙트 경로

생성자에서 런칭 후 사라지는 컨트랙트(nonce 1788). 직접 경로는 아무도 못 하고, 크리에이터만 Via로 선언. 다른 사람은 같은 nonce로도 NotIssuer

공용 런처 가로채기 거절

공격자가 배포한 공용 런처로 피해자가 런칭하면, 런처에 코드가 남아 있어 공격자의 Via는 NotIssuer

CREATE 주소 계산

무작위 배포자·nonce 4,096쌍에서 EVM과 같은 값

토큰 미포함

토큰이 없는 PoolKey는 TokenNotInPool

미초기화 풀 거절

런칭 풀이 PoolManager에 없으면 PoolNotInitialized

미배포 토큰 거절

아직 배포되지 않은 CREATE2 예상 주소는 TokenNotDeployed

POOLS_SLOT

실제 PoolManager에서 초기화한 풀의 slot0를 이 슬롯으로 읽으면 초기 가격이 나옴

남긴 등록 권한의 한계

남긴 ROLE_REGISTRAR로 tokens의 재등록·resolver 교체·하위 레지스트리 교체·삭제 불가. klamp.eth 하위 레지스트리 교체 불가. hooks 등록 후 마지막 권한 회수

업그레이드 역할 없음

resolver·레지스트리 어디에도 우리·등록 컨트랙트의 ROLE_UPGRADE 없음

등록 컨트랙트는 업그레이드 기능이 없고, resolver의 업그레이드 역할(ROLE_UPGRADE)은 처음부터 아무에게도 주지 않는다. 셋업이 끝나면 우리 관리 역할도 전부 회수하므로, 우리도 기록을 바꾸거나 지울 수 없다.

셋업과 조회 (Sepolia)
세팅은 한 번만 한다.

// 셋업 스크립트 (me = 우리 배포 계정). 2단계를 빼고 로컬 테스트 setUp과 같다
uint256 REG_ROLES = ROLE_REGISTRAR | ROLE_REGISTRAR_ADMIN | ROLE_SET_PARENT | ROLE_SET_PARENT_ADMIN;
uint256 RES_ROLES = ROLE_SET_TEXT_ADMIN | ROLE_SET_DATA_ADMIN;
bytes memory ANY = NameCoder.encode("");   // "모든 이름" (namehash 0)

// 1. 우리 레지스트리와 resolver를 ENS 표준 구현으로 배포. ROLE_UPGRADE는 누구에게도 주지 않는다
//    나중에 회수하려면 _ADMIN 역할도 같이 받아야 한다 (회수에도 ADMIN 필요)
UserRegistry reg = UserRegistry(VERIFIABLE_FACTORY.deployProxy(
    USER_REGISTRY_IMPL, salt1, abi.encodeCall(UserRegistry.initialize, (me, REG_ROLES))));
PermissionedResolver res = PermissionedResolver(VERIFIABLE_FACTORY.deployProxy(
    PERMISSIONED_RESOLVER_IMPL, salt2,
    abi.encodeCall(PermissionedResolver.initialize, (me, RES_ROLES, new bytes[](0)))));

// 2. klamp.eth 등록 (가능한 최대 기간). subregistry에 우리 레지스트리를 바로 지정
ETH_REGISTRAR.commit(ETH_REGISTRAR.makeCommitment("klamp", me, secret, reg, address(0), duration, bytes32(0)));
uint256 klampTokenId = ETH_REGISTRAR.register("klamp", me, secret, reg, address(0), duration, MOCK_USDC, bytes32(0));
reg.setParent(ETH_REGISTRY, "klamp");

// 3. tokens 라벨: resolver 지정, 역할 0, 만료 최대
reg.register("tokens", me, IRegistry(address(0)), address(res), 0, type(uint64).max);

// 4. 등록 컨트랙트 배포와 권한 부여
address[] memory launchers = new address[](2);
launchers[0] = 0x00004c4ccc709Ef590F7C81102C0689F0263D4e9; // LiquidityLauncher v3.0.0
launchers[1] = 0x0000FffFBE8efE702c8703aE3477FF5dE3d319C0; // LiquidityLauncher v3.2.0
CanonicalPoolRegistrar registrar = new CanonicalPoolRegistrar(
    res, NameCoder.encode("tokens.klamp.eth"), POOL_MANAGER, UERC20_FACTORY, launchers);
res.authorizeTextRoles(ANY, "pool", address(registrar), true);            // 모든 이름의 text(pool)
res.authorizeDataRoles(ANY, "pool", address(registrar), true);            // 모든 이름의 data(pool)
res.authorizeNameRoles(ANY, ROLE_SET_TEXT_ADMIN, address(registrar), true); // description·url 위임용

// 5. 권한 회수. 레지스트리의 REGISTRAR만 2단계까지 남긴다 (tokens는 못 건드림, 테스트로 확인)
res.authorizeNameRoles(ANY, RES_ROLES, me, false);                                  // resolver: 전부
reg.revokeRootRoles(ROLE_SET_PARENT | ROLE_SET_PARENT_ADMIN, me);                  // 레지스트리: REGISTRAR만 남김
ETH_REGISTRY.revokeRoles(klampTokenId, ROLE_SET_SUBREGISTRY | ROLE_SET_SUBREGISTRY_ADMIN
    | ROLE_SET_RESOLVER | ROLE_SET_RESOLVER_ADMIN | ROLE_CAN_TRANSFER_ADMIN, me);   // klamp.eth 소유자 역할: 전부

// 6. (2단계) hooks.klamp.eth 확보 후 마지막 권한 회수
reg.register("hooks", me, hooksRegistry, hooksResolver, 0, type(uint64).max);
reg.revokeRootRoles(ROLE_REGISTRAR | ROLE_REGISTRAR_ADMIN, me);
셋업 후 남는 쓰기 권한은 등록 컨트랙트의 것뿐이고, 그 컨트랙트는 업그레이드되지 않는다. 남는 위험은 klamp.eth의 만료다. 가능한 최대 기간으로 등록하고, ETHRegistrar.renew는 누구나 비용을 내고 부를 수 있다. 만료 후 누가 이름을 가로채도, SDK는 고정한 tokens resolver가 답하지 않으면 조회 실패로 처리하므로 가짜 값을 쓰지 않는다.

Sepolia 주소:

컨트랙트

주소

ENSv2 ETHRegistrar

0xa4449a0dd2b83007553d9b1d28b583a46a805a30

ENSv2 ETHRegistry

0x67b728a792e789a8978b30cf1b3b641f19354b43

VerifiableFactory

0x118bc31a50d559f7015a8da26d54b3b030cdb70f

UserRegistry 구현

0x840fa461059862ea466a711e8c98c8de732061c0

PermissionedResolver 구현

0x7e4b2d59938930168024201752ee5503df402303

UniversalResolverV2

0x85edf8b6b7d4211e2b07aa687506b746357b92cf

MockUSDC (등록비 결제)

0xd3322b29a7bdee707d1684676f149bf41aa3422f

Uniswap v4 PoolManager

0xE03A1074c86CFeDd5C142C4F04F1a1536e203543

Uniswap v4 StateView

0xe1dd9c3fa50edb962e442f60dfbc432e24537e4c

조회는 이렇게 흐른다.

tokens resolver
UniversalResolv-
erV2
터미널 SDK
tokens resolver
UniversalResolv-
erV2
터미널 SDK
resolve(<토큰>.tokens.klamp.-
eth, text(pool))
토큰 라벨 미등록
확인
상위 resolver에 위임
(와일드카드)
eip155:<chainId>:<poolId>
풀 상태 확인, 경로의
PoolId와 비교
터미널 쪽 코드는 viem 표준 함수 하나다. 우리 ABI는 필요 없다.

import {
  createPublicClient, http, keccak256, encodeAbiParameters, decodeAbiParameters, namehash, parseAbi,
  type Address, type Hex,
} from 'viem'
import { sepolia } from 'viem/chains'
import { normalize } from 'viem/ens'

const client = createPublicClient({ chain: sepolia, transport: http() })
const UNIVERSAL_RESOLVER_V2: Address = '0x85edf8b6b7d4211e2b07aa687506b746357b92cf'
const TOKENS_RESOLVER: Address = '0x0000000000000000000000000000000000000000' // 셋업 후 고정: tokens.klamp.eth의 resolver
const DYNAMIC_FEE_FLAG = 0x800000

const POOL_KEY = {
  type: 'tuple',
  components: [
    { name: 'currency0', type: 'address' },
    { name: 'currency1', type: 'address' },
    { name: 'fee', type: 'uint24' },
    { name: 'tickSpacing', type: 'int24' },
    { name: 'hooks', type: 'address' },
  ],
} as const
const dataAbi = parseAbi(['function data(bytes32 node, string key) view returns (bytes)'])

export type PoolKey = { currency0: Address; currency1: Address; fee: number; tickSpacing: number; hooks: Address }
export type Canonical =
  | { status: 'registered'; poolId: Hex; key: PoolKey }
  | { status: 'not_registered' }
  | { status: 'lookup_failed'; reason: string }

const eq = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()
export const poolIdOf = (key: PoolKey) => keccak256(encodeAbiParameters([POOL_KEY], [key]))

/** 토큰의 대표 풀. 미등록과 조회 실패를 구분한다 */
export async function getCanonicalPool(token: Address, root = 'klamp.eth'): Promise<Canonical> {
  const name = normalize(`${token.toLowerCase()}.tokens.${root}`)
  try {
    // 1. 해석 경로: 고정한 tokens resolver가 답해야 한다 (상위 이름이 만료·탈취되면 여기서 걸림)
    const resolver = await client.getEnsResolver({ name, universalResolverAddress: UNIVERSAL_RESOLVER_V2 })
    if (!eq(resolver, TOKENS_RESOLVER)) return { status: 'lookup_failed', reason: 'unexpected resolver' }

    // 2. 표준 ENS 조회. strict: 해석 오류를 미등록(null)으로 삼키지 않는다
    const text = await client.getEnsText({
      name, key: 'pool', universalResolverAddress: UNIVERSAL_RESOLVER_V2, strict: true,
    })
    if (text === null) return { status: 'not_registered' }

    // 3. 형식과 체인
    const m = /^eip155:(\d+):(0x[0-9a-f]{64})$/.exec(text)
    if (!m || Number(m[1]) !== client.chain.id) return { status: 'lookup_failed', reason: 'bad pool record' }
    const poolId = m[2] as Hex

    // 4. data 레코드의 PoolKey로 PoolId를 다시 계산하고, 토큰이 들어 있는지 확인
    const raw = await client.readContract({
      address: TOKENS_RESOLVER, abi: dataAbi, functionName: 'data', args: [namehash(name), 'pool'],
    })
    const [chainId, key] = decodeAbiParameters([{ type: 'uint256' }, POOL_KEY], raw)
    if (Number(chainId) !== client.chain.id || poolIdOf(key) !== poolId) {
      return { status: 'lookup_failed', reason: 'text/data mismatch' }
    }
    if (!eq(key.currency0, token) && !eq(key.currency1, token)) {
      return { status: 'lookup_failed', reason: 'token not in key' }
    }
    return { status: 'registered', poolId, key }
  } catch (e) {
    return { status: 'lookup_failed', reason: (e as Error).message }
  }
}

export type Verdict = 'allow' | 'requote_canonical' | 'requote_static' | 'hold'

/** 수수료가 PoolKey에 고정된 풀: 훅 없음 + 정적 수수료. 견적과 체결 수수료가 같다 */
const isStatic = (k: PoolKey) =>
  eq(k.hooks, '0x0000000000000000000000000000000000000000') && (k.fee & DYNAMIC_FEE_FLAG) === 0

/** 견적 경로 중 이 토큰이 들어 있는 풀만 판정한다 */
export function judge(token: Address, c: Canonical, route: PoolKey[]): Verdict {
  const hops = route.filter((k) => eq(k.currency0, token) || eq(k.currency1, token))
  const isCanonical = (k: PoolKey) => c.status === 'registered' && poolIdOf(k) === c.poolId
  if (hops.every((k) => isStatic(k) || isCanonical(k))) return 'allow'
  if (c.status === 'registered') return 'requote_canonical' // 대표 풀·정적 풀로만 다시 견적
  if (c.status === 'not_registered') return 'requote_static' // 정적 풀로만 다시 견적, 없으면 경고 후 확인
  return 'hold' // 조회 실패: 정적 풀로만 다시 견적, 확인으로 우회 불가
}
getCanonicalPool은 네 단계로 검증한다. 고정한 resolver가 답하는지, 값이 비었는지(미등록) 오류인지(strict), 형식과 chainId, data 레코드의 PoolKey로 계산한 PoolId가 같은지다. judge는 위 판정 정책 표를 그대로 코드로 옮긴 것이다. 타입 검사를 통과했고, poolIdOf는 Solidity keccak256(abi.encode(key))와 같은 값을 낸다.

설계 결정 (리뷰 반영)
항목

결정

대표 풀의 의미

발행자가 선언한, 등록 시점에 이미 초기화된 풀. 경로 A는 런칭 트랜잭션 안에서 선언하므로 런칭 때 생성된 풀과 같다. 경로 B는 런칭 풀(ETH, 토큰, 2500, 25, 훅 없음)로 고정

등록 권한 증명

경로 A: 호출자 = CREATE2를 실제로 실행한 컨트랙트. 런치패드가 별도 팩토리를 쓰면 그 팩토리가 호출한다. 발행자 컨트랙트에 임의 호출 기능이 없어야 한다. 경로 B: graffiti = LiquidityLauncher를 부른 주소. 직접 불렀으면 그 주소, 일회용 컨트랙트로 불렀으면 CREATE(배포자, nonce)로 다시 계산한 배포자

토큰 배포 확인

배포된 토큰만 (TokenNotDeployed). 예상 주소 선등록 불가

풀 검증

지정한 PoolManager에서 초기화됐는지 확인 (PoolNotInitialized). PoolManager가 initialize 때 PoolKey를 검증하므로 초기화된 풀이면 PoolKey도 유효. POOLS_SLOT은 상수로 두고 실제 PoolManager에서 테스트

기록 수정 정책

영구 고정, 버전 추가 없음. 키 탈취 때 바뀔 수 없는 게 더 중요하다. 복구 기능 대신 실수를 막는다: 경로 B는 PoolKey를 받지 않고, 경로 A는 발행자 코드가 런칭 중에 선언한다

보호 범위

라우터·터미널 판정 정책 섹션과 SDK의 judge()

판정 기준

등록됨·미등록·조회 실패 3가지. 대표 풀·정적 풀만 쓰는 경로는 항상 허용. 기록이 판정을 바꾸는 건 D형(훅이 붙은 대표 풀)

공격 성립 조건

공격 섹션. 허용치 ≥ 체결 수수료면 그만큼 손실, 아니면 체결 실패 (v4-core로 재현)

확장과 권한 봉인

레지스트리의 REGISTRAR만 남기고 나머지 회수. 2단계에서 hooks.klamp.eth 등록 후 REGISTRAR도 회수. 남긴 권한으로 tokens를 못 건드리는 것은 테스트로 확인

불변성 보장

업그레이드 역할은 처음부터 없음(테스트). klamp.eth 소유자 역할(하위 레지스트리·resolver 교체, 전송) 회수. 남는 위험인 만료는 최대 기간 등록, 누구나 갱신, SDK의 resolver 고정으로 대응

메타데이터 편집자

크리에이터(사람). 경로 A는 런치패드가 넘긴 주소, 0이면 없음. 경로 B는 선언한 발행자. 발행자 컨트랙트는 권한 없음(테스트)

조회값 검증

형식 eip155:<chainId>:<poolId>, chainId 일치, data 레코드의 PoolKey로 PoolId 재계산, 토큰 포함. strict 조회로 미등록(null)과 실패(예외) 구분

이벤트 대체 정책

신뢰 주소 1개 확정, 3개 확인 중. PoolId·PoolKey 검증, ENS 기록 우선, 조회가 끝나지 않으면 조회 실패 (판정 정책 섹션)

실배포 호환성

고정 버전: ENSv2 contracts-v2 48b3e2d, v4-core 46c6834, LiquidityLauncher v3.0.0 0x00004c4ccc709Ef590F7C81102C0689F0263D4e9와 v3.2.0 0x0000FffFBE8efE702c8703aE3477FF5dE3d319C0 둘 다 허용. 두 버전과 UERC20Factory는 Sepolia에 Robinhood와 같은 바이트코드로 있음(검토에서 확인)

Pools.trade의 실제 운영 체인(Robinhood Chain)에는 ENSv2가 없다. 레코드에 chainId가 있으니 다른 체인의 풀을 적는 것 자체는 가능하다. 막히는 건 등록 컨트랙트의 검사(발행자 증명, 토큰 배포, 풀 초기화)가 같은 체인 상태만 볼 수 있다는 점이다. 그래서 지금 Robinhood의 Pools.trade 토큰은 이벤트 대체로 보호하고, 다른 체인의 기록은 그 체인 상태를 증명할 수단(스토리지 증명 등)이 생긴 뒤의 로드맵이다. 데모는 Sepolia에서 두 경로를 모두 보여준다.

Sepolia에서 확인할 것:


klamp.eth 등록 가능 여부와 ETHRegistrar 등록 (commit → register, 최소 대기 시간 포함)


ETH_REGISTRY.revokeRoles로 klamp.eth 소유자 역할 회수 후 hasRoles가 0인 화면 캡처 (심사 증거)


LiquidityLauncher v3.0.0·v3.2.0과 UERC20Factory가 Sepolia에 있는지 → 확인됨, 바이트코드도 Robinhood와 같음


getCanonicalPool을 Sepolia에서 실행 (getEnsResolver, getEnsText strict). data(node, "pool") 호출은 로컬의 실제 PermissionedResolver에서 확인됨


Sepolia PoolManager에서 POOLS_SLOT 확인 (StateView getSlot0와 같은 값인지)


ENS 앱에서 와일드카드 이름 표시. 안 보이면 데모는 viem 조회 화면으로


42자 0x… 라벨을 ENS 앱 UI가 자르지 않는지


경로 B 실수 복구 → 런칭 풀 고정으로 실수 자체를 막음


이벤트 발생 주소 3개(0x7c48dde3…, 0xc9566675…, 0x60d73b21…)가 Pools.trade 공식 전략인지

부록: 용어
이 문서에 나오는 Uniswap·배포 용어다. ENS 용어는 위 ENSv2 섹션에 있다.

용어

뜻

Uniswap v4 풀

모든 풀이 PoolManager 컨트랙트 하나 안에 있다. 누구나 아무 풀이나 만들 수 있다 (무허가)

PoolKey

풀을 정의하는 5개 값: currency0, currency1, fee, tickSpacing, hooks. 하나라도 다르면 다른 풀

PoolId

keccak256(abi.encode(PoolKey)). 풀의 고유 ID

훅 (hook)

풀에 붙는 외부 컨트랙트. 스왑 전후로 코드를 실행하고, dynamic fee 풀이면 수수료를 매번 바꿀 수 있다

복제 풀

같은 토큰 페어에 다른 fee·훅으로 만든 풀. 견적 때는 낮은 수수료, 체결 때는 높은 수수료(예: 30%)를 매기는 악성 훅이 붙는다

대표 풀

토큰의 발행자가 선언한, 이미 초기화된 풀. 우리가 ENS에 기록하는 대상

CREATE2

주소 = keccak256(0xff, 배포 컨트랙트, salt, initCode 해시)의 끝 20바이트. 세 값을 알면 주소를 다시 계산해 누가 배포했는지 증명할 수 있다

UERC20Factory

Uniswap 토큰 팩토리. salt = keccak256(name, symbol, decimals, 호출자, graffiti)로 CREATE2 배포

graffiti

UERC20Factory가 salt에 넣는 값. Pools.trade가 쓰는 LiquidityLauncher는 keccak256(abi.encode(LiquidityLauncher를 부른 주소))를 넣는다 → 발행자 증명에 쓴다