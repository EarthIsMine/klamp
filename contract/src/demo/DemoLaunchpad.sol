// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {IUnlockCallback} from "v4-core/interfaces/callback/IUnlockCallback.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {BalanceDelta} from "v4-core/types/BalanceDelta.sol";
import {ModifyLiquidityParams} from "v4-core/types/PoolOperation.sol";
import {TickMath} from "v4-core/libraries/TickMath.sol";
import {FullMath} from "v4-core/libraries/FullMath.sol";
import {FixedPoint96} from "v4-core/libraries/FixedPoint96.sol";

import {CanonicalPoolRegistrar, PoolKey as KlampPoolKey} from "../CanonicalPoolRegistrar.sol";

/// @notice 데모용 최소 ERC-20. 전체 공급량을 배포자(런치패드)에게 발행한다.
contract DemoToken {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(string memory name_, string memory symbol_, uint256 supply) {
        name = name_;
        symbol = symbol_;
        totalSupply = supply;
        balanceOf[msg.sender] = supply;
        emit Transfer(address(0), msg.sender, supply);
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transfer(address to, uint256 value) external returns (bool) {
        return _transfer(msg.sender, to, value);
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) allowance[from][msg.sender] = allowed - value;
        return _transfer(from, to, value);
    }

    function _transfer(address from, address to, uint256 value) internal returns (bool) {
        balanceOf[from] -= value;
        balanceOf[to] += value;
        emit Transfer(from, to, value);
        return true;
    }
}

/// @notice 경로 A 데모 런치패드. 한 트랜잭션에서
///         1) 토큰을 CREATE2로 배포하고  2) D형 훅 풀(ETH/토큰)을 초기화하고
///         3) 전체 공급량을 토큰 단면 유동성으로 넣어 영구히 두고  4) 방금 만든 풀을 대표 풀로 선언한다.
///         런치패드 자신이 CREATE2 실행자라서 발행자(issuer)다. 크리에이터 = launch()를 부른 사람.
/// @dev 설계 전제대로 임의 외부 호출 기능(execute, multicall 등)이 없다. 유동성을 빼는 함수도 없다.
contract DemoLaunchpad is IUnlockCallback {
    IPoolManager public immutable poolManager;
    CanonicalPoolRegistrar public immutable registrar;
    IHooks public immutable hook;

    uint256 public constant SUPPLY = 1e27; // 10억 개
    uint24 public constant FEE = 3000; // 0.3% (정적 LP 수수료. 훅 수수료는 별도)
    int24 public constant TICK_SPACING = 60;
    int24 public constant TICK_UPPER = 198060; // 초기 가격 = 이 틱. 1 ETH ≈ 4억 토큰
    int24 public constant TICK_LOWER = -198060;

    event Launched(address indexed token, address indexed creator, bytes32 poolId);

    error NotPoolManager();

    constructor(IPoolManager poolManager_, CanonicalPoolRegistrar registrar_, IHooks hook_) {
        poolManager = poolManager_;
        registrar = registrar_;
        hook = hook_;
    }

    function initCodeHash(string memory name, string memory symbol) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(type(DemoToken).creationCode, abi.encode(name, symbol, SUPPLY)));
    }

    function saltOf(address creator, string memory name, string memory symbol) public pure returns (bytes32) {
        return keccak256(abi.encode(creator, name, symbol));
    }

    function predictToken(address creator, string memory name, string memory symbol) external view returns (address) {
        bytes32 h = keccak256(
            abi.encodePacked(bytes1(0xff), address(this), saltOf(creator, name, symbol), initCodeHash(name, symbol))
        );
        return address(uint160(uint256(h)));
    }

    function launch(string calldata name, string calldata symbol) external returns (address token) {
        bytes32 salt = saltOf(msg.sender, name, symbol);
        token = address(new DemoToken{salt: salt}(name, symbol, SUPPLY));

        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(address(0)),
            currency1: Currency.wrap(token),
            fee: FEE,
            tickSpacing: TICK_SPACING,
            hooks: hook
        });
        poolManager.initialize(key, TickMath.getSqrtPriceAtTick(TICK_UPPER));
        poolManager.unlock(abi.encode(key, token));

        registrar.recordByCreate2(
            token,
            KlampPoolKey(address(0), token, FEE, TICK_SPACING, address(hook)),
            salt,
            initCodeHash(name, symbol),
            msg.sender
        );
        emit Launched(token, msg.sender, keccak256(abi.encode(key)));
    }

    /// @dev 토큰 단면 유동성: 현재 틱 = TICK_UPPER 라서 [TICK_LOWER, TICK_UPPER) 구간은 토큰(currency1)만 필요하다.
    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        if (msg.sender != address(poolManager)) revert NotPoolManager();
        (PoolKey memory key, address token) = abi.decode(data, (PoolKey, address));
        uint160 sqrtA = TickMath.getSqrtPriceAtTick(TICK_LOWER);
        uint160 sqrtB = TickMath.getSqrtPriceAtTick(TICK_UPPER);
        uint256 liquidity = FullMath.mulDiv(SUPPLY, FixedPoint96.Q96, sqrtB - sqrtA);

        (BalanceDelta delta,) = poolManager.modifyLiquidity(
            key, ModifyLiquidityParams(TICK_LOWER, TICK_UPPER, int256(liquidity), bytes32(0)), ""
        );
        uint256 owed = uint256(uint128(-delta.amount1()));
        poolManager.sync(key.currency1);
        DemoToken(token).transfer(address(poolManager), owed);
        poolManager.settle();
        return "";
    }
}
