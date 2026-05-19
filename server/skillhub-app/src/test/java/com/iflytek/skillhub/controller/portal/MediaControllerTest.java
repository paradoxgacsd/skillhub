package com.iflytek.skillhub.controller.portal;

import com.iflytek.skillhub.auth.rbac.PlatformPrincipal;
import com.iflytek.skillhub.domain.media.MediaAsset;
import com.iflytek.skillhub.domain.media.MediaAssetRole;
import com.iflytek.skillhub.domain.media.MediaAssetService;
import com.iflytek.skillhub.domain.media.MediaOwnerType;
import com.iflytek.skillhub.domain.media.MediaType;
import com.iflytek.skillhub.dto.ApiResponseFactory;
import com.iflytek.skillhub.service.media.MediaAssetAppService;
import org.junit.jupiter.api.Test;
import org.springframework.context.support.StaticMessageSource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Clock;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

class MediaControllerTest {

    private final MediaAssetAppService mediaAssetAppService = mock(MediaAssetAppService.class);
    private final MockMvc mockMvc = standaloneSetup(new MediaController(mediaAssetAppService, responseFactory()))
            .build();

    @Test
    void getAssetStreamsBodyReturnedByAppService() throws Exception {
        MediaAsset asset = asset(42L);
        given(mediaAssetAppService.read(eq(42L), any(), any()))
                .willReturn(new MediaAssetAppService.MediaReadResult(asset, new byte[] {1, 2, 3}));

        mockMvc.perform(get("/api/v1/media/42").requestAttr("userNsRoles", Map.of()))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "image/gif"))
                .andExpect(header().string("Cache-Control", "public, max-age=31536000, immutable"))
                .andExpect(header().string("X-Media-Alt-Text", "Demo animation"))
                .andExpect(content().bytes(new byte[] {1, 2, 3}));

        verify(mediaAssetAppService).read(eq(42L), any(), any());
    }

    @Test
    void uploadPassesOwnerMetadataThroughAppService() throws Exception {
        MediaAsset asset = asset(43L);
        given(mediaAssetAppService.upload(any(MediaAssetService.UploadCommand.class), any(), any()))
                .willReturn(asset);
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "demo.gif",
                "image/gif",
                new byte[] {0x47, 0x49, 0x46, 0x38, 0x39, 0x61}
        );

        mockMvc.perform(multipart("/api/v1/media")
                        .file(file)
                        .param("ownerType", "SKILL_VERSION")
                        .param("ownerId", "9")
                        .param("role", "DEMO")
                        .param("altText", "Demo animation")
                        .with(authentication(auth("owner-1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.id").value(43))
                .andExpect(jsonPath("$.data.url").value("/api/v1/media/43"));
    }

    private UsernamePasswordAuthenticationToken auth(String userId) {
        PlatformPrincipal principal = new PlatformPrincipal(
                userId,
                userId,
                userId + "@example.com",
                "",
                "local",
                Set.of()
        );
        return new UsernamePasswordAuthenticationToken(
                principal,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_USER"))
        );
    }

    private MediaAsset asset(Long id) {
        MediaAsset asset = new MediaAsset(
                MediaOwnerType.SKILL_VERSION,
                9L,
                MediaType.GIF,
                MediaAssetRole.DEMO,
                "media/skill_version/9/hash.gif",
                "image/gif",
                3,
                "hash",
                "owner-1"
        );
        asset.setAltText("Demo animation");
        ReflectionTestUtils.setField(asset, "id", id);
        return asset;
    }

    private ApiResponseFactory responseFactory() {
        StaticMessageSource messageSource = new StaticMessageSource();
        messageSource.addMessage("response.success.created", Locale.ENGLISH, "created");
        return new ApiResponseFactory(messageSource, Clock.systemUTC());
    }
}
