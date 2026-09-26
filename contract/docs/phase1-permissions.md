# Namespace 권한

UserRegistry·PermissionedResolver는 고정된 VerifiableFactory 프록시로 배포한다. registry salt는 설정값, resolver salt는 설정값+1이다. 프록시 주소 계산에 구현 주소가 포함되지 않으므로 두 salt를 분리한다.

- 셋업 운영자: registry root의 REGISTRAR/SET_PARENT와 admin, resolver root의 TEXT_ADMIN/DATA_ADMIN만 임시 보유(Sepolia 팀 배포와 같은 값). 업그레이드 권한은 처음부터 부여하지 않는다.
- tokens: resolver 고정, token resource 역할 0, 만료 uint64 최대. 봉인 단계에서 운영자의 resolver 역할 전부, registry root의 SET_PARENT와 admin, klamp.eth 부모 쪽 역할 전부를 회수한다.
- 봉인 후 남는 것: 운영자의 registry root REGISTRAR와 admin 하나. hooks.klamp.eth를 2단계에서 등록하기 위한 것이며 tokens 재등록·resolver/subregistry 교체·삭제·klamp.eth 연결 변경은 할 수 없다(`testKeptRegistrarCannotTouchTokens`). `Phase1Setup.finalizeHooks`가 hooks를 역할 0으로 등록한 뒤 이 마지막 권한을 회수한다(`testFinalizeHooksRevokesLastRole`).
- registrar: Beta resolver의 **키 단위** setter 권한 4개(모든 이름의 `pool` text·data, `description`·`url` text)를 `grantSetterRoles`로 받는다. Beta에는 이름 단위 위임이 없으므로 크리에이터는 resolver를 직접 쓰지 않고 registrar의 `setTokenText(token, key, value)`를 호출하고, registrar가 `creatorOf[token]`와 키(description·url만)를 확인한다. 봉인 후 resolver 루트 역할 보유자는 0명이며, registrar는 프록시가 아니다.

`SealPhase1`은 체인·부모 연결·tokens resolver·실제 UniversalResolver 왕복 조회·예상 권한 수를 확인하고 운영자 권한을 회수한다. 이미 봉인된 상태에서 재실행하면 회수 쓰기를 생략한다. 예상 밖 root/token 역할 보유자는 봉인을 차단한다. 신뢰할 프로토콜 구현과 깨끗한 신규 배포가 전제이며 임의의 외부 프록시를 이 코드로 인증하지 않는다.

이 봉인은 ENS 프로토콜의 상위 root 권한을 제거하지 않는다. klamp.eth의 만료·재등록이나 상위 연결 변경은 이름 조회를 바꿀 수 있다. 토큰 mapping의 단회성, resolver 쓰기 제한, 이름 경로의 존속은 별개의 보장이다. 갱신은 운영 절차로 관리하고 SDK가 namespace를 확인한다.
