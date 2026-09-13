---
icon: lucide/server
---

# Deployment

NexCTF ships as a single application image plus three supporting services. This page
covers a production Docker Compose deployment: what runs, what you must configure,
TLS, backups, and upgrades.

## What runs

The stack is four containers:

| Service | Image | Role |
| --- | --- | --- |
| `app` | `ghcr.io/nexctf/nexctf` | The application. |
| `db` | `postgres` | All persistent data. |
| `cache` | `valkey` | Sessions cache, rate limits, short-lived tokens, live updates. |
| `s3` | `maxio` | S3-compatible object storage for challenge files and uploads. |

The `app` container is not just the API. A supervisor inside it runs three processes:

- **caddy**: terminates TLS, serves the built React frontend, proxies `/api/*` to the backend.
- **backend**: the FastAPI application (`WORKERS` uvicorn workers).
- **scheduler**: the worker that ticks scheduled jobs once a minute.

!!! info "The frontend is not a separate container"
    It is built at image build time and served as static files by Caddy from inside the
    `app` container. There is nothing to deploy separately.

## Getting the compose file

```bash
curl -O https://raw.githubusercontent.com/nexctf/nexctf/main/compose.yml
```

The published file pins an exact image tag. Keep it pinned; see [Upgrades](#upgrades).

## Configuration

Every setting is an environment variable read by the `app` container. The compose file
gives each one a default via `${VAR:-default}`, so you override them from a `.env` file
next to `compose.yml`, or from your orchestrator.

### Application

| Variable | Default | Notes |
| --- | --- | --- |
| `DOMAIN` | `localhost` | The hostname Caddy serves, and the one everything else is derived from: the S3 hostname `s3.<DOMAIN>`, and the three URLs below. |
| `SECRET_KEY` | *(none)* | Signs session cookies. **Required in production** (see below). |
| `ENVIRONMENT` | `production` | `development`, `staging` or `production`. Anything but `development` enforces the `SECRET_KEY` check and marks cookies `Secure`. |
| `FRONTEND_HOST` | *(from `DOMAIN`)* | Public URL of the site. Used to build email links, OAuth redirects, and the CORS allow-list. |
| `BACKEND_HOST` | *(from `DOMAIN`)* | Public URL of the API. Used to build the OAuth redirect URI and the OAuth server issuer. |
| `WORKERS` | `4` | Backend worker processes. |
| `BACKEND_CORS_ORIGINS` | *(empty)* | Comma-separated extra origins. `FRONTEND_HOST` is always allowed. |
| `TRUSTED_PROXY_COUNT` | `1` | Number of proxies in front of the app. See [Client IP addresses](#client-ip-addresses). |
| `DEMO_DATA` | *(empty)* | `true` seeds example challenges, teams and submissions. Never on a real event. |
| `NEXCTF_PLUGINS` | *(empty)* | Comma-separated plugin specifiers. See [Installing plugins](../plugins/installation.md). |

!!! danger "`SECRET_KEY` is mandatory outside development"
    With `ENVIRONMENT` set to anything other than `development`, the application refuses
    to start unless `SECRET_KEY` is set explicitly in the environment. The compose file
    ships a placeholder default, so **replace it**. Anyone with that value can forge
    session cookies for any account.

    ```bash
    python -c "import secrets; print(secrets.token_urlsafe(32))"
    ```

    Changing it later invalidates every active session.

Setting `DOMAIN` is normally all you need:

```bash title=".env"
DOMAIN=ctf.example.com
```

`FRONTEND_HOST`, `BACKEND_HOST` and `S3_PUBLIC_URL` are each filled in from it
(`https://<DOMAIN>`, and `https://s3.<DOMAIN>` for storage) whenever you leave them
empty, matching the Caddyfile the container generates.

!!! warning "Override the derived URLs when your public URL is not `https://<DOMAIN>`"
    Derivation assumes HTTPS on the default port. If you reach the instance some other
    way, for example through the compose file's `8443` port mapping or behind a proxy
    that serves it under a different name, the derived values are wrong and everything
    that hands a URL to a browser or a third party breaks:

    - password-reset and email-verification links point at the wrong host
    - the OAuth redirect URI sent to external providers does not match what you
      registered
    - the OAuth server's discovery metadata advertises the wrong issuer

    Set the ones that differ explicitly:

    ```bash title=".env"
    DOMAIN=ctf.example.com
    FRONTEND_HOST=https://ctf.example.com:8443
    BACKEND_HOST=https://ctf.example.com:8443
    ```

    Leaving `DOMAIN` at its `localhost` default is the other trap: the derived URLs
    become `https://localhost`, which works for a local trial and for nothing else.

### Database

| Variable | Default | Notes |
| --- | --- | --- |
| `POSTGRES_SERVER` | `db` | |
| `POSTGRES_PORT` | `5432` | |
| `POSTGRES_USER` | `nexctf` | |
| `POSTGRES_PASSWORD` | `nexctf` | Change it. |
| `POSTGRES_DB` | `nexctf` | |
| `POSTGRES_TLS` | `false` | Adds `ssl=require` to the connection. |
| `POSTGRES_POOL_SIZE` | `20` | Connections held open per backend worker. |
| `POSTGRES_MAX_OVERFLOW` | `40` | Extra connections allowed above the pool. |
| `POSTGRES_POOL_TIMEOUT` | `10` | Seconds to wait for a free connection. |

### Cache

| Variable | Default | Notes |
| --- | --- | --- |
| `REDIS_HOST` | `cache` | |
| `REDIS_PORT` | `6379` | |
| `REDIS_PASSWORD` | `nexctf` | Change it. |
| `REDIS_DB` | `0` | |
| `REDIS_TLS` | `false` | |

### Object storage

| Variable | Default | Notes |
| --- | --- | --- |
| `S3_HOST` | `s3` | Internal hostname the backend talks to. |
| `S3_PORT` | `9000` | |
| `S3_BUCKET` | `nexctf` | |
| `S3_ACCESS_KEY` | `admin` | Change it. |
| `S3_SECRET_KEY` | `admin` | Change it. |
| `S3_REGION` | `us-east-1` | |
| `S3_TLS` | `false` | |
| `S3_PUBLIC_URL` | *(from `DOMAIN`)* | Browser-facing URL used inside presigned download links. |

!!! warning "`s3.<DOMAIN>` needs its own DNS record"
    Challenge files are served through presigned URLs that the **browser** fetches
    directly, so the address inside them has to resolve publicly. `S3_PUBLIC_URL` is
    derived as `https://s3.<DOMAIN>`, which is where Caddy already publishes the storage
    service, but that subdomain still needs a DNS record of its own and a certificate
    covering it, like the main one. Without them every download fails for players.

    Override it only when storage is reachable somewhere else:

    ```bash title=".env"
    S3_PUBLIC_URL=https://files.example.net
    ```

    With `DOMAIN` left at `localhost`, the derived value only resolves on your own
    machine.

## TLS

Caddy inside the container generates its own certificate by default. **It does not use
Let's Encrypt or any other ACME provider.** You have two supported options.

=== "Mount your own certificates"

    Put a PEM certificate and key in a directory and mount it at `/certs`. The names are
    fixed:

    ```yaml title="compose.yml"
    services:
      app:
        volumes:
          - ${CERTS_PATH}:/certs:ro
    ```

    | Path | Contents |
    | --- | --- |
    | `/certs/cert.pem` | Certificate chain, covering `DOMAIN` and `s3.DOMAIN`. |
    | `/certs/key.pem` | Private key. |

    Both must be present. If either is missing, Caddy falls back to a self-signed
    certificate. The startup log line `[start] TLS: using custom certificates` confirms
    which path was taken.

=== "Front it with your own reverse proxy"

    Terminate TLS in your existing proxy and forward to the container's HTTP port. The
    compose file binds the ports to loopback only:

    ```yaml
    ports:
      - "127.0.0.1:8080:80"
      - "127.0.0.1:8443:443"
    ```

    Forward to `127.0.0.1:8080`, and set `TRUSTED_PROXY_COUNT` to the number of proxies
    you added.

### Client IP addresses

Rate limiting, the event log and session records all record a client IP.
`TRUSTED_PROXY_COUNT` decides where it comes from:

| Value | Behaviour |
| --- | --- |
| `0` | The direct connection address. `X-Forwarded-For` is ignored entirely. |
| `N` | The Nth entry from the right of `X-Forwarded-For`. |

Count every proxy that appends to the header, including the bundled Caddy. Setting it
too high lets a client spoof its own IP and slip past rate limits; too low and every
request appears to come from your proxy, so one player's rate limit throttles everyone.

## Starting up

```bash
docker compose up -d
```

On every start, before serving traffic, the `app` container:

1. Installs anything listed in `NEXCTF_PLUGINS`.
2. Runs core database migrations.
3. Runs plugin database migrations.
4. Loads fixtures (plus demo data if `DEMO_DATA=true`).
5. Creates the default admin account if it does not already exist.
6. Starts Caddy, the backend and the scheduler.

Any failure in steps 1 to 3 stops the container rather than starting a half-migrated
instance. `docker compose logs app` has the reason, on a line starting with `[start]`.

The container is healthy once `GET /api/v1/info` answers.

## The first admin account

Step 5 above creates one account from these variables, and only if no account with that
username exists yet:

| Variable | Default |
| --- | --- |
| `DEFAULT_ADMIN_USERNAME` | `admin` |
| `DEFAULT_ADMIN_PASSWORD` | `admin` |
| `DEFAULT_ADMIN_TOKEN` | *(none)* |

`DEFAULT_ADMIN_TOKEN` optionally provisions an API token for that account in the same
step, so automation can talk to a fresh instance without a login round-trip. It must
start with `nexctf_` or the container refuses to start.

!!! danger "Change the admin password at first login"
    The defaults are `admin` / `admin`, and the login page is public.

!!! warning "There is no command-line password reset"
    `manager create-admin` only *creates* the account when it is missing; running it
    again on an existing account does nothing. If you lose the password, the recovery
    paths are:

    - another admin issuing a reset link from **Admin → Users**, or
    - the self-service *Forgot password* flow, if [email](settings/email.md) is configured.

    A single-admin instance with no SMTP has neither. Add a second admin account, or
    configure email, before the event starts.

## Backups

Persistent state lives in four named volumes.

| Volume | Contents | Back up? |
| --- | --- | --- |
| `app-db-data` | PostgreSQL: users, teams, challenges, submissions, sessions, settings. | **Yes.** This is the event. |
| `app-s3-data` | Challenge files, uploads, and the database dumps described below. | **Yes.** Not reconstructible. |
| `caddy-data` | Caddy's certificate store. | Optional; regenerated on start. |
| `app-redis-data` | Cache, rate-limit counters, pending reset tokens, OAuth codes. | No. |

Redis holds nothing you cannot lose. Sessions themselves are rows in PostgreSQL, so a
cache wipe does not sign everyone out; it only drops in-flight password-reset links and
rate-limit counters.

### Database dumps from the admin panel

**Admin → Backups** dumps the database without leaving the browser. **Backup now** runs
`pg_dump` in PostgreSQL's custom format and stores the result in the S3 bucket under the
`backups/` prefix, named for the moment it was taken and the schema version it was taken
at:

```
backups/nexctf-20260913T041500Z-d4a9c17e3b52.dump
```

That trailing component is the Alembic revision, and it is what makes a dump safe to
restore later. Each row in the list can be downloaded to your own machine, restored, or
deleted.

!!! warning "Backups cover the database only"
    Uploaded files live in the S3 bucket, not in the dump. Restoring an older database
    against a newer bucket leaves challenge attachments pointing at objects that have
    since been deleted. Back up the `app-s3-data` volume on its own schedule; the two are
    only consistent if you take them together.

!!! info "Marked Beta"
    The backup screen carries a *Beta* badge. Treat a restore as something to rehearse on
    a scratch instance before you need it during an event.

### Scheduling them

A `backup_database` job in the [Scheduler](scheduler.md) takes the same dump on a cron
expression, and its `keep_last` parameter prunes older ones afterwards, so the prefix
does not grow without limit. Anything from `1` to `100` is accepted, and it defaults to
`7`.

### Restoring

**Restore** on a row replaces the entire database with that dump. The platform does the
sequence for you:

1. Stops the backend and the scheduler.
2. Dumps the current database, so the restore itself can be rolled back.
3. Replaces the database (`pg_restore --clean --single-transaction`) and flushes the cache.
4. Runs core and plugin migrations.
5. Starts the backend and the scheduler again.

The instance is unavailable for the length of that, and every user is signed out. The
outcome of the last restore is reported back on the Backups page, whether it succeeded
or not.

!!! warning "Restore refuses a dump from a newer NexCTF"
    The Alembic revision in the filename is checked against the migrations the running
    version knows. A dump taken on a newer release is rejected rather than restored into
    a schema that cannot hold it. Upgrade first, then restore.

Restoring the other way, into a *newer* NexCTF, is fine: step 4 migrates the restored
schema forward.

!!! info "Outside the bundled image"
    Orchestrating its own restart is something only the bundled image can do. Anywhere
    else the button reports as much, and the operator does it by hand: stop the app, then
    run

    ```bash
    manager restore backups/nexctf-20260913T041500Z-d4a9c17e3b52.dump
    ```

    The host needs the PostgreSQL client binaries (`pg_dump`, `pg_restore`) for either
    path to work at all. The bundled image ships them.

### From the command line

Nothing about this is admin-panel-only. A token carrying the `admin.backup`
[scope](authentication.md#token-scopes) drives the same endpoints, which is the supported way
to pull a nightly dump onto storage you control:

```console
$ curl -H "Authorization: Bearer nexctf_..." \
    "https://ctf.example.com/api/v1/admin/backup"
$ curl -H "Authorization: Bearer nexctf_..." -X POST \
    "https://ctf.example.com/api/v1/admin/backup"
```

Take a dump immediately before every upgrade.

## Upgrades

Migrations run automatically at container start, so an upgrade is a tag bump:

1. Back up the database (**Admin → Backups**, or `POST /api/v1/admin/backup`) and the
   S3 volume.
2. Edit the `app` image tag in `compose.yml`.
3. `docker compose pull app && docker compose up -d app`
4. Watch `docker compose logs -f app` for the `[start]` lines.

!!! warning "Pin the image tag"
    Migrations are applied on start and are not reversible by the platform. Running
    `:latest` means an unattended `docker compose pull` can migrate your database mid-event.
    Pin an exact version and bump it deliberately.

## Scaling

The knobs that matter, and how they interact:

- **`WORKERS`**: backend processes in the `app` container. Start at the number of CPU
  cores available to it.
- **`POSTGRES_POOL_SIZE` / `POSTGRES_MAX_OVERFLOW`**: connections *per worker*. The
  ceiling is `WORKERS × (POOL_SIZE + MAX_OVERFLOW)`, and the bundled PostgreSQL is
  started with `max_connections=350`. At the defaults that is `4 × 60 = 240`, within
  budget, but raising `WORKERS` without raising `max_connections` will exhaust it.
- The **scheduler** is a single process that ticks once a minute. Do not run a second
  copy of the `app` container without accounting for it; jobs would fire twice.

The scoreboard is cached and pushed over Server-Sent Events, so a large field of players
watching the ranking does not translate into database load.
