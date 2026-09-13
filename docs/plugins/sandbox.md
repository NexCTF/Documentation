---
icon: lucide/box
---

# Sandbox

`nexctf-sandbox` adds two solution types that run code in a throwaway
[microVM](https://github.com/microsandbox/microsandbox): one where **you** write the
code that grades the answer, one where the **player** writes the code being graded.

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
| `/dev/kvm`, readable and writable by the container | Hardware virtualization. Without it no sandbox boots: `Script checker` then marks every answer wrong, and `Code runner` answers the player with a server error. |
| `NET_ADMIN` capability | Lets the sandbox install the firewall rules that deny the guest network access. |
| Memory headroom | A microVM takes 320 MiB and up to eight run at once per API worker, so 2.5 GB per worker at full load. |
| Free disk for the guest image | The `python:3.12-slim` image is pulled on the first submission and cached inside the container. |

!!! danger "Without `NET_ADMIN` the sandbox has network access"

    Egress denial is enforced by firewall rules the sandbox programs itself. On a host
    that does not let it, the policy is silently not applied and player code can reach
    your internal network. Check it once after deploying, with a `Code runner` challenge
    that tries to open a connection.

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
      NEXCTF_PLUGINS: nexctf-sandbox==0.1.0
    devices:
      - /dev/kvm
    cap_add:
      - NET_ADMIN
    group_add:
      - "994"
```

```console
$ docker compose up -d --force-recreate app
```

Then check the device is usable from inside the container:

```console
$ docker compose exec app test -r /dev/kvm -a -w /dev/kvm && echo ok
```

See [Installing plugins](installation.md) for private indexes, custom CAs and removal.

## Script checker

The answer is passed to a function you write, and whatever it returns decides the
verdict.

| Field | Notes |
| --- | --- |
| Checker function | Python 3. Must define `check(answer, team_id)` returning a boolean. Up to 64 KiB. |
| Timeout (s) | Between 1 and 30, `5` by default. |

```python
def check(answer: str, team_id: str | None) -> bool:
    return answer.strip().lower() == "42"
```

`answer` is exactly what the player submitted. `team_id` is the submitting player's
team, or `None` when they are not in one. Use it for per-team flags:

```python
import hashlib

def check(answer: str, team_id: str | None) -> bool:
    expected = hashlib.sha256(f"s3cr3t{team_id}".encode()).hexdigest()[:16]
    return answer.strip() == f"NEX{{{expected}}}"
```

Anything the function prints is ignored, and an exception inside it counts as a wrong
answer rather than an error the player sees, and so does a syntax error. A broken
checker therefore rejects every player silently: submit a known-good answer yourself
once after writing one. The checker code is admin-only, and never part of what the player-facing
API returns.

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

## Limits

Set on every sandbox and not configurable per challenge:

| Limit | Value |
| --- | --- |
| Guest image | `python:3.12-slim` |
| CPU | 1 core |
| Memory | 320 MiB |
| Disk | 64 MiB, in memory, discarded with the machine |
| Network | Denied |
| Captured output | 64 KiB, truncated beyond that |
| Concurrent sandboxes | 8 per API worker (the image runs four by default, see `WORKERS`) |

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
