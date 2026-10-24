---
icon: lucide/mail
---

# Email

The SMTP server the instance sends mail through. Email is off by default, and an
instance runs without it; turning it on changes how accounts are created and recovered.

The settings live under **Admin → Settings → Email**.

| Setting | Key | Default |
| --- | --- | --- |
| Enable email | `email.enabled` | Off |
| SMTP host | `email.smtp_host` | Empty |
| SMTP port | `email.smtp_port` | `587` |
| SMTP username | `email.smtp_username` | Empty, no authentication |
| SMTP password | `email.smtp_password` | Empty, no authentication |
| Connection security | `email.security` | `starttls` |
| From address | `email.from_address` | Empty |
| From name | `email.from_name` | Empty |

Every one of them governs how accounts are verified and recovered, so saving any of them
from the browser needs a [recent sign-in](../authentication.md#re-authentication).

## What is sent

Two messages, both from the [account flows](../authentication.md#local-accounts):

| Message | Sent when |
| --- | --- |
| Email verification | A player registers, or asks for a new link from the login screen. |
| Password reset | A player uses *Forgot password*. |

Both carry the **CTF name** and the light logo from [Appearance](appearance.md), with a
plain-text copy alongside the HTML. [Notifications](../notifications.md) are not
emailed; they reach players inside the platform.

## What turning it on changes

| | Email off | Email on |
| --- | --- | --- |
| Address at registration | Optional | Required, and must be verified before the first login |
| *Forgot password* | Still on the login page and still reports success, but nothing is sent | Mails a reset link |
| Lost password | An admin issues a reset link from **Admin → Users** | Either path |

Accounts created while email was off were created verified, so turning it on mid-event
locks nobody out. See [Registration](../authentication.md#registration).

## SMTP server

**SMTP host** and **From address** are the two required fields: with either one
empty, every send fails. Leave **SMTP username** and **SMTP password** empty for a
relay that does not ask for authentication.

| Connection security | Port | Behaviour |
| --- | --- | --- |
| `starttls` | `587` | Connects in plain text, then upgrades to TLS before authenticating. The usual choice for a mail provider. |
| `tls` | `465` | TLS from the first byte. |
| `none` | `25` | No encryption. Only for a relay on a network you trust: the password and every message cross it in clear. |

**SMTP port** does not follow **Connection security**; set both.

The **From address** has to be one your SMTP server is allowed to send as, and for mail
to reach inboxes rather than spam folders, its domain needs SPF and DKIM records that
cover that server. **From name** is the display name in front of it; empty, the bare
address is shown.

!!! info "The password is write-only"
    Once saved, **SMTP password** is never sent back to the browser or through the API,
    which show it as set without revealing it. Leave the field alone to keep the
    current password, or type a new one to replace it. The [event log](../events.md)
    records that it changed, never its value.

## Testing the configuration

Messages go out in the background, after the request that triggered them has already
answered: a player who registers is told a link is on its way whether or not the SMTP
server accepted it. A failure shows up in the backend log, and in the
[metrics](../deployment.md#metrics) as `nexctf_emails_total` with `result="failed"`, or
`"misconfigured"` when the host or sender is missing.

Check the configuration before you rely on it. There is no button for it in the
interface, but the [Admin API](../../api/admin.md) sends a test message on demand and
waits for the server's answer, with a token carrying `write:admin.notification`:

```console
$ curl -H "Authorization: Bearer nexctf_..." -X POST \
    -H "Content-Type: application/json" -d '{"to": "you@example.com"}' \
    "https://ctf.example.com/api/v1/admin/email/test"
```

| Answer | Meaning |
| --- | --- |
| `SUCCESS` | The SMTP server accepted the message. |
| `EMAIL-409-DISABLED` | **Enable email** is off. |
| `EMAIL-500` | **SMTP host** or **From address** is empty. |
| `EMAIL-502` | The server refused the connection, the credentials or the message. The backend log has its reply. |

Accepted is not delivered: check that the message actually arrived, and not in spam.
