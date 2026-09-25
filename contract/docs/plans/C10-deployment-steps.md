# C10 배포 작업 분할

- 날짜 / 작성 도구: 2026-09-26 / Codex
- 이유: 네트워크 배포의 등록·재개·검증 책임을 한 커밋에 묶지 않기 위해 C10을 작은 단위로 나눈다.
- C10a: 실제 ETHRegistrar ABI에 따른 commit/wait/register/setParent와 상태 재개, 가격·잔액·이름 충돌 테스트.
- C10b: 중단 후 재실행 가능한 namespace 배포와 봉인 전 레코드 검증 강화.
- C10c: 검증 전 Sepolia 후보 설정, 코드·역할·자금 preflight, 공개 manifest 수집, 읽기 전용 smoke와 로컬 재현.
- 검증: 각 단위의 Foundry/TypeScript 테스트, 최종 새 Anvil 전체 배포·viem E2E.
- 사람 결정: 작은 책임으로 커밋을 쪼개라는 사용자 요청을 적용한 AI 구현 분할이다. 별도 사람 검토 완료는 확인되지 않았다.
- 제약: 공개 네트워크 broadcast를 수행하지 않는다. 환경·서명·프로토콜 코드 검증이 준비되면 문서 명령으로 실행한다.
