---
icon: lucide/shield
---

# Security

Rate limits on flag submissions and logins, the idle timeout for browser sessions, and
the captcha on the login and registration forms.

The settings live under **Admin → Settings → Security**.

| Setting | Key | Default |
| --- | --- | --- |
| Submit rate limit | `rate_limit.submit.enabled` | On |
| Max submissions | `rate_limit.submit.max_requests` | `20` |
| Window (seconds) | `rate_limit.submit.window_seconds` | `60` |
| Login rate limit | `rate_limit.login.enabled` | On |
| Max login attempts | `rate_limit.login.max_requests` | `10` |
| Window (seconds) | `rate_limit.login.window_seconds` | `60` |
| Idle session timeout (minutes) | `auth.session_idle_minutes` | `0`, disabled |
| Enable captcha | `captcha.enabled` | Off |

Everything but the submission limit protects sign-in, so saving it from the browser
needs a [recent sign-in](../authentication.md#re-authentication). Each save is recorded
in the [event log](../events.md) as `config.updated`.

## Rate limits

Both limits are sliding windows: at most **Max** requests in any span of **Window**
seconds, not per calendar minute. Every attempt counts, whatever its outcome, refused
ones included, and a request over the limit is refused with **429**. A client that keeps
retrying keeps itself locked out; one that waits a full window gets its budget back.

| Limit | Counted per | Covers |
| --- | --- | --- |
| Submissions | Team | Every answer submitted, correct or not. |
| Logins | Client IP address | The login form, and [re-authentication](../authentication.md#re-authentication). |

The submission limit is shared by the whole team, whether its members submit from the
browser or from scripts with [API tokens](../authentication.md#api-tokens), so one
member's script can use up the budget for everyone. The default of 20 a minute is
generous for people typing flags and tight for brute force.

!!! warning "The login limit trusts your proxy count"
    The login limit is keyed on the client address, which comes from
    [`TRUSTED_PROXY_COUNT`](../deployment.md#client-ip-addresses). Set too low, every
    login appears to come from your proxy and one player's typos lock everyone out. Set
    too high, a client can claim any address and slip past the limit.

Registration, password-reset requests and verification resends have fixed per-address
limits of their own, which are not settings; see
[Authentication](../authentication.md#local-accounts).

## Idle session timeout

Signs a browser session out after that many minutes without a request, on top of the 24
hour limit every session has. `0` disables it, and the maximum is `1440`, a full day.
API tokens are not affected. A short timeout suits an instance used on shared machines,
such as a classroom, where a session left open would otherwise stay signed in for the
rest of the day.

See [Sessions](../authentication.md#sessions).

## Captcha

**Enable captcha** puts a proof-of-work challenge on the login and registration forms.
It is [ALTCHA](https://altcha.org/), self-hosted: the browser solves a small puzzle
signed with the instance's `SECRET_KEY`, with no third-party service to sign up for and
no request leaving your instance. Players see nothing of it: the puzzle is solved in the
background as the page loads, and the submit button waits for it, usually a fraction of
a second.

Each solution is valid for five minutes and works once, so a solved puzzle cannot be
replayed against the form. A script hitting the endpoints directly has to solve a fresh
one for every attempt, which puts a computing cost on credential stuffing and mass
registration without making a human wait. It slows a script down rather than stopping
it, so keep the login rate limit on alongside it. Failed and missing solutions are counted in the
[metrics](../deployment.md#metrics) as `nexctf_captcha_failures_total`, by reason.

!!! info "API tokens are not challenged"
    The captcha guards the two forms that create a session. Requests made with an API
    token never go through them.
