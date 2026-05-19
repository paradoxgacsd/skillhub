package com.iflytek.skillhub.service.media;

import com.iflytek.skillhub.auth.rbac.PlatformPrincipal;
import com.iflytek.skillhub.domain.media.MediaAsset;
import com.iflytek.skillhub.domain.media.MediaAssetRole;
import com.iflytek.skillhub.domain.media.MediaAssetService;
import com.iflytek.skillhub.domain.media.MediaOwnerType;
import com.iflytek.skillhub.domain.media.MediaType;
import com.iflytek.skillhub.domain.namespace.Namespace;
import com.iflytek.skillhub.domain.namespace.NamespaceRepository;
import com.iflytek.skillhub.domain.namespace.NamespaceRole;
import com.iflytek.skillhub.domain.review.PromotionRequestRepository;
import com.iflytek.skillhub.domain.review.ReviewPermissionChecker;
import com.iflytek.skillhub.domain.shared.exception.DomainForbiddenException;
import com.iflytek.skillhub.domain.skill.Skill;
import com.iflytek.skillhub.domain.skill.SkillRepository;
import com.iflytek.skillhub.domain.skill.SkillStatus;
import com.iflytek.skillhub.domain.skill.SkillVersion;
import com.iflytek.skillhub.domain.skill.SkillVersionRepository;
import com.iflytek.skillhub.domain.skill.SkillVersionStatus;
import com.iflytek.skillhub.domain.skill.SkillVisibility;
import com.iflytek.skillhub.domain.skill.VisibilityChecker;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class MediaAssetAppServiceTest {

    private MediaAssetService mediaAssetService;
    private SkillRepository skillRepository;
    private SkillVersionRepository skillVersionRepository;
    private NamespaceRepository namespaceRepository;
    private MediaAssetAppService service;

    @BeforeEach
    void setUp() {
        mediaAssetService = mock(MediaAssetService.class);
        skillRepository = mock(SkillRepository.class);
        skillVersionRepository = mock(SkillVersionRepository.class);
        namespaceRepository = mock(NamespaceRepository.class);
        service = new MediaAssetAppService(
                mediaAssetService,
                skillRepository,
                skillVersionRepository,
                namespaceRepository,
                mock(PromotionRequestRepository.class),
                new ReviewPermissionChecker(),
                new VisibilityChecker()
        );
    }

    @Test
    void uploadAllowsSkillOwner() {
        Skill skill = skill(7L, "owner-1", SkillVisibility.PRIVATE);
        SkillVersion version = version(9L, 7L, SkillVersionStatus.UPLOADED);
        MediaAsset asset = asset(9L);
        given(skillVersionRepository.findById(9L)).willReturn(Optional.of(version));
        given(skillRepository.findById(7L)).willReturn(Optional.of(skill));
        given(mediaAssetService.upload(any())).willReturn(asset);
        MediaAssetService.UploadCommand command = command(MediaOwnerType.SKILL_VERSION, 9L, "owner-1");

        MediaAsset result = service.upload(command, principal("owner-1"), Map.of());

        assertThat(result).isSameAs(asset);
        verify(mediaAssetService).upload(command);
    }

    @Test
    void uploadRejectsUnrelatedUserForSkillVersionOwner() {
        Skill skill = skill(7L, "owner-1", SkillVisibility.PRIVATE);
        SkillVersion version = version(9L, 7L, SkillVersionStatus.UPLOADED);
        given(skillVersionRepository.findById(9L)).willReturn(Optional.of(version));
        given(skillRepository.findById(7L)).willReturn(Optional.of(skill));

        assertThatThrownBy(() -> service.upload(command(MediaOwnerType.SKILL_VERSION, 9L, "viewer-1"),
                principal("viewer-1"), Map.of()))
                .isInstanceOf(DomainForbiddenException.class)
                .hasMessage("error.media.owner.noPermission");

        verify(mediaAssetService, never()).upload(any());
    }

    @Test
    void readPublicPublishedSkillVersionMediaWithSingleContentLookup() {
        Skill skill = skill(7L, "owner-1", SkillVisibility.PUBLIC);
        skill.setLatestVersionId(9L);
        SkillVersion version = version(9L, 7L, SkillVersionStatus.PUBLISHED);
        MediaAsset asset = asset(9L);
        given(mediaAssetService.get(77L)).willReturn(asset);
        given(skillVersionRepository.findById(9L)).willReturn(Optional.of(version));
        given(skillRepository.findById(7L)).willReturn(Optional.of(skill));
        given(mediaAssetService.read(asset)).willReturn(new byte[] {1, 2});

        MediaAssetAppService.MediaReadResult result = service.read(77L, null, Map.of());

        assertThat(result.asset()).isSameAs(asset);
        assertThat(result.body()).containsExactly(1, 2);
        verify(mediaAssetService).get(77L);
        verify(mediaAssetService).read(asset);
        verify(mediaAssetService, never()).read(77L);
    }

    @Test
    void listSkillVersionMediaUsesVersionOwnerAndVisibility() {
        Namespace namespace = new Namespace("team", "Team", "owner-1");
        setField(namespace, "id", 5L);
        Skill skill = skill(7L, "owner-1", SkillVisibility.PUBLIC);
        skill.setLatestVersionId(9L);
        SkillVersion version = version(9L, 7L, SkillVersionStatus.PUBLISHED);
        MediaAsset asset = asset(9L);
        given(namespaceRepository.findBySlug("team")).willReturn(Optional.of(namespace));
        given(skillRepository.findByNamespaceIdAndSlug(5L, "demo")).willReturn(List.of(skill));
        given(skillVersionRepository.findBySkillIdAndVersion(7L, "1.0.0")).willReturn(Optional.of(version));
        given(mediaAssetService.listByOwner(MediaOwnerType.SKILL_VERSION, 9L)).willReturn(List.of(asset));

        List<MediaAsset> result = service.listSkillVersionMedia("team", "demo", "1.0.0", null, Map.of());

        assertThat(result).containsExactly(asset);
    }

    @Test
    void uploadSkillVersionMediaAllowsNamespaceAdminBeforePublicVisibility() {
        Namespace namespace = new Namespace("team", "Team", "owner-1");
        setField(namespace, "id", 5L);
        Skill skill = skill(7L, "owner-1", SkillVisibility.PRIVATE);
        SkillVersion version = version(9L, 7L, SkillVersionStatus.UPLOADED);
        MediaAsset asset = asset(9L);
        given(namespaceRepository.findBySlug("team")).willReturn(Optional.of(namespace));
        given(skillRepository.findByNamespaceIdAndSlug(5L, "demo")).willReturn(List.of(skill));
        given(skillVersionRepository.findBySkillIdAndVersion(7L, "1.0.0")).willReturn(Optional.of(version));
        given(skillVersionRepository.findById(9L)).willReturn(Optional.of(version));
        given(skillRepository.findById(7L)).willReturn(Optional.of(skill));
        given(mediaAssetService.upload(any())).willReturn(asset);

        MediaAsset result = service.uploadSkillVersionMedia(
                "team",
                "demo",
                "1.0.0",
                MediaAssetRole.DEMO,
                new byte[] {0x47, 0x49, 0x46, 0x38, 0x39, 0x61},
                "image/gif",
                "demo.gif",
                null,
                principal("admin-1"),
                Map.of(5L, NamespaceRole.ADMIN)
        );

        assertThat(result).isSameAs(asset);
        verify(mediaAssetService).upload(any());
    }

    private MediaAssetService.UploadCommand command(MediaOwnerType ownerType, Long ownerId, String uploader) {
        return new MediaAssetService.UploadCommand(
                ownerType,
                ownerId,
                MediaAssetRole.DEMO,
                new byte[] {0x47, 0x49, 0x46, 0x38, 0x39, 0x61},
                "image/gif",
                "demo.gif",
                null,
                uploader
        );
    }

    private PlatformPrincipal principal(String userId) {
        return new PlatformPrincipal(userId, userId, userId + "@example.com", "", "local", Set.of());
    }

    private Skill skill(Long id, String ownerId, SkillVisibility visibility) {
        Skill skill = new Skill(5L, "demo", ownerId, visibility);
        setField(skill, "id", id);
        skill.setStatus(SkillStatus.ACTIVE);
        return skill;
    }

    private SkillVersion version(Long id, Long skillId, SkillVersionStatus status) {
        SkillVersion version = new SkillVersion(skillId, "1.0.0", "owner-1");
        setField(version, "id", id);
        version.setStatus(status);
        return version;
    }

    private MediaAsset asset(Long ownerId) {
        MediaAsset asset = new MediaAsset(
                MediaOwnerType.SKILL_VERSION,
                ownerId,
                MediaType.GIF,
                MediaAssetRole.DEMO,
                "media/skill_version/" + ownerId + "/hash.gif",
                "image/gif",
                8,
                "hash",
                "owner-1"
        );
        setField(asset, "id", 77L);
        return asset;
    }

    private void setField(Object target, String fieldName, Object value) {
        try {
            Field field = target.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException e) {
            throw new AssertionError(e);
        }
    }
}
