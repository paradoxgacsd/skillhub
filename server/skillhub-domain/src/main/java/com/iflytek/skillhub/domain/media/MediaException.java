package com.iflytek.skillhub.domain.media;

import com.iflytek.skillhub.domain.shared.exception.LocalizedDomainException;

/**
 * Domain-level error for media uploads (file-header rejection, size limit, etc.).
 * Message is the i18n key (e.g. {@code error.media.gif.invalidSignature}).
 */
public class MediaException extends LocalizedDomainException {
    public MediaException(String messageCode) {
        super(messageCode);
    }

    @Override
    public int statusCode() {
        return 400;
    }
}
