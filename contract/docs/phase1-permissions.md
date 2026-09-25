# Namespace 권한

UserRegistry·PermissionedResolver는 고정된 VerifiableFactory 프록시로 배포한다. registry salt는 설정값, resolver salt는 설정값+1이다. 프록시 주소 계산에 구현 주소가 포함되지 않으므로 두 salt를 분리한다.

- 셋업 운영자: registry root의 REGISTRAR/SET_PARENT와 admin, resolver root의 TEXT_ADMIN/DATA_ADMIN만 임시 보유. 업그레이드 권한은 처음부터 부여하지 않는다.
- tokens: resolver 고정, token resource 역할 0, 만료 uint64 최대. 운영자의 registry root 권한과 klamp 연결의 token 권한도 봉인 단계에서 회수한다.
- hooks: 지정 관리자가 hooks resource의 resolver/subregistry 변경과 해당 admin만 보유한다. 전체 이름 관리 역할은 없다.
- registrar: 전체 이름의 pool text/data 쓰기와 root TEXT_ADMIN. 고정 resolver의 authorizeTextRoles는 키별 admin을 지원하지 않으므로 명세의 허용 경로를 사용한다. TEXT_ADMIN은 쓰기도 함의하지만 registrar의 외부 진입점은 검증된 최초 등록과 description/url 위임만 노출한다. registrar는 프록시가 아니다.

`SealPhase1`은 체인·부모 연결·tokens resolver·실제 UniversalResolver 왕복 조회·예상 권한 수를 확인하고 운영자 권한을 회수한다. 이미 봉인된 상태에서 재실행하면 회수 쓰기를 생략한다. 예상 밖 root/token 역할 보유자는 봉인을 차단한다. 신뢰할 프로토콜 구현과 깨끗한 신규 배포가 전제이며 임의의 외부 프록시를 이 코드로 인증하지 않는다.

이 봉인은 ENS 프로토콜의 상위 root 권한을 제거하지 않는다. klamp.eth의 만료·재등록이나 상위 연결 변경은 이름 조회를 바꿀 수 있다. 토큰 mapping의 단회성, resolver 쓰기 제한, 이름 경로의 존속은 별개의 보장이다. 갱신은 운영 절차로 관리하고 SDK가 namespace를 확인한다.
