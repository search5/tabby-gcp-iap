tabby-gcp-iap documentation
============================

A `Tabby <https://tabby.sh>`_ plugin that connects to Google Cloud Platform VM
instances over `Identity-Aware Proxy (IAP) TCP forwarding
<https://cloud.google.com/iap/docs/using-tcp-forwarding>`_ — without depending
on the ``gcloud`` CLI at runtime.

The plugin implements the full IAP tunnel protocol natively: it talks
directly to the Google OAuth2 token endpoint and to the IAP WebSocket relay,
generates and registers its own temporary SSH key, and drives an interactive
SSH session over the tunnel — all without ever spawning a ``gcloud``
subprocess.

.. toctree::
   :maxdepth: 2
   :caption: Contents

   prerequisites
   installation
   usage
   architecture
   troubleshooting

Indices and tables
===================

* :ref:`genindex`
* :ref:`search`
