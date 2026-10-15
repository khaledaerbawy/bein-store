# Free Facebook automation

This branch is a draft for a cloud-based scheduler that can publish to three Facebook Pages using Meta Graph API, with no paid AI API. Do not enable publishing until the owner adds the required secrets and verifies the Meta permissions.

- Schedule: three runs per day; one post per page per run.
- Artwork: locally rendered HTML/CSS PNG on GitHub-hosted runners.
- Captions: Arabic educational templates, not paid AI generation.
- Dashboard: separate route in the existing Bein Store app.
- Secrets must be stored in GitHub Actions Secrets, never committed.

Review the official GitHub Actions, Supabase, and Meta quotas before activation.
