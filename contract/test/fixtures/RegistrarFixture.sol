// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {Test} from "forge-std/Test.sol";
import {CanonicalPoolRegistrar, PoolKey, IPermissionedResolver as IRegistrarResolver, IUERC20Factory, IPoolManager as IExtsloadManager} from "../../src/CanonicalPoolRegistrar.sol";
import {IPermissionedResolver} from "ens-v2/resolver/interfaces/IPermissionedResolver.sol";
import {IPermissionedResolverInitializable} from "ens-v2/resolver/interfaces/IPermissionedResolverInitializable.sol";
import {Grant} from "ens-v2/access-control/interfaces/IEACGrantInitializable.sol";
import {Phase1Setup} from "../../script/Phase1Setup.sol";
import {EnsDeploy} from "../../script/EnsDeploy.sol";
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
    /// @dev creator = 0: no description/url rights for anyone.
    function record(CanonicalPoolRegistrar registrar, address token, PoolKey memory key, bytes32 salt) external {
        registrar.recordByCreate2(token, key, salt, keccak256(type(FixtureToken).creationCode), address(0));
    }
}
abstract contract RegistrarFixture is Test {
    PoolManager internal manager;
    StateView internal stateView;
    IPermissionedResolver internal resolver;
    CanonicalPoolRegistrar internal registrar;
    Create2Launcher internal deployer;
    UERC20Factory internal factory;
    LiquidityLauncher internal launcher;
    address internal creator = address(0xC0FFEE);
    bytes internal tokensName;
    function setUp() public virtual {
        tokensName = NameCoder.encode("tokens.klamp.eth");
        VerifiableFactory vf = new VerifiableFactory();
        Grant[] memory grants = new Grant[](1); grants[0] = Grant(address(this), Phase1Setup.RES_ROLES);
        resolver = IPermissionedResolver(vf.deployProxy(EnsDeploy.resolverImpl(), 0,
            abi.encodeCall(IPermissionedResolverInitializable.initialize,(grants, new bytes[](0)))));
        factory = new UERC20Factory();
        launcher = new LiquidityLauncher(IAllowanceTransfer(address(0)));
        address[] memory launchers = new address[](1); launchers[0] = address(launcher);
        manager = new PoolManager(address(this));
        stateView = new StateView(manager);
        registrar = new CanonicalPoolRegistrar(IRegistrarResolver(address(resolver)), tokensName, IExtsloadManager(address(manager)), IUERC20Factory(address(factory)), launchers);
        resolver.grantSetterRoles(Phase1Setup.textSetter("pool"), address(registrar));
        resolver.grantSetterRoles(Phase1Setup.dataSetter("pool"), address(registrar));
        resolver.grantSetterRoles(Phase1Setup.textSetter("description"), address(registrar));
        resolver.grantSetterRoles(Phase1Setup.textSetter("url"), address(registrar));
        deployer = new Create2Launcher();
    }
    function initialize(PoolKey memory key) internal {
        manager.initialize(V4Key(Currency.wrap(key.currency0), Currency.wrap(key.currency1), key.fee, key.tickSpacing, IHooks(key.hooks)), uint160(1 << 96));
    }
    function keyFor(address token) internal pure returns (PoolKey memory) {
        return PoolKey(address(0), token, 3000, 60, address(0));
    }
    /// @dev InstantLaunchStrategy pool that path B always records.
    function launchKeyFor(address token) internal pure returns (PoolKey memory) {
        return PoolKey(address(0), token, 2500, 25, address(0));
    }
    function textOf(address token, string memory key) internal view returns (string memory) {
        return Phase1Setup.readText(resolver, Phase1Setup.tokenName(token), key);
    }
    function dataOf(address token, string memory key) internal view returns (bytes memory) {
        return Phase1Setup.readData(resolver, Phase1Setup.tokenName(token), key);
    }
    function nodeFor(address token) internal pure returns (bytes32) {
        return NameCoder.namehash(NameCoder.encode(string.concat(vm.toLowercase(vm.toString(token)), ".tokens.klamp.eth")),0);
    }
    function launchToken() internal returns (address token) {
        vm.prank(creator);
        token = launcher.createToken(address(factory), "Launch", "LCH", 18, 1e18, creator, abi.encode(UERC20Metadata("", "", "", 0)));
    }
}
