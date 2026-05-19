package com.iflytek.skillhub.controller.portal;

import com.iflytek.skillhub.auth.rbac.PlatformPrincipal;
import com.iflytek.skillhub.domain.media.MediaAsset;
import com.iflytek.skillhub.domain.media.MediaAssetRole;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

class SkillMediaControllerTest {

    private final MediaAssetAppService mediaAssetAppService = mock(MediaAssetAppService.class);
    private final MockMvc mockMvc = standaloneSetup(new SkillMediaController(mediaAssetAppService, responseFactory()))
            .build();

    @Test
    void listVersionMediaReturnsAssets() throws Exception {
        given(mediaAssetAppService.listSkillVersionMedia(eq("team"), eq("demo"), eq("1.0.0"), any(), any()))
                .willReturn(List.of(asset(201L, MediaAssetRole.COVER), asset(202L, MediaAssetRole.DEMO)));

        mockMvc.perform(get("/api/web/skills/team/demo/versions/1.0.0/media")
                        .requestAttr("userNsRoles", Map.of()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data[0].id").value(201))
                .andExpect(jsonPath("$.data[1].role").value("DEMO"));
    }

    @Test
    void uploadVersionMediaResolvesOwnerServerSide() throws Exception {
        MediaAsset uploaded = asset(202L, MediaAssetRole.DEMO);
        given(mediaAssetAppService.uploadSkillVersionMedia(
                eq("team"), eq("demo"), eq("1.0.0"), eq(MediaAssetRole.DEMO),
                any(), eq("image/gif"), eq("demo.gif"), eq("Demo"), any(), any()))
                .willReturn(uploaded);
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "demo.gif",
                "image/gif",
                new byte[] {0x47, 0x49, 0x46, 0x38, 0x39, 0x61}
        );

        mockMvc.perform(multipart("/api/web/skills/team/demo/versions/1.0.0/media")
                        .file(file)
                        .param("role", "DEMO")
                        .param("altText", "Demo")
                        .with(authentication(auth("owner-1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(202));

        verify(mediaAssetAppService).uploadSkillVersionMedia(
                eq("team"), eq("demo"), eq("1.0.0"), eq(MediaAssetRole.DEMO),
                any(), eq("image/gif"), eq("demo.gif"), eq("Demo"), any(), any());
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

    private MediaAsset asset(Long id, MediaAssetRole role) {
        MediaAsset asset = new MediaAsset(
                MediaOwnerType.SKILL_VERSION,
                9L,
                role == MediaAssetRole.DEMO ? MediaType.GIF : MediaType.IMAGE,
                role,
                "media/skill_version/9/hash-" + id + ".gif",
                role == MediaAssetRole.DEMO ? "image/gif" : "image/png",
                3,
                "hash-" + id,
                "owner-1"
        );
        ReflectionTestUtils.setField(asset, "id", id);
        return asset;
    }

    private ApiResponseFactory responseFactory() {
        StaticMessageSource messageSource = new StaticMessageSource();
        messageSource.addMessage("response.success.created", Locale.ENGLISH, "created");
        messageSource.addMessage("response.success.read", Locale.ENGLISH, "read");
        return new ApiResponseFactory(messageSource, Clock.systemUTC());
    }
}
