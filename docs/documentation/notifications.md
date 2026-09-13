---
icon: lucide/bell
---

# Notifications

Announcements pushed to players while the event runs: a challenge going live, a hotfix on
a broken flag, a reminder that the scoreboard is about to freeze.

## The notification list

![Notification list](../assets/images/notifications/notifications.webp)

| Column | Meaning |
| --- | --- |
| Title | Headline shown to players. |
| Type | `Broadcast` for everyone, otherwise the notification is limited to the targeted teams. |
| Created by | Admin who sent it. |

## Sending a notification

![New notification](../assets/images/notifications/new_notification.webp)

| Field | Notes |
| --- | --- |
| Title | Headline shown to players. |
| Content | Body of the message. |
| Broadcast | Send to every user instead of specific teams. |
| Teams | Recipients when Broadcast is off. Pick one or more. |

Saving delivers the notification immediately: connected players get it pushed live, and
it also stays in their notification list so anyone who logs in later still sees it.
Players without a team only ever receive broadcasts.
