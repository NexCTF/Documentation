---
icon: lucide/braces
---

# API

Everything the web interface does, it does through the same REST API, so anything
it can do you can script. This page covers the conventions every endpoint shares;
the [User](user.md) and [Admin](admin.md) pages browse the endpoints themselves.

## Base URL and schemas

Every endpoint lives under `/api/v1` on your own instance. There is no hosted
API: the base URL is your `BACKEND_HOST`, so `https://ctf.example.com/api/v1`.

The reference pages here render a copy of the schema, taken at the release named
on each of them. Every instance also serves its own schema and an interactive
Swagger UI, and that copy is the authority for the version you are actually
running: reach for it whenever yours is not the release shown here, or when you
want to fire real requests at it.

| | Schema | Interactive |
| --- | --- | --- |
| User API | `/api/openapi.json` | `/api/docs` |
| Admin API | `/api/admin/openapi.json` | `/api/admin/docs` |

!!! info "The admin schema is itself admin-only"
    `/api/openapi.json` is public, but both admin URLs require a signed-in admin.
    Fetching the admin schema anonymously returns 401, which surprises people
    comparing the two.

## Authenticating

Two credentials are accepted, and most endpoints take either.

=== "API token"

    A bearer token, for scripts and integrations. Create one from your profile
    settings, choosing the scopes it carries.

    ```console
    $ curl -H "Authorization: Bearer nexctf_..." \
        https://ctf.example.com/api/v1/info/me
    ```

=== "Session cookie"

    The `NexCTF` cookie a browser gets from `POST /api/v1/auth/token`. This is
    what the web interface uses, and the only thing that works for the handful
    of endpoints that refuse tokens outright.

See [Authentication](../documentation/authentication.md) for how tokens are
issued, stored and revoked.

### Scopes

Every token carries a set of `verb:group` scopes, and each endpoint declares the
one it needs. The schema carries it as `x-token-scope` on each operation and the
reference pages show it with the operation, so you can read off exactly what a
script needs rather than granting broadly and hoping.

A request outside its scopes is refused with `403 SCOPE-403`, naming the scope
that was missing. The [full scope list](../documentation/authentication.md#token-scopes)
and the endpoints no token can reach are documented with authentication.

## The response envelope

Every response, success or failure, is an object with the same outer shape. The
payload is always under `data`.

```json
{
  "status": "SUCCESS",
  "message": "Success",
  "error_code": null,
  "data": { }
}
```

An error keeps the envelope and fills in the rest:

```json
{
  "status": "FAIL",
  "message": "Insufficient token scope",
  "description": "This API token is missing the write:admin.user scope.",
  "error_code": "SCOPE-403"
}
```

`error_code` is the field to branch on. It is stable across releases in a way
that `message` is not, and it is more specific than the HTTP status: several
distinct failures share a status code and are told apart only here.

| Code | Meaning |
| --- | --- |
| `AUTH-401` | Wrong username or password. |
| `AUTH-403-DISABLED` | The account was deactivated by an admin. |
| `SCOPE-403` | The token does not carry the scope this endpoint needs. |
| `SCOPE-403-SESSION` | This endpoint refuses tokens; it needs a browser session. |
| `SCOPE-422` | A requested token scope is not available to this account. |
| `VAL-422` | Request body failed validation. `data` lists the offending fields. |
| `HTTP-<status>` | An error with no code of its own. |
| `SERVER-500` | Unhandled server error. |

## Listing, paging and filtering

List endpoints share one set of query parameters, and answer with the same
envelope plus a `pagination` object.

| Parameter | Default | Notes |
| --- | --- | --- |
| `items_per_page` | `20` | Maximum `100`. |
| `pagination_type` | `offset` | `offset` or `cursor`. |
| `page` | `1` | Offset pagination only. |
| `cursor` | | Cursor pagination only: the `next_cursor` from the previous response. |
| `search` | | Free-text search. |
| `search_column` | | Restrict the search to one column instead of all searchable ones. |
| `order_by` | | Field to sort on. |
| `order` | `asc` | `asc` or `desc`. |

Offset paging is the easier one and gives you a total; cursor paging is stable
while rows are being inserted underneath you, which matters on the event log and
the submission list during a live event.

=== "Offset"

    ```json
    "pagination": {
      "total_count": 412, "items_per_page": 20,
      "page": 3, "pages": 21, "has_more": true
    }
    ```

=== "Cursor"

    ```json
    "pagination": {
      "next_cursor": "eyJ...", "prev_cursor": null,
      "items_per_page": 20, "has_more": true
    }
    ```

!!! warning "Which columns you can search, filter and sort on is per endpoint"
    Each resource declares its own searchable, filterable and sortable fields,
    so there is no one list that holds everywhere. Filters appear as extra query
    parameters named after the column (`event_type`, `actor__username`, …), and
    `order_by` accepts only that endpoint's fields. The endpoint's entry in the
    interactive docs on your instance enumerates both.

    A response also echoes what was available, under `filter_attributes`,
    `search_columns` and `order_columns`, which is the quickest way to discover
    them from a script.

## Rate limits

Submissions and logins are rate limited, and both limits are configurable under
[Security settings](../documentation/settings/security.md). The submission limit
is counted **per team**, not per token, so several scripts running for one team
share a single budget.

Registration, password-reset requests and verification resends carry fixed
per-IP limits that are not configurable.
