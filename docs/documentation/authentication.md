---
icon: lucide/lock-keyhole
---

# Authentication

How players and admins get an account and prove who they are: local accounts, two-factor
authentication, sessions, API tokens, and OAuth2 / OpenID Connect in both directions.

## Local accounts

### Registration

Registration is open by default and controlled by `ctf.allow_registration` in
[Competition settings](settings/competition.md). Turning it off hides the form and
rejects the endpoint, so late sign-ups stop without touching anything else.

Whether an email address is required depends on whether [email](settings/email.md) is
configured:

| Email enabled | Address | Effect |
| --- | --- | --- |
| Off | Optional | The account is usable immediately. |
| On | **Required** | A verification link is sent, and login is blocked until it is used. |

Registration is rate limited to **5 attempts per minute per IP address**. That limit is
fixed and is not one of the [Security settings](settings/security.md). If
[captcha](settings/security.md) is enabled, the registration form is challenged too. The
captcha is a self-hosted ALTCHA proof-of-work, signed with `SECRET_KEY`; there is no
third-party service to sign up for and nothing leaves your instance.

!!! info "Turning email on mid-event"
    Accounts registered while email was off were created already verified, so they keep
    working. Only accounts created afterwards need to verify.

### Email verification

The verification link is valid for **24 hours** and works once. Players who let it lapse
can request a new one from the login screen, rate limited to **3 requests per minute per
IP address**.

!!! info "Requesting a new link does not cancel the old one"
    Each request mints an independent token. Every link sent in the last 24 hours stays
    usable until it expires or is clicked. That is harmless, since they all verify the same
    address, but it means resending is not a way to revoke a link that went astray.

Login is only gated on verification while email is enabled. Otherwise an unverified
account could never be unlocked, so the check is skipped rather than locking people out.

### Password reset

*Forgot password* mails a single-use link valid for **1 hour**. The link is consumed the
moment it is opened, so a second click fails even inside the hour. Requests are rate
limited to **3 per minute per IP address**, and the address is matched
case-insensitively.

The form always reports success, whether or not the address matches an account, so it
cannot be used to test which addresses are registered. As with verification, requesting
a second link leaves the first one valid until it expires.

Without email configured there is no self-service reset. An admin can still generate a
reset link for any user from **Admin → Users**; the link is shown ready to copy, and can
be handed over out of band. That path does not need SMTP.

### Login

Passwords are hashed with Argon2. A login attempt against an unknown username performs
the same hashing work as a real one, so response timing does not reveal which usernames
exist.

Login is rate limited per IP, and unlike registration this one **is** configurable under
[Security settings](settings/security.md), via `rate_limit.login.max_requests` and
`rate_limit.login.window_seconds`.

Every attempt is recorded in the [event log](events.md), successes as `user.login` and
failures as `user.login_failed` with the reason:

| Reason | Meaning |
| --- | --- |
| `unknown_user` | No account with that username. |
| `bad_password` | Wrong password. |
| `bad_totp` | Password correct, TOTP code wrong. |
| `disabled` | Account deactivated by an admin. |
| `email_not_verified` | Credentials correct, verification link not used yet. |

A run of `unknown_user` failures from one address is the signature of username
enumeration; a run of `bad_password` against one account is a brute-force attempt.

## Two-factor authentication

Any user can enrol a TOTP authenticator from their own profile settings. It is per-user
and opt-in. There is no instance-wide setting that forces it on, so ask your admins to
enable it rather than assuming.

Enrolment is the usual three steps: the platform shows a secret and QR code, the user
scans it, and the setup is only committed once they enter a valid code. The pending
secret is held for **10 minutes**; an enrolment that is not confirmed in that window
expires and leaves the account unchanged.

Once enabled, login asks for the 6-digit code after the password. Codes from the
immediately preceding and following time step are accepted, so a device whose clock
drifts by up to 30 seconds still works.

Disabling TOTP requires a current code, so someone who walks up to an unlocked browser
cannot quietly remove it.

!!! warning "There are no recovery codes"
    A user who loses their authenticator cannot recover the account themselves. An admin
    has to issue a password-reset link from **Admin → Users**. Make sure at least one
    admin account is reachable by someone other than the person who owns it.

## Sessions

Signing in sets a signed `NexCTF` cookie, valid for **24 hours** and marked `Secure`
outside development. Session records live in PostgreSQL, not in the cache, so restarting
the cache container does not sign anyone out.

From their profile settings a user can see every active session, with its browser user
agent, originating and most recent IP address, and last activity. Any session can be
revoked individually, or all of them at once.

Admins see the same list for any account under **Admin → Users → *user***, and can sign
one device out from there without touching the password. The session an admin is
currently using is marked as such, so they do not revoke their own by accident. Each
revocation is recorded in the [event log](events.md) as `admin.user_session_revoked`,
with the target account in the metadata.

!!! info "Revoking a session is not the same as locking an account out"
    A revoked session only ends that one device. Someone who still knows the password
    signs straight back in. To actually stop an account, deactivate it: that bumps the
    session version and invalidates every session at once.

Two things invalidate sessions everywhere at once, by bumping the account's session
version:

- changing the account password
- an admin deactivating the account

Rotating `SECRET_KEY` invalidates every session on the instance, since the cookie
signature no longer verifies.

## API tokens

Tokens are the non-interactive way in, for scripts and integrations. A user creates them
from their profile settings; each has a name and an optional expiry, and a user can hold
several.

Send one as a bearer token:

```console
$ curl -H "Authorization: Bearer nexctf_..." https://ctf.example.com/api/v1/info/me
```

| Property | Behaviour |
| --- | --- |
| Prefix | Every token starts with `nexctf_`, which makes them easy to catch in secret scanners. |
| Storage | Only a SHA-256 hash is stored. The value is shown once, at creation. |
| Expiry | Optional. Without one the token is valid until revoked. |
| Revocation | Immediate, from the same screen. |
| Permissions | Chosen per token, from the scopes below. A token never carries more than it was granted. |

### Token scopes

A token is granted a set of `verb:group` scopes at creation, and every request it makes
is checked against them. The verb comes from the HTTP method: `GET`, `HEAD` and
`OPTIONS` need `read`, and `POST`, `PUT`, `PATCH` and `DELETE` need `write`. The group
comes from the endpoint.

| Group | Covers |
| --- | --- |
| `profile` | The owner's own profile and team membership. |
| `token` | Listing and revoking API tokens. |
| `challenge` | Challenges and their attachments, including answer submission. |
| `scoreboard` | The scoreboard. |
| `team` | Teams. |
| `notification` | Notifications and the event stream. |
| `content` | Pages and site info. |
| `plugin` | Endpoints a plugin mounts on the player side. |

Admins can additionally grant the administrative groups:

| Group | Covers |
| --- | --- |
| `admin.challenge` | Challenges, questions, solutions, hints, files, submissions, score adjustments. |
| `admin.user` | Users and custom fields. |
| `admin.team` | Teams. |
| `admin.scoreboard` | Scoreboard and statistics. |
| `admin.notification` | Notifications and email. |
| `admin.content` | Pages and links. |
| `admin.config` | Settings, the event log, the scheduler, feedback, OAuth providers and clients, plugins. |
| `admin.backup` | Creating, downloading, deleting and restoring [database backups](deployment.md#backups). |
| `admin.plugin` | Endpoints a plugin mounts on the admin side. |

Three rules are worth knowing before you build the list:

- **Granting a write grants the matching read.** Asking for `write:admin.challenge`
  stores `read:admin.challenge` alongside it, so you never have to tick both.
- **A player cannot grant an admin group.** The scopes on offer are narrowed to the
  owner's own role, and a request for one outside it is refused with `SCOPE-422`.
- **A token needs at least one scope.** Creating one with an empty list is refused.

Scopes are fixed for the life of the token. To widen or narrow one, revoke it and issue
a replacement.

!!! info "Every endpoint publishes the scope it needs"
    The OpenAPI schema carries an `x-token-scope` field on each operation, and the
    rendered API docs repeat it in the description, so you can read off exactly what a
    script needs rather than granting broadly and hoping.

A request that reaches an endpoint outside its scopes is refused with **403
`SCOPE-403`**, naming the scope it was missing.

### Endpoints a token cannot reach

Some endpoints refuse bearer authentication outright and answer **403
`SCOPE-403-SESSION`**, whatever scopes the token carries:

- creating an API token
- revoking one of your own sessions
- unlinking an OAuth provider
- changing the password
- enrolling in or disabling TOTP

These are the operations that change how an account is secured, and requiring a browser
session keeps a leaked token from being used to entrench itself.

The admin audit channel of the live event stream follows the same logic in a softer
form: an admin's token only receives it when it holds `read:admin.config`.

!!! warning "An admin token with admin scopes is an admin credential"
    Scopes narrow what a token can reach, not who it acts as. A token granted
    `write:admin.user` can create administrators. Grant the narrowest set that does the
    job, and treat a broadly scoped token like the password.

`DEFAULT_ADMIN_TOKEN` provisions a token at first start for automation, and it is
granted **every** scope available to an admin; see
[Deployment](deployment.md#the-first-admin-account). It is a bootstrap credential, not
one to keep in use: issue a narrowly scoped token for each job and revoke the default.

!!! info "Tokens bypass 2FA by design"
    A token authenticates on its own, and TOTP is a login-flow check rather than a
    per-request one.
    That is what makes unattended scripts possible, and why an admin token deserves the
    same handling as a password.

## Logging in with an external provider

NexCTF can delegate login to any OAuth2 / OpenID Connect provider that publishes a
discovery document: Keycloak, Authentik, Auth0, GitLab, Google, and others. Providers
are configured at **Admin → OAuth providers**, and each one you activate adds a button
to the login page.

| Field | Notes |
| --- | --- |
| Slug | URL-safe identifier. It appears in the callback URL, so pick it before registering the client and do not change it afterwards. |
| Name | Label shown on the login button. |
| Client ID / Client secret | Issued by the provider. |
| Discovery URL | The provider's `.well-known` document. Endpoints are read from it, so you never enter them individually. |
| Scopes | Space-separated. Defaults to `openid email profile`. |
| Icon URL | Optional image for the login button. |
| Active | Inactive providers are hidden from the login page and their endpoints return 404. |

Register this redirect URI with the provider, substituting your `BACKEND_HOST` and the
slug you chose:

```
https://ctf.example.com/api/v1/auth/providers/<slug>/callback
```

!!! warning "The redirect URI depends on `DOMAIN`"
    It is built from `BACKEND_HOST`, which is derived from `DOMAIN` unless you set it
    explicitly. Leave both unset and the platform sends the provider a callback address
    on `http://localhost:8000`, and the flow fails. If your public URL is not
    `https://<DOMAIN>`, set `BACKEND_HOST` yourself. See
    [Deployment](deployment.md#application).

### How accounts are matched

On a successful callback the provider's subject identifier is looked up:

- **Known subject** → sign in to the account it is linked to.
- **Unknown subject, user already signed in** → link the provider to the current account.
- **Unknown subject, nobody signed in** → create a new account.

New accounts take their username from the provider (`preferred_username`, then `login`,
then the subject id) and get a short random suffix if that name is already taken. The
provider's email is copied over and marked verified, since the provider vouched for it.

!!! info "Accounts are never matched by email address"
    A matching email does **not** attach a provider identity to an existing local
    account. If it did, a provider that hands out unverified email addresses could be
    used to take over any account by claiming its address. Users who want both must sign
    in locally first, then link the provider from their profile settings.

    The other side of that guarantee: if the provider's email is already claimed by
    another local account, the new account is created without an email address rather
    than colliding.

Users can see their linked providers, and unlink them, from their profile settings.

!!! warning "Unlinking can lock an account out"
    An account created through a provider has no password. Unlinking its only provider
    leaves no way in. Set a password first.

## Using NexCTF as a provider

The other direction: NexCTF is itself an OAuth2 authorization server, so other
applications can offer *Sign in with NexCTF*. Useful for a writeup site, a Discord bot,
or anything else you run alongside the event that should share the same accounts.

Register applications at **Admin → OAuth clients**.

| Field | Notes |
| --- | --- |
| Name / Description | Shown to the user on the consent screen. |
| Redirect URIs | One per line. A callback that is not listed exactly is refused. |
| Allowed scopes | Space-separated subset of the scopes below. |
| Allowed roles | Space-separated, from `admin` and `user`. Leave empty to allow everyone. |
| Active | Inactive clients are refused. |

The client ID is generated for you; the client secret is shown **once** at creation and
stored only as a hash. Losing it means rotating it.

### What the server supports

| | |
| --- | --- |
| Discovery | `/api/v1/oauth2/.well-known/oauth-authorization-server` |
| Grant type | `authorization_code` |
| Response type | `code` |
| PKCE | Supported, `S256` only |
| Client authentication | `client_secret_post` |
| Authorization code lifetime | 10 minutes, single use |
| Access token lifetime | 1 hour |

There are no refresh tokens: the client repeats the authorization flow when the access
token expires.

### Scopes

| Scope | Grants |
| --- | --- |
| `openid` | A stable user identifier. |
| `profile` | The username. |
| `email` | The email address. |
| `roles` | The platform role: `admin` or `user`. |

Request `roles` when the other application needs to mirror your admin list; without it a
client cannot tell an admin from a player.

!!! info "Role restrictions are enforced on every authorization"
    *Allowed roles* is checked when the user reaches the consent screen, not only at
    registration. Demoting a user from admin to player immediately stops them authorizing
    an admin-only client, though an access token issued beforehand remains valid until
    it expires.

The issuer and endpoint URLs in the discovery document come from `BACKEND_HOST`. As with
external providers, an unset `BACKEND_HOST` advertises `localhost` to your clients.
