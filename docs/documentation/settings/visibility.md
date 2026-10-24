---
icon: lucide/eye
---

# Visibility

Who can see the scoreboard, the challenges, and the members of other teams.

The settings live under **Admin → Settings → Visibility**.

| Setting | Key | Default |
| --- | --- | --- |
| Scoreboard visibility | `visibility.scoreboard` | `public` |
| Challenges visibility | `visibility.challenges` | `authenticated` |
| Show team members | `visibility.show_team_members` | On |

## Levels

The two visibility settings take the same three values:

| Value | Shown in the interface as | Who sees it |
| --- | --- | --- |
| `public` | Public | Anyone, signed in or not. |
| `authenticated` | Authenticated users | Signed-in accounts. Anonymous requests are refused with **401**. |
| `hidden` | Hidden (admins only) | Nobody on the player side; requests are refused with **403**. Admins keep their own views in the admin panel. |

`hidden` applies to admins too when they browse the player side: they are treated as
players there, and find the data under **Admin** instead.

## Scoreboard

**Scoreboard visibility** covers the scoreboard, its score history, and every team's
public profile page. Hidden, a team's own page still shows its members and challenge
progress, but no longer its rank.

`public` lets the scoreboard be shared before sign-up and watched by spectators. It is
cached and pushed live, so a crowd watching it does not translate into database load.
`hidden` suits an event that announces its results at a ceremony; for that, a
[freeze](competition.md#freezing-the-scoreboard) is often the better tool, since it hides
the end of the race while keeping the board up.

## Challenges

**Challenges visibility** covers the challenge list and every challenge page. Submitting
always needs a signed-in account with a team, whatever this setting says, so `public`
only lets visitors read: it turns the challenge list into a showcase for the event.

`hidden` takes the challenges away from players without deactivating them one by one,
for instance while the board is being fixed mid-event. [Hide challenges before
start](competition.md#event-times) is the setting for keeping them out of sight until the
event opens.

## Team members

**Show team members** lists the members on each team's public profile page. Off, a team
page shows only the team itself, its score and its progress, which keeps players from
being identified through their team. A team always sees its own members.
