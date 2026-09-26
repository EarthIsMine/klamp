// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @dev Uniswap v4 PoolKey. Same ABI as v4-core's PoolKey (Currency, IHooks = address).
struct PoolKey {
    address currency0; // 0x0 = ETH
    address currency1;
    uint24 fee;
    int24 tickSpacing;
    address hooks;
}

/// @dev ENSv2 PermissionedResolver (Sepolia ENSv2 Beta), only the functions we use. Records are written by DNS-encoded name.
///      Write permissions in this version are per key (no per-name delegation), so the registrar also writes description/url,
///      and this contract checks the creator for each token.
interface IPermissionedResolver {
    function setText(bytes calldata name, string calldata key, string calldata value) external;
    function setData(bytes calldata name, string calldata key, bytes calldata value) external;
}

/// @dev Uniswap UERC20Factory. Token address = CREATE2(salt = keccak256(name, symbol, decimals, factoryCaller, graffiti)).
///      factoryCaller is the contract that called the factory (the `creator` argument in Uniswap code; LiquidityLauncher on Pools.trade).
///      The address that called LiquidityLauncher goes into graffiti.
interface IUERC20Factory {
    function getUERC20Address(
        string memory name,
        string memory symbol,
        uint8 decimals,
        address factoryCaller,
        bytes32 graffiti
    ) external view returns (address);
}

/// @dev Uniswap v4 PoolManager, only the functions we use. Pool state is read via extsload.
interface IPoolManager {
    function extsload(bytes32 slot) external view returns (bytes32);
}

interface IERC20Metadata {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
}

/// @title CanonicalPoolRegistrar
/// @notice Only a token's issuer can declare that token's canonical pool, once.
///         Issuer = the address the token address cryptographically points to. No one can declare the canonical pool of someone else's token.
///         Stored at: text("pool"), data("pool") of <tokenAddress>.tokens.klamp.eth
contract CanonicalPoolRegistrar {
    IPermissionedResolver public immutable resolver; // resolver of tokens.klamp.eth
    bytes32 public immutable tokensNode; // namehash("tokens.klamp.eth")
    bytes public tokensName; // DNS-encoded "tokens.klamp.eth"
    IPoolManager public immutable poolManager; // Uniswap v4 PoolManager on this chain
    IUERC20Factory public immutable uerc20Factory; // 0x0 disables path B
    mapping(address => bool) public isLiquidityLauncher; // fixed at deployment, immutable afterwards

    mapping(address token => bytes32 poolId) public canonicalPoolOf;
    /// @notice Who can write description/url. Set at declaration and never changes. If 0, no one can write.
    mapping(address token => address creator) public creatorOf;

    uint24 public constant LAUNCH_FEE = 2500; // InstantLaunchStrategy.LP_FEE
    int24 public constant LAUNCH_TICK_SPACING = 25; // InstantLaunchStrategy.TICK_SPACING
    /// @dev v4 StateLibrary.POOLS_SLOT (v4-core 46c6834). Tests confirm it matches the deployed PoolManager
    bytes32 public constant POOLS_SLOT = bytes32(uint256(6));

    /// @param issuer Address that declared the canonical pool (path A: launchpad contract, path B: creator)
    /// @param creator Address that manages description/url (same as issuer in path B). Written via setTokenText
    event CanonicalRecorded(address indexed token, bytes32 indexed poolId, address indexed issuer, address creator);

    error NotIssuer();
    error TokenNotDeployed();
    error PoolNotInitialized();
    error TokenNotInPool();
    error AlreadyRecorded();
    error NotCreator();
    error KeyNotAllowed();

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

    /// @notice Path A. issuer = the contract (launchpad) that deployed the token with CREATE2.
    ///         Declares the just-created pool inside the launch transaction. creator is the address passed by the launchpad.
    ///         The caller must be the contract that actually executed CREATE2. If the launchpad uses a separate token factory,
    ///         that factory must call this (NotIssuer if the launchpad calls it instead).
    ///         Assumption: the issuer contract must have no arbitrary external call feature (execute, multicall, etc.).
    ///         Otherwise a third party could call this function through it.
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

    /// @notice Path B. Tokens created via Uniswap LiquidityLauncher (Pools.trade).
    ///         LiquidityLauncher sets graffiti = keccak256(abi.encode(address that called LiquidityLauncher)).
    ///         Direct call case: that address is both issuer and creator. It calls this directly after launch.
    ///         Takes no PoolKey. Fixed to the single pool InstantLaunchStrategy creates, preventing a wrong declaration.
    function recordByLiquidityLauncher(address token, address launcher) external {
        _recordLaunched(token, launcher, msg.sender);
    }

    /// @notice Path B, via a disposable contract. The creator deploys a disposable contract whose constructor
    ///         calls LiquidityLauncher and then self-destructs. graffiti points to the disposable address, which
    ///         is recomputed as CREATE(creator, nonce). Issuer = the creator that deployed that contract.
    /// @dev Rejects if code remains at the disposable address, so that the deployer of a shared contract used by many
    ///      cannot hijack someone else's launch.
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
        // InstantLaunchStrategy's pool: ETH / token, LP_FEE 2500, TICK_SPACING 25, no hook (liquidity-launcher v3.2.0)
        _record(token, PoolKey(address(0), token, LAUNCH_FEE, LAUNCH_TICK_SPACING, address(0)), msg.sender);
    }

    function _record(address token, PoolKey memory key, address creator) internal {
        if (key.currency0 != token && key.currency1 != token) revert TokenNotInPool();
        if (canonicalPoolOf[token] != bytes32(0)) revert AlreadyRecorded();

        bytes32 poolId = keccak256(abi.encode(key)); // same value as v4 PoolIdLibrary
        // Pool state slot0 = pools[poolId]. sqrtPriceX96 == 0 means uninitialized.
        // PoolManager validates the PoolKey on initialize, so an initialized pool implies a valid PoolKey.
        bytes32 slot0 = poolManager.extsload(keccak256(abi.encodePacked(poolId, POOLS_SLOT)));
        if (uint160(uint256(slot0)) == 0) revert PoolNotInitialized();
        canonicalPoolOf[token] = poolId;
        creatorOf[token] = creator;

        bytes memory name = _tokenName(token);
        resolver.setText(
            name, "pool", string.concat("eip155:", _dec(block.chainid), ":", _hex(abi.encodePacked(poolId)))
        );
        resolver.setData(name, "pool", abi.encode(block.chainid, key));

        emit CanonicalRecorded(token, poolId, msg.sender, creator);
    }

    /// @notice Only the token's creator writes description/url on the token's name. Other keys such as pool cannot be written.
    function setTokenText(address token, string calldata key, string calldata value) external {
        address creator = creatorOf[token];
        if (creator == address(0) || msg.sender != creator) revert NotCreator();
        bytes32 k = keccak256(bytes(key));
        if (k != keccak256("description") && k != keccak256("url")) revert KeyNotAllowed();
        resolver.setText(_tokenName(token), key, value);
    }

    /// @dev DNS-encoded "<0x lowercase token address>.tokens.klamp.eth"
    function _tokenName(address token) internal view returns (bytes memory) {
        string memory label = _hex(abi.encodePacked(token)); // "0x" + 40 lowercase chars
        return abi.encodePacked(uint8(bytes(label).length), label, tokensName);
    }

    // ---------- utils ----------

    /// @dev CREATE address = last 20 bytes of keccak256(rlp([deployer, nonce])). nonce < 2^64 (EIP-2681)
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
