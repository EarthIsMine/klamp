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

/// @dev Uniswap UERC20Factory. 토큰 주소 = CREATE2(salt = keccak256(name, symbol, decimals, factoryCaller, graffiti)).
///      factoryCaller는 팩토리를 부른 컨트랙트(Uniswap 코드의 `creator` 인자, Pools.trade에서는 LiquidityLauncher)다.
///      LiquidityLauncher를 부른 주소는 graffiti 쪽에 들어간다.
interface IUERC20Factory {
    function getUERC20Address(
        string memory name,
        string memory symbol,
        uint8 decimals,
        address factoryCaller,
        bytes32 graffiti
    ) external view returns (address);
}

/// @dev Uniswap v4 PoolManager 중 쓰는 함수만. 풀 상태는 extsload로 읽는다.
interface IPoolManager {
    function extsload(bytes32 slot) external view returns (bytes32);
}

interface IERC20Metadata {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
}

/// @title CanonicalPoolRegistrar
/// @notice 토큰의 발행자(issuer)만 그 토큰의 대표 풀을 한 번 선언할 수 있다.
///         발행자 = 토큰 주소가 암호학적으로 가리키는 주소. 남의 토큰의 대표 풀은 아무도 선언할 수 없다.
///         기록 위치: <토큰주소>.tokens.klamp.eth 의 text("pool"), data("pool")
contract CanonicalPoolRegistrar {
    IPermissionedResolver public immutable resolver; // tokens.klamp.eth 의 resolver
    bytes32 public immutable tokensNode; // namehash("tokens.klamp.eth")
    bytes public tokensName; // DNS 인코딩된 "tokens.klamp.eth"
    IPoolManager public immutable poolManager; // 이 체인의 Uniswap v4 PoolManager
    IUERC20Factory public immutable uerc20Factory; // 0x0이면 경로 B 끔
    mapping(address => bool) public isLiquidityLauncher; // 배포 시 고정, 이후 변경 불가

    mapping(address token => bytes32 poolId) public canonicalPoolOf;

    uint24 public constant LAUNCH_FEE = 2500; // InstantLaunchStrategy.LP_FEE
    int24 public constant LAUNCH_TICK_SPACING = 25; // InstantLaunchStrategy.TICK_SPACING
    /// @dev v4 StateLibrary.POOLS_SLOT (고정한 v4-core 59d3ecf). 배포된 PoolManager에서 같은 값인지 테스트로 확인한다
    bytes32 public constant POOLS_SLOT = bytes32(uint256(6));

    /// @param issuer 대표 풀을 선언한 주소 (경로 A: 런치패드 컨트랙트, 경로 B: 크리에이터)
    /// @param creator description·url을 관리할 사람 주소 (경로 B에서는 issuer와 같다)
    event CanonicalRecorded(address indexed token, bytes32 indexed poolId, address indexed issuer, address creator);

    error NotIssuer();
    error TokenNotDeployed();
    error PoolNotInitialized();
    error TokenNotInPool();
    error AlreadyRecorded();

    constructor(
        IPermissionedResolver resolver_,
        bytes memory tokensName_,
        IPoolManager poolManager_,
        IUERC20Factory uerc20Factory_,
        address[] memory liquidityLaunchers
    ) {
        resolver = resolver_;
        tokensName = tokensName_;
        tokensNode = _namehash(tokensName_, 0);
        poolManager = poolManager_;
        uerc20Factory = uerc20Factory_;
        for (uint256 i; i < liquidityLaunchers.length; i++) {
            isLiquidityLauncher[liquidityLaunchers[i]] = true;
        }
    }

    /// @notice 경로 A. issuer = 토큰을 CREATE2로 배포한 컨트랙트(런치패드) 자신.
    ///         런칭 트랜잭션 안에서, 방금 만든 풀을 선언한다. creator는 런치패드가 넘겨주는 사람 주소.
    ///         호출자는 CREATE2를 실제로 실행한 컨트랙트여야 한다. 런치패드가 별도 토큰 팩토리를 쓰면
    ///         그 팩토리가 호출해야 한다 (런치패드가 대신 부르면 NotIssuer).
    ///         전제: 발행자 컨트랙트에 임의 외부 호출 기능(execute, multicall 등)이 없어야 한다.
    ///         있으면 제3자가 그 기능을 통해 이 함수를 부를 수 있다.
    function recordByCreate2(
        address token,
        PoolKey calldata key,
        bytes32 salt,
        bytes32 initCodeHash,
        address creator
    ) external {
        if (token.code.length == 0) revert TokenNotDeployed();
        address predicted = address(
            uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), msg.sender, salt, initCodeHash))))
        );
        if (predicted != token) revert NotIssuer();
        _record(token, key, creator);
    }

    /// @notice 경로 B. Uniswap LiquidityLauncher(Pools.trade)로 만든 토큰.
    ///         LiquidityLauncher는 graffiti = keccak256(abi.encode(LiquidityLauncher를 부른 주소))를 넣는다.
    ///         그 주소를 직접 부른 경우: 그 주소가 발행자이자 크리에이터다. 런칭 후 직접 호출한다.
    ///         PoolKey는 받지 않는다. InstantLaunchStrategy가 만드는 풀 하나로 고정해 잘못된 선언을 막는다.
    function recordByLiquidityLauncher(address token, address launcher) external {
        _recordLaunched(token, launcher, msg.sender);
    }

    /// @notice 경로 B, 일회용 컨트랙트 경유. 크리에이터가 일회용 컨트랙트를 배포하고, 그 생성자가
    ///         LiquidityLauncher를 부른 뒤 사라진 경우. graffiti는 일회용 주소를 가리키고, 그 주소는
    ///         CREATE(크리에이터, nonce)로 다시 계산된다. 발행자 = 그 컨트랙트를 배포한 크리에이터.
    /// @dev 일회용 주소에 코드가 남아 있으면 거절한다. 여러 사람이 쓰는 공용 컨트랙트의 배포자가
    ///      남의 런칭을 가로채지 못하게 하기 위해서다.
    function recordByLiquidityLauncherVia(address token, address launcher, uint256 nonce) external {
        address disposable = _createAddress(msg.sender, nonce);
        if (disposable.code.length != 0) revert NotIssuer();
        _recordLaunched(token, launcher, disposable);
    }

    function _recordLaunched(address token, address launcher, address graffitiOwner) internal {
        if (!isLiquidityLauncher[launcher]) revert NotIssuer();
        if (token.code.length == 0) revert TokenNotDeployed();
        IERC20Metadata t = IERC20Metadata(token);
        address predicted = uerc20Factory.getUERC20Address(
            t.name(), t.symbol(), t.decimals(), launcher, keccak256(abi.encode(graffitiOwner))
        );
        if (predicted != token) revert NotIssuer();
        // InstantLaunchStrategy의 풀: ETH / 토큰, LP_FEE 2500, TICK_SPACING 25, 훅 없음 (liquidity-launcher v3.2.0)
        _record(token, PoolKey(address(0), token, LAUNCH_FEE, LAUNCH_TICK_SPACING, address(0)), msg.sender);
    }

    function _record(address token, PoolKey memory key, address creator) internal {
        if (key.currency0 != token && key.currency1 != token) revert TokenNotInPool();
        if (canonicalPoolOf[token] != bytes32(0)) revert AlreadyRecorded();

        bytes32 poolId = keccak256(abi.encode(key)); // v4 PoolIdLibrary와 같은 값
        // 풀 상태 slot0 = pools[poolId]. sqrtPriceX96 == 0이면 미초기화.
        // PoolManager가 initialize 때 PoolKey를 검증하므로, 초기화된 풀이면 PoolKey도 유효하다.
        bytes32 slot0 = poolManager.extsload(keccak256(abi.encodePacked(poolId, POOLS_SLOT)));
        if (uint160(uint256(slot0)) == 0) revert PoolNotInitialized();
        canonicalPoolOf[token] = poolId;

        string memory label = _hex(abi.encodePacked(token)); // "0x" + 소문자 40자
        bytes32 node = keccak256(abi.encodePacked(tokensNode, keccak256(bytes(label))));
        bytes memory name = abi.encodePacked(uint8(bytes(label).length), label, tokensName);

        resolver.setText(
            node, "pool", string.concat("eip155:", _dec(block.chainid), ":", _hex(abi.encodePacked(poolId)))
        );
        resolver.setData(node, "pool", abi.encode(block.chainid, key));
        if (creator != address(0)) {
            resolver.authorizeTextRoles(name, "description", creator, true);
            resolver.authorizeTextRoles(name, "url", creator, true);
        }

        emit CanonicalRecorded(token, poolId, msg.sender, creator);
    }

    // ---------- utils ----------

    /// @dev CREATE 주소 = keccak256(rlp([deployer, nonce]))의 끝 20바이트. nonce < 2^64 (EIP-2681)
    function _createAddress(address deployer, uint256 nonce) internal pure returns (address) {
        bytes memory rlp;
        if (nonce == 0) {
            rlp = abi.encodePacked(bytes1(0xd6), bytes1(0x94), deployer, bytes1(0x80));
        } else if (nonce <= 0x7f) {
            rlp = abi.encodePacked(bytes1(0xd6), bytes1(0x94), deployer, uint8(nonce));
        } else {
            uint256 len;
            for (uint256 t = nonce; t != 0; t >>= 8) len++;
            bytes memory n = new bytes(len);
            for (uint256 i; i < len; i++) n[len - 1 - i] = bytes1(uint8(nonce >> (8 * i)));
            rlp = abi.encodePacked(bytes1(uint8(0xd6 + len)), bytes1(0x94), deployer, bytes1(uint8(0x80 + len)), n);
        }
        return address(uint160(uint256(keccak256(rlp))));
    }

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
