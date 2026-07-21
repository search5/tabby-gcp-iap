Troubleshooting & FAQ
======================

Application Default Credentials expired or missing
-------------------------------------------------------

**Symptom:** the connection fails immediately with an authentication or
token-refresh error, and no tunnel is ever opened.

**Cause:** the plugin reads
``~/.config/gcloud/application_default_credentials.json`` and refreshes an
OAuth2 access token from it on every connection. If this file is missing,
malformed, or its refresh token has been revoked or expired, token refresh
fails before the plugin ever reaches the IAP tunnel.

**Fix:** re-run the login step from :doc:`prerequisites`:

.. code-block:: bash

   gcloud auth application-default login

Then retry the connection.

403 / permission denied when opening the tunnel
----------------------------------------------------

**Symptom:** authentication succeeds (a token is obtained), but opening the
tunnel itself fails with a 403 or "permission denied" style error.

**Cause:** your account is missing the IAP IAM role required to open a
tunnel to the target instance.

**Fix:** grant yourself (or the relevant service account) the
**IAP-secured Tunnel User** role, ``roles/iap.tunnelResourceAccessor``, on
the project or instance, as described in :doc:`prerequisites`. Confirm with
your GCP project administrator if you don't have IAM permissions yourself.

Confirming the plugin actually loaded
-----------------------------------------

**Symptom:** the "GCP IAP SSH" tab type doesn't appear, or connections
behave unexpectedly, and you're not sure whether the plugin is even loaded.

**Fix:** open **View → Toggle Developer Tools** in Tabby and check the
console for:

.. code-block:: text

   [tabby-gcp-iap] module loaded

If this line is missing, the plugin failed to load — check that it was
installed into the correct plugin directory for your OS (see
:doc:`installation`) and that Tabby was fully restarted afterwards.

SSH connects but the username is rejected
-----------------------------------------------

**Symptom:** the IAP tunnel opens successfully, but the SSH handshake
fails, or you land on an unexpected account.

**Cause:** GCP derives the Linux account on the instance from the local
**OS username** of the machine running Tabby (the output of ``whoami``),
not from your Google account's email address. If you filled in the
``Username`` field in the profile using your Google email or a guessed
name, it likely won't match.

**Fix:** set the ``Username`` field (see :doc:`usage`) to the actual Linux
account on the target instance — typically the same value ``whoami``
prints locally, unless your organization uses a custom OS Login mapping.

The plugin doesn't update after ``git pull``
--------------------------------------------------

**Symptom:** you pulled the latest source changes, but Tabby still behaves
like the old version.

**Cause:** installing from source requires an explicit rebuild and
redeploy step — pulling new source alone does not update the files Tabby
actually loads.

**Fix:** run the full update sequence from :doc:`installation`:

.. code-block:: bash

   git pull
   npm run build
   npm run install-plugin

Then fully restart Tabby (not just reload the window).
