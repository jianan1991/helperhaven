package com.helperhaven.storage;

import java.io.InputStream;
import java.time.Duration;

/**
 * Abstraction over object storage so the same code runs against MinIO locally
 * and S3 in AWS. Swap implementations via Spring profile / configuration —
 * never leak S3-specific types into service/domain code.
 */
public interface FileStorage {

    String upload(String key, InputStream content, long contentLength, String contentType);

    String signedGetUrl(String key, Duration ttl);

    String signedPutUrl(String key, String contentType, Duration ttl);

    void delete(String key);
}
