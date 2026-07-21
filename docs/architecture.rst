Architecture
============

Source layout
--------------

All of the plugin's logic lives under ``src/``:

.. list-table::
   :header-rows: 1
   :widths: 30 70

   * - File
     - Responsibility
   * - ``api.ts``
     - Defines the ``IAPProfile`` type, extending Tabby's
       ``ConnectableTerminalProfile``.
   * - ``iapAuth.ts``
     - Obtains an OAuth2 access token from Application Default Credentials
       by talking to the Google token endpoint directly.
   * - ``iapKeyManager.ts``
     - Generates the ``google_compute_engine`` SSH key pair and registers
       the public key with GCP, via either instance/project metadata or OS
       Login.
   * - ``iapTunnel.ts``
     - Opens the IAP WebSocket tunnel and exposes it as a Node.js
       ``Duplex`` stream.
   * - ``iapSession.ts``
     - Implements Tabby's ``BaseSession`` on top of ``ssh2``, driving the
       SSH protocol over the tunnel stream.
   * - ``iapProfileProvider.ts``
     - Registers the plugin's ``ProfileProvider`` with Tabby so the
       "GCP IAP SSH" profile type appears in the UI.
   * - ``index.ts``
     - The plugin's Angular ``NgModule`` entry point.
   * - ``components/iapProfileSettings.component.ts``
     - The profile settings form (instance, project, zone, username, port,
       key path).
   * - ``components/iapTab.component.ts``
     - The terminal tab component, extending Tabby's
       ``ConnectableTerminalTabComponent``.

Request flow
-------------

The four stages described in :doc:`usage` map directly onto these files:

.. code-block:: text

   iapProfileProvider.ts   -->  registers the profile type
        |
        v
   iapAuth.ts               -->  ADC file --> OAuth2 access token
        |
        v
   iapKeyManager.ts          -->  ensure SSH key exists + registered with GCP
        |
        v
   iapTunnel.ts               -->  WebSocket to tunnel.cloudproxy.app
        |                           (relay.tunnel.cloudproxy.app subprotocol)
        v
   iapSession.ts                -->  ssh2 session over the tunnel Duplex stream
        |
        v
   components/iapTab.component.ts  -->  interactive shell rendered in the tab

No step in this chain invokes the ``gcloud`` binary; everything from token
refresh to the tunnel's binary framing (DATA / ACK / SID) is implemented
natively in TypeScript.

Bundled dependencies
----------------------

The plugin bundles exactly two runtime libraries into its webpack build:

* ``ws`` — WebSocket client used for the IAP tunnel connection.
* ``ssh2`` — SSH client used to drive the session once the tunnel is open.

Together they add roughly **380 KB** to the bundle. Beyond these two
libraries, the plugin has **no runtime dependencies** other than what
Tabby itself provides (Angular, Tabby's core APIs, etc.).
