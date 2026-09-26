
Klamp 개발 기획·명세 (최종) — ETHGlobal Tokyo 2026
2026년 9월 26일
 · 
@Someone


최종본 (9/26 18:00). 1단계는 구현·테스트 완료, 2~4단계는 명세 확정. 다음 순서는 전원 학습(팀 학습 덱 → 1단계 설계 문서 → 이 명세) 후 Sepolia 배포다.

개요
Klamp는 밈 트레이더가 견적에서 본 수수료로 체결되게 한다. 런치패드 토큰에 붙는 악성 훅 복제 풀을 첫 거래부터 라우팅에서 뺀다.

문제: 누구나 같은 페어에 훅 풀을 만들 수 있다. 악성 훅은 견적 때 0.05%, 체결 때 10~30%를 매긴다. 사용자의 슬리피지 허용치가 그 이상이면 그대로 잃는다 (Uniswap v4-core로 재현).

근거: 코인 커뮤니티에서 먼저 퍼졌고, 0x도 9/14 보고했다 (source). Hayden(9/15) "skill issue, don't route to bad hooks" (source). 스레드에서 해법은 나오지 않았다.

해법: 흐름의 네 단계에 하나씩 대응한다. 1단계(런칭) 발행자가 선언한 대표 풀을 ENSv2에 기록, 2단계(풀 생성) 훅 수수료 상한을 코드로 강제, 3단계(견적) ENS를 읽고 경로 판정·재견적, 4단계(체결) 판정한 경로 그대로 체결.

트랙: Uniswap (v4 훅 + API) · ENS (ENSv2).

원칙: 트레이더는 아무것도 하지 않는다. 심사 위원회나 목록이 아니라 코드가 증명한다.

상세: 1단계 설계 문서 (컨트랙트 전체 코드·테스트·셋업·SDK), 1단계 슬라이드, 팀 학습 덱 (4분 발표·데모 준비).

구조
터미널은 견적 경로에서 토큰이 들어 있는 풀만 본다. 아래 세 가지는 통과하고, 그 외 훅 풀이 있으면 다시 견적한다.

경로의 풀

확인 방법

ENS 이름

처리

대표 풀

발행자가 선언 (1단계)

<토큰>.tokens.klamp.eth

통과. 훅이 붙어 있어도 발행자의 선택이다

정적 풀

PoolKey에 훅 없음 + 고정 수수료

없음

통과. 견적 수수료 = 체결 수수료

상한 훅 풀

CappedHookProxy 뒤의 훅 (2단계)

<훅>.hooks.klamp.eth

표시 수수료가 아니라 상한으로 견적해 통과

그 외 훅 풀

위 세 가지가 아님

없음

재견적. 조회 결과별 처리는 1단계 설계 문서의 판정 정책

대표·정적·상한 풀
그 외 훅 풀
런칭
런치패드 · Pools.trade

CanonicalPoolRegistrar

tokens.klamp.eth

훅 개발자

CappedHookProxy
2단계

hooks.klamp.eth

터미널
Uniswap API 견적

judge

체결

재견적

런칭은 등록 컨트랙트를 거쳐 tokens.klamp.eth에, 상한 훅은 팩토리를 거쳐 hooks.klamp.eth에 기록되고, 터미널은 둘을 읽어 판정한다.

구성 요소
구성

역할

상태

CanonicalPoolRegistrar

1단계. 발행자 증명 후 대표 풀을 ENS에 한 번 기록. 진입점 3개 (CREATE2 런치패드, LiquidityLauncher 직접 호출, 일회용 컨트랙트 경유)

완료. 로컬 테스트 13개 통과

Klamp SDK (getCanonicalPool, judge)

3단계. 등록됨·미등록·조회 실패를 구분해 경로 판정

완료(타입 검사). Sepolia 실행 전

공격 재현

v4-core로 견적·체결 수수료 차이와 슬리피지별 손실 재현

완료

CappedHookProxy + 팩토리

2단계. 훅 수수료를 상한 이하로 강제하고 hooks.klamp.eth에 상한 기록

설계

데모 런치패드

경로 A. 훅이 붙은 대표 풀(D형)을 만들고 같은 트랜잭션에서 선언

테스트용 버전 있음, D형 데모판 필요

데모 터미널

두 모드. 일반 라우터(모든 풀을 견적해 최선을 고르는 단순 라우터, 애그리게이터 동작 재현)와 Klamp(judge → 재견적 → 체결)

미착수

단계별 명세
1단계는 구현과 테스트가 끝났고 상세는 1단계 설계 문서에 있다. 이 섹션은 2~4단계의 명세다.

단계

흐름

막는 것

만드는 것

상태

1

런칭

어느 풀이 진짜인지 모름

CanonicalPoolRegistrar

완료

2

풀 생성

훅 수수료를 믿을 수 없어 정직한 훅 풀까지 막힘

CappedHookProxy, CappedHookFactory

설계

3

견적

견적 경로에 복제 풀이 들어옴

SDK getCanonicalPool, getCap, judge, requote

조회·판정 완료, 나머지 설계

4

체결

판정한 경로와 다른 경로로 체결됨

SDK verifySwapCalldata, buildSwap

설계

2단계 · 풀 생성: 상한 훅 (CappedHookProxy)
목표는 대표 풀이 아닌 훅 풀도 수수료 상한이 코드로 보장되면 라우팅할 수 있게 하는 것이다. 상한이 보장되면 견적과 체결의 차이가 상한을 넘지 못한다.

훅 개발자는 수수료 로직(policy 컨트랙트)을 만들고, 팩토리로 프록시를 배포한다. 풀의 hooks 주소는 프록시다.

프록시 주소의 권한 비트는 beforeInitialize(bit 13)와 beforeSwap(bit 7)뿐이다. v4는 훅 권한을 주소 비트로 정하므로, delta 반환(bit 3, 2)과 afterSwap 권한이 원천적으로 없다. 팩토리가 이 비트만 켜진 주소가 나오는 CREATE2 salt로 배포한다.

콜백

동작

beforeInitialize

key.fee == DYNAMIC_FEE_FLAG이고 key.hooks == 자기 자신인 풀만 허용. 아니면 revert

beforeSwap

policy.getFee(sender, key, params, hookData)를 가스 제한 STATICCALL로 호출. fee = min(결과, cap). 호출·디코딩이 실패하면 cap. 반환은 (selector, ZERO_DELTA, fee | OVERRIDE_FEE_FLAG)

cap은 배포 때 고정(immutable), 단위는 pips(1,000,000 = 100%). 관리자·업그레이드·policy 교체가 없다. 바꾸려면 새 프록시, 즉 새 풀이다.

policy가 호출자(sender)를 보고 견적과 체결을 다르게 해도 둘 다 cap을 넘지 못한다.

CappedHookFactory.deploy(policy, cap, salt)는 배포와 <프록시 주소>.hooks.klamp.eth 기록을 한 트랜잭션에서 한다. 레코드는 text cap(예: "3000")과 data cap = abi.encode(uint24 cap, address policy, bytes32 proxyCodeHash).

ENS 구조는 1단계와 같다. hooks.klamp.eth의 resolver가 와일드카드로 답하고, cap 키는 팩토리만 쓴다. 팩토리는 자기가 배포한 주소만 기록한다. 등록 후 레지스트리의 마지막 권한(REGISTRAR와 그 admin)을 회수한다.

SDK는 레코드의 proxyCodeHash가 훅 주소의 extcodehash와 같은지, 권한 비트가 13·7뿐인지 확인한 뒤에만 cap을 믿는다.

완료 기준 (v4-core 실제 코드 위 테스트):

policy가 30%를 요청하면 체결 수수료는 cap

policy가 revert하거나 가스를 다 쓰면 체결 수수료는 cap

견적 호출자와 라우터에 다른 수수료를 줘도 둘 다 cap 이하 (공격 재현 테스트와 같은 구조)

dynamic fee가 아닌 풀, 다른 hooks 주소의 초기화는 거절

팩토리가 아닌 주소의 cap 기록은 거절

한계: delta로 수수료를 떼는 D형 훅은 감쌀 수 없다. 그래서 D형은 2단계가 아니라 1단계(대표 풀 선언)로 보호한다. 이전의 afterSwap 불변식 안은 폐기했다.

3단계 · 견적: 판정과 재견적
입력은 사용자 요청(tokenIn, tokenOut, 수량, 슬리피지)이고, 출력은 확정 경로(PoolKey 목록), 기대 수령량, 최악 수령량이다.

Uniswap Trading API /quote(protocols = V2, V3, V4)로 견적과 경로를 받는다. 경로의 v4 풀에는 poolId, fee, tickSpacing, hooks가 들어 있다 (routing-api 공개 코드 기준).

토큰이 들어 있는 v4 풀마다 분류한다: 대표 풀(getCanonicalPool), 정적 풀(hooks 0, dynamic fee 플래그 없음), 상한 훅 풀(getCap), 그 외.

judge로 판정한다: allow, requote_canonical, requote_static, hold (1단계 설계 문서의 판정 정책).

재견적한다.

requote_canonical: V4Quoter quoteExactInputSingle로 대표 풀을 직접 견적한다. 다른 구간이 있으면 그 구간만 Trading API 견적을 이어 붙인다.

requote_static, hold: Trading API를 protocols = V2, V3로 다시 부른다. V2·V3 풀에는 훅이 없다. 결과가 없고 requote_static이면 경고 후 사용자 확인, hold면 거래하지 않는다.

상한 훅 풀이 경로에 있으면 표시 수수료가 아니라 cap으로 최악 수령량을 계산한다. v4-sdk로 풀 상태(StateView)를 읽어 fee = cap으로 로컬 시뮬레이션하고, 안 되면 견적 수령량 × (1 − cap) / (1 − 견적 수수료)로 근사한다.

4단계 · 체결: 판정한 경로 그대로
목표는 3단계에서 판정한 경로와 다른 경로로 체결되지 않게 하는 것이다. 견적과 체결 사이에 경로가 바뀌면 3단계가 소용없다.

Trading API 경로를 그대로 쓸 때(allow): /swap이 준 Universal Router calldata는 수정하지 않고 디코딩해서 검증한다(verifySwapCalldata). V4_SWAP 명령 안의 스왑 액션(SWAP_EXACT_IN_SINGLE 0x06, SWAP_EXACT_IN 0x07 등)에서 PoolKey·PathKey를 꺼내 3단계 확정 경로와 비교하고, 하나라도 다르면 서명하지 않고 재견적한다.

재견적 경로일 때: calldata를 직접 만든다(buildSwap). v4-sdk V4Planner로 SWAP_EXACT_IN_SINGLE → SETTLE_ALL → TAKE_ALL을 쌓아 Universal Router execute로 보낸다. V2·V3 재견적은 Trading API /swap을 쓰고 위와 같이 검증한다.

amountOutMinimum: 3단계의 최악 수령량 × (1 − 사용자 슬리피지). 정적·대표 풀은 견적 수령량, 상한 훅 풀은 cap 기준이다.

체결 후: Swap 이벤트의 fee를 읽어 실제 수수료를 보여준다. 대표 풀의 체결 수수료가 견적보다 높았으면 그 토큰에 경고를 표시한다.

결과적으로 체결 경로에 남는 풀은 세 가지뿐이다: 견적 수수료와 체결 수수료가 같은 정적 풀, cap을 넘지 못하는 상한 훅 풀, 발행자가 선언한 대표 풀. 복제 풀의 30% 부과는 경로에 들어올 수 없다. 샌드위치 같은 트랜잭션 밖 MEV는 범위 밖이다.

ENS 권한 규칙
ENSv2 contracts-v2(2026-07-03) 코드와 로컬 테스트로 확인했다. 셋업 스크립트와 Sepolia 주소는 1단계 설계 문서에 있다.

tokens.klamp.eth: 역할 0, 만료 최대. 아무도 resolver 교체·전송·삭제를 못 한다. 토큰 이름은 등록하지 않고 와일드카드로 답한다.

pool 레코드: 등록 컨트랙트만 쓴다 (모든 이름의 pool 키 권한).

description·url: 그 토큰의 크리에이터만 쓴다 (기록 때 위임).

우리: 셋업 후 resolver 역할과 klamp.eth 소유자 역할을 전부 회수한다. 레지스트리의 REGISTRAR와 그 admin만 hooks.klamp.eth 등록까지 남기고(둘 다 운영 계정 보유), 이 권한으로 tokens를 못 건드린다는 것은 테스트로 확인했다. ROLE_UPGRADE는 처음부터 아무에게도 없다.

런치패드별 이름공간이나 신뢰 목록은 없다. 기록 권한은 발행자 증명으로만 정해진다.

추적은 labelhash 기준 (토큰 ID는 역할 변경 시 재생성).

데모 (4분)
발표 1분 15초, 데모 2분 15초. 발표는 영어로 하고, 장면별 대본은 팀 학습 덱의 발표자 노트에 있다.

시간

장면

내용

0:00–0:25

문제

견적 0.05%, 체결 10%. 허용치가 그 이상이면 그대로 잃는다 (v4-core 재현). Hayden 스레드

0:25–0:55

해법

발행자만 대표 풀을 한 번 선언하고, ENS에 기록한다. 라우터는 첫 거래 전에 복제 풀을 뺀다

0:55–1:15

왜 ENSv2

매핑은 우리 터미널 하나를, ENS 기록은 ENS를 읽는 모든 곳을 지킨다

1:15–2:35

데모 1 (경로 A)

대표 훅 풀 토큰 + 공격자 복제 훅 풀. 일반 라우터 모드는 복제 풀로 10% 손실, Klamp 모드는 판정 후 대표 풀로 체결

2:35–3:00

데모 2

우리 코드 없이 viem getEnsText(가능하면 ENS 앱)로 같은 pool 값

3:00–3:30

데모 3 (경로 B)

Pools.trade 방식 토큰. 크리에이터가 일회용 컨트랙트 nonce로 선언 성공, 다른 지갑은 NotIssuer

3:30–4:00

마무리

Proof, not curation. Uniswap v4 + ENSv2

준비: 데모는 전부 Sepolia에 미리 배포된 상태에서 시작한다. klamp.eth·레지스트리·resolver·등록 컨트랙트, D형 데모 런치패드로 만든 토큰과 대표 훅 풀, 복제 풀(견적 0.05%, 체결 10% 훅, 공격 재현 테스트와 같은 구조), Pools.trade 방식 토큰.

일반 라우터라는 말: Sepolia에서는 Uniswap API가 우리 훅 풀을 라우팅하지 않을 수 있다. 그래서 모든 풀을 견적해 가장 좋은 곳을 고르는 단순 라우터로 애그리게이터 동작을 재현하고, 발표에서 그렇게 밝힌다.

바꿔 끼우기: 2단계가 끝나면 데모 3을 상한 훅(30% 요청 → cap으로 절삭)으로 바꿔도 된다. 시간이 넘치면 데모 2를 줄인다.

대비책: 체인이 느림 → 미리 녹화한 영상. ENS 앱이 이름을 못 보여줌 → viem 조회 화면. 2단계 미완성 → 상한 훅 장면 생략.

외울 문장 다섯 개 (발표자와 질문 받는 사람 모두 똑같이):

Traders do nothing. The fee they're quoted is the fee they pay. 오프닝과 마무리

Only the token's issuer can declare its canonical pool, once. 해법 설명

A mapping protects our terminal. An ENS record protects everyone who reads ENS. ENS 트랙

Proof, not curation. "게이트 아니냐"는 질문

It plugs into Uniswap's live launch stack, not a hypothetical launchpad. "실제로 쓰이냐"는 질문

외울 숫자: 0.05→10% (재현 설정), −9.94% (허용치 10% 이상일 때 손실), 76~86% (런치패드 훅 중 D형, hooklist 근사치), 10/12 (최근 Pools.trade 런칭 중 일회용 컨트랙트 방식, 샘플 추정), 13 (로컬 테스트), 4·3 (등록 검사·진입점), 1번 (대표 풀 선언), 0 (업그레이드 권한을 가진 주소). 이 밖의 숫자는 쓰지 않는다.

일정과 역할
제출 마감은 9/27(일) 09:00 JST. 3인 팀 기준으로 짰고, 인원이 다르면 역할을 합친다.

시점 (JST)

A · Uniswap

B · ENS

C · 프론트/데모

~토 03:00 (완료)

공격 재현, 등록 컨트랙트 + 테스트 13개

ENSv2 구조·셋업 스크립트 (로컬 검증)

SDK 코드, 1단계 슬라이드

토 18:00

전원 학습

전원 학습

전원 학습

토 21:00

D형 데모 런치패드 + 복제 풀, 가능하면 상한 훅

Sepolia 셋업·역할 회수 캡처, SDK 실행

터미널 두 모드 + judge 연동

일 01:00

기능 동결

ENS 앱 표시 확인

데모 end-to-end

일 03:00

4분 리허설 3회

4분 리허설 3회

녹화본 확보

일 06:00

FEEDBACK.md

README

영상

학습을 먼저 하기로 해서 이전 일정(토 12:00·18:00 마일스톤)을 뒤로 밀었다. 각 시점은 그때까지 끝낼 일이다. 일 09:00 제출. 커밋은 작게 자주. 밀리면 2단계(CappedHookProxy) → ENS 앱 화면(viem 조회 화면으로 대체) → 프론트 폴리싱 순으로 자른다. 1단계와 공격 재현만으로도 데모가 성립한다.

제출 체크

공통: 공개 레포, 기간 중 커밋, 영상 2~4분 (720p+, 폰·AI 음성·배속 금지), README에 AI 사용 명시 (규정)


Uniswap: FEEDBACK.md + 피드백 폼, README에 등록 컨트랙트·훅 프록시·API 연동 코드 위치 (프라이즈)


ENS: ENSv2 Sepolia, 하드코딩 없음, 라이브 데모 링크, 오픈소스

예상 질문
질문

답

대표 풀은 누가 정하나

토큰 주소가 가리키는 발행자. 한 번 선언하면 우리를 포함해 아무도 못 바꾼다. 남의 토큰에는 선언할 수 없다

Uniswap API가 이미 하지 않나

보호는 라우터 컨트랙트가 아니라 API의 경로 선택에 있다. API 사용자만 해당되고, 경쟁 애그리게이터는 쓰지 않으며, 방식이 비공개라 검증할 수 없다. "API가 못 막는다"고는 말하지 않는다

혁신을 막는 게이트 아닌가

훅 풀도 대표 풀이면 통과하고, 상한 훅은 상한으로 견적한다. 심사나 목록 없이 코드 증명만 있다

발행자가 나쁜 풀을 고르면

막지 않는다. 그 토큰 자체의 문제다. 막는 건 제3자가 남의 토큰에 붙이는 복제 풀이다

Pools.trade 대표 풀은 정적 풀인데 기록이 왜 필요한가

정적 풀은 기록 없이도 판정이 같다. 기록이 판정을 바꾸는 건 훅이 붙은 대표 풀(D형, 런치패드 훅의 76~86%)이다

그냥 매핑 쓰면

매핑은 우리 ABI를 아는 곳만 읽는다. ENS는 viem·ethers·ENS 앱이 표준으로 읽고, 레코드 단위 권한·와일드카드를 재구현할 필요가 없다

Robinhood Chain은

ENSv2가 없어 지금은 검증된 TokenLaunched 이벤트로 대체한다. 등록 컨트랙트의 검사가 같은 체인 상태만 볼 수 있어서다. 다른 체인 기록은 로드맵

API가 Sepolia 미지원이면

데모의 일반 라우터는 애그리게이터 동작을 재현한 단순 라우터라고 먼저 밝힌다. 실제 API 경로 형식은 메인넷 견적을 읽기 전용으로 보여준다

크리에이터 키가 털리면

대표 풀은 못 바꾼다. 한 번만 쓰기를 택한 이유다. 그 키로 바꿀 수 있는 건 description·url뿐이다

남은 확인

ENSv2·Uniswap v4 Sepolia 주소


Pools.trade 실데이터 분석: 최근 런칭 12건 중 10건이 일회용 컨트랙트 방식, 신뢰 이벤트 주소 정리


LiquidityLauncher v3.0.0·v3.2.0과 UERC20Factory가 Sepolia에 있는지


Sepolia 체크리스트 (1단계 설계 문서 맨 아래): 등록·역할 회수·SDK 실행·POOLS_SLOT


42자 0x… 라벨의 ENS 앱 표시


실제 피해 트랜잭션 해시 1~2건 (오프닝용)


미확인 TokenLaunched 발생 주소 3개가 Pools.trade 공식 전략인지


Trading API가 Sepolia에서 우리 훅 풀을 라우팅하는지 (안 되면 데모는 일반 라우터 재현으로 간다)