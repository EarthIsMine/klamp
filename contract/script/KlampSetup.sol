// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {RegistryRolesLib} from "ensv2/registry/libraries/RegistryRolesLib.sol";
import {NameCoder} from "ens-contracts/utils/NameCoder.sol";

import {CanonicalPoolRegistrar, IPermissionedResolver, IPoolManager, IUERC20Factory} from "../src/CanonicalPoolRegistrar.sol";

// ENSv2 Sepolia Beta(공식 세트)에서 쓰는 함수만. 시그니처는 Etherscan에 verify된 소스와 같다.
struct Grant {
    address account;
    uint256 roleBitmap;
}
interface IVerifiableFactory {
    function deployProxy(address implementation, uint256 salt, bytes memory data) external returns (address);
}

interface IUserRegistry {
    function initialize(Grant[] calldata grants) external;
    function setParent(address parent, string memory label) external;
    function register(string memory label, address owner, address registry, address resolver, uint256 roleBitmap, uint64 expiry)
        external
        returns (uint256);
    function revokeRootRoles(uint256 roleBitmap, address account) external returns (bool);
    function roles(uint256 anyId, address account) external view returns (uint256);
    function getResolver(string calldata label) external view returns (address);
    function getSubregistry(string calldata label) external view returns (address);
}

interface IPermResolver {
    function initialize(Grant[] calldata grants, bytes[] calldata calls) external;
    function grantSetterRoles(bytes calldata setter, address account) external returns (bool);
    function revokeRootRoles(uint256 roleBitmap, address account) external returns (bool);
    function roles(uint256 resource, address account) external view returns (uint256);
    function resolve(bytes calldata name, bytes calldata data) external view returns (bytes memory);
    function setText(bytes calldata name, string calldata key, string calldata value) external;
    function setData(bytes calldata name, string calldata key, bytes calldata value) external;
}

/// @dev 읽기용 표준 프로필 (공식 resolver는 resolve(name, data)로만 읽는다, ENSIP-10)
interface IRecordReader {
    function text(bytes32 node, string calldata key) external view returns (string memory);
    function data(bytes32 node, string calldata key) external view returns (bytes memory);
}

interface IETHRegistrar {
    function makeCommitment(string memory label, address owner, bytes32 secret, address subregistry, address resolver, uint64 duration, bytes32 referrer)
        external
        pure
        returns (bytes32);
    function commit(bytes32 commitment) external;
    function register(string memory label, address owner, bytes32 secret, address subregistry, address resolver, uint64 duration, address paymentToken, bytes32 referrer)
        external
        returns (uint256);
    function getRegisterPrice(string calldata label, uint64 duration, address paymentToken) external view returns (uint256 base, uint256 premium);
    function isAvailable(string memory label) external view returns (bool);
}

interface IETHRegistry {
    function revokeRoles(uint256 anyId, uint256 roleBitmap, address account) external returns (bool);
    function roles(uint256 anyId, address account) external view returns (uint256);
    function getSubregistry(string calldata label) external view returns (address);
    function getResolver(string calldata label) external view returns (address);
}

interface IMockUSDC {
    function mint(address to, uint256 amount) external;
    function approve(address spender, uint256 amount) external returns (bool);
}

/// @notice 1단계 설계 문서의 셋업 스크립트를 두 단계로 나눈 것. commit 후 60초(MIN_COMMITMENT_AGE)가 지나야 register할 수 있다.
abstract contract KlampSetup {
    // ENSv2 Sepolia Beta (ENS 공식 문서 docs.ens.domains/learn/deployments#sepolia-ensv2-beta, ENS 앱·익스플로러가 읽는 세트)
    IETHRegistrar constant ETH_REGISTRAR = IETHRegistrar(0xAbe76F6C8DFcEd81AA5A2bB8034202A7136b94ca);
    IETHRegistry constant ETH_REGISTRY = IETHRegistry(0x657eA849311d3D5823348ddEd7C2AaAFb3EDE09E);
    IVerifiableFactory constant VERIFIABLE_FACTORY = IVerifiableFactory(0x9e726Eb570beb6BCEb495AB8cdA7df517d4e841C);
    address constant USER_REGISTRY_IMPL = 0xA80338aAA8D23831cEa25E858D1774534aBb0263;
    address constant PERMISSIONED_RESOLVER_IMPL = 0x14F09Fd05d4585759e54844DC9B00147131Cf243;
    IMockUSDC constant MOCK_USDC = IMockUSDC(0x16f95D91DBa7dA3Aca778Ec053dF0FF6C6A8aA8e);
    // Uniswap (Sepolia)
    IPoolManager constant POOL_MANAGER = IPoolManager(0xE03A1074c86CFeDd5C142C4F04F1a1536e203543);
    IUERC20Factory constant UERC20_FACTORY = IUERC20Factory(0x000000e200088D55C39a11F609E5F667729ad49b);
    address constant LAUNCHER_V3_0_0 = 0x00004c4ccc709Ef590F7C81102C0689F0263D4e9;
    address constant LAUNCHER_V3_2_0 = 0x0000FffFBE8efE702c8703aE3477FF5dE3d319C0;

    string constant LABEL = "klamp";

    /// @dev 실배포는 "klamp". 포크 테스트는 이미 등록된 이름과 겹치지 않게 덮어쓴다
    function _label() internal view virtual returns (string memory) {
        return LABEL;
    }
    uint64 constant DURATION = 1000 * 365 days; // 약 4,500 MockUSDC

    uint256 constant REG_ROLES = RegistryRolesLib.ROLE_REGISTRAR | RegistryRolesLib.ROLE_REGISTRAR_ADMIN
        | RegistryRolesLib.ROLE_SET_PARENT | RegistryRolesLib.ROLE_SET_PARENT_ADMIN;
    // 공식 세트의 PermissionedResolverLib 값 (이전 버전과 ROLE_SET_DATA 비트가 다르다: 1<<36 → 1<<24)
    uint256 constant ROLE_SET_TEXT = 1 << 4;
    uint256 constant ROLE_SET_DATA = 1 << 24;
    uint256 constant RES_ROLES = (ROLE_SET_TEXT << 128) | (ROLE_SET_DATA << 128);
    uint256 constant KLAMP_OWNER_ROLES = RegistryRolesLib.ROLE_SET_SUBREGISTRY | RegistryRolesLib.ROLE_SET_SUBREGISTRY_ADMIN
        | RegistryRolesLib.ROLE_SET_RESOLVER | RegistryRolesLib.ROLE_SET_RESOLVER_ADMIN | RegistryRolesLib.ROLE_CAN_TRANSFER_ADMIN;

    struct Deployed {
        IUserRegistry reg;
        IPermResolver res;
        CanonicalPoolRegistrar registrar;
        uint256 klampTokenId;
    }

    /// 1. 레지스트리·resolver를 ENS 표준 구현 프록시로 배포하고, 등록비를 준비하고, commit 한다.
    function _phase1(address me, bytes32 secret, uint256 salt) internal returns (IUserRegistry reg, IPermResolver res) {
        Grant[] memory g = new Grant[](1);
        g[0] = Grant(me, REG_ROLES);
        reg = IUserRegistry(
            VERIFIABLE_FACTORY.deployProxy(USER_REGISTRY_IMPL, salt, abi.encodeCall(IUserRegistry.initialize, (g)))
        );
        g[0] = Grant(me, RES_ROLES); // ROLE_UPGRADE는 누구에게도 주지 않는다
        res = IPermResolver(
            VERIFIABLE_FACTORY.deployProxy(
                PERMISSIONED_RESOLVER_IMPL, salt + 1, abi.encodeCall(IPermResolver.initialize, (g, new bytes[](0)))
            )
        );
        (uint256 base, uint256 premium) = ETH_REGISTRAR.getRegisterPrice(_label(), DURATION, address(MOCK_USDC));
        MOCK_USDC.mint(me, base + premium);
        MOCK_USDC.approve(address(ETH_REGISTRAR), base + premium);
        ETH_REGISTRAR.commit(
            ETH_REGISTRAR.makeCommitment(_label(), me, secret, address(reg), address(0), DURATION, bytes32(0))
        );
    }

    /// 2~5. klamp.eth 등록, tokens 라벨, 등록 컨트랙트 배포·권한 부여, 우리 권한 회수.
    function _phase2(address me, bytes32 secret, IUserRegistry reg, IPermResolver res) internal returns (Deployed memory d) {
        d.reg = reg;
        d.res = res;
        d.klampTokenId =
            ETH_REGISTRAR.register(_label(), me, secret, address(reg), address(0), DURATION, address(MOCK_USDC), bytes32(0));
        reg.setParent(address(ETH_REGISTRY), _label());

        reg.register("tokens", me, address(0), address(res), 0, type(uint64).max);

        address[] memory launchers = new address[](2);
        launchers[0] = LAUNCHER_V3_0_0;
        launchers[1] = LAUNCHER_V3_2_0;
        d.registrar = new CanonicalPoolRegistrar(
            IPermissionedResolver(address(res)), NameCoder.encode("tokens.klamp.eth"), POOL_MANAGER, UERC20_FACTORY, launchers
        );
        // 키 단위 권한: pool(text·data), description·url(text)은 등록 컨트랙트만 쓴다. 이름 인자는 권한 계산에 쓰이지 않는다
        bytes memory any = NameCoder.encode("");
        address r = address(d.registrar);
        res.grantSetterRoles(abi.encodeCall(IPermResolver.setText, (any, "pool", "")), r);
        res.grantSetterRoles(abi.encodeCall(IPermResolver.setData, (any, "pool", "")), r);
        res.grantSetterRoles(abi.encodeCall(IPermResolver.setText, (any, "description", "")), r);
        res.grantSetterRoles(abi.encodeCall(IPermResolver.setText, (any, "url", "")), r);

        res.revokeRootRoles(RES_ROLES, me);
        reg.revokeRootRoles(RegistryRolesLib.ROLE_SET_PARENT | RegistryRolesLib.ROLE_SET_PARENT_ADMIN, me);
        ETH_REGISTRY.revokeRoles(d.klampTokenId, KLAMP_OWNER_ROLES, me);
    }
}
