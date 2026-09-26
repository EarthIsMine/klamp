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

/// @notice Minimal ERC-20 for the demo. Mints the entire supply to the deployer (launchpad).
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

/// @notice Path A demo launchpad. In one transaction it
///         1) deploys the token with CREATE2  2) initializes a D-type hook pool (ETH/token)
///         3) adds the full supply as single-sided token liquidity, locked forever  4) declares the new pool as the canonical pool.
///         The launchpad itself executes CREATE2, so it is the issuer. Creator = the caller of launch().
/// @dev Per the design assumption, there is no arbitrary external call feature (execute, multicall, etc.). There is no liquidity withdrawal function either.
contract DemoLaunchpad is IUnlockCallback {
    IPoolManager public immutable poolManager;
    CanonicalPoolRegistrar public immutable registrar;
    IHooks public immutable hook;

    uint256 public constant SUPPLY = 1e27; // 1 billion tokens
    uint24 public constant FEE = 3000; // 0.3% (static LP fee; hook fee is separate)
    int24 public constant TICK_SPACING = 60;
    int24 public constant TICK_UPPER = 198060; // initial price = this tick. 1 ETH ≈ 400 million tokens
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

    /// @dev Single-sided token liquidity: current tick = TICK_UPPER, so the [TICK_LOWER, TICK_UPPER) range needs only the token (currency1).
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
