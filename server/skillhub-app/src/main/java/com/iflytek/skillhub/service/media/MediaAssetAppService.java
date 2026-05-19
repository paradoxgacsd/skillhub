package com.iflytek.skillhub.service.media;

import com.iflytek.skillhub.auth.rbac.PlatformPrincipal;
import com.iflytek.skillhub.domain.media.MediaAsset;
import com.iflytek.skillhub.domain.media.MediaAssetRole;
import com.iflytek.skillhub.domain.media.MediaAssetService;
import com.iflytek.skillhub.domain.media.MediaOwnerType;
import com.iflytek.skillhub.domain.namespace.Namespace;
import com.iflytek.skillhub.domain.namespace.NamespaceRepository;
import com.iflytek.skillhub.domain.namespace.NamespaceRole;
import com.iflytek.skillhub.domain.review.PromotionRequest;
import com.iflytek.skillhub.domain.review.PromotionRequestRepository;
import com.iflytek.skillhub.domain.review.ReviewPermissionChecker;
import com.iflytek.skillhub.domain.shared.exception.DomainBadRequestException;
import com.iflytek.skillhub.domain.shared.exception.DomainForbiddenException;
import com.iflytek.skillhub.domain.shared.exception.DomainNotFoundException;
import com.iflytek.skillhub.domain.skill.Skill;
import com.iflytek.skillhub.domain.skill.SkillRepository;
import com.iflytek.skillhub.domain.skill.SkillStatus;
import com.iflytek.skillhub.domain.skill.SkillVersion;
import com.iflytek.skillhub.domain.skill.SkillVersionRepository;
import com.iflytek.skillhub.domain.skill.SkillVersionStatus;
import com.iflytek.skillhub.domain.skill.VisibilityChecker;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Application boundary for media ownership checks and read visibility.
 */
@Service
public class MediaAssetAppService {

    private final MediaAssetService mediaAssetService;
    private final SkillRepository skillRepository;
    private final SkillVersionRepository skillVersionRepository;
    private final NamespaceRepository namespaceRepository;
    private final PromotionRequestRepository promotionRequestRepository;
    private final ReviewPermissionChecker reviewPermissionChecker;
    private final VisibilityChecker visibilityChecker;

    public MediaAssetAppService(MediaAssetService mediaAssetService,
                                SkillRepository skillRepository,
                                SkillVersionRepository skillVersionRepository,
                                NamespaceRepository namespaceRepository,
                                PromotionRequestRepository promotionRequestRepository,
                                ReviewPermissionChecker reviewPermissionChecker,
                                VisibilityChecker visibilityChecker) {
        this.mediaAssetService = mediaAssetService;
        this.skillRepository = skillRepository;
        this.skillVersionRepository = skillVersionRepository;
        this.namespaceRepository = namespaceRepository;
        this.promotionRequestRepository = promotionRequestRepository;
        this.reviewPermissionChecker = reviewPermissionChecker;
        this.visibilityChecker = visibilityChecker;
    }

    @Transactional
    public MediaAsset upload(MediaAssetService.UploadCommand command,
                             PlatformPrincipal principal,
                             Map<Long, NamespaceRole> userNamespaceRoles) {
        if (principal == null) {
            throw new DomainForbiddenException("error.media.upload.unauthenticated");
        }
        assertCanWrite(command.ownerType(), command.ownerId(), principal, safeRoles(userNamespaceRoles));
        return mediaAssetService.upload(command);
    }

    @Transactional(readOnly = true)
    public List<MediaAsset> listSkillVersionMedia(String namespaceSlug,
                                                  String skillSlug,
                                                  String version,
                                                  PlatformPrincipal principal,
                                                  Map<Long, NamespaceRole> userNamespaceRoles) {
        SkillVersionContext context = resolveSkillVersion(namespaceSlug, skillSlug, version, principal, userNamespaceRoles);
        assertCanReadSkillVersion(context.skill(), context.version(), principal, safeRoles(userNamespaceRoles));
        return mediaAssetService.listByOwner(MediaOwnerType.SKILL_VERSION, context.version().getId());
    }

    @Transactional
    public MediaAsset uploadSkillVersionMedia(String namespaceSlug,
                                              String skillSlug,
                                              String version,
                                              MediaAssetRole role,
                                              byte[] bytes,
                                              String contentType,
                                              String filename,
                                              String altText,
                                              PlatformPrincipal principal,
                                              Map<Long, NamespaceRole> userNamespaceRoles) {
        if (principal == null) {
            throw new DomainForbiddenException("error.media.upload.unauthenticated");
        }
        SkillVersionContext context = resolveSkillVersion(namespaceSlug, skillSlug, version, principal, userNamespaceRoles);
        MediaAssetService.UploadCommand command = new MediaAssetService.UploadCommand(
                MediaOwnerType.SKILL_VERSION,
                context.version().getId(),
                role,
                bytes,
                contentType,
                filename,
                altText,
                principal.userId()
        );
        return upload(command, principal, userNamespaceRoles);
    }

    @Transactional(readOnly = true)
    public MediaReadResult read(Long id,
                                PlatformPrincipal principal,
                                Map<Long, NamespaceRole> userNamespaceRoles) {
        MediaAsset asset = mediaAssetService.get(id);
        assertCanRead(asset, principal, safeRoles(userNamespaceRoles));
        return new MediaReadResult(asset, mediaAssetService.read(asset));
    }

    private void assertCanWrite(MediaOwnerType ownerType,
                                Long ownerId,
                                PlatformPrincipal principal,
                                Map<Long, NamespaceRole> userNamespaceRoles) {
        switch (ownerType) {
            case SKILL_VERSION -> {
                SkillVersion version = skillVersionRepository.findById(ownerId)
                        .orElseThrow(() -> new DomainNotFoundException("skill_version.not_found", ownerId));
                Skill skill = skillRepository.findById(version.getSkillId())
                        .orElseThrow(() -> new DomainNotFoundException("skill.not_found", version.getSkillId()));
                if (!canManageSkill(skill, principal, userNamespaceRoles)) {
                    throw new DomainForbiddenException("error.media.owner.noPermission");
                }
            }
            case PROMOTION_CAMPAIGN -> {
                PromotionRequest request = promotionRequestRepository.findById(ownerId)
                        .orElseThrow(() -> new DomainNotFoundException("promotion.not_found", ownerId));
                if (!reviewPermissionChecker.canViewPromotion(request, principal.userId(), platformRoles(principal))) {
                    throw new DomainForbiddenException("error.media.owner.noPermission");
                }
            }
            case SKILL_BUNDLE_VERSION -> throw new DomainBadRequestException("error.media.owner.unsupported", ownerType);
        }
    }

    private void assertCanRead(MediaAsset asset,
                               PlatformPrincipal principal,
                               Map<Long, NamespaceRole> userNamespaceRoles) {
        switch (asset.getOwnerType()) {
            case SKILL_VERSION -> {
                SkillVersion version = skillVersionRepository.findById(asset.getOwnerId())
                        .orElseThrow(() -> new DomainNotFoundException("skill_version.not_found", asset.getOwnerId()));
                Skill skill = skillRepository.findById(version.getSkillId())
                        .orElseThrow(() -> new DomainNotFoundException("skill.not_found", version.getSkillId()));
                assertCanReadSkillVersion(skill, version, principal, userNamespaceRoles);
            }
            case PROMOTION_CAMPAIGN -> {
                PromotionRequest request = promotionRequestRepository.findById(asset.getOwnerId())
                        .orElseThrow(() -> new DomainNotFoundException("promotion.not_found", asset.getOwnerId()));
                if (principal == null || !reviewPermissionChecker.canViewPromotion(request, principal.userId(), platformRoles(principal))) {
                    throw new DomainForbiddenException("error.media.access.denied");
                }
            }
            case SKILL_BUNDLE_VERSION -> throw new DomainForbiddenException("error.media.access.denied");
        }
    }

    private void assertCanReadSkillVersion(Skill skill,
                                           SkillVersion version,
                                           PlatformPrincipal principal,
                                           Map<Long, NamespaceRole> userNamespaceRoles) {
        String userId = principal != null ? principal.userId() : null;
        Set<String> platformRoles = platformRoles(principal);
        if (canManageSkill(skill, principal, userNamespaceRoles)) {
            return;
        }
        if (skill.getStatus() != SkillStatus.ACTIVE || skill.isHidden()) {
            throw new DomainForbiddenException("error.media.access.denied");
        }
        if (version.getStatus() != SkillVersionStatus.PUBLISHED) {
            throw new DomainForbiddenException("error.media.access.denied");
        }
        if (!visibilityChecker.canAccess(skill, userId, userNamespaceRoles, platformRoles)) {
            throw new DomainForbiddenException("error.media.access.denied");
        }
    }

    private SkillVersionContext resolveSkillVersion(String namespaceSlug,
                                                    String skillSlug,
                                                    String version,
                                                    PlatformPrincipal principal,
                                                    Map<Long, NamespaceRole> userNamespaceRoles) {
        Namespace namespace = namespaceRepository.findBySlug(namespaceSlug)
                .orElseThrow(() -> new DomainNotFoundException("namespace.not_found", namespaceSlug));
        String userId = principal != null ? principal.userId() : null;
        List<Skill> candidates = skillRepository.findByNamespaceIdAndSlug(namespace.getId(), skillSlug);
        if (candidates.isEmpty()) {
            throw new DomainNotFoundException("skill.not_found", skillSlug);
        }

        for (Skill candidate : candidates) {
            SkillVersion skillVersion = skillVersionRepository.findBySkillIdAndVersion(candidate.getId(), version)
                    .orElse(null);
            if (skillVersion == null) {
                continue;
            }
            if (canManageSkill(candidate, principal, safeRoles(userNamespaceRoles))) {
                return new SkillVersionContext(candidate, skillVersion);
            }
        }

        for (Skill candidate : candidates) {
            SkillVersion skillVersion = skillVersionRepository.findBySkillIdAndVersion(candidate.getId(), version)
                    .orElse(null);
            if (skillVersion == null) {
                continue;
            }
            if (visibilityChecker.canAccess(candidate, userId, safeRoles(userNamespaceRoles), platformRoles(principal))) {
                return new SkillVersionContext(candidate, skillVersion);
            }
        }

        throw new DomainNotFoundException("skill_version.not_found", version);
    }

    private boolean canManageSkill(Skill skill,
                                   PlatformPrincipal principal,
                                   Map<Long, NamespaceRole> userNamespaceRoles) {
        if (principal == null) {
            return false;
        }
        if (platformRoles(principal).contains("SUPER_ADMIN")) {
            return true;
        }
        NamespaceRole role = userNamespaceRoles.get(skill.getNamespaceId());
        return skill.getOwnerId().equals(principal.userId())
                || role == NamespaceRole.ADMIN
                || role == NamespaceRole.OWNER;
    }

    private Map<Long, NamespaceRole> safeRoles(Map<Long, NamespaceRole> userNamespaceRoles) {
        return userNamespaceRoles != null ? userNamespaceRoles : Map.of();
    }

    private Set<String> platformRoles(PlatformPrincipal principal) {
        return principal != null && principal.platformRoles() != null ? principal.platformRoles() : Set.of();
    }

    private record SkillVersionContext(Skill skill, SkillVersion version) {}

    public record MediaReadResult(MediaAsset asset, byte[] body) {}
}
