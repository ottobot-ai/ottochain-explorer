# Changelog

## [0.8.0](https://github.com/ottobot-ai/ottochain-explorer/compare/v0.7.1...v0.8.0) (2026-03-20)


### Features

* **ci:** auto-merge SDK bump PRs when CI passes ([#114](https://github.com/ottobot-ai/ottochain-explorer/issues/114)) ([0359897](https://github.com/ottobot-ai/ottochain-explorer/commit/035989789ae2b5bc3bfdd560cf289d4e333147b2))

## [0.7.1](https://github.com/ottobot-ai/ottochain-explorer/compare/v0.7.0...v0.7.1) (2026-03-18)


### Bug Fixes

* **ci:** remove --skip-generate (removed in Prisma v7) ([#109](https://github.com/ottobot-ai/ottochain-explorer/issues/109)) ([6356bc3](https://github.com/ottobot-ai/ottochain-explorer/commit/6356bc356203e70440eb253df5ec8c69ebe1d6dd))

## [0.7.0](https://github.com/ottobot-ai/ottochain-explorer/compare/v0.6.0...v0.7.0) (2026-03-13)


### Features

* add SDK version bump workflow ([#87](https://github.com/ottobot-ai/ottochain-explorer/issues/87)) ([80ea23f](https://github.com/ottobot-ai/ottochain-explorer/commit/80ea23f37371250265903339d89f34fdb87e2786))
* **rejections:** add signer filter, date range, and URL state persistence ([#85](https://github.com/ottobot-ai/ottochain-explorer/issues/85)) ([c5eb9d9](https://github.com/ottobot-ai/ottochain-explorer/commit/c5eb9d98c9e84b0190e0abb8980ed6fa57af5e06))
* RejectionsView component tests (no nav button) ([#82](https://github.com/ottobot-ai/ottochain-explorer/issues/82)) ([742fcad](https://github.com/ottobot-ai/ottochain-explorer/commit/742fcad938ceb4a1a2ab72da30027905f998cf64))
* **tests:** ContractsView component tests — 28 tests ([#83](https://github.com/ottobot-ai/ottochain-explorer/issues/83)) ([1a236f4](https://github.com/ottobot-ai/ottochain-explorer/commit/1a236f423e1407e018bd1262673237ed9574d2ff))
* **tests:** DAOsView component tests — 27 tests ([#84](https://github.com/ottobot-ai/ottochain-explorer/issues/84)) ([d141472](https://github.com/ottobot-ai/ottochain-explorer/commit/d141472dc873c376c67f687b44774016adaf9cc2))


### Bug Fixes

* **ci:** use OTTOBOT_PAT for SDK bump PRs ([#102](https://github.com/ottobot-ai/ottochain-explorer/issues/102)) ([3e59982](https://github.com/ottobot-ai/ottochain-explorer/commit/3e59982001583731aafa6eef6a7500351f4648ad))
* mobile-responsive layout with paginated lists ([#91](https://github.com/ottobot-ai/ottochain-explorer/issues/91)) ([18bd255](https://github.com/ottobot-ai/ottochain-explorer/commit/18bd2553488dd9aac23bd5eaad564535d2457668))
* update sdk-bump workflow to actions v6 ([#89](https://github.com/ottobot-ai/ottochain-explorer/issues/89)) ([92365dc](https://github.com/ottobot-ai/ottochain-explorer/commit/92365dcf73334fcd5885e219e1281f6abfbd3cde))
* use pnpm in sdk-bump workflow, gitignore package-lock.json ([#103](https://github.com/ottobot-ai/ottochain-explorer/issues/103)) ([91f1203](https://github.com/ottobot-ai/ottochain-explorer/commit/91f1203ab2d0f153c427e7999bb4c9579e690d2e))

## [0.6.0](https://github.com/ottobot-ai/ottochain-explorer/compare/v0.5.2...v0.6.0) (2026-03-03)


### Features

* **tests:** Add component tests for core pages + Codecov integration ([#81](https://github.com/ottobot-ai/ottochain-explorer/issues/81)) ([67e953e](https://github.com/ottobot-ai/ottochain-explorer/commit/67e953e78ff6b81f0b0b1c99c49060c5b1cbc5b0))


### Bug Fixes

* **ci:** trigger CI on develop-targeting PRs ([#72](https://github.com/ottobot-ai/ottochain-explorer/issues/72)) ([ca94d67](https://github.com/ottobot-ai/ottochain-explorer/commit/ca94d677b5ae4aa2d1e9b3c30cee992b4d1f8273))

## [0.5.2](https://github.com/ottobot-ai/ottochain-explorer/compare/v0.5.1...v0.5.2) (2026-02-28)


### Bug Fixes

* update pnpm lockfile for Docker build ([#70](https://github.com/ottobot-ai/ottochain-explorer/issues/70)) ([a95cca8](https://github.com/ottobot-ai/ottochain-explorer/commit/a95cca8c6c063f3f2252fd8b43ac368085df915a))

## [0.5.1](https://github.com/ottobot-ai/ottochain-explorer/compare/v0.5.0...v0.5.1) (2026-02-28)


### Bug Fixes

* use network-first fetch policy for Apollo queries ([#68](https://github.com/ottobot-ai/ottochain-explorer/issues/68)) ([064328e](https://github.com/ottobot-ai/ottochain-explorer/commit/064328e0490c347bf0f033f0d23e2cd57f92f652))

## [0.5.0](https://github.com/ottobot-ai/ottochain-explorer/compare/v0.4.1...v0.5.0) (2026-02-23)


### Features

* **ci:** use pre-built JARs from versions.yaml instead of building from source ([#45](https://github.com/ottobot-ai/ottochain-explorer/issues/45)) ([6306b8d](https://github.com/ottobot-ai/ottochain-explorer/commit/6306b8d6358a7c1c517eed035fc719f09759dd2b))

## [0.4.1](https://github.com/ottobot-ai/ottochain-explorer/compare/v0.4.0...v0.4.1) (2026-02-19)


### Bug Fixes

* regenerate pnpm-lock.yaml for v0.4.0 release ([3fca974](https://github.com/ottobot-ai/ottochain-explorer/commit/3fca9744160ddf04dc96767771c5780880ed6270))

## [0.4.0](https://github.com/ottobot-ai/ottochain-explorer/compare/v0.3.3...v0.4.0) (2026-02-19)


### Features

* Oracle view SDK integration ([#39](https://github.com/ottobot-ai/ottochain-explorer/issues/39)) ([177f3dc](https://github.com/ottobot-ai/ottochain-explorer/commit/177f3dc71f53e410c54b8d4e8785fa9ab28b2054))
* **tests:** add React component testing with Vitest ([#40](https://github.com/ottobot-ai/ottochain-explorer/issues/40)) ([4a03df5](https://github.com/ottobot-ai/ottochain-explorer/commit/4a03df5271fdd415e0b03bb20c69adf02e360456))

## [0.3.3](https://github.com/ottobot-ai/ottochain-explorer/compare/v0.3.2...v0.3.3) (2026-02-13)


### Bug Fixes

* **ci:** use proper gh api syntax for client_payload ([#36](https://github.com/ottobot-ai/ottochain-explorer/issues/36)) ([caae9c2](https://github.com/ottobot-ai/ottochain-explorer/commit/caae9c29af01220614075c7403058df50d625afc))

## [0.3.2](https://github.com/ottobot-ai/ottochain-explorer/compare/v0.3.1...v0.3.2) (2026-02-13)


### Bug Fixes

* **ci:** use GH_TOKEN env var for gh CLI ([#34](https://github.com/ottobot-ai/ottochain-explorer/issues/34)) ([7a5e837](https://github.com/ottobot-ai/ottochain-explorer/commit/7a5e837e6f4ddfa128fe7827471a84268f3084af))

## [0.3.1](https://github.com/ottobot-ai/ottochain-explorer/compare/v0.3.0...v0.3.1) (2026-02-12)


### Bug Fixes

* add nginx proxy for GraphQL API ([#32](https://github.com/ottobot-ai/ottochain-explorer/issues/32)) ([44926a8](https://github.com/ottobot-ai/ottochain-explorer/commit/44926a844affa7b4e35745fb1b76f218fe699d1e))

## [0.3.0](https://github.com/ottobot-ai/ottochain-explorer/compare/v0.2.0...v0.3.0) (2026-02-12)


### Features

* update branding with otter logo ([#30](https://github.com/ottobot-ai/ottochain-explorer/issues/30)) ([d1390f4](https://github.com/ottobot-ai/ottochain-explorer/commit/d1390f4b847a21ab7d4e58d24b0cfdef554282e8))


### Bug Fixes

* use RELEASE_TOKEN for release-please to trigger CI ([#29](https://github.com/ottobot-ai/ottochain-explorer/issues/29)) ([09ee8b5](https://github.com/ottobot-ai/ottochain-explorer/commit/09ee8b5c1175a4b50a645c223da324312cac216d))

## [0.2.0](https://github.com/ottobot-ai/ottochain-explorer/compare/v0.1.0...v0.2.0) (2026-02-10)


### Features

* **ci:** add release-please for automated releases ([#27](https://github.com/ottobot-ai/ottochain-explorer/issues/27)) ([103edea](https://github.com/ottobot-ai/ottochain-explorer/commit/103edea267c7475c1d96d672bfca3cc0778b9422))
* notify deploy repo on release ([#25](https://github.com/ottobot-ai/ottochain-explorer/issues/25)) ([19f0e50](https://github.com/ottobot-ai/ottochain-explorer/commit/19f0e50125bde4a07ec1c403c3c63c0e0b5b6c6e))


### Bug Fixes

* **ci:** move secrets check inside run script ([#26](https://github.com/ottobot-ai/ottochain-explorer/issues/26)) ([d2d73d2](https://github.com/ottobot-ai/ottochain-explorer/commit/d2d73d250c53f5bf476f82d17006c570a10a0c71))
