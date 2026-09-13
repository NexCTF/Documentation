---
icon: lucide/user
hide:
  - toc
---

<!--
  The schema beside this page is a copy of what a NexCTF instance serves at
  /api/openapi.json. Refresh it on each release, and bump the version below:

      curl -o docs/api/openapi-user.json https://<your-instance>/api/openapi.json

  That endpoint is public, so any running instance will do.
-->

# User API

The endpoints available to a signed-in player, and to anyone holding an
API token without administrative scopes. See [How the API works](index.md) for
authentication, the response envelope, pagination and errors.

*Rendered from `/api/openapi.json` at NexCTF 0.10.0.*

!!! info "Reading the scope line"
    Each operation names the [token scope](../documentation/authentication.md#token-scopes)
    it requires. Where it says an API token is not accepted, the endpoint needs a
    browser session: either because it is part of the sign-in, registration or
    OAuth flow that issues a session in the first place, or because it changes how
    an account is secured. See
    [Endpoints a token cannot reach](../documentation/authentication.md#endpoints-a-token-cannot-reach).

<rapi-doc class="nex-rapidoc" spec-url="../openapi-user.json"
  render-style="view" show-header="false" show-info="false"
  allow-try="false" allow-authentication="false"
  allow-server-selection="false" allow-spec-url-load="false"
  allow-spec-file-load="false" schema-style="table"
  schema-description-expanded="true" default-schema-tab="schema"
  load-fonts="false"></rapi-doc>
