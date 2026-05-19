package com.iflytek.skillhub.controller.portal;

import com.iflytek.skillhub.auth.rbac.PlatformPrincipal;
import com.iflytek.skillhub.controller.BaseApiController;
import com.iflytek.skillhub.domain.media.MediaAssetRole;
import com.iflytek.skillhub.domain.namespace.NamespaceRole;
import com.iflytek.skillhub.dto.ApiResponse;
import com.iflytek.skillhub.dto.ApiResponseFactory;
import com.iflytek.skillhub.dto.media.MediaAssetResponse;
import com.iflytek.skillhub.service.media.MediaAssetAppService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 * Skill-version media endpoints used by detail pages and owner upload flows.
 */
@RestController
@RequestMapping({"/api/v1/skills/{namespace}/{slug}/versions/{version}/media",
        "/api/web/skills/{namespace}/{slug}/versions/{version}/media"})
public class SkillMediaController extends BaseApiController {

    private final MediaAssetAppService mediaAssetAppService;

    public SkillMediaController(MediaAssetAppService mediaAssetAppService, ApiResponseFactory responseFactory) {
        super(responseFactory);
        this.mediaAssetAppService = mediaAssetAppService;
    }

    @GetMapping
    public ApiResponse<List<MediaAssetResponse>> listVersionMedia(
            @PathVariable String namespace,
            @PathVariable String slug,
            @PathVariable String version,
            @AuthenticationPrincipal PlatformPrincipal principal,
            @RequestAttribute(value = "userNsRoles", required = false)
            Map<Long, NamespaceRole> userNsRoles) {
        List<MediaAssetResponse> response = mediaAssetAppService
                .listSkillVersionMedia(namespace, slug, version, principal, userNsRoles)
                .stream()
                .map(MediaAssetResponse::from)
                .toList();
        return ok("response.success.read", response);
    }

    @PostMapping
    public ApiResponse<MediaAssetResponse> uploadVersionMedia(
            @PathVariable String namespace,
            @PathVariable String slug,
            @PathVariable String version,
            @RequestParam("file") MultipartFile file,
            @RequestParam("role") MediaAssetRole role,
            @RequestParam(value = "altText", required = false) String altText,
            @AuthenticationPrincipal PlatformPrincipal principal,
            @RequestAttribute(value = "userNsRoles", required = false)
            Map<Long, NamespaceRole> userNsRoles) throws IOException {
        var asset = mediaAssetAppService.uploadSkillVersionMedia(
                namespace,
                slug,
                version,
                role,
                file.getBytes(),
                file.getContentType(),
                file.getOriginalFilename(),
                altText,
                principal,
                userNsRoles
        );
        return ok("response.success.created", MediaAssetResponse.from(asset));
    }
}
