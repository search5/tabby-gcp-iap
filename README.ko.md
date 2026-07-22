# tabby-gcp-iap

🌐 [English](README.md) | **한국어**

📖 **[문서](https://search5.github.io/tabby-gcp-iap/ko/)** (English / 한국어)

[Tabby](https://tabby.sh) 플러그인으로, [IAP(Identity-Aware Proxy) TCP 터널링](https://cloud.google.com/iap/docs/using-tcp-forwarding)을 통해 Google Cloud Platform VM 인스턴스에 연결합니다 — 런타임에 `gcloud` CLI에 의존하지 않습니다.

## 동작 방식

이 플러그인은 IAP 터널 프로토콜 전체를 네이티브로 구현합니다:

1. **인증** — `~/.config/gcloud/application_default_credentials.json`을 읽고, Google 토큰 엔드포인트를 직접 호출해 OAuth2 액세스 토큰을 갱신합니다 (`gcloud` 바이너리 불필요).
2. **키 관리** — `~/.ssh/google_compute_engine`이 없으면 생성한 뒤, `gcloud`와 동일한 임시 키 형식(10분 만료, `google-ssh` JSON 코멘트)으로 Compute Engine API를 통해 공개키를 GCP 프로젝트에 등록합니다. OS Login 사용 여부는 자동으로 감지합니다.
3. **터널** — [`ws`](https://github.com/websockets/ws) 패키지로 `tunnel.cloudproxy.app`에 WebSocket 연결을 열고, IAP 릴레이 서브프로토콜(`relay.tunnel.cloudproxy.app`)을 구사합니다 (DATA / ACK / SID 프레임 등 바이너리 프레이밍 포함).
4. **SSH** — [`ssh2`](https://github.com/mscdex/ssh2) 패키지로 터널 스트림 위에서 SSH를 실행해 인터랙티브 셸을 엽니다.

`gcloud` 프로세스가 실행되지 않으며, 터미널에 "Proxy command" 메시지도 뜨지 않습니다.

**탭 복구** — Tabby가 재시작되면, 열려있던 IAP 탭이 자동으로 다시 열리고 같은 인스턴스에 재연결되며 터미널 스크롤백도 복원됩니다.

## 사전 요구 사항

플러그인을 사용하기 전에 다음 일회성 설정이 필요합니다:

### 1. Application Default Credentials

```bash
gcloud auth application-default login
```

이 명령은 `~/.config/gcloud/application_default_credentials.json`을 생성하며, 플러그인은 런타임에 이 파일로 액세스 토큰을 얻습니다.

### 2. IAP 권한

대상 리소스에 대해 Google 계정에 **IAP-secured Tunnel User** 역할(`roles/iap.tunnelResourceAccessor`)이 있어야 합니다.

> **SSH 키:** 수동 키 설정이 필요 없습니다. 플러그인이 첫 연결 시 `~/.ssh/google_compute_engine`을 자동 생성하고, 공개키를 GCP 프로젝트에 등록합니다.

## 설치

### 방법 A — Tabby 플러그인 매니저 (권장)

**Tabby Settings → Plugins**에서 `gcp-iap`를 검색해 Install을 클릭하세요. 안내가 뜨면 Tabby를 재시작합니다.

### 방법 B — 소스에서 직접 설치

**요구 사항:** [Node.js](https://nodejs.org/) 18 이상

```bash
git clone https://github.com/search5/tabby-gcp-iap.git
cd tabby-gcp-iap
npm install
npm run build
npm run install-plugin
```

`npm run install-plugin`은 운영체제를 자동으로 감지해서 빌드된 파일을 올바른 Tabby 플러그인 디렉터리로 복사합니다:

| OS | 플러그인 디렉터리 |
|---|---|
| macOS | `~/Library/Application Support/tabby/plugins/node_modules/tabby-gcp-iap/` |
| Linux | `~/.config/tabby/plugins/node_modules/tabby-gcp-iap/` |
| Windows | `%APPDATA%\tabby\plugins\node_modules\tabby-gcp-iap\` |

설치 후 Tabby를 재시작하세요. 플러그인이 로드됐는지 확인하려면 **View → Toggle Developer Tools**를 열고 다음 줄이 있는지 확인합니다:
```
[tabby-gcp-iap] module loaded
```

### 업데이트

```bash
git pull
npm run build
npm run install-plugin
```

그런 다음 Tabby를 재시작하세요.

## 사용법

1. Tabby 열기 → **New tab** → **GCP IAP SSH**
2. 프로필 설정 입력:

| 필드 | 설명 | 예시 |
|---|---|---|
| Instance name | GCE 인스턴스 이름 | `my-vm` |
| Project | GCP 프로젝트 ID | `my-project-123` |
| Zone | 인스턴스 존 | `us-central1-a` |
| Username | 인스턴스의 Linux 사용자 | `mzc01-search5` |
| SSH Port | SSH 포트 (보통 22) | `22` |
| SSH private key | SSH 키 경로 | `~/.ssh/google_compute_engine` |

> **Username 팁:** GCP는 Google 이메일 주소가 아니라 로컬 OS 사용자 이름(`whoami` 출력값)으로 Linux 계정을 생성합니다.

## 개발

```bash
npm run watch   # 파일 변경 시 자동 재빌드
npm run install-plugin && <Tabby 재시작>
```

플러그인 로그를 보려면 Tabby 개발자 콘솔(**View → Toggle Developer Tools**)을 여세요.

## 아키텍처

```
src/
├── api.ts                              # IAPProfile 타입 (ConnectableTerminalProfile 확장)
├── iapAuth.ts                          # Application Default Credentials로 OAuth2 토큰 발급
├── iapKeyManager.ts                    # SSH 키 생성 + GCP 등록 (메타데이터 / OS Login)
├── iapTunnel.ts                        # IAP WebSocket 터널 → Node.js Duplex 스트림
├── iapSession.ts                       # BaseSession 구현 (ssh2)
├── iapProfileProvider.ts               # ProfileProvider 등록
├── index.ts                            # NgModule 진입점
└── components/
    ├── iapProfileSettings.component.ts # 프로필 설정 UI
    └── iapTab.component.ts             # 터미널 탭 (ConnectableTerminalTabComponent)
```

**번들된 의존성:** `ws`, `ssh2` (총 ~380 KB)
**런타임 의존성:** Tabby가 제공하는 것 외에는 없음

## 라이선스

MIT

Copyright (c) 2026 Ji-Ho Lee

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
