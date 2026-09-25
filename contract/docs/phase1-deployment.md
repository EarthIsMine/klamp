# 배포와 검증 재현

모든 명령은 `contract/`에서 실행한다. 공개 네트워크 실배포는 아직 수행하지 않았다. `deployments/sepolia.candidates.json`은 원문 및 고정 ENS 저장소의 후보 주소이며 검증된 manifest가 아니다.

## 로컬 전체 실행

```sh
./scripts/setup-dependencies.sh
forge test
npm test
npm run typecheck
npm run test:e2e
```

마지막 명령은 새 Anvil을 시작해 실제 ENSv2·v4·registrar·ERC20 probe를 배포하고, 풀 초기화·등록·봉인·viem 조회·권한 eth_call을 검증한 뒤 Anvil을 종료한다. 생성 파일은 `deployments/local.json`, `deployments/local.verification.json`이다. verification은 공개 주소·버전·관측 코드 해시·배포 블록·트랜잭션 해시·만료·봉인 상태를 포함한다. 로컬은 소스에서 배포한 환경이며 Sepolia 증거가 아니다.

데모를 계속 사용하려면 별도 터미널에서 로컬 노드를 유지한다.

```sh
anvil --silent --port 18545
# 다른 터미널, contract/:
export RPC_URL=http://127.0.0.1:18545
export OPERATOR=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
forge script script/LocalPhase1.s.sol:LocalPhase1 --rpc-url "$RPC_URL" --broadcast --unlocked --slow
npm run demo
```

브라우저에서 http://127.0.0.1:4173 를 연다. ProbeToken은 실제 ERC20이며 초기화 풀에 유동성은 추가하지 않는다. 거래 전송은 제공하지 않는다. 로컬 공개 개발 계정은 테스트 전용이다.

## Sepolia 준비와 dry-run

1. `.env.example`을 무시되는 `.env`로 복사해 설정한다. 서명은 Foundry keystore를 사용하고 비밀키를 manifest에 넣지 않는다. registration secret은 로컬에서 새로 생성하여 commit과 register 사이 동일하게 유지한다.
2. 후보 JSON을 `deployments/sepolia.private.json`으로 복사하고 operator/hooksAdmin, 검증된 tokenFactory/launcher, 최대 등록비를 채운다. 각 프로토콜 주소의 runtime code hash를 독립적으로 확인한 빌드/공식 배포 근거와 대조한 뒤 `expectedCodeHashes`에 필드명별로 넣는다. 현재 RPC에서 읽은 값을 그대로 넣는 것은 버전 검증이 아니다. immutable·프록시 구현과 protocol role도 확인한다.
3. dotenv 파일은 명령 실행 환경에 로드한다. JSON과 env의 chain/address/operator 설정은 일치시킨다. root 이름은 klamp.eth로 고정하며 충돌 시 다른 이름으로 몰래 바꾸지 않는다.
4. `npx tsx scripts/preflight.ts`는 체인, 코드 해시, UniversalResolver/registry/StateView 연결, registrar 역할, 이름 소유자, 등록 가격 상한·잔액·allowance·gas 잔액을 읽기 전용으로 검사한다. 미기입·미검증 값이 있으면 실패한다. RPC/서명/코드 신뢰가 준비되지 않았다면 여기서 공개 배포 준비가 완료된 것으로 표시하지 않는다.
5. 다음 명령은 `--broadcast`가 없으므로 시뮬레이션이다. 단계가 아직 온체인에 없으면 다음 단계는 선행 단계의 실제 배포 후에 재현할 수 있다.

```sh
forge script script/DeployPhase1.s.sol:DeployPhase1 --rpc-url "$RPC_URL"
forge script script/RegisterRoot.s.sol:RegisterRoot --rpc-url "$RPC_URL"
forge script script/ProbePhase1.s.sol:ProbePhase1 --rpc-url "$RPC_URL"
forge script script/SealPhase1.s.sol:SealPhase1 --rpc-url "$RPC_URL"
```

## 실배포 순서와 재개

검증한 설정과 허용된 네트워크·서명 계정으로만 위 단계에 `--broadcast --slow --account <keystore-alias>`를 추가한다. 이 문서 작성 중에는 실행하지 않았다. 각 dry-run에서 sender와 예상 gas를 확인한다.

- Deploy: registry/resolver/registrar 공개 주소를 반환·receipt에서 확인해 REGISTRY/RESOLVER/REGISTRAR에 저장한다. 재개 시 원래 DEPLOYMENT_SALT와 REGISTRAR를 유지한다. 이미 있는 프록시는 factory가 구현을 검증한 뒤 재사용한다. registrar 배포 직후 중단됐다면 receipt에서 주소를 복구한다.
- RegisterRoot: 최초에는 commit만 한다. `readyAt` 이후 같은 설정과 secret으로 재실행하면 정확한 가격만 approve하고 register→setParent를 수행한다. 대기 중 재실행은 쓰기 없음, 만료 commitment는 다시 commit, 이미 같은 namespace가 등록됐으면 중복 결제 없음. 타인 소유/다른 연결은 오류로 중단한다.
- ProbePhase1: 테스트넷 전용 ERC20·ETH 풀을 초기화하고 실제 CREATE2 배포 주체로 등록한다. `deployments/probe.json`의 create2Launcher를 PROBE_LAUNCHER, token을 PROBE_TOKEN으로 보존한다. 재실행은 동일 salt/launcher를 사용한다. JSON은 시뮬레이션에서도 생성되므로 receipt와 코드 확인 전 실배포 증거로 쓰지 않는다.
- Seal: 실제 ENS probe 조회와 예상 권한 상태를 검증한 후 봉인한다. 이미 봉인됐다면 회수 쓰기를 생략한다. hooks 관리 권한은 별도로 남는다.
- Smoke: 아래 public manifest를 채운 후 `npx tsx scripts/deployment-smoke.ts`. editor 성공과 운영자/덮어쓰기 실패는 eth_call이므로 추가 거래를 보내지 않는다. 검증 보고서는 SMOKE_OUTPUT에 저장한다.

등록·갱신은 고정 ETHRegistrar의 `getRegisterPrice`/`getRenewPrice`로 가격을 확인한다. 갱신 ABI는 `renew(string,uint64,IERC20,bytes32)`이다. klamp.eth 만료 전에 담당자가 비용·기간을 확인해 갱신해야 한다. 갱신 자동 실행은 이번 구현 범위에 없다.

## 공개 manifest 필드

`deployments/sepolia.phase1.json`은 실제 배포 후 작성한다. 미실행 주소를 가짜 manifest로 만들지 않는다. `deployments/local.json`과 `versions.json`을 구조 참고로 사용한다.

- chainId, rootRegistry, ethRegistry, registry, resolver, registryImplementation, resolverImplementation, universalResolver, registrar, stateView, poolManager, launcher, tokenFactory
- operator, hooksAdmin, editor(생략 시 operator), token, poolId, create2Launcher, salt, initCodeHash
- independently verified expectedCodeHashes(위 각 코드 주소 필드에 대응), deploymentBlock, publicTransactions(공개 tx 해시 목록)

smoke는 이 설정을 읽고 text/data·권한·봉인·코드를 검증하여 실제 observedCodeHashes, expiry, checkedBlock, versions를 보고서에 남긴다. 코드 해시 일치만으로 공급자 코드 안전성이나 감사 완료를 주장하지 않는다. ENS 앱 표시 여부와 사람이 SDK 문서를 읽고 직접 실행했는지는 별도 수동 확인이다.
