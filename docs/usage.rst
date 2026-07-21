Usage
=====

Creating a new GCP IAP connection
------------------------------------

1. Open Tabby and choose **New tab → GCP IAP SSH**.
2. Fill in the profile settings:

.. list-table::
   :header-rows: 1

   * - Field
     - Description
     - Example
   * - Instance name
     - GCE instance name
     - ``my-vm``
   * - Project
     - GCP project ID
     - ``my-project-123``
   * - Zone
     - Instance zone
     - ``us-central1-a``
   * - Username
     - Linux user on the instance
     - ``mzc01-search5``
   * - SSH Port
     - SSH port (usually 22)
     - ``22``
   * - SSH private key
     - Path to the SSH key
     - ``~/.ssh/google_compute_engine``

3. Save the profile and connect. On first connect, the plugin transparently
   generates and registers the SSH key described in :doc:`prerequisites` —
   no extra action is required from you.

.. note::

   **Username tip:** GCP derives the Linux account on the instance from
   your local OS username (the output of ``whoami`` on the machine running
   Tabby), not from your Google account email address. If your connection
   fails with an authentication error even though IAP itself let the tunnel
   through, double-check that the ``Username`` field matches the actual
   Linux account on the VM rather than assuming it matches your Google
   identity.

What happens behind the scenes
----------------------------------

Every connection goes through the same four stages:

1. **Auth** — the plugin reads your Application Default Credentials and
   exchanges/refreshes an OAuth2 access token directly with the Google
   token endpoint.
2. **Key management** — if ``~/.ssh/google_compute_engine`` does not
   already exist, it is generated, and the public key is registered with
   your GCP project through the Compute Engine metadata API (or OS Login,
   if enabled).
3. **Tunnel** — a WebSocket connection is opened to
   ``tunnel.cloudproxy.app``, speaking the IAP relay subprotocol
   (``relay.tunnel.cloudproxy.app``), including its binary DATA / ACK / SID
   framing.
4. **SSH** — an SSH session is driven over that tunnel stream, and an
   interactive shell is opened in the Tabby tab.

See :doc:`architecture` for how these stages map onto the plugin's source
files.

Development workflow
------------------------

If you are working on the plugin itself (see :doc:`installation`, Method
2), you can iterate with:

.. code-block:: bash

   npm run watch   # rebuild on file change
   npm run install-plugin && # then restart Tabby

Open Tabby's developer console (**View → Toggle Developer Tools**) to see
the plugin's log output while you work.
