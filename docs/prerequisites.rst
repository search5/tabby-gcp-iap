Prerequisites
=============

Before installing or using **tabby-gcp-iap**, complete the following
one-time setup. Both steps are required — the plugin will fail to open a
tunnel if either one is missing.

1. Application Default Credentials
-----------------------------------

The plugin does not shell out to the ``gcloud`` binary at runtime. Instead,
it reads your local Application Default Credentials (ADC) directly and
refreshes an OAuth2 access token against the Google token endpoint itself.

Generate the ADC file once with the ``gcloud`` CLI:

.. code-block:: bash

   gcloud auth application-default login

This creates ``~/.config/gcloud/application_default_credentials.json``,
which **tabby-gcp-iap** reads at connection time to obtain access tokens.
If this file is missing or its refresh token has expired, the plugin cannot
authenticate — see :doc:`troubleshooting` for the symptoms and the fix.

2. IAP IAM permissions
------------------------

Your Google account (or service account) must be granted the
**IAP-secured Tunnel User** role, ``roles/iap.tunnelResourceAccessor``, on
the target project or instance. Without this role, IAP rejects the tunnel
request and the connection fails with an authorization error.

You can grant it at the project level with:

.. code-block:: bash

   gcloud projects add-iam-policy-binding PROJECT_ID \
       --member="user:you@example.com" \
       --role="roles/iap.tunnelResourceAccessor"

.. note::

   **No manual SSH key setup is needed.** Unlike a traditional SSH
   workflow, you do not need to generate or upload a key yourself. On the
   first connection, the plugin automatically generates
   ``~/.ssh/google_compute_engine`` (if it does not already exist) and
   registers the corresponding public key with your GCP project via the
   Compute Engine metadata API, using the same short-lived key format
   (10-minute expiry, ``google-ssh`` JSON comment) that ``gcloud compute
   ssh`` itself uses. OS Login is detected automatically, so this works
   whether or not your project has OS Login enabled.

Once both steps above are complete, continue to :doc:`installation`.
