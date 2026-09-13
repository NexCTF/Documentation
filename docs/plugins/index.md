---
icon: lucide/puzzle
---

# Plugins

A plugin is a Python package installed next to NexCTF that adds new types to the
platform: challenge types, solution types, scheduler job types, its own settings
section, and sometimes a panel in the player or admin interface.

## Official plugins

<div class="grid cards" markdown>

-   :lucide-box:{ .lg .middle } __[Sandbox](sandbox.md)__

    ---

    Runs untrusted code in a throwaway microVM. Adds a `Script checker` solution that
    validates answers with your own Python function, and a `Code runner` solution that
    runs the player's code against test cases.

    `nexctf-sandbox`

    [:octicons-arrow-right-24: Details](sandbox.md)

</div>
