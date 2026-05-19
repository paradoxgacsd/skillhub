# GIF Media Display v1.0 PRD

## Goal

Allow skill version pages to attach and display structured GIF or image media for demos, covers, and screenshots without embedding those assets in package documentation.

## Scope

- Store media metadata in `media_asset` with immutable object-storage content.
- Support `SKILL_VERSION`, `SKILL_BUNDLE_VERSION`, and `PROMOTION_CAMPAIGN` owner coordinates, with Skill version display as the first integrated owner.
- Validate media by magic bytes instead of trusting file extensions or declared content type.
- Apply default limits of 10 MB for general GIF/image assets and 5 MB for promotion GIF assets.
- Serve media through `/api/v1/media/{id}` only after owner visibility checks.
- Expose Skill version media through `/api/v1|web/skills/{namespace}/{slug}/versions/{version}/media`.

## Non-Goals

- Full SkillBundle UI integration.
- Full PromotionCampaign UI integration.
- Moderated media review workflow.

## Acceptance Criteria

- Public users can read media for public, active, published Skill versions.
- Skill owners, namespace owners/admins, and super admins can upload media for owned/manageable Skill versions.
- A caller cannot upload media to an arbitrary Skill version they do not manage.
- WebP validation requires both `RIFF` at byte offset 0 and `WEBP` at byte offset 8.
- Promotion GIF uploads use the promotion-specific 5 MB limit.
- Detail pages render DEMO media when present and use COVER media as the static fallback.
