
Klamp Phase 1 Design (Final): Launch and Canonical Pool Record (ENSv2)
September 25, 2026
 · 
@Someone


Klamp records the canonical pool declared by a token's issuer in ENSv2, so routers and terminals can read it with standard ENS tools and tell it apart from replica pools created by third parties. The core of the design fits in one line: only the issuer that the token address points to can declare the canonical pool, once. This is the first stage of the full flow (launch → pool creation → quote → execution).

Out of scope: fee caps (phase 2, CappedHookProxy), impersonation tokens, MEV outside the transaction.

Current status: the registrar, SDK, setup script and attack reproduction are done (13 local tests pass). Sepolia deployment and the demo remain (checklist at the bottom).

When the attack works
The damage from a replica pool attack is set by the user's slippage tolerance. If the tolerance exceeds the execution fee, the user loses that much; if it is lower, the trade fails. We reproduced it with the real Uniswap v4 code (v4-core). On the same pair we created a canonical pool (0.25% fixed, no hook) and a replica pool (dynamic fee + hook); the hook charges the quote caller 0.05% and the actual router a high fee.

Execution fee

Actual received vs. quote

Slippage 0.5%·1%·5%

10%

20%

30%

10%

−9.94%

Execution fails

Executes, loss

Executes, loss

Executes, loss

30%

−29.94%

Execution fails

Execution fails

Execution fails

Executes, loss

In both cases the replica pool's quote (0.05%) looks better than the canonical pool's (0.25%), so the router picks the replica pool.

Tolerance ≥ execution fee: the trade executes and the user loses the fee. The attacker sets the fee just below common tolerances.

Tolerance < execution fee: the trade fails and the user loses gas. If the user raises the tolerance and retries, it becomes the first case.

Meme trades are volatile, so users tend to set high tolerances. Conversely, this attack is impossible on a pool whose fee is fixed in the PoolKey (no hook + static fee). Below, such pools are called static pools.

Who decides the canonical pool
Canonical pool = an already-initialized pool declared by the token's issuer. Path A declares inside the launch transaction, so it is the pool created at launch. Klamp does not judge whether a pool is good. It only verifies on-chain who declared it and that the token and pool actually exist, and once declared, no one can change it. No one can declare the canonical pool for someone else's token.

There are three roles.

Role

Meaning

Can do

Issuer (issuer)

The address the token address cryptographically points to. Exactly one per token

Declare the canonical pool once

Creator (creator)

The person who launched the token

Manage the token description and link (description, url). Cannot change the canonical pool

Deployer contract (deployer)

The contract that actually executed CREATE2. On path A, the registration caller must be this contract

Nothing. May or may not be the issuer

Who the issuer is depends on how the token was created.



Path A: CREATE2 launchpad

Path B: Uniswap Pools.trade

Contract that deployed the token

Launchpad

UERC20Factory

What the token address commits to

Launchpad address + salt + code

LiquidityLauncher address + graffiti = keccak256(abi.encode(address that called LiquidityLauncher))

Issuer

The launchpad contract. Its code declares

The address that called LiquidityLauncher directly. If called through a disposable contract, the address that deployed that contract

Creator

The person's address passed by the launchpad

Same as the issuer

Pool that can be declared

An initialized pool chosen by the issuer. Declared inside the launch transaction

The single launch pool (ETH, token, 2500, 25, no hook). Declared by the creator after launch

Path B is not a hypothetical launchpad. Uniswap LiquidityLauncher already writes the address that called LiquidityLauncher into UERC20Factory as graffiti, and Klamp uses that value as-is for the proof. The Pools.trade code does not change.

Action

Who can do it

Declare canonical pool

The token's issuer, once

Change or delete canonical pool

No one (including the issuer and the Klamp team)

Edit description and link

The token's creator

Change the rules (registrar)

No one. Not upgradeable; admin roles revoked after setup

Remaining trust assumption

ENS's own root and .eth registry. The same assumption as anything that reads ENS

Questions expected from judges, with answers:

What if the issuer declares a bad pool? We don't block it. The token belongs to the issuer, and what traders want to buy is the issuer's token. What Klamp blocks is replica pools that third parties attach to someone else's token. Fee manipulation in the canonical pool itself is handled separately by phase 2 (fee cap).

What if the creator key is later compromised? An already-declared canonical pool cannot be changed. That is why we chose write-once. Only the description and link can change.

What if nothing is declared? With no record, the token has no known canonical pool. Existing Pools.trade tokens are looked up via the TokenLaunched event instead.

On path B, what if someone declares a pool other than the launch pool? They can't. Path B takes no PoolKey and is fixed to the launch pool.

What if the path A issuer contract has an arbitrary-call feature? A third party could call recordByCreate2 through that feature (execute, multicall, etc.). So path A makes "the issuer contract blocks arbitrary external calls" a launchpad integration requirement.

What if a token is launched through a shared launcher contract used by many people? That contract still has code, so the Via entry point rejects it. So the person who deployed the launcher cannot hijack other people's launches. Such tokens can only be declared if the launcher itself can call recordByLiquidityLauncher.

Router and terminal verdict policy
The Klamp SDK looks only at pools in the quote route that contain this token. Canonical pools and static pools are immune to the attack above, so they pass; only when other pools (hook, dynamic fee) are in the route does handling depend on the lookup result.

Lookup result

Criterion

When other pools are in the route

Registered

The ENS record passes verification

Requote using only canonical and static pools. No user bypass

Not registered

The record is empty and there is no trusted launch event

Requote using only static pools. If there is no static route, warn and ask the user to confirm

Lookup failed

RPC error, not the pinned resolver, format/chainId/PoolId mismatch

Requote using only static pools. Cannot be bypassed by confirmation; retry

If the route uses only canonical and static pools, all three cases allow it. If the canonical pool itself is a hook pool (type D), it is allowed, and fee manipulation by that hook is blocked by phase 2 (fee cap).

Where the protection comes from. If the canonical pool is a static pool, the "static pools only" rule alone gives the same verdict. Pools.trade launch pools are like this. The record changes the verdict for tokens whose canonical pool has a hook (type D). Without a record, a legitimate hook pool is indistinguishable from a replica pool and gets blocked; with a record, the canonical hook pool passes and only other hook pools on the same pair are blocked. By hooklist, most launchpad hooks (Robinhood 86%) are type D. So the defense demo uses a type D launchpad on path A, and path B shows the issuer proof, standard ENS lookup, and description and link.

Pools.trade tokens without an ENS record use the launch event instead. A pool obtained from the event is treated the same as registered.

Event fallback

Policy

Trusted emitter address

InstantLaunchStrategy 0x23f8209572b4a1C2AD88A42749E830791Fb027f1 (v3.2.0 Robinhood table in the liquidity-launcher README; 294 of the last 364). 0xAD44D55E7f8337C3cE113fBb591486E85be104b2 from the same table had 0 in roughly the last 2 million blocks. Three active unverified addresses (0x7c48dde3…, 0xc9566675…, 0x60d73b21…) will be added after confirming they are official Pools.trade strategies. The list is pinned in the SDK

Verification

topic0 = TokenLaunched, topic2 = the token, PoolId computed from the decoded PoolKey = topic1, PoolKey = (ETH, token, 2500, 25, no hook)

Lookup method

Via an indexer or our own cache. If the lookup cannot complete (e.g. public RPC block-range limits), lookup failed

Conflict with ENS record

The ENS record wins. If they differ, use the ENS value as the canonical pool and warn "differs from launch pool"

What changes
The canonical pool stays as is; we only add one record. 

The baseline is Pools.trade Instant Launch (InstantLaunchStrategy).



Current

After

Launch

Mint token → create pool (ETH/token, 0.25% fixed, no hook) → lock liquidity permanently → TokenLaunched event

Same + 1 registrar call (during or right after launch)

Canonical pool info

Only in the event; routers don't look at it

ENSv2 record, anyone can look it up

Replica pools

Anyone can create one

Still possible. Routers filter them out

The canonical pool record is common to all launchpad types. The fee cap is needed only for types C and D.

Type

Canonical pool shape

Examples

A. No hook

No hook, fixed fee

Pools.trade Instant Launch

B. Swap hook, no fee manipulation

beforeSwap only (trade gates, etc.)

GatedSwapHook, ZoraV4CoinHook

C. Dynamic fee hook

The hook changes the LP fee

Clanker dynamic fee family

D. Delta fee hook

Takes a fee via delta on every swap

LaunchHook, LaunchpadHook, TokenFab

E. Graduating

Own curve before graduation, v4 pool after

Bonding curve style

Type D is the majority: by hooklist, Robinhood 86%, Base 76% (keyword-filter approximation). Type E records at graduation.

Why ENSv2 rather than a mapping
A record's value scales with how many places read it. So the write rules live in our contract, and reading happens through ENS.



Own mapping

ENSv2

Who reads it

Only those who know our ABI

Every client that reads ENS (getEnsText, ENS app)

Write permissions

Implement ourselves

Enhanced Access Control built in

Token info

Separate system

Description and link on the same name (a token list attested by the issuer)

Next phase

New contract, new integration

Add hooks.klamp.eth to the same tree

If we disappear

Disappears with us

Still readable with standard tools

For the pitch: a mapping protects our one terminal. An ENS record protects everything that reads ENS. The demo shows the same pool value coming out of viem getEnsText (and the ENS app if possible) without any of our code.

ENSv2: new features and how we use them
ENS is Ethereum's standard naming system that resolves names (vitalik.eth) to records such as addresses and text. In v1, every name lived in one registry contract as namehash → owner, and the owner had all permissions. v2 is a tree in which each name has its own registry, and permissions can be split into roles.

Our name tree looks like this. With no per-launchpad namespaces or trust lists, issuer proofs record every token in one space.

klamp.eth                              ← root. Subnames managed by our UserRegistry
 ├ tokens.klamp.eth                    ← phase 1. Roles 0, max expiry. One resolver answers for all tokens
 │   └ 0x<token>.tokens.klamp.eth      ← per-token record. Not registered (wildcard)
 └ hooks.klamp.eth                     ← phase 2 (fee cap)
v2 feature

What it is

Where we use it

Hierarchical registries

Each name has its own registry managing its subnames (root → eth → klamp.eth → …). Sublabels are created with register(label, owner, subregistry, resolver, roleBitmap, expiry)

Our UserRegistry under klamp.eth, with only the tokens label registered

Role-based permissions (Enhanced Access Control)

Role bitmaps instead of ownership. ROLE_SET_RESOLVER, ROLE_SET_SUBREGISTRY, ROLE_CAN_TRANSFER_ADMIN, etc. are granted and revoked separately. Granting a role to someone requires that role's _ADMIN

Register the tokens label with roles 0 → no one can replace the resolver, transfer, or delete

Per-record permissions (PermissionedResolver)

Grants resolver write permission per (name, record key) pair. See the 4-cell table below

Registrar = pool on all names, creator = description and url on its own token's name

Wildcard resolution

When an unregistered subname is queried, the nearest parent name's resolver answers (LibRegistry.findResolver)

Token names are not registered. Zero registration cost per token

UniversalResolverV2

Entry point where a client passes just the name and it walks the registry tree, finds the resolver and calls it

viem getEnsText calls this → readable without our ABI

VerifiableFactory

Deploys ENS standard implementations (UserRegistry, PermissionedResolver) as proxies. Anyone can verify it is standard code

Proves our registry and resolver are not arbitrary code

data record (ENSIP-24)

A new standard for storing arbitrary bytes besides text

Store abi.encode(chainId, PoolKey) as-is → contracts can decode and use it too

When PermissionedResolver receives setText(node, key, value), it checks whether one of the four resources below has ROLE_SET_TEXT. A resource is keccak256(node, keccak256(key)), and 0 in a slot means "all". Roles on the root resource (0, 0) apply to every resource.



All keys

Specific key

All names

resource(0, 0) = root. Emptied after setup

resource(0, pool) ← registrar

Specific name

resource(node, 0). Granted to no one

resource(node, description), resource(node, url) ← that token's creator

Reference code: ensdomains/contracts-v2 (commit of 2026-07-03).

CanonicalPoolRegistrar
We build a single contract. It has three entry points (two issuer proof methods: CREATE2 and graffiti), and once a proof passes, all record through the same _record. For all three entry points, caller = issuer.

Entry point

Caller (= issuer)

Issuer proof

Canonical pool

recordByCreate2(token, key, salt, initCodeHash, creator)

The contract that deployed the token with CREATE2, inside the launch transaction

CREATE2(msg.sender, salt, initCodeHash) == token

Argument key

recordByLiquidityLauncher(token, launcher)

The address that called LiquidityLauncher directly (EOA or smart account)

getUERC20Address(name, symbol, decimals, launcher, keccak256(msg.sender)) == token

Fixed to the launch pool

recordByLiquidityLauncherVia(token, launcher, nonce)

The creator who deployed the disposable launch contract

CREATE(msg.sender, nonce) in the graffiti slot of the formula above. Rejected if that address still has code

Fixed to the launch pool

The path B launch pool is the (ETH, token, 2500, 25, no hook) pool created by InstantLaunchStrategy. Since no PoolKey is taken, it cannot be declared wrongly. In a sample of 12 recent Robinhood launches, 10 used a disposable contract, so without the Via entry point most could not be declared.

launcher accepts only the two LiquidityLauncher versions pinned at deployment: v3.0.0 0x00004c4ccc709Ef590F7C81102C0689F0263D4e9, v3.2.0 0x0000FffFBE8efE702c8703aE3477FF5dE3d319C0. Verified source confirms both put the address that called LiquidityLauncher into graffiti, and both exist on Sepolia and Robinhood with the same bytecode. This is a condition of the proof method, not a launchpad vetting.

Before recording it checks four things: whether the token is already deployed (TokenNotDeployed), whether the PoolKey contains the token (TokenNotInPool), whether it is already declared (AlreadyRecorded), and whether the pool is initialized in the specified PoolManager (PoolNotInitialized). On success it writes the following and emits CanonicalRecorded(token, poolId, issuer, creator). If creator is 0, description and link permissions go to no one.

Key

Value

Written by

pool (text)

eip155:<chainId>:<poolId>

Registrar

pool (data, ENSIP-24)

abi.encode(chainId, PoolKey)

Registrar

description, url (text)

Token description, link

Creator (delegated at record time)

This is the full code. It compiles as this single file with no external libraries.

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

/// @dev Only the ENSv2 PermissionedResolver functions we use.
interface IPermissionedResolver {
    function setText(bytes32 node, string calldata key, string calldata value) external;
    function setData(bytes32 node, string calldata key, bytes calldata value) external;
    function authorizeTextRoles(bytes calldata name, string calldata key, address account, bool grant)
        external
        returns (bool);
}

/// @dev Uniswap UERC20Factory. Token address = CREATE2(salt = keccak256(name, symbol, decimals, factoryCaller, graffiti)).
///      factoryCaller is the contract that called the factory (the `creator` argument in Uniswap's code; LiquidityLauncher on Pools.trade).
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

/// @dev Only the Uniswap v4 PoolManager functions we use. Pool state is read via extsload.
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
///         Issuer = the address the token address cryptographically points to. No one can declare the canonical pool for someone else's token.
///         Record location: text("pool"), data("pool") of <tokenAddress>.tokens.klamp.eth
contract CanonicalPoolRegistrar {
    IPermissionedResolver public immutable resolver; // resolver of tokens.klamp.eth
    bytes32 public immutable tokensNode; // namehash("tokens.klamp.eth")
    bytes public tokensName; // DNS-encoded "tokens.klamp.eth"
    IPoolManager public immutable poolManager; // this chain's Uniswap v4 PoolManager
    IUERC20Factory public immutable uerc20Factory; // 0x0 disables path B
    mapping(address => bool) public isLiquidityLauncher; // pinned at deployment, immutable afterwards

    mapping(address token => bytes32 poolId) public canonicalPoolOf;

    uint24 public constant LAUNCH_FEE = 2500; // InstantLaunchStrategy.LP_FEE
    int24 public constant LAUNCH_TICK_SPACING = 25; // InstantLaunchStrategy.TICK_SPACING
    /// @dev v4 StateLibrary.POOLS_SLOT (v4-core 46c6834). Tests confirm the deployed PoolManager uses the same value
    bytes32 public constant POOLS_SLOT = bytes32(uint256(6));

    /// @param issuer Address that declared the canonical pool (path A: launchpad contract, path B: creator)
    /// @param creator Person's address that manages description and url (equals issuer on path B)
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

    /// @notice Path A. issuer = the contract (launchpad) that deployed the token with CREATE2.
    ///         Declares the just-created pool inside the launch transaction. creator is the person's address passed by the launchpad.
    ///         The caller must be the contract that actually executed CREATE2. If the launchpad uses a separate token factory,
    ///         that factory must call (if the launchpad calls instead, NotIssuer).
    ///         Precondition: the issuer contract must have no arbitrary external call feature (execute, multicall, etc.).
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

    /// @notice Path B. Tokens created with Uniswap LiquidityLauncher (Pools.trade).
    ///         LiquidityLauncher sets graffiti = keccak256(abi.encode(address that called LiquidityLauncher)).
    ///         If that address called directly: it is both issuer and creator, and calls this directly after launch.
    ///         Takes no PoolKey. Fixed to the single pool InstantLaunchStrategy creates, to prevent wrong declarations.
    function recordByLiquidityLauncher(address token, address launcher) external {
        _recordLaunched(token, launcher, msg.sender);
    }

    /// @notice Path B, via a disposable contract. The creator deploys a disposable contract whose constructor
    ///         calls LiquidityLauncher and then disappears. graffiti points to the disposable address, which is
    ///         recomputed as CREATE(creator, nonce). Issuer = the creator that deployed that contract.
    /// @dev Rejects if the disposable address still has code, so that the deployer of a shared contract used by many
    ///      cannot hijack other people's launches.
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
        // PoolManager validates the PoolKey at initialize, so an initialized pool implies a valid PoolKey.
        bytes32 slot0 = poolManager.extsload(keccak256(abi.encodePacked(poolId, POOLS_SLOT)));
        if (uint160(uint256(slot0)) == 0) revert PoolNotInitialized();
        canonicalPoolOf[token] = poolId;

        string memory label = _hex(abi.encodePacked(token)); // "0x" + 40 lowercase chars
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
Verification: 13 local Foundry tests pass on top of the real ENSv2 contracts (contracts-v2 48b3e2d, 2026-07-03), Uniswap v4 PoolManager (v4-core 46c6834), and the original Uniswap UERC20Factory (CREATE address computation fuzzed 4,096 times).

Test

What it checks

CREATE2 path declaration and lookup

Launchpad initializes a pool during launch and declares it → tokens resolver answers via wildcard → resolveWithGateways, which viem calls, returns the same value. data(node, "pool") is also read from the real resolver and the PoolKey decoded. creator can write description but not pool. The issuer (launchpad) has no metadata permission

Non-issuer call rejected

An attacker calling with the same salt gets NotIssuer

Overwrite rejected

Issuer redeclaring with a pool of a different fee gets AlreadyRecorded

LiquidityLauncher direct-call path

Creator declares successfully, attacker gets NotIssuer

Disposable contract path

A contract that launches in its constructor and disappears (nonce 1788). No one can use the direct path; only the creator declares via Via. Anyone else gets NotIssuer even with the same nonce

Shared launcher hijack rejected

If a victim launches through a shared launcher deployed by the attacker, the launcher still has code, so the attacker's Via gets NotIssuer

CREATE address computation

Matches the EVM for 4,096 random deployer/nonce pairs

Token not included

A PoolKey without the token gets TokenNotInPool

Uninitialized pool rejected

If the launch pool is not in the PoolManager, PoolNotInitialized

Undeployed token rejected

A predicted CREATE2 address not yet deployed gets TokenNotDeployed

POOLS_SLOT

Reading slot0 of a pool initialized in the real PoolManager through this slot returns the initial price

Limits of the retained registrar role

The retained ROLE_REGISTRAR cannot re-register tokens, replace its resolver, replace its subregistry, or delete it. Cannot replace the klamp.eth subregistry. Final role revoked after registering hooks

No upgrade role

Neither we nor the registrar hold ROLE_UPGRADE on the resolver or any registry

The registrar has no upgrade feature, and the resolver's upgrade role (ROLE_UPGRADE) is never granted to anyone. After setup we revoke all our admin roles too, so even we cannot change or delete records.

Setup and lookup (Sepolia)
Setup happens once.

// Setup script (me = our deployer account). Same as the local test setUp, minus phase 2
uint256 REG_ROLES = ROLE_REGISTRAR | ROLE_REGISTRAR_ADMIN | ROLE_SET_PARENT | ROLE_SET_PARENT_ADMIN;
uint256 RES_ROLES = ROLE_SET_TEXT_ADMIN | ROLE_SET_DATA_ADMIN;
bytes memory ANY = NameCoder.encode("");   // "all names" (namehash 0)

// 1. Deploy our registry and resolver as ENS standard implementations. ROLE_UPGRADE is granted to no one
//    To revoke later we must also hold the _ADMIN roles (revoking also requires ADMIN)
UserRegistry reg = UserRegistry(VERIFIABLE_FACTORY.deployProxy(
    USER_REGISTRY_IMPL, salt1, abi.encodeCall(UserRegistry.initialize, (me, REG_ROLES))));
PermissionedResolver res = PermissionedResolver(VERIFIABLE_FACTORY.deployProxy(
    PERMISSIONED_RESOLVER_IMPL, salt2,
    abi.encodeCall(PermissionedResolver.initialize, (me, RES_ROLES, new bytes[](0)))));

// 2. Register klamp.eth (maximum possible duration). Set our registry as subregistry right away
ETH_REGISTRAR.commit(ETH_REGISTRAR.makeCommitment("klamp", me, secret, reg, address(0), duration, bytes32(0)));
uint256 klampTokenId = ETH_REGISTRAR.register("klamp", me, secret, reg, address(0), duration, MOCK_USDC, bytes32(0));
reg.setParent(ETH_REGISTRY, "klamp");

// 3. tokens label: set resolver, roles 0, max expiry
reg.register("tokens", me, IRegistry(address(0)), address(res), 0, type(uint64).max);

// 4. Deploy the registrar and grant permissions
address[] memory launchers = new address[](2);
launchers[0] = 0x00004c4ccc709Ef590F7C81102C0689F0263D4e9; // LiquidityLauncher v3.0.0
launchers[1] = 0x0000FffFBE8efE702c8703aE3477FF5dE3d319C0; // LiquidityLauncher v3.2.0
CanonicalPoolRegistrar registrar = new CanonicalPoolRegistrar(
    res, NameCoder.encode("tokens.klamp.eth"), POOL_MANAGER, UERC20_FACTORY, launchers);
res.authorizeTextRoles(ANY, "pool", address(registrar), true);            // text(pool) on all names
res.authorizeDataRoles(ANY, "pool", address(registrar), true);            // data(pool) on all names
res.authorizeNameRoles(ANY, ROLE_SET_TEXT_ADMIN, address(registrar), true); // for delegating description and url

// 5. Revoke roles. Keep only the registry's REGISTRAR until phase 2 (cannot touch tokens, confirmed by tests)
res.authorizeNameRoles(ANY, RES_ROLES, me, false);                                  // resolver: all
reg.revokeRootRoles(ROLE_SET_PARENT | ROLE_SET_PARENT_ADMIN, me);                  // registry: keep only REGISTRAR
ETH_REGISTRY.revokeRoles(klampTokenId, ROLE_SET_SUBREGISTRY | ROLE_SET_SUBREGISTRY_ADMIN
    | ROLE_SET_RESOLVER | ROLE_SET_RESOLVER_ADMIN | ROLE_CAN_TRANSFER_ADMIN, me);   // klamp.eth owner roles: all

// 6. (Phase 2) Secure hooks.klamp.eth, then revoke the final roles
reg.register("hooks", me, hooksRegistry, hooksResolver, 0, type(uint64).max);
reg.revokeRootRoles(ROLE_REGISTRAR | ROLE_REGISTRAR_ADMIN, me);
After setup the only remaining write permission belongs to the registrar, and that contract is not upgradeable. The remaining risk is klamp.eth expiring. We register for the maximum possible duration, and anyone can pay to call ETHRegistrar.renew. Even if someone grabs the name after expiry, the SDK treats a non-answer from the pinned tokens resolver as lookup failed, so it never uses a fake value.

Sepolia addresses:

Contract

Address

ENSv2 ETHRegistrar

0xa4449a0dd2b83007553d9b1d28b583a46a805a30

ENSv2 ETHRegistry

0x67b728a792e789a8978b30cf1b3b641f19354b43

VerifiableFactory

0x118bc31a50d559f7015a8da26d54b3b030cdb70f

UserRegistry implementation

0x840fa461059862ea466a711e8c98c8de732061c0

PermissionedResolver implementation

0x7e4b2d59938930168024201752ee5503df402303

UniversalResolverV2

0x85edf8b6b7d4211e2b07aa687506b746357b92cf

MockUSDC (registration fee payment)

0xd3322b29a7bdee707d1684676f149bf41aa3422f

Uniswap v4 PoolManager

0xE03A1074c86CFeDd5C142C4F04F1a1536e203543

Uniswap v4 StateView

0xe1dd9c3fa50edb962e442f60dfbc432e24537e4c

The lookup flows like this.

tokens resolver
UniversalResolv-
erV2
Terminal SDK
tokens resolver
UniversalResolv-
erV2
Terminal SDK
resolve(<token>.tokens.klamp.-
eth, text(pool))
Token label not registered
check
Delegate to parent resolver
(wildcard)
eip155:<chainId>:<poolId>
Check pool state, compare
with the route's PoolId
The terminal-side code is one standard viem function. Our ABI is not needed.

import {
  createPublicClient, http, keccak256, encodeAbiParameters, decodeAbiParameters, namehash, parseAbi,
  type Address, type Hex,
} from 'viem'
import { sepolia } from 'viem/chains'
import { normalize } from 'viem/ens'

const client = createPublicClient({ chain: sepolia, transport: http() })
const UNIVERSAL_RESOLVER_V2: Address = '0x85edf8b6b7d4211e2b07aa687506b746357b92cf'
const TOKENS_RESOLVER: Address = '0x0000000000000000000000000000000000000000' // pinned after setup: resolver of tokens.klamp.eth
const DYNAMIC_FEE_FLAG = 0x800000

const POOL_KEY = {
  type: 'tuple',
  components: [
    { name: 'currency0', type: 'address' },
    { name: 'currency1', type: 'address' },
    { name: 'fee', type: 'uint24' },
    { name: 'tickSpacing', type: 'int24' },
    { name: 'hooks', type: 'address' },
  ],
} as const
const dataAbi = parseAbi(['function data(bytes32 node, string key) view returns (bytes)'])

export type PoolKey = { currency0: Address; currency1: Address; fee: number; tickSpacing: number; hooks: Address }
export type Canonical =
  | { status: 'registered'; poolId: Hex; key: PoolKey }
  | { status: 'not_registered' }
  | { status: 'lookup_failed'; reason: string }

const eq = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()
export const poolIdOf = (key: PoolKey) => keccak256(encodeAbiParameters([POOL_KEY], [key]))

/** The token's canonical pool. Distinguishes not registered from lookup failed */
export async function getCanonicalPool(token: Address, root = 'klamp.eth'): Promise<Canonical> {
  const name = normalize(`${token.toLowerCase()}.tokens.${root}`)
  try {
    // 1. Resolution path: the pinned tokens resolver must answer (catches an expired or hijacked parent name)
    const resolver = await client.getEnsResolver({ name, universalResolverAddress: UNIVERSAL_RESOLVER_V2 })
    if (!eq(resolver, TOKENS_RESOLVER)) return { status: 'lookup_failed', reason: 'unexpected resolver' }

    // 2. Standard ENS lookup. strict: don't swallow resolution errors as not registered (null)
    const text = await client.getEnsText({
      name, key: 'pool', universalResolverAddress: UNIVERSAL_RESOLVER_V2, strict: true,
    })
    if (text === null) return { status: 'not_registered' }

    // 3. Format and chain
    const m = /^eip155:(\d+):(0x[0-9a-f]{64})$/.exec(text)
    if (!m || Number(m[1]) !== client.chain.id) return { status: 'lookup_failed', reason: 'bad pool record' }
    const poolId = m[2] as Hex

    // 4. Recompute the PoolId from the data record's PoolKey and check the token is in it
    const raw = await client.readContract({
      address: TOKENS_RESOLVER, abi: dataAbi, functionName: 'data', args: [namehash(name), 'pool'],
    })
    const [chainId, key] = decodeAbiParameters([{ type: 'uint256' }, POOL_KEY], raw)
    if (Number(chainId) !== client.chain.id || poolIdOf(key) !== poolId) {
      return { status: 'lookup_failed', reason: 'text/data mismatch' }
    }
    if (!eq(key.currency0, token) && !eq(key.currency1, token)) {
      return { status: 'lookup_failed', reason: 'token not in key' }
    }
    return { status: 'registered', poolId, key }
  } catch (e) {
    return { status: 'lookup_failed', reason: (e as Error).message }
  }
}

export type Verdict = 'allow' | 'requote_canonical' | 'requote_static' | 'hold'

/** Pool whose fee is fixed in the PoolKey: no hook + static fee. Quote and execution fees are equal */
const isStatic = (k: PoolKey) =>
  eq(k.hooks, '0x0000000000000000000000000000000000000000') && (k.fee & DYNAMIC_FEE_FLAG) === 0

/** Judges only the pools in the quote route that contain this token */
export function judge(token: Address, c: Canonical, route: PoolKey[]): Verdict {
  const hops = route.filter((k) => eq(k.currency0, token) || eq(k.currency1, token))
  const isCanonical = (k: PoolKey) => c.status === 'registered' && poolIdOf(k) === c.poolId
  if (hops.every((k) => isStatic(k) || isCanonical(k))) return 'allow'
  if (c.status === 'registered') return 'requote_canonical' // requote using only canonical and static pools
  if (c.status === 'not_registered') return 'requote_static' // requote using only static pools; if none, warn and confirm
  return 'hold' // lookup failed: requote using only static pools; cannot be bypassed by confirmation
}
getCanonicalPool verifies in four steps: whether the pinned resolver answers, whether the value is empty (not registered) or an error (strict), the format and chainId, and whether the PoolId computed from the data record's PoolKey matches. judge is the verdict policy table above translated directly into code. It passes type checking, and poolIdOf produces the same value as Solidity keccak256(abi.encode(key)).

Design decisions (after review)
Item

Decision

Meaning of canonical pool

A pool declared by the issuer and already initialized at registration time. Path A declares inside the launch transaction, so it is the pool created at launch. Path B is fixed to the launch pool (ETH, token, 2500, 25, no hook)

Proof of registration right

Path A: caller = the contract that actually executed CREATE2. If the launchpad uses a separate factory, that factory calls. The issuer contract must have no arbitrary-call feature. Path B: graffiti = the address that called LiquidityLauncher. If called directly, that address; if called through a disposable contract, the deployer recomputed via CREATE(deployer, nonce)

Token deployment check

Deployed tokens only (TokenNotDeployed). No pre-registering predicted addresses

Pool verification

Checks the pool is initialized in the specified PoolManager (PoolNotInitialized). PoolManager validates the PoolKey at initialize, so an initialized pool implies a valid PoolKey. POOLS_SLOT is a constant, tested against the real PoolManager

Record modification policy

Permanently fixed, no versioning. Being unchangeable when a key is stolen matters more. Instead of a recovery feature, we prevent mistakes: path B takes no PoolKey, and on path A the issuer code declares during launch

Protection scope

The router and terminal verdict policy section and the SDK's judge()

Verdict criteria

Three states: registered, not registered, lookup failed. Routes using only canonical and static pools are always allowed. The record changes the verdict for type D (canonical pool with a hook)

Attack conditions

Attack section. If tolerance ≥ execution fee, the user loses that much; otherwise execution fails (reproduced with v4-core)

Extension and role seal

Keep only the registry's REGISTRAR and revoke the rest. In phase 2, revoke REGISTRAR too after registering hooks.klamp.eth. Tests confirm the retained role cannot touch tokens

Immutability guarantee

No upgrade role from the start (tested). klamp.eth owner roles (subregistry/resolver replacement, transfer) revoked. The remaining risk, expiry, is handled by max-duration registration, renewal by anyone, and the SDK's pinned resolver

Metadata editor

The creator (a person). Path A: the address passed by the launchpad; none if 0. Path B: the declaring issuer. The issuer contract has no permission (tested)

Lookup value verification

Format eip155:<chainId>:<poolId>, chainId match, PoolId recomputed from the data record's PoolKey, token included. Strict lookup distinguishes not registered (null) from failure (exception)

Event fallback policy

1 trusted address confirmed, 3 under review. PoolId/PoolKey verification, ENS record wins, lookup failed if the lookup cannot complete (verdict policy section)

Live deployment compatibility

Pinned versions: ENSv2 contracts-v2 48b3e2d, v4-core 46c6834, both LiquidityLauncher v3.0.0 0x00004c4ccc709Ef590F7C81102C0689F0263D4e9 and v3.2.0 0x0000FffFBE8efE702c8703aE3477FF5dE3d319C0 allowed. Both versions and UERC20Factory exist on Sepolia with the same bytecode as Robinhood (confirmed in review)

Pools.trade's actual production chain (Robinhood Chain) has no ENSv2. Since the record includes chainId, writing a pool from another chain is possible in itself. The blocker is that the registrar's checks (issuer proof, token deployment, pool initialization) can only see same-chain state. So Pools.trade tokens on Robinhood are currently protected by the event fallback, and records for other chains are on the roadmap once there is a way to prove that chain's state (storage proofs, etc.). The demo shows both paths on Sepolia.

To check on Sepolia:


Whether klamp.eth can be registered, and ETHRegistrar registration (commit → register, including the minimum wait)


Screenshot of hasRoles being 0 after revoking the klamp.eth owner roles via ETH_REGISTRY.revokeRoles (evidence for judges)


Whether LiquidityLauncher v3.0.0/v3.2.0 and UERC20Factory exist on Sepolia → confirmed, bytecode also matches Robinhood


Run getCanonicalPool on Sepolia (getEnsResolver, getEnsText strict). The data(node, "pool") call is confirmed against the real PermissionedResolver locally


Check POOLS_SLOT on the Sepolia PoolManager (same value as StateView getSlot0)


Wildcard name display in the ENS app. If it doesn't show, the demo uses the viem lookup screen


Whether the ENS app UI truncates the 42-char 0x… label


Path B mistake recovery → prevented altogether by fixing the launch pool


Whether the three emitter addresses (0x7c48dde3…, 0xc9566675…, 0x60d73b21…) are official Pools.trade strategies

Appendix: Terms
Uniswap and deployment terms used in this document. ENS terms are in the ENSv2 section above.

Term

Meaning

Uniswap v4 pool

All pools live inside a single PoolManager contract. Anyone can create any pool (permissionless)

PoolKey

The 5 values that define a pool: currency0, currency1, fee, tickSpacing, hooks. If any differs, it is a different pool

PoolId

keccak256(abi.encode(PoolKey)). The pool's unique ID

Hook (hook)

An external contract attached to a pool. Runs code before and after swaps; on a dynamic fee pool it can change the fee every time

Replica pool

A pool created on the same token pair with a different fee or hook. Carries a malicious hook that charges a low fee at quote time and a high fee (e.g. 30%) at execution

Canonical pool

An already-initialized pool declared by the token's issuer. What we record in ENS

CREATE2

Address = last 20 bytes of keccak256(0xff, deployer contract, salt, initCode hash). Knowing the three values lets you recompute the address and prove who deployed it

UERC20Factory

Uniswap token factory. Deploys via CREATE2 with salt = keccak256(name, symbol, decimals, caller, graffiti)

graffiti

The value UERC20Factory puts into the salt. LiquidityLauncher, used by Pools.trade, puts in keccak256(abi.encode(address that called LiquidityLauncher)) → used for the issuer proof