---
icon: lucide/trophy
---

# Competition

The event itself: its name, when it runs, how teams form, and what players may change
for themselves.

The settings live under **Admin → Settings → Competition**.

| Setting | Key | Default |
| --- | --- | --- |
| CTF name | `ctf.name` | `NexCTF` |
| CTF description | `ctf.description` | Empty |
| Start time | `ctf.start_time` | Empty, open immediately |
| End time | `ctf.end_time` | Empty, never ends |
| Freeze time | `ctf.freeze_time` | Empty, never frozen |
| Hide challenges before start | `ctf.hide_challenges_before_start` | On |
| Max team size | `ctf.team_size` | `4` |
| Allow registration | `ctf.allow_registration` | On |
| Scheduler timezone | `ctf.timezone` | `UTC` |
| Allow team creation | `ctf.allow_team_creation` | On |
| Allow team changes | `ctf.allow_team_changes` | On |
| Allow profile customization | `ctf.allow_user_customization` | On |
| Allow team customization | `ctf.allow_team_customization` | On |
| Enable challenge feedback | `ctf.enable_challenge_feedback` | On |
| Release writeups after end | `ctf.release_writeups_after_end` | Off |

**Save** sends every changed setting at once, from every tab, and a dot on a tab marks
the ones with unsaved changes. Each save is recorded in the [event log](../events.md)
as `config.updated`, with the old and new value of every key. The
[Admin API](../../api/admin.md) reads and writes the same keys.

## Name and description

**CTF name** is the browser tab title, the text shown wherever no logo is set, and the
name in every email the instance sends. **CTF description** is the blurb on the default
home page. Both are part of rebranding the instance; see
[Customization](../customization.md).

## Event times

The three times are absolute moments. The picker takes them in your browser's timezone,
stores them in UTC, and echoes the result under the field in UTC, and in the scheduler
timezone when that is not UTC, so you can check what you entered before saving.

| Time | Before it | After it |
| --- | --- | --- |
| Start time | Submissions and hint unlocks are refused. The challenge list is hidden too while **Hide challenges before start** is on. | The event is open. |
| Freeze time | The scoreboard is live. | The public scoreboard, score history and team pages stop counting new solves. The admin scoreboard is unaffected. |
| End time | The event is open. | Submissions, hint unlocks and team changes are refused, and nothing scored afterwards counts. |

An empty time imposes nothing: no start time means the event is open from the moment
the instance is, and no end time means it never closes. They must come in order, start
before freeze before end, or the save is refused.

These rules apply to admins as well when they use the player side, so an admin can check
what players see by browsing the challenges. The admin panel itself is never gated.

!!! info "Hidden or just closed before the start"
    With **Hide challenges before start** on, players see no challenges at all until the
    start, and team pages leave out their challenge progress. Turned off, players can
    read the challenges in advance, with a banner saying that submissions open at the
    start, but still cannot submit.

### Freezing the scoreboard

A freeze keeps the final ranking a surprise. Past the freeze time, the public scoreboard
shows the standings at that moment, while the event carries on underneath: solves are
still recorded and still scored. A team still sees its own progress on its own team page,
and admins see the live ranking under **Admin → Scoreboard**.

!!! warning "The freeze outlasts the event"
    The end time does not lift the freeze: the public scoreboard keeps showing the
    standings at the freeze time after the event is over. To reveal the final ranking,
    clear **Freeze time** and save.

Moving or clearing the freeze or end time refreshes the cached scoreboard immediately.

## Teams

| Setting | Effect |
| --- | --- |
| Max team size | How many active members a team can hold. A player joining with an invite code is refused once the team is full. |
| Allow team creation | Lets players create a team, and become its first member. Off, players can only join an existing team. |
| Allow team changes | Lets players create, join or leave a team, and rotate their team's invite code. |

Team changes close for good at the end time, whatever the setting says.

!!! warning "A team that has scored cannot be left"
    A player cannot leave a team once it has solved a question, so points never follow a
    player from one team to another. Admins can still move a player from
    **Admin → Users**.

**Max team size** is checked when a player joins, not afterwards: lowering it leaves
existing teams as they are, and an admin assigning a player to a team is not held to it.

## Registration

**Allow registration** turns the sign-up form off without touching existing accounts.
It also stops [external providers](../authentication.md#how-accounts-are-matched) from
creating new accounts. Saving it from the browser needs a
[recent sign-in](../authentication.md#re-authentication). See
[Registration](../authentication.md#registration) for what an open form asks for.

## Scheduler timezone

The zone [cron expressions](../scheduler.md#repeating-jobs) are read in, so a job set
for midnight stays at midnight across a daylight-saving shift. It changes nothing about
the event times above, which are absolute.

## Profiles

**Allow profile customization** lets players edit their own links and custom fields.
**Allow team customization** lets any team member edit the team name, country, links and
custom fields. Turning either off freezes what is already there rather than clearing it,
which is the usual way to lock team names once the scoreboard is public. See
[Customization](../customization.md#what-players-can-change-for-themselves).

## Challenges

**Enable challenge feedback** lets a team rate and comment on a challenge once it has
solved every question in it; the results are under [Feedback](../feedback.md).

**Release writeups after end** shows every challenge's writeup to everyone once the end
time has passed, including challenges a team never solved. Without it, a writeup is only
ever shown to a team that completed the challenge.
