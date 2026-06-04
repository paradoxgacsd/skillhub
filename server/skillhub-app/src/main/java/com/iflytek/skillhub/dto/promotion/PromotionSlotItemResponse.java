package com.iflytek.skillhub.dto.promotion;

import com.iflytek.skillhub.domain.promotion.PromotionCampaign;
import com.iflytek.skillhub.domain.promotion.PromotionTargetType;

/**
 * Public-facing item rendered into a promotion slot. Excludes audit fields and
 * version sequence to avoid leaking review state to anonymous readers.
 */
public record PromotionSlotItemResponse(
        Long campaignId,
        String slotCode,
        PromotionTargetType targetType,
        Long targetId,
        String title,
        String subtitle,
        String coverUrl,
        String demoGifUrl,
        String targetUrl,
        String targetNamespace,
        String targetSlug,
        String targetName,
        String targetSummary,
        String targetVersion,
        Long downloadCount,
        Integer starCount
) {
    public static PromotionSlotItemResponse from(PromotionCampaign c, String targetUrl) {
        return from(c, targetUrl, null);
    }

    public static PromotionSlotItemResponse from(PromotionCampaign c, String targetUrl, SkillPromotionTargetView target) {
        String coverUrl = c.getCoverMediaId() == null ? null : "/api/v1/media/" + c.getCoverMediaId();
        String demoUrl = c.getDemoMediaId() == null ? null : "/api/v1/media/" + c.getDemoMediaId();
        return new PromotionSlotItemResponse(
                c.getId(), c.getSlotCode(), c.getTargetType(), c.getTargetId(),
                c.getTitle(), c.getSubtitle(),
                coverUrl, demoUrl,
                targetUrl,
                target == null ? null : target.namespace(),
                target == null ? null : target.slug(),
                target == null ? null : target.name(),
                target == null ? null : target.summary(),
                target == null ? null : target.version(),
                target == null ? null : target.downloadCount(),
                target == null ? null : target.starCount()
        );
    }

    public record SkillPromotionTargetView(
            String namespace,
            String slug,
            String name,
            String summary,
            String version,
            Long downloadCount,
            Integer starCount
    ) {}
}
