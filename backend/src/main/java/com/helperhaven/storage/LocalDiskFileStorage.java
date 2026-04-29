package com.helperhaven.storage;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Duration;

@Component
@ConditionalOnProperty(name = "helperhaven.storage.provider", havingValue = "local", matchIfMissing = true)
public class LocalDiskFileStorage implements FileStorage {

    static final Path ROOT = Path.of(System.getProperty("java.io.tmpdir"), "helperhaven-uploads");

    @Override
    public String upload(String key, InputStream content, long contentLength, String contentType) {
        Path target = resolve(key);
        try {
            Files.createDirectories(target.getParent());
            Files.copy(content, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return key;
    }

    @Override
    public String signedGetUrl(String key, Duration ttl) {
        return "http://localhost:8080/api/local-storage/" + key;
    }

    @Override
    public String signedPutUrl(String key, String contentType, Duration ttl) {
        return "http://localhost:8080/api/local-storage/" + key;
    }

    @Override
    public void delete(String key) {
        try {
            Files.deleteIfExists(resolve(key));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    static Path resolve(String key) {
        return ROOT.resolve(key).normalize();
    }
}
