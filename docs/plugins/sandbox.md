---
icon: lucide/box
---

# Sandbox

[`nexctf-sandbox`](https://github.com/NexCTF/nexctf-sandbox) adds two solution types that run
code in a throwaway [microVM](https://github.com/microsandbox/microsandbox): one where
**you** write the code that grades the answer, one where the **player** writes the code
being graded.

| Solution type | Grades | Available on questions of type |
| --- | --- | --- |
| `Script checker` | Your Python function decides whether the answer is correct. | `Short answer`, `Long answer`, `Code` |
| `Code runner` | The player's Python code is run against your test cases. | `Code` |

Both appear in the [solution picker](../documentation/challenges.md#solutions) of a
question once the plugin is installed, next to `Match` and `Regex`.

## Requirements

The sandbox boots a real virtual machine per submission, which the host has to allow.

| Requirement | Why |
| --- | --- |
| NexCTF 0.12 | Each plugin release supports one NexCTF minor version, see [Compatibility](#compatibility). |
| `/dev/kvm`, readable and writable by the container | Hardware virtualization. Without it no sandbox boots: `Script checker` then marks every answer wrong, and `Code runner` answers the player with a server error. |
| Memory headroom | A microVM takes 320 MiB and up to eight run at once per API worker, so 2.5 GB per worker at full load. |
| Free disk for the guest image | The `python:3.14-slim` image is pulled on the first submission and cached inside the container. |

Nothing else: no added capability and no root. [Network access](#network-access) is
enforced by microsandbox's own network stack, not by firewall rules on the host.

## Installing

The container runs as a non-root user, so passing the device in is not enough on its
own: it also needs the group that owns `/dev/kvm` on the host.

```console
$ stat -c '%g' /dev/kvm
994
```

Use that number, which differs from host to host:

```yaml title="compose.yml"
services:
  app:
    environment:
      NEXCTF_PLUGINS: nexctf-sandbox==1.0.0
    devices:
      - /dev/kvm
    group_add:
      - "994"
```

```console
$ docker compose up -d --force-recreate app
```

Then check the device is usable from inside the container:

```console
$ docker compose exec app test -r /dev/kvm -a -w /dev/kvm && echo ok
ok
```

See [Installing plugins](installation.md) for private indexes, custom CAs and removal.

### Compatibility

| `nexctf-sandbox` | NexCTF |
| --- | --- |
| 1.0.x | 0.12.x |

The plugin declares the NexCTF versions it supports, so it will not install against
another one: upgrade NexCTF and the plugin together, in the same container recreation.

!!! info "Coming from 0.1"

    The `NET_ADMIN` capability is no longer used: drop `cap_add` from the service. The
    default **Base image** moved from `python:3.12-slim` to `python:3.14-slim`, which
    checkers and player code run under unless the setting was changed. A checker
    importing a module Python 3.13 removed, such as `cgi` or `telnetlib`, needs updating,
    or set **Base image** back to `python:3.12-slim`.

## Script checker

The answer is passed to a function you write, and whatever it returns decides the
verdict.

| Field | Notes |
| --- | --- |
| Checker function | Python 3. Must define `check(answer, team_id, team_fields)` returning a boolean. Up to 64 KiB. |
| Timeout (s) | Between 1 and 30, `5` by default. |

```python
def check(answer: str, team_id: str | None, team_fields: dict) -> bool:
    return answer.strip().lower() == "42"
```

`answer` is exactly what the player submitted. `team_id` is the submitting player's
team, or `None` when they are not in one. Use it for per-team flags:

```python
import hashlib

def check(answer: str, team_id: str | None, team_fields: dict) -> bool:
    expected = hashlib.sha256(f"s3cr3t{team_id}".encode()).hexdigest()[:16]
    return answer.strip() == f"NEX{{{expected}}}"
```

Anything the function prints is ignored, and an exception inside it counts as a wrong
answer rather than an error the player sees, and so does a syntax error. A broken
checker therefore rejects every player silently: submit a known-good answer yourself
once after writing one. The checker code is admin-only, and never part of what the player-facing
API returns.

### Team custom fields

`team_fields` holds the submitting team's [custom fields](../documentation/users-teams.md),
keyed by field name. Private fields are included: the checker is admin code, and a
per-team seed or secret is what the argument is for.

```python
import hashlib

def check(answer: str, team_id: str | None, team_fields: dict) -> bool:
    seed = team_fields.get("seed", "")
    expected = hashlib.sha256(seed.encode()).hexdigest()[:16]
    return answer.strip() == f"NEX{{{expected}}}"
```

| Field type | Value in `team_fields` |
| --- | --- |
| Integer | `int` |
| Boolean | `bool` |
| Anything else | `str` |

A field the team left empty is missing from the dictionary rather than set to `None`,
so read it with `.get()`. A value stored before its field changed type, and no longer
parsing as the new one, is passed as the raw string. A player with no team gets an
empty dictionary.

A new checker starts from a template that lists the team custom fields defined on the
instance, with their types, as a comment. Fields added later do not update an existing
checker.

`team_fields` is optional. A checker declared without it, such as
`check(answer, team_id)`, keeps working unchanged: the argument is only passed to a
function that can take it.

!!! warning "Teams can edit their own fields"

    With [**Allow Team Customization**](../documentation/customization.md#what-players-can-change-for-themselves)
    on, team members can change their team's custom fields, and with them what the
    checker sees. Before deriving a flag from a field, make sure the team cannot edit it.

## Code runner

The player submits code, the plugin runs it once per test case and compares what it
printed.

| Field | Notes |
| --- | --- |
| Test cases | Up to 20. Each has an **Input (stdin)** fed to the program and an **Expected output**. |
| Timeout (s) | Applies to each test case separately. Between 1 and 30, `5` by default. |

The answer is accepted only when **every** test case passes. A test case passes when the
program exits with status `0` and its standard output equals the expected output after
stripping leading and trailing whitespace. A crash or a non-zero exit fails the case,
whatever the program printed. Standard error is ignored.

A solution with no test cases rejects everything, so add at least one.

!!! info "Test cases share one machine"

    All the test cases of a submission run on the same microVM, one after another, so a
    file written by the first case is still there for the second. Nothing is shared
    between submissions or between players: each gets its own machine, discarded
    afterwards.

## Settings

**Admin → Plugins → Sandbox** holds the microVM budget. It applies to every sandbox on
the instance: none of it is set per challenge, where the only knob is the solution's own
timeout.

| Setting | Default | Notes |
| --- | --- | --- |
| Base image | `python:3.14-slim` | OCI image every microVM boots from. It must provide `python3` on `PATH`. |
| vCPUs | `1` | Virtual CPUs given to each microVM. |
| Memory (MiB) | `256` | Guest RAM. The root disk is added on top, so a default machine costs the host 320 MiB. |
| Root disk (MiB) | `64` | tmpfs, so guest writes are RAM-backed and cost no host disk. Discarded with the machine. |
| Network access | `disabled` | What the guest may reach. See below. |
| Max concurrent microVMs | `8` | Ceiling across all challenges, per API worker (the image runs four by default, see `WORKERS`). |

`Max concurrent microVMs` sizes a semaphore built once at startup, so it only takes
effect after a restart. Every other setting is read fresh per submission and applies to
the next one.

### Network access

Submitted code has no network at all by default. Opening it up is an instance-wide
decision: every sandbox on the instance gets the same policy, for checkers and player
code alike.

| Value | The guest can reach |
| --- | --- |
| `disabled` | Nothing. |
| `internet` | Public addresses, plus the host's DNS resolver on port 53. Private ranges stay blocked, and with them the host's own network. |
| `all` | Everything, unfiltered, the host's own network included. |

`internet` is for a challenge that genuinely has to fetch something: an API, a remote
service you host, a package index. It stops deliberately short of `all`, because the
host's network is where Redis and the Postgres holding your flags sit.

!!! danger "`all` puts submitted code on your infrastructure's network"

    Nothing is filtered under `all`. Code a player submits can reach Redis, the database
    holding your flags, and anything else routable from the container. Use it only on an
    instance that has nothing worth reaching next to it.

## Limits

Fixed on every sandbox, whatever the settings say:

| Limit | Value |
| --- | --- |
| Captured output | 64 KiB per stream, truncated beyond that |
| Solution timeout | Between 1 and 30 seconds |
| Test cases | 20 per `Code runner` solution |
| Checker function | 64 KiB |

Submissions beyond the concurrency limit wait for a free slot rather than failing. A
microVM takes about a second to boot, which is the floor on how fast one of these
solutions can answer.

## Timeouts

Code that runs past its timeout is killed. The submission is recorded as **wrong**, so
the player sees a wrong answer and it counts towards malus. A `solution.timeout` entry
is also written to the [Events](../documentation/events.md) log with the solution and
team involved.

Those events are the signal that a challenge is misconfigured: a checker doing real work
on a slow instance, or a timeout set too tight for the algorithm the challenge asks for.
Watch the log after opening a code challenge.

!!! warning "Player output stays out of the logs"

    Only the size of what the sandbox produced is logged, never the content, so a
    checker that crashes cannot spill a flag into the container logs. Keep it that way:
    do not add printing to a checker to debug it on a live instance.
