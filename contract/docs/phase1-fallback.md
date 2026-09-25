# 이벤트 fallback 설정

[고정 InstantLaunchStrategy](https://github.com/Uniswap/liquidity-launcher/blob/1eda9f0c0243e2fdc0cbe0d665200ffa8c2ba53a/src/strategies/InstantLaunchStrategy.sol)의 TokenLaunched 이벤트만 지원한다. 런처의 TokenCreated는 풀 키를 제공하지 않으므로 대체하지 않는다.

`FallbackConfig.sources`의 각 항목은 검증한 strategy 주소, 배포된 runtime code hash(immutable 포함), launcher 주소, 배포 시작 블록을 요구한다. `confirmations >= 1`, `maxScanBlocks`, `chunkSize`를 명시한다. 실제 공개 배포 주소와 코드가 검증되지 않았으므로 기본 목록은 비어 있으며 자동으로 후보 주소를 신뢰하지 않는다.

ENS missing만 스캔한다. confirmed 블록에서 namespace 및 strategy의 poolManager/launcher getter와 코드 해시를 검증한다. 조회를 작은 범위로 나누고 최대 이력 범위를 넘으면 unavailable로 반환한다. 신뢰 emitter, 대상 토큰, currency 순서·포함, 이벤트 PoolId와 PoolKey 해시 일치, 로그 블록 해시, 동일 PoolManager의 초기화 상태를 확인한다. removed 로그를 사용하지 않는다. 상충하는 두 풀은 ambiguous이며 자동으로 마지막 로그를 선택하지 않는다.

결과 source는 launch-event이고 ENS에 쓰지 않는다. SDK 테스트의 이벤트 입력은 고정 ABI에 맞춘 테스트 데이터이며 실제 네트워크의 strategy 발행·배포 검증을 대신하지 않는다.
