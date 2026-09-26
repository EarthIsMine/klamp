// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {Test} from "forge-std/Test.sol";
import {RegistrationFlow, IETHRegistrarParams} from "../script/RegistrationFlow.sol";
import {Phase1Setup} from "../script/Phase1Setup.sol";
import {EnsDeploy} from "../script/EnsDeploy.sol";
import {IPermissionedRegistry} from "ens-v2/registry/interfaces/IPermissionedRegistry.sol";
import {IRegistry} from "ens-v2/registry/interfaces/IRegistry.sol";
import {IEACGrantInitializable, Grant} from "ens-v2/access-control/interfaces/IEACGrantInitializable.sol";
import {RegistryRolesLib as R} from "ens-v2/registry/libraries/RegistryRolesLib.sol";
import {IRentPriceOracle} from "ens-v2/registrar/interfaces/IRentPriceOracle.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC1155Holder} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import {VerifiableFactory} from "@ensdomains/verifiable-factory/VerifiableFactory.sol";
contract FixedPriceOracle is IRentPriceOracle {
    function getRegisterPrice(string calldata,uint64,uint64,IERC20) external pure returns(uint256,uint256){return(1e6,0);}
    function getRenewPrice(string calldata,uint64,uint64,IERC20) external pure returns(uint256){return 1e6;}
    function isPaymentToken(IERC20) external pure returns(bool){return true;}
}
interface IMockERC20 { function mint(address to,uint256 amount) external; function nuke(address owner) external; }
contract RegistrationFlowTest is Test,ERC1155Holder {
    RegistrationFlow.Config internal c;
    function setUp() public {
        vm.warp(100000);
        address labels=EnsDeploy.labelStore();
        c.eth=EnsDeploy.permissionedRegistry(labels,address(this),Phase1Setup.REG_ROLES|R.ROLE_RENEW_ADMIN);
        VerifiableFactory vf=new VerifiableFactory();
        Grant[] memory grants=new Grant[](1); grants[0]=Grant(address(this),Phase1Setup.REG_ROLES);
        c.registry=IPermissionedRegistry(vf.deployProxy(EnsDeploy.userRegistryImpl(labels),0,abi.encodeCall(IEACGrantInitializable.initialize,(grants))));
        c.registrar=IETHRegistrarParams(address(EnsDeploy.ethRegistrar(address(this),c.eth,address(0xBEEF),new FixedPriceOracle())));
        c.eth.grantRootRoles(R.ROLE_REGISTRAR|R.ROLE_RENEW,address(c.registrar));
        address payment=EnsDeploy.mockERC20("USDC",6);IMockERC20(payment).mint(address(this),10e6);
        c.payment=IERC20(payment);c.operator=address(this);c.secret=keccak256("local fixture only");c.duration=365 days;c.maxPrice=1e6;
    }
    function step() external returns(RegistrationFlow.Step,uint256){return RegistrationFlow.step(c);}
    function testCommitWaitRegisterAndResume() public {
        (RegistrationFlow.Step s,uint256 ready)=this.step();assertEq(uint256(s),0);assertEq(ready,block.timestamp+60);
        (s,)=this.step();assertEq(uint256(s),1);
        vm.warp(ready);(s,)=this.step();assertEq(uint256(s),2);
        assertEq(c.eth.getOwner(uint256(keccak256("klamp"))),address(this));
        (IRegistry parent,string memory label)=c.registry.getParent();assertEq(address(parent),address(c.eth));assertEq(label,"klamp");
        assertEq(c.payment.balanceOf(address(0xBEEF)),1e6);
        (s,)=this.step();assertEq(uint256(s),3);assertEq(c.payment.balanceOf(address(0xBEEF)),1e6);
    }
    function testExpiredCommitmentIsReplaced() public {
        this.step();vm.warp(block.timestamp+3600);(RegistrationFlow.Step s,)=this.step();assertEq(uint256(s),0);
    }
    function testNameConflictDoesNotChooseAnotherRoot() public {
        c.eth.register("klamp",address(123),IRegistry(address(0)),address(0),0,type(uint64).max);
        vm.expectRevert("klamp.eth owned by another account");this.step();
    }
    function testPriceAndBalanceCheckedBeforeCommit() public {
        c.maxPrice=0;vm.expectRevert("registration price exceeds cap");this.step();
        c.maxPrice=1e6;IMockERC20(address(c.payment)).nuke(address(this));
        vm.expectRevert("insufficient payment balance");this.step();
    }
}
