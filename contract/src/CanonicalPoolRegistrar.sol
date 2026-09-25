// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @dev Uniswap v4 PoolKey. v4-core의 PoolKey와 ABI가 같다 (Currency, IHooks = address).
struct PoolKey {
    address currency0; // 0x0 = ETH
    address currency1;
    uint24 fee;
    int24 tickSpacing;
    address hooks;
}

/// @dev ENSv2 PermissionedResolver 중 쓰는 함수만.
interface IPermissionedResolver {
    function setText(bytes32 node, string calldata key, string calldata value) external;
    function setData(bytes32 node, string calldata key, bytes calldata value) external;
    function authorizeTextRoles(bytes calldata name, string calldata key, address account, bool grant)
        external
        returns (bool);
}

/// @dev Uniswap UERC20Factory. 토큰 주소 = CREATE2(salt = keccak256(name, symbol, decimals, creator, graffiti)).
interface IUERC20Factory {
    function getUERC20Address(
        string memory name,
        string memory symbol,
        uint8 decimals,
        address creator,
        bytes32 graffiti
    ) external view returns (address);
}

interface IERC20Metadata {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
}

interface IStateView {
    function poolManager() external view returns (address);
    function getSlot0(bytes32 poolId) external view returns (uint160, int24, uint24, uint24);
}

/// @title CanonicalPoolRegistrar
/// @notice 토큰을 만든 주체만 그 토큰의 대표 풀을 ENS에 한 번 기록할 수 있다.
///         기록 위치: <토큰주소>.tokens.klamp.eth 의 text("pool"), data("pool")
contract CanonicalPoolRegistrar {
    IStateView public immutable stateView;
    address public immutable poolManager;
    IPermissionedResolver public immutable resolver; // tokens.klamp.eth 의 resolver
    bytes32 public immutable tokensNode; // namehash("tokens.klamp.eth")
    bytes public tokensName; // DNS 인코딩된 "tokens.klamp.eth"
    IUERC20Factory public immutable uerc20Factory; // 0x0이면 경로 B 끔
    mapping(address => bool) public isLiquidityLauncher; // 배포 시 고정, 이후 변경 불가

    mapping(address token => bytes32 poolId) public canonicalPoolOf;

    event CanonicalRecorded(address indexed token, bytes32 indexed poolId, address indexed deployer);

    error NotDeployer();
    error InvalidEditor();
    error TokenNotDeployed();
    error InvalidCurrencyOrder();
    error PoolNotInitialized();
    error InvalidStateView();
    error LauncherDisabled();
    error TokenNotInPool();
    error AlreadyRecorded();

    constructor(
        IPermissionedResolver resolver_,
        bytes memory tokensName_,
        IUERC20Factory uerc20Factory_,
        address[] memory liquidityLaunchers,
        IStateView stateView_,
        address poolManager_
    ) {
        if (address(stateView_).code.length == 0 || poolManager_.code.length == 0
            || stateView_.poolManager() != poolManager_) revert InvalidStateView();
        stateView = stateView_;
        poolManager = poolManager_;
        resolver = resolver_;
        tokensName = tokensName_;
        tokensNode = _namehash(tokensName_, 0);
        uerc20Factory = uerc20Factory_;
        for (uint256 i; i < liquidityLaunchers.length; i++) {
            isLiquidityLauncher[liquidityLaunchers[i]] = true;
        }
    }

    /// @notice 경로 A: CREATE2로 토큰을 배포한 컨트랙트(런치패드)가 런칭 트랜잭션 안에서 호출.
    function recordByCreate2(address token, PoolKey calldata key, bytes32 salt, bytes32 initCodeHash)
        external
    {
        _proveCreate2(token, salt, initCodeHash);
        _record(token, key, msg.sender);
    }

    function recordByCreate2(address token, PoolKey calldata key, bytes32 salt, bytes32 initCodeHash, address metadataEditor)
        external
    {
        if (metadataEditor == address(0)) revert InvalidEditor();
        _proveCreate2(token, salt, initCodeHash);
        _record(token, key, metadataEditor);
    }

    function _proveCreate2(address token, bytes32 salt, bytes32 initCodeHash) internal view {
        address predicted = address(
            uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), msg.sender, salt, initCodeHash))))
        );
        if (predicted != token) revert NotDeployer();
    }

    /// @notice 경로 B: Uniswap LiquidityLauncher(Pools.trade)로 만든 토큰의 크리에이터가 런칭 후 직접 호출.
    /// @dev LiquidityLauncher는 graffiti = keccak256(abi.encode(원래 호출자))를 넣어 토큰을 만든다.
    function recordByLiquidityLauncher(address token, PoolKey calldata key, address launcher) external {
        if (address(uerc20Factory) == address(0)) revert LauncherDisabled();
        if (!isLiquidityLauncher[launcher]) revert NotDeployer();
        if (token == address(0) || token.code.length == 0) revert TokenNotDeployed();
        IERC20Metadata t = IERC20Metadata(token);
        address predicted = uerc20Factory.getUERC20Address(
            t.name(), t.symbol(), t.decimals(), launcher, keccak256(abi.encode(msg.sender))
        );
        if (predicted != token) revert NotDeployer();
        _record(token, key, msg.sender);
    }

    function _record(address token, PoolKey calldata key, address metadataEditor) internal {
        if (token == address(0) || token.code.length == 0) revert TokenNotDeployed();
        if (key.currency0 >= key.currency1) revert InvalidCurrencyOrder();
        if (key.currency0 != token && key.currency1 != token) revert TokenNotInPool();
        if (canonicalPoolOf[token] != bytes32(0)) revert AlreadyRecorded();

        bytes32 poolId = keccak256(abi.encode(key)); // v4 PoolIdLibrary와 같은 값
        (uint160 sqrtPriceX96,,,) = stateView.getSlot0(poolId);
        if (sqrtPriceX96 == 0) revert PoolNotInitialized();
        canonicalPoolOf[token] = poolId;

        string memory label = _hex(abi.encodePacked(token)); // "0x" + 소문자 40자
        bytes32 node = keccak256(abi.encodePacked(tokensNode, keccak256(bytes(label))));
        bytes memory name = abi.encodePacked(uint8(bytes(label).length), label, tokensName);

        resolver.setText(
            node, "pool", string.concat("eip155:", _dec(block.chainid), ":", _hex(abi.encodePacked(poolId)))
        );
        resolver.setData(node, "pool", abi.encode(block.chainid, key));
        resolver.authorizeTextRoles(name, "description", metadataEditor, true);
        resolver.authorizeTextRoles(name, "url", metadataEditor, true);

        emit CanonicalRecorded(token, poolId, msg.sender);
    }

    // ---------- utils ----------

    function _namehash(bytes memory dns, uint256 offset) internal pure returns (bytes32) {
        uint256 len = uint8(dns[offset]);
        if (len == 0) return bytes32(0);
        bytes memory label = new bytes(len);
        for (uint256 i; i < len; i++) {
            label[i] = dns[offset + 1 + i];
        }
        return keccak256(abi.encodePacked(_namehash(dns, offset + 1 + len), keccak256(label)));
    }

    function _hex(bytes memory b) internal pure returns (string memory) {
        bytes16 digits = "0123456789abcdef";
        bytes memory s = new bytes(2 + b.length * 2);
        s[0] = "0";
        s[1] = "x";
        for (uint256 i; i < b.length; i++) {
            s[2 + i * 2] = digits[uint8(b[i]) >> 4];
            s[3 + i * 2] = digits[uint8(b[i]) & 0x0f];
        }
        return string(s);
    }

    function _dec(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        uint256 n;
        for (uint256 t = v; t != 0; t /= 10) n++;
        bytes memory s = new bytes(n);
        for (; v != 0; v /= 10) s[--n] = bytes1(uint8(48 + (v % 10)));
        return string(s);
    }
}
