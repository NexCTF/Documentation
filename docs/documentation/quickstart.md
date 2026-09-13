---
icon: lucide/rocket
---

# Quickstart

Get a NexCTF instance running locally with Docker Compose.

## 1. Download the compose file

```bash
curl -O https://raw.githubusercontent.com/nexctf/nexctf/main/compose.yml
```

## 2. Start the stack

```bash
docker compose up -d
```

This brings up the FastAPI backend, the React frontend, PostgreSQL, and Valkey.

## 3. Log in

Open **https://localhost:8443**.

!!! info "Your browser will warn about the certificate"
    The bundled Caddy generates a self-signed certificate and does not use Let's
    Encrypt, so the warning is expected on a local run. Accept it and continue. For a
    real deployment, mount your own certificate or front the container with your own
    proxy; see [Deployment](deployment.md#tls).

Sign in with the default credentials:

| Username | Password |
|----------|----------|
| `admin`  | `admin`  |

Change the admin password immediately after first login.

## Next steps

- Create your first [challenge](challenges.md) from the admin dashboard.
- Enrol TOTP 2FA on your own account from your profile settings, or add an OAuth2/OIDC
  provider under **Admin → OAuth providers**. See [Authentication](authentication.md).
- Turn on the [rate limits and captcha](settings/security.md) before the event opens.
- Register a custom challenge or solution type through the [plugin
  system](../plugins/index.md).
- Take the instance to production: [Deployment](deployment.md).
