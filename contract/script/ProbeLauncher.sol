// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {CanonicalPoolRegistrar, PoolKey} from "../src/CanonicalPoolRegistrar.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey as V4Key} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
contract ProbeToken is ERC20 {
    constructor(address recipient) ERC20("Klamp Probe", "KPROBE") { _mint(recipient,1_000_000e18); }
}
/// @dev Testnet demonstration only: initializes a pool without adding liquidity.
contract ProbeLauncher {
    address public immutable operator;
    CanonicalPoolRegistrar public immutable registrar;
    constructor(address operator_,CanonicalPoolRegistrar registrar_) { operator=operator_;registrar=registrar_; }
    function initCodeHash() public view returns(bytes32) {return keccak256(abi.encodePacked(type(ProbeToken).creationCode,abi.encode(operator)));}
    function tokenAddress(bytes32 salt) public view returns(address) {return address(uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff),address(this),salt,initCodeHash())))));}
    function launch(bytes32 salt) external returns(address token) {
        require(block.chainid==31337||block.chainid==11155111,"testnet only");
        require(msg.sender==operator,"operator only");
        token=tokenAddress(salt);
        if(token.code.length==0) new ProbeToken{salt:salt}(operator);
        PoolKey memory key=PoolKey(address(0),token,3000,60,address(0));
        bytes32 id=keccak256(abi.encode(key));
        (uint160 price,,,)=registrar.stateView().getSlot0(id);
        if(price==0) IPoolManager(registrar.poolManager()).initialize(V4Key(Currency.wrap(address(0)),Currency.wrap(token),3000,60,IHooks(address(0))),uint160(1<<96));
        if(registrar.canonicalPoolOf(token)==0) registrar.recordByCreate2(token,key,salt,initCodeHash(),operator);
        else require(registrar.canonicalPoolOf(token)==id,"existing pool differs");
    }
}
