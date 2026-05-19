package com.iflytek.skillhub.domain.media;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Verifies that {@link MediaValidator} accepts only files whose magic bytes
 * match the declared content type, and rejects oversized uploads.
 */
class MediaValidatorTest {

    private final MediaValidator validator = new MediaValidator(10_000, 5_000, 1_000);

    @Test
    void acceptsGif87aHeader() {
        byte[] header = bytes("GIF87a-rest");
        MediaType type = validator.validateAndClassify(header, 200, "image/gif", MediaOwnerType.SKILL_VERSION);
        assertThat(type).isEqualTo(MediaType.GIF);
    }

    @Test
    void acceptsGif89aHeader() {
        byte[] header = bytes("GIF89a-rest");
        MediaType type = validator.validateAndClassify(header, 200, "image/gif", MediaOwnerType.SKILL_VERSION);
        assertThat(type).isEqualTo(MediaType.GIF);
    }

    @Test
    void rejectsGifWithMismatchingDeclaredType() {
        byte[] header = bytes("GIF89a-x");
        assertThatThrownBy(() -> validator.validateAndClassify(header, 200, "image/png", MediaOwnerType.SKILL_VERSION))
                .isInstanceOf(MediaException.class)
                .hasMessage("error.media.gif.contentTypeMismatch");
    }

    @Test
    void rejectsTooLargeGif() {
        byte[] header = bytes("GIF89a-x");
        assertThatThrownBy(() -> validator.validateAndClassify(header, 99_000, "image/gif", MediaOwnerType.SKILL_VERSION))
                .isInstanceOf(MediaException.class)
                .hasMessage("error.media.gif.tooLarge");
    }

    @Test
    void rejectsImageDeclaredAsGifWithoutGifSignature() {
        byte[] header = new byte[] {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A};
        assertThatThrownBy(() -> validator.validateAndClassify(header, 200, "image/gif", MediaOwnerType.SKILL_VERSION))
                .isInstanceOf(MediaException.class)
                .hasMessage("error.media.gif.invalidSignature");
    }

    @Test
    void acceptsPngWithMatchingDeclaredType() {
        byte[] header = new byte[] {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
        MediaType type = validator.validateAndClassify(header, 200, "image/png", MediaOwnerType.SKILL_VERSION);
        assertThat(type).isEqualTo(MediaType.IMAGE);
    }

    @Test
    void acceptsJpegWithMatchingDeclaredType() {
        byte[] header = new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0x00, 0x10};
        MediaType type = validator.validateAndClassify(header, 200, "image/jpeg", MediaOwnerType.SKILL_VERSION);
        assertThat(type).isEqualTo(MediaType.IMAGE);
    }

    @Test
    void rejectsTooLargeImage() {
        byte[] header = new byte[] {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
        assertThatThrownBy(() -> validator.validateAndClassify(header, 100_000, "image/png", MediaOwnerType.SKILL_VERSION))
                .isInstanceOf(MediaException.class)
                .hasMessage("error.media.image.tooLarge");
    }

    @Test
    void rejectsUnknownSignature() {
        byte[] header = bytes("HELLO!");
        assertThatThrownBy(() -> validator.validateAndClassify(header, 200, "image/png", MediaOwnerType.SKILL_VERSION))
                .isInstanceOf(MediaException.class)
                .hasMessage("error.media.unsupportedType");
    }

    @Test
    void appliesPromotionGifLimitForPromotionCampaignOwners() {
        byte[] header = bytes("GIF89a-x");

        assertThatThrownBy(() -> validator.validateAndClassify(header, 1_001, "image/gif", MediaOwnerType.PROMOTION_CAMPAIGN))
                .isInstanceOf(MediaException.class)
                .hasMessage("error.media.gif.tooLarge");
    }

    @Test
    void nonPromotionGifUsesGeneralGifLimit() {
        byte[] header = bytes("GIF89a-x");

        MediaType type = validator.validateAndClassify(header, 1_001, "image/gif", MediaOwnerType.SKILL_VERSION);

        assertThat(type).isEqualTo(MediaType.GIF);
    }

    @Test
    void acceptsWebpOnlyWhenRiffContainerDeclaresWebpAtOffsetEight() {
        byte[] header = new byte[] {
                0x52, 0x49, 0x46, 0x46,
                0x10, 0x00, 0x00, 0x00,
                0x57, 0x45, 0x42, 0x50,
                0x00, 0x00, 0x00, 0x00
        };

        MediaType type = validator.validateAndClassify(header, 200, "image/webp", MediaOwnerType.SKILL_VERSION);

        assertThat(type).isEqualTo(MediaType.IMAGE);
    }

    @Test
    void rejectsRiffContainerWithoutWebpSignature() {
        byte[] header = new byte[] {
                0x52, 0x49, 0x46, 0x46,
                0x10, 0x00, 0x00, 0x00,
                0x57, 0x41, 0x56, 0x45,
                0x00, 0x00, 0x00, 0x00
        };

        assertThatThrownBy(() -> validator.validateAndClassify(header, 200, "image/webp", MediaOwnerType.SKILL_VERSION))
                .isInstanceOf(MediaException.class)
                .hasMessage("error.media.unsupportedType");
    }

    private static byte[] bytes(String literal) {
        byte[] result = new byte[Math.max(literal.length(), 8)];
        for (int i = 0; i < literal.length(); i++) result[i] = (byte) literal.charAt(i);
        return result;
    }
}
