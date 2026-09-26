// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {RegistrarFixture} from "./RegistrarFixture.sol";
import {Phase1Setup} from "../../script/Phase1Setup.sol";
import {IPermissionedRegistry} from "ens-v2/registry/interfaces/IPermissionedRegistry.sol";
import {IRegistry} from "ens-v2/registry/interfaces/IRegistry.sol";
import {VerifiableFactory} from "@ensdomains/verifiable-factory/VerifiableFactory.sol";
import {IUniversalResolve} from "../../script/Phase1Setup.sol";
import {EnsDeploy} from "../../script/EnsDeploy.sol";
import {IUERC20Factory, IPoolManager as IExtsloadManager} from "../../src/CanonicalPoolRegistrar.sol";
import {ERC1155Holder} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
abstract contract NamespaceFixture is RegistrarFixture, ERC1155Holder {
    Phase1Setup.Deployment internal deployment;
    Phase1Setup.Config internal setupConfig;
    IPermissionedRegistry internal root;
    IPermissionedRegistry internal eth;
    IUniversalResolve internal universal;
    address internal probe;
    function setUp() public virtual override {
        super.setUp();
        address labels = EnsDeploy.labelStore();
        root = EnsDeploy.permissionedRegistry(labels,address(this),Phase1Setup.REG_ROLES);
        eth = EnsDeploy.permissionedRegistry(labels,address(this),Phase1Setup.REG_ROLES);
        root.register("eth",address(this),eth,address(0),Phase1Setup.PARENT_ROLES,type(uint64).max);
        eth.setParent(root,"eth");
        address[] memory launchers = new address[](1); launchers[0]=address(launcher);
        setupConfig = Phase1Setup.Config(new VerifiableFactory(),EnsDeploy.userRegistryImpl(labels),EnsDeploy.resolverImpl(),IExtsloadManager(address(manager)),IUERC20Factory(address(factory)),launchers,address(this),0);
        deployment = Phase1Setup.deploy(setupConfig);
        eth.register("klamp",address(this),deployment.registry,address(0),Phase1Setup.PARENT_ROLES,type(uint64).max);
        deployment.registry.setParent(eth,"klamp");
        universal = EnsDeploy.universalResolver(root,address(this));
        registrar=deployment.registrar; resolver=deployment.resolver;
        probe=deployer.deploy(0); initialize(keyFor(probe)); deployer.recordWithEditor(registrar,probe,keyFor(probe),0,creator);
    }
    function seal() internal { Phase1Setup.seal(deployment,eth,universal,address(this),block.chainid,probe); }
}
