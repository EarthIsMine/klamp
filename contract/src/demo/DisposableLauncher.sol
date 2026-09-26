// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {PoolKey} from "../CanonicalPoolRegistrar.sol";

struct UERC20Metadata {
    string description;
    string website;
    string image;
    bytes extra;
}

interface ILiquidityLauncher {
    function createToken(
        address factory,
        string calldata name,
        string calldata symbol,
        uint8 decimals,
        uint128 initialSupply,
        address recipient,
        bytes calldata tokenData
    ) external payable returns (address);
}

interface IPoolManagerInit {
    function initialize(PoolKey memory key, uint160 sqrtPriceX96) external returns (int24);
}

/// @notice Pools.trade 일회용 런칭 패턴 재현. 생성자에서 LiquidityLauncher로 토큰을 만들고 바로 selfdestruct 한다
///         (EIP-6780: 생성한 tx 안이면 코드가 지워진다). graffiti = keccak256(abi.encode(이 컨트랙트 주소)).
/// @dev Sepolia에는 InstantLaunchStrategy가 없어서, 전략 대신 같은 PoolKey(ETH, 토큰, 2500, 25, 훅 없음)로 풀만 초기화한다.
///      poolManager가 0이면 풀 초기화를 건너뛴다.
contract DisposableLauncher {
    constructor(
        address launcher,
        address factory,
        address poolManager,
        string memory name,
        string memory symbol,
        address recipient,
        uint160 sqrtPriceX96
    ) {
        address token = ILiquidityLauncher(launcher).createToken(
            factory, name, symbol, 18, 1e27, recipient, abi.encode(UERC20Metadata("", "", "", ""))
        );
        if (poolManager != address(0)) {
            IPoolManagerInit(poolManager).initialize(PoolKey(address(0), token, 2500, 25, address(0)), sqrtPriceX96);
        }
        selfdestruct(payable(msg.sender));
    }
}
