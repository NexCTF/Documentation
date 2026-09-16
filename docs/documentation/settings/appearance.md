---
icon: lucide/palette
---

# Appearance

Logos, accent color, favicon, login background, the theme visitors land on, and a slot
for your own CSS. Every field is optional, and an empty one falls back to the NexCTF
default rather than showing nothing.

The settings live under **Admin → Settings → Appearance**.

| Setting | Type | Default |
| --- | --- | --- |
| Logo URL | Image | Empty, the CTF name is shown as text |
| Logo URL (dark mode) | Image | Empty, falls back to the main logo |
| Accent Color | Color | `#3b82f6` |
| Favicon URL | Image | Empty, the bundled NexCTF icon |
| Login Background URL | Image | Empty, the card sits on the page background |
| Default Theme | Choice | `system` |
| Custom CSS | Text | Empty |

**Save** applies the whole category at once, and a dot on the tab marks unsaved changes.
Everything but **Default Theme** repaints open pages immediately over the public event
stream; a page that missed the push picks the change up within 60 seconds. The
[Admin API](../../api/admin.md) reads and writes the same values under
`appearance.logo_url`, `appearance.logo_url_dark`, `appearance.accent_color`,
`appearance.favicon_url`, `appearance.login_background_url`, `appearance.default_theme`
and `appearance.custom_css`.

## Logo

Two fields, one per theme. The dark one applies only when the dark theme is active and
only when it is set; otherwise the main logo serves both. The fallback runs one way:
setting only the dark logo leaves the light theme showing the CTF name as text.

The logo replaces the CTF name, so a lockup carrying your event name is the right asset.
It is scaled to fit, never cropped:

| Where | Height | Maximum width |
| --- | --- | --- |
| Player navigation bar | 28 px | 160 px |
| Admin sidebar | 24 px | 112 px |
| Home page | 64 px | 320 px |
| Login card | 64 px | No limit |
| Verification and password reset email | 48 px | No limit |

A lockup around 320 × 64 covers every slot, and SVG stays sharp at all of them.

!!! info "Email always uses the light logo"

    Transactional emails are rendered on a white background, so they take **Logo URL**
    and never the dark variant. Some mail clients will not render SVG, which is the one
    case for supplying a PNG. An uploaded logo works here: its site-relative URL is made
    absolute against the instance's public address before the message goes out.

!!! tip "Transparent backgrounds"

    The logo is drawn straight onto the page and the sidebar, both of which change color
    with the theme, so a PNG with a white box baked in shows that box in dark mode.
    Export with a transparent background, or fill the dark variant field.

## Accent color

One color for buttons, badges, links, active tabs and focus rings. It must be six-digit
hex with a leading `#`: three-digit shorthand, `rgb()` and CSS color names are ignored
and fall back to the built-in NexCTF blue. The picker beside the field always produces a
valid value.

The shade is adjusted before use. NexCTF measures it against each background it will be
drawn on and shifts it, darker on light surfaces and lighter on dark ones, until it
clears:

| Use | Target contrast |
| --- | --- |
| Accent as text, and as a fill behind text | 4.5:1, WCAG AA for body text |
| Focus rings and other interface outlines | 3:1, WCAG AA for interface elements |

The two themes are adjusted independently, so a pale color comes out noticeably darker
in light mode while staying close to itself in dark mode. Text placed on an accent fill
is picked to match, so no choice of accent can produce an unreadable button.

## Favicon

Shown in the browser tab and in bookmarks. Setting it replaces every icon the app
declares, at every size, including the Apple touch icon. Clearing it restores the
bundled NexCTF icon and its PNG fallbacks at 16, 32, 48 and 180 pixels. One SVG covers
everything; a raster image should be 180 × 180.

## Login background

A full-bleed image behind the login card, covering the viewport and centered. It also
covers the two screens that replace the login form, *account disabled* and *email not
verified*. The card is opaque, so a busy image stays readable. Keep the file small,
since it loads before the visitor has a session.

## Default theme

Which theme a visitor gets before they pick one.

| Value | Effect |
| --- | --- |
| `system` | Follow the operating system setting, and keep following it when it changes. |
| `light` | Light theme. |
| `dark` | Dark theme. |

!!! warning "It only applies to visitors who have never picked a theme"

    The theme toggle stores the visitor's choice in their browser, and that choice wins.
    Anyone administering an instance has almost certainly used the toggle, so check this
    setting in a private window. A visitor who has already chosen cannot be overridden:
    it is an accessibility preference, not a branding decision.

## Custom CSS

Arbitrary CSS, injected into every page as a `<style>` element after the app's own
stylesheet. The escape hatch for what the fields above do not cover: the weight of a
heading, the corner radius of a card, hiding an element you do not use.

!!! danger "Custom CSS is public"

    It is served to every visitor, signed in or not, as part of the public instance
    information. Treat it as published content.

The app's colors are CSS custom properties, so retheming a surface is usually one
redefinition rather than a hunt for selectors:

```css
/* Tint every card surface with the accent, in dark mode. */
.dark {
  --card: color-mix(in oklab, var(--nexctf-surface), var(--nexctf-accent) 6%);
}
```

Nothing validates what you type. The browser drops malformed rules one at a time rather
than rejecting the block, so a stray brace silently takes the rest with it. Clearing the
field restores the stock appearance immediately.

## Uploading images

The four image fields take a pasted URL or an upload. **Upload** stores the file in
object storage, marks it public and fills in its URL, so the asset is served from the
same origin as the app and appears in the [file manager](../files.md) like any other
public file. An external URL works too, with the usual caveats: the host has to stay up
for as long as the event runs, and it sees a request from every visitor.
