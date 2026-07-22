# tabby-gcp-iap

📖 **[Documentation](https://search5.github.io/tabby-gcp-iap/)** (English / 한국어)

A [Tabby](https://tabby.sh) plugin that connects to Google Cloud Platform VM instances over [Identity-Aware Proxy (IAP) TCP tunneling](https://cloud.google.com/iap/docs/using-tcp-forwarding) — without depending on the `gcloud` CLI at runtime.

## How it works

The plugin implements the full IAP tunnel protocol natively:

1. **Auth** — Reads `~/.config/gcloud/application_default_credentials.json` and refreshes an OAuth2 access token directly via the Google token endpoint (no `gcloud` binary).
2. **Key management** — Generates `~/.ssh/google_compute_engine` if it does not exist, then registers the public key with the GCP project via the Compute Engine API using the same temporary-key format as `gcloud` (10-minute expiry, `google-ssh` JSON comment). OS Login is detected automatically.
3. **Tunnel** — Opens a WebSocket connection to `tunnel.cloudproxy.app` using the [`ws`](https://github.com/websockets/ws) package and speaks the IAP relay subprotocol (`relay.tunnel.cloudproxy.app`) including binary framing (DATA / ACK / SID frames).
4. **SSH** — Runs SSH over the tunnel stream using the [`ssh2`](https://github.com/mscdex/ssh2) package and opens an interactive shell.

No `gcloud` process is spawned, and no "Proxy command" message appears in the terminal.

## Prerequisites

The following one-time setup is required before using the plugin:

### 1. Application Default Credentials

```bash
gcloud auth application-default login
```

This creates `~/.config/gcloud/application_default_credentials.json`, which the plugin uses to obtain access tokens at runtime.

### 2. IAP permissions

Your Google account must have the **IAP-secured Tunnel User** role (`roles/iap.tunnelResourceAccessor`) on the target resource.

> **SSH key:** No manual key setup is required. The plugin generates `~/.ssh/google_compute_engine` automatically on first connect and registers the public key with your GCP project.

## Installation

### Option A — Tabby Plugin Manager (recommended)

Search for `gcp-iap` in **Tabby Settings → Plugins** and click Install. Restart Tabby when prompted.

### Option B — From source

**Requirements:** [Node.js](https://nodejs.org/) 18 or later

```bash
git clone https://github.com/search5/tabby-gcp-iap.git
cd tabby-gcp-iap
npm install
npm run build
npm run install-plugin
```

`npm run install-plugin` detects your OS and copies the built files to the correct Tabby plugin directory automatically:

| OS | Plugin directory |
|---|---|
| macOS | `~/Library/Application Support/tabby/plugins/node_modules/tabby-gcp-iap/` |
| Linux | `~/.config/tabby/plugins/node_modules/tabby-gcp-iap/` |
| Windows | `%APPDATA%\tabby\plugins\node_modules\tabby-gcp-iap\` |

Restart Tabby after installation. To confirm the plugin loaded, open **View → Toggle Developer Tools** and look for:
```
[tabby-gcp-iap] module loaded
```

### Updating

```bash
git pull
npm run build
npm run install-plugin
```

Then restart Tabby.

## Usage

1. Open Tabby → **New tab** → **GCP IAP SSH**
2. Fill in the profile settings:

| Field | Description | Example |
|---|---|---|
| Instance name | GCE instance name | `my-vm` |
| Project | GCP project ID | `my-project-123` |
| Zone | Instance zone | `us-central1-a` |
| Username | Linux user on the instance | `mzc01-search5` |
| SSH Port | SSH port (usually 22) | `22` |
| SSH private key | Path to the SSH key | `~/.ssh/google_compute_engine` |

> **Username tip:** GCP creates the Linux account using your local OS username (output of `whoami`), not your Google email address.

## Development

```bash
npm run watch   # rebuild on file change
npm run install-plugin && <restart Tabby>
```

Open Tabby's developer console (**View → Toggle Developer Tools**) to see plugin logs.

## Architecture

```
src/
├── api.ts                              # IAPProfile type (extends ConnectableTerminalProfile)
├── iapAuth.ts                          # OAuth2 token from Application Default Credentials
├── iapKeyManager.ts                    # SSH key generation + GCP registration (metadata / OS Login)
├── iapTunnel.ts                        # IAP WebSocket tunnel → Node.js Duplex stream
├── iapSession.ts                       # BaseSession implementation (ssh2)
├── iapProfileProvider.ts               # ProfileProvider registration
├── index.ts                            # NgModule entry point
└── components/
    ├── iapProfileSettings.component.ts # Profile settings UI
    └── iapTab.component.ts             # Terminal tab (ConnectableTerminalTabComponent)
```

**Bundled dependencies:** `ws`, `ssh2` (~380 KB total)  
**Runtime dependencies:** none beyond what Tabby provides

## License

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
