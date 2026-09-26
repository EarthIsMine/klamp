# Phase 1 의존성 기준

기존 구현·lock·실행 테스트가 없는 저장소에서 시작했다. 원문 SHA를 복구할 자료는 없었으며, 명세 날짜와 일치하는 ENSv2 커밋을 선택하고 실제 resolver ABI를 실행 검증했다. 다른 Solidity 의존성은 선택한 런처의 gitlink를 따른다.

| 의존성 | 고정 SHA / 버전 |
| --- | --- |
| ENSv2 | [f2f0a05e6c1711134b73204a1e37f8e6c1aea6ab](https://github.com/ensdomains/contracts-v2/tree/f2f0a05e6c1711134b73204a1e37f8e6c1aea6ab) (태그 `sepolia-deployment-2026-09-15`, Sepolia ENSv2 Beta 공식 세트. C14에서 `48b3e2d`에서 재고정) |
| LiquidityLauncher | [1eda9f0c0243e2fdc0cbe0d665200ffa8c2ba53a](https://github.com/Uniswap/liquidity-launcher/tree/1eda9f0c0243e2fdc0cbe0d665200ffa8c2ba53a) |
| UERC20Factory | [46290a5447844016516b4b4530013da01b6ff801](https://github.com/Uniswap/uerc20-factory/tree/46290a5447844016516b4b4530013da01b6ff801) |
| v4-core | [59d3ecf53afa9264a16bba0e38f4c5d2231f80bc](https://github.com/Uniswap/v4-core/tree/59d3ecf53afa9264a16bba0e38f4c5d2231f80bc) |
| v4-periphery / StateView | [ad04c9f24a170accf5ea1b2836bbafd514537ca6](https://github.com/Uniswap/v4-periphery/tree/ad04c9f24a170accf5ea1b2836bbafd514537ca6) |
| viem | 2.56.9 (package-lock.json) |
| Solidity / EVM | 0.8.26 (`src/`는 `compilation_restrictions`로 고정, Sepolia registrar와 동일) · ENSv2 구현은 0.8.25(`script/EnsArtifacts.sol`) / Cancun |
| Foundry 실행 환경 | 1.7.1, 4072e48705af9d93e3c0f6e29e93b5e9a40caed8 |
| Node / TypeScript | 24.14.1 / 5.9.3 |

## 확인한 실제 ABI와 제약

- PermissionedResolver `initialize(address,uint256,bytes[])`, `authorizeNameRoles(bytes,uint256,address,bool)`, `authorizeTextRoles(bytes,string,address,bool)`, `authorizeDataRoles(bytes,string,address,bool)`는 원문과 호환된다. 뒤의 세 함수는 bool을 반환한다.
- `authorizeTextRoles`는 키 resource의 admin이 아니라 이름 resource의 TEXT_ADMIN을 검사한다. C05는 명세가 허용한 root TEXT_ADMIN 경로를 사용하며, registrar의 위임 코드를 description/url로 제한한다.
- UserRegistry는 `constructor(ILabelStore,address)` 및 `initialize(address,uint256)`, `register(string,address,IRegistry,address,uint256,uint64)`를 사용한다. VerifiableFactory `deployProxy` salt는 uint256이다.
- ETHRegistrar는 `makeCommitment(string,address,bytes32,IRegistry,address,uint64,bytes32)`, `commit(bytes32)`, `register(string,address,bytes32,IRegistry,address,uint64,IERC20,bytes32)`, `renew(string,uint64,IERC20,bytes32)`를 제공한다.
- UniversalResolverV2는 root registry, gateway provider, contract namer를 생성자 인자로 받고 AbstractUniversalResolver의 resolve 경로를 사용한다.
- StateView `poolManager()` getter로 연결을 확인할 수 있다. `getSlot0(bytes32)` 반환은 uint160,int24,uint24,uint24이다.
- LiquidityLauncher `getGraffiti(creator)`는 keccak256(abi.encode(creator))이다. UERC20Factory는 name/symbol/decimals/호출자/graffiti를 salt로 쓰고 실제 UERC20 creationCode로 주소를 계산한다. 두 구현은 프록시 업그레이드 진입점이 없으며, 실제 네트워크 주소의 동일성은 별도 검증해야 한다.
- `TokenLaunched(bytes32 indexed,address indexed,address indexed,(address,address,uint24,int24,address))`는 런처가 아닌 **InstantLaunchStrategy**가 발생시킨다. strategy의 immutable poolManager/launcher 및 신뢰 배포 주소 검증이 필요하다. 런처의 TokenCreated/TokenDistributed를 이 이벤트로 대체하지 않는다.
- 명세 Sepolia 주소는 모두 검증 전 후보다. 체인·코드·배포 버전 검증을 아직 실행하지 않았다.

## 재현

`contract/`에서 `./scripts/setup-dependencies.sh`, `forge test`, `npm run typecheck`를 실행한다. 설치는 프로젝트가 import하는 하위 모듈만 초기화한다. Solidity 의존성 SHA는 gitlink, JS는 lockfile이 기준이다.

실제 열람 자료: 위 고정 소스의 resolver/PermissionedResolver.sol, registry/UserRegistry.sol, registrar/ETHRegistrar.sol, registrar/AbstractETHRegistrar.sol, universalResolver/UniversalResolverV2.sol, LiquidityLauncher.sol, strategies/InstantLaunchStrategy.sol, factories/UERC20Factory.sol, lens/StateView.sol. SDK 문서: https://viem.sh/docs/ens/actions/getEnsText (SDK 구현 단계에서 실행 경로 검증).
