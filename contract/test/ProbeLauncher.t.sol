// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {RegistrarFixture} from "./fixtures/RegistrarFixture.sol";
import {ProbeLauncher,ProbeToken} from "../script/ProbeLauncher.sol";
contract ProbeLauncherTest is RegistrarFixture {
    function testRealTokenProbeAndResume() public {
        vm.chainId(31337);
        ProbeLauncher p=new ProbeLauncher(address(this),registrar);
        address token=p.launch(0);
        assertEq(ProbeToken(token).balanceOf(address(this)),1_000_000e18);
        assertTrue(registrar.canonicalPoolOf(token)!=0);
        vm.recordLogs();assertEq(p.launch(0),token);assertEq(vm.getRecordedLogs().length,0);
        vm.prank(creator);vm.expectRevert("operator only");p.launch(0);
    }
}
