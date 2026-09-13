---
icon: lucide/link
---

# Links

Shortcuts to resources hosted outside the platform: a Discord server, the event website,
a status page, or an internal dashboard only the staff should see.

## The link list

![Link list](../assets/images/links/links.webp)

| Column | Meaning |
| --- | --- |
| Name | Label shown on the link. |
| URL | Destination. |
| Visibility | `Public` for players, `Admin` for staff only. |
| Status | Disabled links are kept but shown nowhere. |

## Creating a link

![New link](../assets/images/links/new_link.webp)

| Field | Notes |
| --- | --- |
| Name | Label shown on the link. |
| URL | Absolute destination, e.g. `https://discord.gg/...`. |
| Visibility | `public` adds it to the player navigation bar, `admin` to the admin sidebar. |
| Enabled | On by default. Turn it off to hide the link without deleting it. |

Links always open in a new tab.

!!! info "Public links are cached"

    The player-facing list is served from a cache with a 60 second lifetime, so adding,
    editing or disabling a public link can take up to a minute to reach players. Admin
    links are not cached.
