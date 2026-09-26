// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {IETHRegistrar} from "ens-v2/registrar/interfaces/IETHRegistrar.sol";
import {IPermissionedRegistry} from "ens-v2/registry/interfaces/IPermissionedRegistry.sol";
import {IRegistry} from "ens-v2/registry/interfaces/IRegistry.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @dev Public immutables of the Beta ETHRegistrar that IETHRegistrar does not declare.
interface IETHRegistrarParams is IETHRegistrar {
    function ETH_REGISTRY() external view returns (IPermissionedRegistry);
    function MIN_COMMITMENT_AGE() external view returns (uint64);
    function MAX_COMMITMENT_AGE() external view returns (uint64);
}
library RegistrationFlow {
    using SafeERC20 for IERC20;
    enum Step { Committed, Waiting, Registered, AlreadyRegistered }
    struct Config { IETHRegistrarParams registrar; IPermissionedRegistry eth; IPermissionedRegistry registry; IERC20 payment; address operator; bytes32 secret; uint64 duration; uint256 maxPrice; }
    function step(Config memory c) internal returns (Step status, uint256 readyAt) {
        require(address(c.registrar.ETH_REGISTRY()) == address(c.eth), "registrar registry mismatch");
        require(c.operator != address(0) && address(c.registry).code.length > 0, "invalid registration config");
        address owner = c.eth.getOwner(uint256(keccak256("klamp")));
        if(owner != address(0)) {
            require(owner == c.operator, "klamp.eth owned by another account");
            require(address(c.eth.getSubregistry("klamp")) == address(c.registry), "existing namespace differs");
            link(c); return (Step.AlreadyRegistered,0);
        }
        require(c.registrar.isAvailable("klamp"), "klamp.eth unavailable");
        (uint256 base,uint256 premium)=c.registrar.getRegisterPrice("klamp",c.duration,c.payment);
        uint256 price=base+premium;
        require(price<=c.maxPrice, "registration price exceeds cap");
        require(c.payment.balanceOf(c.operator)>=price, "insufficient payment balance");
        bytes32 commitment=c.registrar.makeCommitment("klamp",c.operator,c.secret,c.registry,address(0),c.duration,0);
        uint64 at=c.registrar.commitmentAt(commitment);
        if(at==0 || uint256(at)+c.registrar.MAX_COMMITMENT_AGE()<=block.timestamp) {
            c.registrar.commit(commitment);
            return (Step.Committed,block.timestamp+c.registrar.MIN_COMMITMENT_AGE());
        }
        readyAt=uint256(at)+c.registrar.MIN_COMMITMENT_AGE();
        if(block.timestamp<readyAt) return (Step.Waiting,readyAt);
        if(c.payment.allowance(c.operator,address(c.registrar))<price) c.payment.forceApprove(address(c.registrar),price);
        c.registrar.register("klamp",c.operator,c.secret,c.registry,address(0),c.duration,c.payment,0);
        link(c); return (Step.Registered,0);
    }
    function link(Config memory c) private {
        (IRegistry parent,string memory label)=c.registry.getParent();
        if(address(parent)==address(0)) c.registry.setParent(c.eth,"klamp");
        else require(address(parent)==address(c.eth) && keccak256(bytes(label))==keccak256("klamp"),"existing parent differs");
    }
}
