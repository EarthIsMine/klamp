// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {IUnlockCallback} from "v4-core/interfaces/callback/IUnlockCallback.sol";
import {PoolKey as V4PoolKey} from "v4-core/types/PoolKey.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {BalanceDelta} from "v4-core/types/BalanceDelta.sol";
import {SwapParams} from "v4-core/types/PoolOperation.sol";
import {TickMath} from "v4-core/libraries/TickMath.sol";
import {NameCoder} from "ens-contracts/utils/NameCoder.sol";

import {CanonicalPoolRegistrar, PoolKey} from "../src/CanonicalPoolRegistrar.sol";
import {DeltaFeeHook} from "../src/demo/DeltaFeeHook.sol";
import {DemoLaunchpad, DemoToken} from "../src/demo/DemoLaunchpad.sol";
import {IPermResolver, IRecordReader} from "../script/KlampSetup.sol";

/// @dev 테스트 전용 발행자: CREATE2로 토큰을 만들고 임의의 PoolKey로 선언을 시도한다 (거절 경로 확인용).
contract TestIssuer {
    function deploy(bytes32 salt) external returns (address) {
        return address(new DemoToken{salt: salt}("T", "T", 1e18));
    }

    function initCodeHash() external pure returns (bytes32) {
        return keccak256(abi.encodePacked(type(DemoToken).creationCode, abi.encode("T", "T", uint256(1e18))));
    }

    function record(CanonicalPoolRegistrar r, address token, PoolKey calldata key, bytes32 salt, bytes32 h) external {
        r.recordByCreate2(token, key, salt, h, msg.sender);
    }
}

/// @dev ETH exact-in 스왑 한 번 (구매)
contract Buyer is IUnlockCallback {
    IPoolManager immutable pm;

    constructor(IPoolManager pm_) {
        pm = pm_;
    }

    function buy(V4PoolKey memory key) external payable returns (uint256 out) {
        out = abi.decode(pm.unlock(abi.encode(key, msg.value, msg.sender)), (uint256));
    }

    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        (V4PoolKey memory key, uint256 amountIn, address to) = abi.decode(data, (V4PoolKey, uint256, address));
        BalanceDelta d = pm.swap(key, SwapParams(true, -int256(amountIn), TickMath.MIN_SQRT_PRICE + 1), "");
        pm.settle{value: uint256(uint128(-d.amount0()))}();
        uint256 out = uint256(uint128(d.amount1()));
        pm.take(key.currency1, to, out);
        return abi.encode(out);
    }
}

/// @notice 경로 A(CREATE2 런치패드)와 등록 검사 4가지를 Sepolia 포크의 실제 배포 등록 컨트랙트로 확인한다.
contract PathAForkTest is Test {
    IPoolManager constant PM = IPoolManager(0xE03A1074c86CFeDd5C142C4F04F1a1536e203543);
    CanonicalPoolRegistrar registrar;
    IPermResolver res;
    DeltaFeeHook hook;
    DemoLaunchpad pad;

    address creator = makeAddr("creator");
    address attacker = makeAddr("attacker");
    address feeTo = makeAddr("feeTo");

    function setUp() public {
        vm.createSelectFork("sepolia");
        string memory j = vm.readFile("./deployments/sepolia.json");
        registrar = CanonicalPoolRegistrar(vm.parseJsonAddress(j, ".registrar"));
        res = IPermResolver(vm.parseJsonAddress(j, ".resolver"));

        // 훅 주소 하위 14비트가 권한 비트(0x44)와 정확히 같아지는 salt를 찾는다
        bytes memory init = abi.encodePacked(type(DeltaFeeHook).creationCode, abi.encode(PM, feeTo, uint256(100)));
        bytes32 h = keccak256(init);
        uint256 salt;
        while (uint160(vm.computeCreate2Address(bytes32(salt), h, address(this))) & 0x3FFF != 0x44) {
            salt++;
        }
        hook = new DeltaFeeHook{salt: bytes32(salt)}(PM, feeTo, 100);
        pad = new DemoLaunchpad(PM, registrar, IHooks(address(hook)));
    }

    function _name(address token) internal pure returns (bytes memory) {
        return NameCoder.encode(string.concat(vm.toLowercase(vm.toString(token)), ".tokens.klamp.eth"));
    }

    function _text(address token, string memory key) internal view returns (string memory) {
        bytes32 node = NameCoder.namehash(_name(token), 0);
        return abi.decode(res.resolve(_name(token), abi.encodeCall(IRecordReader.text, (node, key))), (string));
    }

    function _v4key(address token) internal view returns (V4PoolKey memory) {
        return V4PoolKey(Currency.wrap(address(0)), Currency.wrap(token), 3000, 60, IHooks(address(hook)));
    }

    function test_pathA_launch_declares_hooked_pool() public {
        vm.prank(creator);
        address token = pad.launch("Klamp Hook Demo", "KHOOK");

        bytes32 poolId = keccak256(abi.encode(_v4key(token)));
        assertEq(registrar.canonicalPoolOf(token), poolId, "canonical = launch pool");
        assertEq(registrar.creatorOf(token), creator, "creator = launch caller");
        assertEq(_text(token, "pool"), string.concat("eip155:11155111:", vm.toString(poolId)));

        // 크리에이터는 설명을 쓸 수 있다. 발행자(런치패드)에게는 메타데이터 권한이 없다
        vm.prank(creator);
        registrar.setTokenText(token, "url", "https://klamp.demo");
        assertEq(_text(token, "url"), "https://klamp.demo");
        vm.prank(address(pad));
        vm.expectRevert(CanonicalPoolRegistrar.NotCreator.selector);
        registrar.setTokenText(token, "url", "x");
    }

    function test_pathA_hooked_pool_trades_with_fixed_fee() public {
        vm.prank(creator);
        address token = pad.launch("Klamp Hook Demo", "KHOOK");
        Buyer b = new Buyer(PM);
        vm.deal(address(this), 1 ether);
        uint256 out = b.buy{value: 0.01 ether}(_v4key(token));
        uint256 fee = DemoToken(token).balanceOf(feeTo);
        assertGt(out, 0, "bought");
        // 훅 수수료 1%: fee / (out + fee) = 1%
        assertApproxEqRel(fee * 100, out + fee, 1e15, "hook takes 1%");
    }

    function test_pathA_attacker_cannot_declare() public {
        vm.prank(creator);
        address token = pad.launch("Klamp Hook Demo", "KHOOK");
        // 이미 선언된 토큰이지만, 같은 salt·initCode를 넣어도 호출자가 런치패드가 아니면 NotIssuer
        bytes32 salt = pad.saltOf(creator, "Klamp Hook Demo", "KHOOK");
        bytes32 h = pad.initCodeHash("Klamp Hook Demo", "KHOOK");
        vm.prank(attacker);
        vm.expectRevert(CanonicalPoolRegistrar.NotIssuer.selector);
        registrar.recordByCreate2(token, PoolKey(address(0), token, 3000, 60, address(0)), salt, h, attacker);
    }

    function test_check_TokenNotDeployed() public {
        TestIssuer iss = new TestIssuer();
        bytes32 h = iss.initCodeHash();
        address future = vm.computeCreate2Address(bytes32(uint256(1)), h, address(iss));
        vm.expectRevert(CanonicalPoolRegistrar.TokenNotDeployed.selector);
        iss.record(registrar, future, PoolKey(address(0), future, 3000, 60, address(0)), bytes32(uint256(1)), h);
    }

    function test_check_TokenNotInPool() public {
        TestIssuer iss = new TestIssuer();
        bytes32 h = iss.initCodeHash();
        address token = iss.deploy(bytes32(uint256(2)));
        vm.expectRevert(CanonicalPoolRegistrar.TokenNotInPool.selector);
        iss.record(registrar, token, PoolKey(address(0), address(0xBEEF), 3000, 60, address(0)), bytes32(uint256(2)), h);
    }

    function test_check_PoolNotInitialized() public {
        TestIssuer iss = new TestIssuer();
        bytes32 h = iss.initCodeHash();
        address token = iss.deploy(bytes32(uint256(3)));
        vm.expectRevert(CanonicalPoolRegistrar.PoolNotInitialized.selector);
        iss.record(registrar, token, PoolKey(address(0), token, 3000, 60, address(0)), bytes32(uint256(3)), h);
    }

    function test_check_AlreadyRecorded() public {
        TestIssuer iss = new TestIssuer();
        bytes32 h = iss.initCodeHash();
        address token = iss.deploy(bytes32(uint256(4)));
        PM.initialize(V4PoolKey(Currency.wrap(address(0)), Currency.wrap(token), 3000, 60, IHooks(address(0))), 2 ** 96);
        PoolKey memory k = PoolKey(address(0), token, 3000, 60, address(0));
        iss.record(registrar, token, k, bytes32(uint256(4)), h);
        // 다른 fee의 풀로 다시 선언해도 거절
        PM.initialize(V4PoolKey(Currency.wrap(address(0)), Currency.wrap(token), 500, 10, IHooks(address(0))), 2 ** 96);
        vm.expectRevert(CanonicalPoolRegistrar.AlreadyRecorded.selector);
        iss.record(registrar, token, PoolKey(address(0), token, 500, 10, address(0)), bytes32(uint256(4)), h);
    }
}
