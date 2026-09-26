---
icon: lucide/calendar-clock
---

# Scheduler

Jobs that fire at a chosen date and time, once or on a repeating schedule: open a
challenge at the start of a round, post a reminder before the freeze, close everything
when the event ends.

!!! warning "Requires the worker"

    Jobs are executed by the background worker, a separate process from the API inside
    the `app` container. If it is not running, jobs simply stay pending and nothing
    fires. See [Deployment](deployment.md#what-runs).

## The job list

![Job list](../assets/images/scheduler/scheduler.webp)

| Column | Meaning |
| --- | --- |
| ID | Identifier of the job, with a copy button. |
| Name | Label given when the job was created. |
| Type | What the job does, see [Job types](#job-types). |
| Next run | When the job is due, in your local timezone, with the cron expression underneath for repeating jobs. |
| Status | `scheduled` for a job still waiting, `completed` once a one-shot job has run, `disabled` for a job that is turned off. |
| Last run | When the job was last due to run. |

## Creating a job

![New job](../assets/images/scheduler/new_scheduler.webp)

| Field | Notes |
| --- | --- |
| Name | Free-form label, only used in the admin panel. |
| Job type | What the job does. The Parameters section changes with the type. |
| Scheduled at | Date and time the job is due, entered in your local timezone. With a cron expression it becomes **First run (optional)**: leave it empty and the first cron occurrence is used. |
| Repeat (cron) | Optional cron expression. Empty means the job fires once. See [Repeating jobs](#repeating-jobs). |
| Active | On by default. A job that is not active never fires. |
| Parameters | Type-specific, see below. |

A job needs either a date or a cron expression, and can have both.

!!! info "Jobs fire on the second"

    Once a minute the worker queues every job due within the next minute, each one
    held back until its exact time. A job scheduled for `18:00:30` starts at
    `18:00:30`, never before. The exception is a job created or moved less than a
    minute before it is due: it waits for the next pass, so it can start up to a minute
    late.

## Repeating jobs

A cron expression turns a one-shot job into a repeating one. Standard 5-field syntax is
accepted, and 6 fields when you need seconds, with the seconds field first. A job fires
at most once a minute, so that seconds field must name a single value: `30 0 * * * *`
is accepted, `*/10 * * * * *` is refused.

| Expression | Fires |
| --- | --- |
| `0 0 * * *` | Every day at midnight. |
| `*/5 * * * *` | Every five minutes. |
| `0 9 * * 1` | Every Monday at 09:00. |

The field previews the next fire times as you type, and refuses to save an expression it
cannot parse or that fires more than once a minute.

!!! info "Which timezone applies"

    Cron expressions are read in the **event timezone**, set by `ctf.timezone` in
    [Competition settings](settings/competition.md), so "every day at midnight" stays at
    midnight across a daylight-saving shift. Times are always *displayed* in the local
    timezone of whoever is looking at the page.

As soon as a run is queued the job is rescheduled to its next occurrence and stays
`scheduled`. A repeating job runs until you disable or delete it; if its expression
somehow becomes unparsable, the job is deactivated instead of firing at the wrong time.

## Job types

### `toggle_challenge`

Turns a challenge on or off.

![New toggle_challenge job](../assets/images/scheduler/new_scheduler_toggle_challenge.webp)

| Parameter | Notes |
| --- | --- |
| Challenge Id | The challenge to change. |
| Make Active | On makes the challenge visible to players, off hides it. |

Two jobs on the same challenge, one with Make Active on and one off, give you a release
window.

### `send_notification`

Sends the same message the [Notifications](notifications.md) page sends, at a chosen time.

![New send_notification job](../assets/images/scheduler/new_scheduler_send_notification.webp)

| Parameter | Notes |
| --- | --- |
| Title | Headline shown to players. |
| Content | Body of the message. |
| Is Broadcast | Send to every user instead of specific teams. |
| Team Ids | Recipients when Is Broadcast is off. |

### `backup_database`

Dumps the database to object storage, the same dump **Admin → Backups** takes by hand.
This is how you get nightly backups without a cron job on the host.

| Parameter | Notes |
| --- | --- |
| Keep Last | How many dumps to keep. Older ones are deleted after each run. Between `1` and `100`, defaults to `7`. |

Pair it with a cron expression: `0 3 * * *` with **Keep Last** at `7` gives you a
week of nightly dumps on a prefix that never grows. See
[Backups](deployment.md#backups) for what a dump contains, and what it does not.

!!! warning "Pruning happens after the dump, not before"
    **Keep Last** counts scheduled backups and the ones you took by hand alike. Set it
    high enough that a manual backup taken before an upgrade is not swept away by that
    night's run. Pre-restore backups are the exception: they are never counted and never
    pruned.

More job types can be added by a [plugin](../plugins/index.md).

## Job details

Opening a job shows what it will do and what it has done.

![Job details](../assets/images/scheduler/scheduler_details.webp)

**Next run** and **Repeat (cron)** show when the job fires next and, for a repeating job,
the expression driving it. **Edit** changes the name, schedule, cron and parameters,
**Disable** stops a job from firing, and **Delete** removes it along with its history.

**Run now** executes the job immediately, without touching its schedule: the job still
fires on its own at its next run time afterwards. Useful for checking that the parameters
are right.

### Execution history

Every run is recorded with its status, start and completion time, and the error message
if it failed.

A failed run is **not** retried. A one-shot job is retired either way, and a repeating
job moves on to its next occurrence, so check the history after an important job was due.
Only the last 100 runs of a job are kept.

Two failures are recorded by the platform rather than by the job itself:

| Error | Meaning |
| --- | --- |
| `skipped: the previous run is still in progress` | The job came due while its last run had not finished. Scheduled runs of one job never overlap, so this occurrence is dropped. |
| `lost: the run ended without recording a result` | The run never reported back: the worker was stopped mid-run and the run outlasted its five minute grace period, or the run hit its one hour limit and was stopped. |
