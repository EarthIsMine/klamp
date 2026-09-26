// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;
// Compiles the ENSv2 Beta implementations (0.8.25-only) as their own compilation unit so that
// 0.8.26 scripts and tests can deploy them with vm.deployCode and talk to them through interfaces.
import {UserRegistry} from "ens-v2/registry/UserRegistry.sol";
import {PermissionedRegistry} from "ens-v2/registry/PermissionedRegistry.sol";
import {PermissionedResolver} from "ens-v2/resolver/PermissionedResolver.sol";
import {UniversalResolverV2} from "ens-v2/universalResolver/UniversalResolverV2.sol";
import {LabelStore} from "ens-v2/utils/LabelStore.sol";
import {ETHRegistrar} from "ens-v2/registrar/ETHRegistrar.sol";
import {MockERC20} from "~test/mocks/MockERC20.sol";
