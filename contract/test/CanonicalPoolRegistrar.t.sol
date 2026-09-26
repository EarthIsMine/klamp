// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {RegistrarFixture, FixtureToken} from "./fixtures/RegistrarFixture.sol";
import {CanonicalPoolRegistrar, PoolKey, IPermissionedResolver, IUERC20Factory, IPoolManager as IExtsloadManager} from "../src/CanonicalPoolRegistrar.sol";
import {LiquidityLauncher} from "launcher/LiquidityLauncher.sol";
import {UERC20Metadata} from "@uniswap/uerc20-factory/src/libraries/UERC20MetadataLibrary.sol";

/// @dev Calls LiquidityLauncher from its constructor and deploys no runtime code, like the Pools.trade one-shot flow.
contract DisposableLaunch {
    constructor(LiquidityLauncher launcher, address factory, address recipient) {
        launcher.createToken(factory, "Via", "VIA", 18, 1e18, recipient, abi.encode(UERC20Metadata("", "", "", 0)));
        assembly { return(0, 0) }
    }
}
/// @dev A shared launcher that stays deployed; its deployer must not be able to claim other people's launches.
contract PublicLauncher {
    LiquidityLauncher immutable launcher; address immutable factory;
    constructor(LiquidityLauncher launcher_, address factory_) { launcher = launcher_; factory = factory_; }
    function launch() external returns (address) {
        return launcher.createToken(factory, "Shared", "SHR", 18, 1e18, msg.sender, abi.encode(UERC20Metadata("", "", "", 0)));
    }
}
contract CreateAddressHarness is CanonicalPoolRegistrar {
    constructor() CanonicalPoolRegistrar(IPermissionedResolver(address(0)), hex"00", IExtsloadManager(address(0)), IUERC20Factory(address(0)), new address[](0)) {}
    function createAddress(address deployer, uint256 nonce) external pure returns (address) { return _createAddress(deployer, nonce); }
}

contract CanonicalPoolRegistrarTest is RegistrarFixture {
    address internal attacker = address(0xBAD);
    event CanonicalRecorded(address indexed token, bytes32 indexed poolId, address indexed issuer, address creator);

    function testCreate2RecordsTextAndData() public {
        address token = deployer.deploy(bytes32(0));
        PoolKey memory key = keyFor(token);
        initialize(key);
        bytes32 id = keccak256(abi.encode(key));
        vm.expectEmit(address(registrar));
        emit CanonicalRecorded(token, id, address(deployer), creator);
        deployer.recordWithEditor(registrar, token, key, bytes32(0), creator);
        assertEq(registrar.canonicalPoolOf(token), id);
        assertEq(textOf(token, "pool"), string.concat("eip155:", vm.toString(block.chainid), ":", vm.toString(id)));
        assertEq(dataOf(token, "pool"), abi.encode(block.chainid, key));
    }
    function testRejectNonIssuer() public {
        address token = deployer.deploy(bytes32(0)); initialize(keyFor(token));
        vm.prank(attacker); vm.expectRevert(CanonicalPoolRegistrar.NotIssuer.selector);
        registrar.recordByCreate2(token, keyFor(token), bytes32(0), keccak256(type(FixtureToken).creationCode), attacker);
    }
    function testRejectOverwriteWithAnotherFee() public {
        address token = deployer.deploy(bytes32(0));
        initialize(keyFor(token));
        deployer.record(registrar, token, keyFor(token), bytes32(0));
        PoolKey memory other = keyFor(token); other.fee = 500; other.tickSpacing = 10; initialize(other);
        vm.expectRevert(CanonicalPoolRegistrar.AlreadyRecorded.selector);
        deployer.record(registrar, token, other, bytes32(0));
    }
    function testRejectTokenNotInPool() public {
        address token = deployer.deploy(bytes32(0));
        vm.expectRevert(CanonicalPoolRegistrar.TokenNotInPool.selector);
        deployer.record(registrar, token, keyFor(address(1)), bytes32(0));
        assertEq(registrar.canonicalPoolOf(token), bytes32(0));
    }

    function testLauncherDirectRecordsFixedLaunchPool() public {
        address token = launchToken();
        assertEq(token, factory.getUERC20Address("Launch", "LCH", 18, address(launcher), keccak256(abi.encode(creator))));
        initialize(launchKeyFor(token));
        vm.prank(attacker); vm.expectRevert(CanonicalPoolRegistrar.NotIssuer.selector);
        registrar.recordByLiquidityLauncher(token, address(launcher));
        vm.expectEmit(address(registrar));
        emit CanonicalRecorded(token, keccak256(abi.encode(launchKeyFor(token))), creator, creator);
        vm.prank(creator); registrar.recordByLiquidityLauncher(token, address(launcher));
        assertEq(registrar.canonicalPoolOf(token), keccak256(abi.encode(launchKeyFor(token))));
        vm.prank(creator); registrar.setTokenText(token, "description", "launched");
    }
    function testLauncherPathIgnoresOtherPoolsAndUnknownLaunchers() public {
        address token = launchToken();
        initialize(keyFor(token)); // a different pool exists, but path B only accepts the launch pool
        vm.prank(creator); vm.expectRevert(CanonicalPoolRegistrar.PoolNotInitialized.selector);
        registrar.recordByLiquidityLauncher(token, address(launcher));
        initialize(launchKeyFor(token));
        vm.prank(creator); vm.expectRevert(CanonicalPoolRegistrar.NotIssuer.selector);
        registrar.recordByLiquidityLauncher(token, address(factory));
    }

    function testDisposableContractOnlyItsDeployerCanRecord() public {
        uint64 nonce = 1788;
        vm.setNonce(creator, nonce);
        vm.prank(creator);
        address disposable = address(new DisposableLaunch(launcher, address(factory), creator));
        assertEq(disposable, vm.computeCreateAddress(creator, nonce));
        assertEq(disposable.code.length, 0);
        address token = factory.getUERC20Address("Via", "VIA", 18, address(launcher), keccak256(abi.encode(disposable)));
        assertGt(token.code.length, 0);
        initialize(launchKeyFor(token));

        vm.prank(creator); vm.expectRevert(CanonicalPoolRegistrar.NotIssuer.selector);
        registrar.recordByLiquidityLauncher(token, address(launcher)); // direct path: graffiti is the disposable address
        vm.prank(attacker); vm.expectRevert(CanonicalPoolRegistrar.NotIssuer.selector);
        registrar.recordByLiquidityLauncherVia(token, address(launcher), nonce);
        vm.prank(creator); vm.expectRevert(CanonicalPoolRegistrar.NotIssuer.selector);
        registrar.recordByLiquidityLauncherVia(token, address(launcher), nonce - 1);

        vm.prank(creator); registrar.recordByLiquidityLauncherVia(token, address(launcher), nonce);
        assertEq(registrar.canonicalPoolOf(token), keccak256(abi.encode(launchKeyFor(token))));
        vm.prank(creator); registrar.setTokenText(token, "url", "https://example.com");
    }
    function testPublicLauncherDeployerCannotHijack() public {
        uint64 nonce = vm.getNonce(attacker);
        vm.prank(attacker);
        PublicLauncher shared = new PublicLauncher(launcher, address(factory));
        address victim = address(0xF00D);
        vm.prank(victim); address token = shared.launch();
        initialize(launchKeyFor(token));
        vm.prank(attacker); vm.expectRevert(CanonicalPoolRegistrar.NotIssuer.selector);
        registrar.recordByLiquidityLauncherVia(token, address(launcher), nonce);
        vm.prank(victim); vm.expectRevert(CanonicalPoolRegistrar.NotIssuer.selector);
        registrar.recordByLiquidityLauncher(token, address(launcher));
        assertEq(registrar.canonicalPoolOf(token), bytes32(0));
    }

    /// forge-config: default.fuzz.runs = 4096
    function testFuzzCreateAddressMatchesEvm(address deployerAddress, uint64 nonce) public {
        nonce = uint64(bound(nonce, 0, type(uint64).max - 1)); // EIP-2681
        CreateAddressHarness harness = new CreateAddressHarness();
        assertEq(harness.createAddress(deployerAddress, nonce), vm.computeCreateAddress(deployerAddress, nonce));
    }
}
