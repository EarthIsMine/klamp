# 저장소 작업 규칙

- 1단계 컨트랙트의 명세·작업 기록·구현은 `contract/` 안에 두고, 프론트엔드는 `web/` 안에 둔다.
- `contract/` 작업 전에는 `contract/AGENTS.md`와 `contract/Klamp_Phase1_Agent_Spec.md`를 읽고 적용한다.
- `contract/` 명령은 해당 디렉터리에서 npm/Foundry로, `web/` 명령은 해당 디렉터리에서 pnpm으로 실행한다. 한쪽의 패키지 매니저나 잠금 파일을 다른 쪽으로 통합하지 않는다.
- 프론트의 온체인 데이터 계층은 `contract/sdk`의 상태를 그대로 소비한다. 대표 풀 조회는 `found | missing | invalid | unavailable | ambiguous`, 경로 비교는 `match | mismatch | blocked`를 유지한다.
- 2단계 수수료 상한은 현재 컨트랙트 구현 범위가 아니다. 프론트 데모에서는 mock임을 명시하고 실제 온체인 보장처럼 표현하지 않는다.
- Git 저장소 루트는 현재 디렉터리이며 기존 사용자 변경사항을 보존한다.
