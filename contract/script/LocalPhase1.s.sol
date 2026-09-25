// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {Script} from "forge-std/Script.sol";
import {Phase1Setup} from "./Phase1Setup.sol";
import {PoolManager} from "@uniswap/v4-core/src/PoolManager.sol";
import {StateView} from "@uniswap/v4-periphery/src/lens/StateView.sol";
import {PoolKey as V4Key} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {UserRegistry} from "ens-v2/registry/UserRegistry.sol";
import {PermissionedRegistry} from "ens-v2/registry/PermissionedRegistry.sol";
import {PermissionedResolver} from "ens-v2/resolver/PermissionedResolver.sol";
import {LabelStore} from "ens-v2/utils/LabelStore.sol";
import {IContractNamer} from "ens-v2/reverse-registrar/interfaces/IContractNamer.sol";
import {UniversalResolverV2} from "ens-v2/universalResolver/UniversalResolverV2.sol";
import {GatewayProvider} from "@ens/contracts/ccipRead/GatewayProvider.sol";
import {VerifiableFactory} from "@ensdomains/verifiable-factory/VerifiableFactory.sol";
import {UERC20Factory} from "@uniswap/uerc20-factory/src/factories/UERC20Factory.sol";
import {LiquidityLauncher} from "launcher/LiquidityLauncher.sol";
import {IAllowanceTransfer} from "permit2/src/interfaces/IAllowanceTransfer.sol";
import {Create2Launcher} from "../test/fixtures/RegistrarFixture.sol";
import {PoolKey, IStateView, IUERC20Factory} from "../src/CanonicalPoolRegistrar.sol";

/// @dev Local-only fixture; never use this to replace public ENS infrastructure.
contract LocalPhase1 is Script {
    PoolManager manager;
    StateView state;
    PermissionedRegistry root;
    PermissionedRegistry eth;
    UniversalResolverV2 universal;
    Phase1Setup.Config c;
    Phase1Setup.Deployment d;
    address token;
    function run() external {
        require(block.chainid == 31337, "local chain only");
        address operator = vm.envAddress("OPERATOR");
        vm.startBroadcast(operator);
        manager = new PoolManager(operator);
        state = new StateView(manager);
        LabelStore labels = new LabelStore(IContractNamer(address(0)));
        root = new PermissionedRegistry(labels,operator,Phase1Setup.REG_ROLES);
        eth = new PermissionedRegistry(labels,operator,Phase1Setup.REG_ROLES);
        root.register("eth",operator,eth,address(0),Phase1Setup.HOOK_ROLES,type(uint64).max);
        eth.setParent(root,"eth");
        c.factory = new VerifiableFactory(); c.registryImpl = new UserRegistry(labels,operator);
        c.resolverImpl = new PermissionedResolver(operator); c.stateView = IStateView(address(state));
        c.poolManager = address(manager); c.tokenFactory = IUERC20Factory(address(new UERC20Factory()));
        c.launchers = new address[](1); c.launchers[0] = address(new LiquidityLauncher(IAllowanceTransfer(address(0))));
        c.operator = operator; c.hooksAdmin = operator;
        d = Phase1Setup.deploy(c);
        eth.register("klamp",operator,d.registry,address(0),Phase1Setup.HOOK_ROLES,type(uint64).max);
        d.registry.setParent(eth,"klamp");
        universal = new UniversalResolverV2(root,new GatewayProvider(operator,new string[](0)),IContractNamer(address(0)));
        Create2Launcher deployer = new Create2Launcher();
        token = deployer.deploy(0);
        manager.initialize(V4Key(Currency.wrap(address(0)),Currency.wrap(token),3000,60,IHooks(address(0))),uint160(1<<96));
        deployer.recordWithEditor(d.registrar,token,PoolKey(address(0),token,3000,60,address(0)),0,operator);
        Phase1Setup.seal(d,eth,universal,operator,operator,31337,token);
        vm.stopBroadcast();
        string memory object = "local";
        vm.serializeUint(object,"chainId",31337);
        vm.serializeAddress(object,"operator",operator);
        vm.serializeAddress(object,"token",token);
        vm.serializeAddress(object,"poolManager",address(manager));
        vm.serializeAddress(object,"stateView",address(state));
        vm.serializeAddress(object,"rootRegistry",address(root));
        vm.serializeAddress(object,"ethRegistry",address(eth));
        vm.serializeAddress(object,"registry",address(d.registry));
        vm.serializeAddress(object,"resolver",address(d.resolver));
        vm.serializeAddress(object,"registryImplementation",address(c.registryImpl));
        vm.serializeAddress(object,"resolverImplementation",address(c.resolverImpl));
        vm.serializeAddress(object,"registrar",address(d.registrar));
        vm.serializeAddress(object,"launcher",c.launchers[0]);
        vm.serializeAddress(object,"tokenFactory",address(c.tokenFactory));
        vm.serializeBytes32(object,"poolId",d.registrar.canonicalPoolOf(token));
        string memory json = vm.serializeAddress(object,"universalResolver",address(universal));
        vm.writeJson(json,"deployments/local.json");
    }
}
