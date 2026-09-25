// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {RegistrarFixture} from "./RegistrarFixture.sol";
import {Phase1Setup} from "../../script/Phase1Setup.sol";
import {UserRegistry} from "ens-v2/registry/UserRegistry.sol";
import {PermissionedRegistry} from "ens-v2/registry/PermissionedRegistry.sol";
import {IRegistry} from "ens-v2/registry/interfaces/IRegistry.sol";
import {RegistryRolesLib as R} from "ens-v2/registry/libraries/RegistryRolesLib.sol";
import {PermissionedResolver} from "ens-v2/resolver/PermissionedResolver.sol";
import {VerifiableFactory} from "@ensdomains/verifiable-factory/VerifiableFactory.sol";
import {LabelStore} from "ens-v2/utils/LabelStore.sol";
import {IContractNamer} from "ens-v2/reverse-registrar/interfaces/IContractNamer.sol";
import {GatewayProvider} from "@ens/contracts/ccipRead/GatewayProvider.sol";
import {UniversalResolverV2} from "ens-v2/universalResolver/UniversalResolverV2.sol";
import {IUERC20Factory, IStateView} from "../../src/CanonicalPoolRegistrar.sol";
import {ERC1155Holder} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
abstract contract NamespaceFixture is RegistrarFixture, ERC1155Holder {
    Phase1Setup.Deployment internal deployment;
    Phase1Setup.Config internal setupConfig;
    PermissionedRegistry internal root;
    PermissionedRegistry internal eth;
    UniversalResolverV2 internal universal;
    address internal hooksAdmin = address(0xBEEF);
    address internal probe;
    function setUp() public virtual override {
        super.setUp();
        LabelStore labels = new LabelStore(IContractNamer(address(0)));
        root = new PermissionedRegistry(labels,address(this),Phase1Setup.REG_ROLES);
        eth = new PermissionedRegistry(labels,address(this),Phase1Setup.REG_ROLES);
        root.register("eth",address(this),eth,address(0),Phase1Setup.HOOK_ROLES,type(uint64).max);
        eth.setParent(root,"eth");
        address[] memory launchers = new address[](1); launchers[0]=address(launcher);
        setupConfig = Phase1Setup.Config(new VerifiableFactory(),new UserRegistry(labels,address(this)),new PermissionedResolver(address(this)),IStateView(address(stateView)),address(manager),IUERC20Factory(address(factory)),launchers,address(this),hooksAdmin,0);
        deployment = Phase1Setup.deploy(setupConfig);
        eth.register("klamp",address(this),deployment.registry,address(0),Phase1Setup.HOOK_ROLES,type(uint64).max);
        deployment.registry.setParent(eth,"klamp");
        universal = new UniversalResolverV2(root,new GatewayProvider(address(this),new string[](0)),IContractNamer(address(0)));
        registrar=deployment.registrar; resolver=deployment.resolver;
        probe=deployer.deploy(0); initialize(keyFor(probe)); deployer.recordWithEditor(registrar,probe,keyFor(probe),0,creator);
    }
    function seal() internal { Phase1Setup.seal(deployment,eth,universal,address(this),hooksAdmin,block.chainid,probe); }
}
