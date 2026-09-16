---
icon: lucide/brush
---

# Customization

A fresh instance is called NexCTF and wears the NexCTF colors. Rebranding it is optional
and touches four places. This page is the map; each setting is documented on the page it
links to.

## What to change, in order

1. **[Name and description](settings/competition.md)**. **CTF Name** is the browser tab
   title, the fallback wherever no logo is set, and the name in every email the
   instance sends. **CTF Description** is the blurb on the home page. Both sit under
   **Admin → Settings → Competition**.
2. **[Logo, colors and favicon](settings/appearance.md)**. One accent color, two logos,
   a favicon, a login background, and a custom CSS slot for the rest. Under
   **Admin → Settings → Appearance**.
3. **[Pages](pages.md)**. Rules, sponsors, a code of conduct, an FAQ: Markdown pages of
   your own, in the player navigation.
4. **[Links](links.md)**. Shortcuts out to a Discord server, an event site or a status
   page, in the player navigation bar or the admin sidebar.

## Where the branding shows up

| Setting | Category | Seen on |
| --- | --- | --- |
| CTF Name | Competition | Tab title, navigation bar, login and registration cards, outgoing email |
| Logo URL | Appearance | Player navigation bar, admin sidebar, home page, login card, outgoing email |
| Accent Color | Appearance | Buttons, badges, links, active tabs, focus rings |
| Favicon URL | Appearance | Browser tab, bookmarks, home screen icons |
| Login Background URL | Appearance | The login screen and its error states |

## What players can change for themselves

Two Competition settings, both on by default:

- **Allow Profile Customization** lets players edit their own links and custom fields.
- **Allow Team Customization** lets team members edit the team name, country, links and
  custom fields.

Turning either off mid-event freezes what is already there rather than clearing it,
which is the usual reason to reach for them: locking team names once the scoreboard is
public. The custom fields themselves are yours to define, under
[Users & Teams](users-teams.md).

## Beyond the settings

[Custom CSS](settings/appearance.md#custom-css) covers small visual changes without
touching the code. Past that, the [plugin system](../plugins/index.md) is the supported
way to add behavior of your own: challenge types, solution strategies, scheduler jobs
and frontend components, without forking.
