# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] - 2026-06-25

### Added
- Automatic SSH key pair generation (`~/.ssh/google_compute_engine`) on first connect — no manual `gcloud compute ssh` run required.
- Automatic SSH public key registration with GCP on every connect using the same temporary-key format as `gcloud` (10-minute expiry, `google-ssh` JSON comment with `userName` and `expireOn`).
- OS Login detection: queries project and instance metadata to determine whether to use the Compute Engine metadata API or the OS Login API for key registration.
- Progress messages in the terminal during connection setup (access token, key check, key registration, tunnel, SSH).

### Changed
- Prerequisites reduced to one step: `gcloud auth application-default login`. The SSH key setup step is now fully automated.
- License copyright updated to Ji-Ho Lee.

### Fixed
- Author field in `package.json` corrected.

## [1.0.0] - 2026-06-24

### Added
- Initial release.
- Native IAP WebSocket tunnel (`tunnel.cloudproxy.app`) without spawning a `gcloud` process.
- OAuth2 token acquisition directly from Application Default Credentials (`~/.config/gcloud/application_default_credentials.json`).
- SSH over IAP tunnel via the `ssh2` package.
- Tabby profile UI for instance, project, zone, username, port, and SSH key path.
- Cross-platform install script (`npm run install-plugin`) for macOS, Linux, and Windows.
