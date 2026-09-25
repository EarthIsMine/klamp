// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {Test} from "forge-std/Test.sol";
import {CanonicalPoolRegistrar, PoolKey, IPermissionedResolver, IUERC20Factory, IStateView} from "../../src/CanonicalPoolRegistrar.sol";
import {PermissionedResolver} from "ens-v2/resolver/PermissionedResolver.sol";
import {PermissionedResolverLib as Roles} from "ens-v2/resolver/libraries/PermissionedResolverLib.sol";
import {VerifiableFactory} from "@ensdomains/verifiable-factory/VerifiableFactory.sol";
import {NameCoder} from "@ens/contracts/utils/NameCoder.sol";
import {UERC20Factory} from "@uniswap/uerc20-factory/src/factories/UERC20Factory.sol";
import {LiquidityLauncher} from "launcher/LiquidityLauncher.sol";
import {IAllowanceTransfer} from "permit2/src/interfaces/IAllowanceTransfer.sol";
import {UERC20Metadata} from "@uniswap/uerc20-factory/src/libraries/UERC20MetadataLibrary.sol";

import {PoolManager} from "@uniswap/v4-core/src/PoolManager.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey as V4Key} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {StateView} from "@uniswap/v4-periphery/src/lens/StateView.sol";

contract FixtureToken { }
contract Create2Launcher {
    function deploy(bytes32 salt) external returns (address) { return address(new FixtureToken{salt:salt}()); }
    function recordWithEditor(CanonicalPoolRegistrar registrar, address token, PoolKey memory key, bytes32 salt, address editor) external {
        registrar.recordByCreate2(token, key, salt, keccak256(type(FixtureToken).creationCode), editor);
    }
    function record(CanonicalPoolRegistrar registrar, address token, PoolKey memory key, bytes32 salt) external {
        registrar.recordByCreate2(token, key, salt, keccak256(type(FixtureToken).creationCode));
    }
}
abstract contract RegistrarFixture is Test {
    PoolManager internal manager;
    StateView internal stateView;
    PermissionedResolver internal resolver;
    CanonicalPoolRegistrar internal registrar;
    Create2Launcher internal deployer;
    UERC20Factory internal factory;
    LiquidityLauncher internal launcher;
    address internal creator = address(0xC0FFEE);
    bytes internal tokensName;
    function setUp() public virtual {
        tokensName = NameCoder.encode("tokens.klamp.eth");
        VerifiableFactory vf = new VerifiableFactory();
        resolver = PermissionedResolver(vf.deployProxy(address(new PermissionedResolver(address(this))), 0,
            abi.encodeCall(PermissionedResolver.initialize,(address(this), Roles.ROLE_SET_TEXT_ADMIN | Roles.ROLE_SET_DATA_ADMIN, new bytes[](0)))));
        factory = new UERC20Factory();
        launcher = new LiquidityLauncher(IAllowanceTransfer(address(0)));
        address[] memory launchers = new address[](1); launchers[0] = address(launcher);
        manager = new PoolManager(address(this));
        stateView = new StateView(manager);
        registrar = new CanonicalPoolRegistrar(IPermissionedResolver(address(resolver)), tokensName, IUERC20Factory(address(factory)), launchers, IStateView(address(stateView)), address(manager));
        resolver.authorizeTextRoles(hex"00", "pool", address(registrar), true);
        resolver.authorizeDataRoles(hex"00", "pool", address(registrar), true);
        resolver.authorizeNameRoles(hex"00", Roles.ROLE_SET_TEXT_ADMIN, address(registrar), true);
        deployer = new Create2Launcher();
    }
    function initialize(PoolKey memory key) internal {
        manager.initialize(V4Key(Currency.wrap(key.currency0), Currency.wrap(key.currency1), key.fee, key.tickSpacing, IHooks(key.hooks)), uint160(1 << 96));
    }
    function keyFor(address token) internal pure returns (PoolKey memory) {
        return PoolKey(address(0), token, 3000, 60, address(0));
    }
    function nodeFor(address token) internal pure returns (bytes32) {
        return NameCoder.namehash(NameCoder.encode(string.concat(vm.toLowercase(vm.toString(token)), ".tokens.klamp.eth")),0);
    }
    function launchToken() internal returns (address token) {
        vm.prank(creator);
        token = launcher.createToken(address(factory), "Launch", "LCH", 18, 1e18, creator, abi.encode(UERC20Metadata("", "", "", 0)));
    }
}
