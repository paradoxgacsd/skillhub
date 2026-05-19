package com.iflytek.skillhub.controller.portal;

import com.iflytek.skillhub.auth.rbac.PlatformPrincipal;
import com.iflytek.skillhub.controller.BaseApiController;
import com.iflytek.skillhub.domain.media.MediaAssetRole;
import com.iflytek.skillhub.domain.media.MediaAssetService;
import com.iflytek.skillhub.domain.media.MediaOwnerType;
import com.iflytek.skillhub.domain.namespace.NamespaceRole;
import com.iflytek.skillhub.dto.ApiResponse;
import com.iflytek.skillhub.dto.ApiResponseFactory;
import com.iflytek.skillhub.dto.media.MediaAssetResponse;
import com.iflytek.skillhub.service.media.MediaAssetAppService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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
import java.util.Map;

/**
 * Public media endpoints. Uploads are owner-checked; reads are visibility-checked
 * before immutable media bytes are streamed.
 */
@RestController
@RequestMapping("/api/v1/media")
public class MediaController extends BaseApiController {

    private final MediaAssetAppService mediaAssetAppService;

    public MediaController(MediaAssetAppService mediaAssetAppService, ApiResponseFactory responseFactory) {
        super(responseFactory);
        this.mediaAssetAppService = mediaAssetAppService;
    }

    @PostMapping
    public ApiResponse<MediaAssetResponse> upload(@RequestParam("file") MultipartFile file,
                                                  @RequestParam("ownerType") MediaOwnerType ownerType,
                                                  @RequestParam("ownerId") Long ownerId,
                                                  @RequestParam("role") MediaAssetRole role,
                                                  @RequestParam(value = "altText", required = false) String altText,
                                                  @AuthenticationPrincipal PlatformPrincipal principal,
                                                  @RequestAttribute(value = "userNsRoles", required = false)
                                                  Map<Long, NamespaceRole> userNsRoles) throws IOException {
        MediaAssetService.UploadCommand command = new MediaAssetService.UploadCommand(
                ownerType, ownerId, role, file.getBytes(), file.getContentType(),
                file.getOriginalFilename(), altText, principal != null ? principal.userId() : null);
        var asset = mediaAssetAppService.upload(command, principal, userNsRoles);
        return ok("response.success.created", MediaAssetResponse.from(asset));
    }

    @GetMapping("/{id}")
    public ResponseEntity<byte[]> getAsset(@PathVariable Long id,
                                           @AuthenticationPrincipal PlatformPrincipal principal,
                                           @RequestAttribute(value = "userNsRoles", required = false)
                                           Map<Long, NamespaceRole> userNsRoles) {
        MediaAssetAppService.MediaReadResult result = mediaAssetAppService.read(id, principal, userNsRoles);
        var asset = result.asset();
        byte[] body = result.body();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(asset.getContentType()));
        headers.setContentLength(body.length);
        headers.add(HttpHeaders.CACHE_CONTROL, "public, max-age=31536000, immutable");
        if (asset.getAltText() != null) {
            headers.add("X-Media-Alt-Text", asset.getAltText());
        }
        return ResponseEntity.ok().headers(headers).body(body);
    }
}
