// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {RegistryRolesLib} from "ensv2/registry/libraries/RegistryRolesLib.sol";
import {NameCoder} from "ens-contracts/utils/NameCoder.sol";

import {KlampSetup, IUserRegistry, IPermResolver, IRecordReader} from "../script/KlampSetup.sol";
import {CanonicalPoolRegistrar, PoolKey} from "../src/CanonicalPoolRegistrar.sol";

struct UERC20Metadata {
    string description;
    string website;
    string image;
    bytes extra;
}

interface ILiquidityLauncher {
    function createToken(
        address factory,
        string calldata name,
        string calldata symbol,
        uint8 decimals,
        uint128 initialSupply,
        address recipient,
        bytes calldata tokenData
    ) external payable returns (address);
}

interface IPoolManagerInit {
    function initialize(PoolKey memory key, uint160 sqrtPriceX96) external returns (int24);
}

/// @dev Pools.trade disposable launch pattern: the constructor calls LiquidityLauncher and immediately selfdestructs (EIP-6780: code deleted within the same tx).
contract DisposableLauncher {
    constructor(address launcher, address factory, string memory name, string memory symbol, address recipient) {
        ILiquidityLauncher(launcher).createToken(
            factory, name, symbol, 18, 1e27, recipient, abi.encode(UERC20Metadata("", "", "", ""))
        );
        selfdestruct(payable(msg.sender));
    }
}

/// @notice On a Sepolia fork: full setup → declare via both path B entry points → check lookup values. Rehearsal before real deployment.
contract SetupForkTest is Test, KlampSetup {
    /// klamp.eth is already registered for real, so the same setup is reproduced under a different name
    function _label() internal pure override returns (string memory) {
        return "klampforktest";
    }

    address me = makeAddr("klamp-deployer");
    address creator = makeAddr("creator");
    address attacker = makeAddr("attacker");
    bytes32 secret = keccak256("klamp-secret");
    Deployed d;

    function setUp() public {
        vm.createSelectFork("sepolia");
        vm.startPrank(me, me);
        (IUserRegistry reg, IPermResolver res) = _phase1(me, secret, 1);
        vm.stopPrank();

        vm.warp(block.timestamp + 61);
        vm.roll(block.number + 5);

        vm.startPrank(me, me);
        d = _phase2(me, secret, reg, res);
        vm.stopPrank();
    }

    function test_setup_wiring_and_revoked_roles() public view {
        assertEq(ETH_REGISTRY.getSubregistry(_label()), address(d.reg), "klamp.eth subregistry");
        assertEq(d.reg.getResolver("tokens"), address(d.res), "tokens resolver");
        assertEq(ETH_REGISTRY.roles(d.klampTokenId, me) & KLAMP_OWNER_ROLES, 0, "klamp.eth owner roles left");
        assertEq(d.res.roles(0, me), 0, "resolver root roles left");
        uint256 left = d.reg.roles(0, me);
        assertEq(left, RegistryRolesLib.ROLE_REGISTRAR | RegistryRolesLib.ROLE_REGISTRAR_ADMIN, "registry: only REGISTRAR left");
    }

    function _launch(address from) internal returns (address token) {
        vm.prank(from, from);
        token = ILiquidityLauncher(LAUNCHER_V3_2_0).createToken(
            address(UERC20_FACTORY), "Klamp Demo", "KDEMO", 18, 1e27, from, abi.encode(UERC20Metadata("", "", "", ""))
        );
        _initPool(token);
    }

    function _initPool(address token) internal {
        // Around 1 ETH = 1,000,000 tokens. The value itself is not under test
        IPoolManagerInit(address(POOL_MANAGER)).initialize(
            PoolKey(address(0), token, 2500, 25, address(0)), 77371252455336267181195264 /* 2^86 */
        );
    }

    function _node(address token) internal pure returns (bytes32) {
        return NameCoder.namehash(NameCoder.encode(string.concat(vm.toLowercase(vm.toString(token)), ".tokens.klamp.eth")), 0);
    }

    function _name(address token) internal pure returns (bytes memory) {
        return NameCoder.encode(string.concat(vm.toLowercase(vm.toString(token)), ".tokens.klamp.eth"));
    }

    function _text(address token, string memory key) internal view returns (string memory) {
        bytes memory r = d.res.resolve(_name(token), abi.encodeCall(IRecordReader.text, (_node(token), key)));
        return abi.decode(r, (string));
    }

    function _data(address token, string memory key) internal view returns (bytes memory) {
        bytes memory r = d.res.resolve(_name(token), abi.encodeCall(IRecordReader.data, (_node(token), key)));
        return abi.decode(r, (bytes));
    }

    function test_pathB_direct() public {
        address token = _launch(creator);

        vm.prank(attacker);
        vm.expectRevert(CanonicalPoolRegistrar.NotIssuer.selector);
        d.registrar.recordByLiquidityLauncher(token, LAUNCHER_V3_2_0);

        vm.prank(creator);
        d.registrar.recordByLiquidityLauncher(token, LAUNCHER_V3_2_0);

        bytes32 poolId = keccak256(abi.encode(PoolKey(address(0), token, 2500, 25, address(0))));
        assertEq(d.registrar.canonicalPoolOf(token), poolId);
        string memory expected = string.concat("eip155:11155111:", vm.toString(poolId));
        assertEq(_text(token, "pool"), expected, "text(pool)");
        (uint256 chainId, PoolKey memory key) = abi.decode(_data(token, "pool"), (uint256, PoolKey));
        assertEq(chainId, 11155111);
        assertEq(key.currency1, token);

        // The creator writes only description, via the registrar. It cannot write pool, nor write to the resolver directly
        vm.startPrank(creator);
        d.registrar.setTokenText(token, "description", "demo");
        assertEq(_text(token, "description"), "demo");
        vm.expectRevert(CanonicalPoolRegistrar.KeyNotAllowed.selector);
        d.registrar.setTokenText(token, "pool", "eip155:1:0xdead");
        bytes memory name = NameCoder.encode(string.concat(vm.toLowercase(vm.toString(token)), ".tokens.klamp.eth"));
        vm.expectRevert();
        d.res.setText(name, "description", "direct");
        vm.stopPrank();
        vm.prank(attacker);
        vm.expectRevert(CanonicalPoolRegistrar.NotCreator.selector);
        d.registrar.setTokenText(token, "description", "hijack");

        vm.prank(creator);
        vm.expectRevert(CanonicalPoolRegistrar.AlreadyRecorded.selector);
        d.registrar.recordByLiquidityLauncher(token, LAUNCHER_V3_2_0);
    }

    function test_pathB_via_disposable() public {
        uint64 nonce = vm.getNonce(creator);
        vm.prank(creator, creator);
        DisposableLauncher disposable = new DisposableLauncher(
            LAUNCHER_V3_2_0, address(UERC20_FACTORY), "Klamp Via", "KVIA", creator
        );
        assertEq(address(disposable).code.length, 0, "disposable should be gone");
        address token = UERC20_FACTORY.getUERC20Address(
            "Klamp Via", "KVIA", 18, LAUNCHER_V3_2_0, keccak256(abi.encode(address(disposable)))
        );
        assertGt(token.code.length, 0, "token deployed");
        _initPool(token);

        vm.prank(attacker);
        vm.expectRevert(CanonicalPoolRegistrar.NotIssuer.selector);
        d.registrar.recordByLiquidityLauncherVia(token, LAUNCHER_V3_2_0, nonce);

        vm.prank(creator);
        d.registrar.recordByLiquidityLauncherVia(token, LAUNCHER_V3_2_0, nonce);
        assertTrue(d.registrar.canonicalPoolOf(token) != bytes32(0));
    }
}
