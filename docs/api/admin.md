---
icon: lucide/shield-user
hide:
  - toc
---

<!--
  The schema beside this page is a copy of what a NexCTF instance serves at
  /api/admin/openapi.json. Refresh it on each release, and bump the version below:

      curl -o docs/api/openapi-admin.json https://<your-instance>/api/admin/openapi.json

  That endpoint requires an admin session, so send the cookie or a
  token with the admin.config scope.
-->

# Admin API

The endpoints behind `/api/v1/admin`, every one of them requiring an
account with the `admin` role. See [How the API works](index.md) for
authentication, the response envelope, pagination and errors.

*Rendered from `/api/admin/openapi.json` at NexCTF 0.10.0.*

!!! warning "An admin scope is an admin credential"
    Scopes narrow what a token can reach, not who it acts as. A token carrying
    `write:admin.user` can create administrators. Grant each token the narrowest
    set that does its job; see
    [Token scopes](../documentation/authentication.md#token-scopes).

<rapi-doc class="nex-rapidoc" spec-url="../openapi-admin.json"
  render-style="view" show-header="false" show-info="false"
  allow-try="false" allow-authentication="false"
  allow-server-selection="false" allow-spec-url-load="false"
  allow-spec-file-load="false" schema-style="table"
  schema-description-expanded="true" default-schema-tab="schema"
  load-fonts="false"></rapi-doc>
