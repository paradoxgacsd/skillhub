package com.iflytek.skillhub.domain.media;

import java.util.Set;

/**
 * Validates media uploads against magic-byte signatures and size limits.
 *
 * <p>The design doc requires GIF magic-byte validation (rejects files whose extension
 * lies about content), and a size cap to keep cards/list views responsive.
 */
public class MediaValidator {

    private static final byte[] GIF87A = {0x47, 0x49, 0x46, 0x38, 0x37, 0x61}; // GIF87a
    private static final byte[] GIF89A = {0x47, 0x49, 0x46, 0x38, 0x39, 0x61}; // GIF89a
    private static final byte[] PNG    = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
    private static final byte[] JPEG   = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] WEBP_RIFF = {0x52, 0x49, 0x46, 0x46}; // RIFF
    private static final byte[] WEBP = {0x57, 0x45, 0x42, 0x50}; // WEBP at byte offset 8

    private static final Set<String> ALLOWED_GIF_TYPES =
            Set.of("image/gif");
    private static final Set<String> ALLOWED_IMAGE_TYPES =
            Set.of("image/png", "image/jpeg", "image/jpg", "image/webp");

    private final long maxGifBytes;
    private final long maxImageBytes;
    private final long maxPromotionGifBytes;

    public MediaValidator(long maxGifBytes, long maxImageBytes, long maxPromotionGifBytes) {
        this.maxGifBytes = maxGifBytes;
        this.maxImageBytes = maxImageBytes;
        this.maxPromotionGifBytes = maxPromotionGifBytes;
    }

    public MediaType validateAndClassify(byte[] header, long sizeBytes, String declaredContentType, MediaOwnerType ownerType) {
        if (header == null || header.length < 6) {
            throw new MediaException("error.media.headerUnreadable");
        }
        if (declaredContentType == null) {
            throw new MediaException("error.media.unsupportedType");
        }

        if (matches(header, GIF87A) || matches(header, GIF89A)) {
            if (!ALLOWED_GIF_TYPES.contains(declaredContentType.toLowerCase())) {
                throw new MediaException("error.media.gif.contentTypeMismatch");
            }
            if (sizeBytes > maxGifBytes(ownerType)) {
                throw new MediaException("error.media.gif.tooLarge");
            }
            return MediaType.GIF;
        }

        if (declaredContentType.toLowerCase().equals("image/gif")) {
            // Declared GIF but header does not match; reject before storage.
            throw new MediaException("error.media.gif.invalidSignature");
        }

        if (matches(header, PNG) || matches(header, JPEG) || matches(header, WEBP_RIFF) && matches(header, WEBP, 8)) {
            if (!ALLOWED_IMAGE_TYPES.contains(declaredContentType.toLowerCase())) {
                throw new MediaException("error.media.image.contentTypeMismatch");
            }
            if (sizeBytes > maxImageBytes) {
                throw new MediaException("error.media.image.tooLarge");
            }
            return MediaType.IMAGE;
        }

        throw new MediaException("error.media.unsupportedType");
    }

    private long maxGifBytes(MediaOwnerType ownerType) {
        return ownerType == MediaOwnerType.PROMOTION_CAMPAIGN ? maxPromotionGifBytes : maxGifBytes;
    }

    private static boolean matches(byte[] header, byte[] signature) {
        return matches(header, signature, 0);
    }

    private static boolean matches(byte[] header, byte[] signature, int offset) {
        if (offset < 0 || header.length < offset + signature.length) return false;
        for (int i = 0; i < signature.length; i++) {
            if (header[offset + i] != signature[i]) return false;
        }
        return true;
    }
}
