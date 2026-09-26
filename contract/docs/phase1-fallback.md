# 이벤트 fallback 설정

[고정 InstantLaunchStrategy](https://github.com/Uniswap/liquidity-launcher/blob/1eda9f0c0243e2fdc0cbe0d665200ffa8c2ba53a/src/strategies/InstantLaunchStrategy.sol)의 TokenLaunched 이벤트만 지원한다. 런처의 TokenCreated는 풀 키를 제공하지 않으므로 대체하지 않는다.

`FallbackConfig.sources`의 각 항목은 검증한 strategy 주소, 배포된 runtime code hash(immutable 포함), launcher 주소, 배포 시작 블록을 요구한다. `confirmations >= 1`, `maxScanBlocks`, `chunkSize`를 명시한다. 실제 공개 배포 주소와 코드가 검증되지 않았으므로 기본 목록은 비어 있으며 자동으로 후보 주소를 신뢰하지 않는다.

ENS `not_registered`만 스캔한다. 이벤트에서 인정하는 풀은 InstantLaunchStrategy 모양 `(ETH, 토큰, 2500, 25, 훅 없음)`뿐이다. ENS가 `registered`이면 이벤트로 덮어쓰지 않고, 런칭 풀과 다르면 `warning: launch-pool-differs`만 붙인다. confirmed 블록에서 namespace 및 strategy의 poolManager/launcher getter와 코드 해시를 검증한다. 조회를 작은 범위로 나누고 최대 이력 범위를 넘으면 `lookup_failed`로 반환한다. 신뢰 emitter, 대상 토큰, currency 순서·포함, 이벤트 PoolId와 PoolKey 해시 일치, 로그 블록 해시, 동일 PoolManager의 초기화 상태를 확인한다. removed 로그를 사용하지 않는다. 상충하는 두 풀은 `lookup_failed: multiple-launch-pools`이며 자동으로 마지막 로그를 선택하지 않는다.

결과 source는 launch-event이고 ENS에 쓰지 않는다. SDK 테스트의 이벤트 입력은 고정 ABI에 맞춘 테스트 데이터이며 실제 네트워크의 strategy 발행·배포 검증을 대신하지 않는다.

## Robinhood Chain 실측 (2026-09-26, C12)

공개 RPC `https://rpc.mainnet.chain.robinhood.com`(chain ID 4663)와 Blockscout PRO API(chain_id=4663)로 읽기 전용 확인했다. 아직 SDK 기본 목록에는 넣지 않았다.

| 항목 | 값 |
| --- | --- |
| InstantLaunchStrategy v3.2.0 | `0x23f8209572b4a1C2AD88A42749E830791Fb027f1`, Blockscout 검증 소스명 InstantLaunchStrategy, 이벤트 ABI가 고정 소스와 같음 |
| runtime code hash | `0x29df27cf43533e9b3708dcd2a2c0fd17a1a8796407e7d39375f47e5c809cffca` (immutable 포함, 확인 시점 head 72,99x,xxx) |
| 배포 블록 (fromBlock) | 28,519,960, 배포자 `0x32f4b2e69ebd7746596af8699dac1908f43107ad` (LiquidityLauncher·UERC20Factory와 같은 배포자) |
| `launcher()` / `poolManager()` | `0x0000FffFBE8efE702c8703aE3477FF5dE3d319C0` / `0x8366a39CC670B4001A1121B8F6A443A643e40951` |
| 활동량 | 배포 이후 TokenLaunched 30,000건 이상(페이지 상한까지 집계), 최근 200만 블록 249건 |
| `0xAD44D55E7f8337C3cE113fBb591486E85be104b2` | 같은 버전·배포자, 누적 3,239건이지만 최근 200만 블록 0건. 설계 문서의 "최근 0건"은 맞고, 누적 0건은 아님 |
| 실제 로그 PoolKey | 표본 전부 `(0x0, 토큰, 2500(0x9c4), 25(0x19), 훅 없음)` |

최근 30건의 graffiti 소유자 분류: LiquidityLauncher 직접 호출 EOA 16건(경로 B 직접), 코드 없는 일회용 컨트랙트 생성 트랜잭션 13건(`recordByLiquidityLauncherVia` 가능), 코드가 남는 중간 컨트랙트 1건(63바이트 revert 전용 런타임, `0x5cce771c…`; 어느 경로로도 등록 불가). 설계 문서의 "12건 중 10건 일회용"과 비율이 다르다.
