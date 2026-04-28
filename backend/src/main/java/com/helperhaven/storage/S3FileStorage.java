package com.helperhaven.storage;

import com.helperhaven.config.AppProperties;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.io.InputStream;
import java.net.URI;
import java.time.Duration;

/**
 * Works against real S3 (prod) and MinIO (local) — endpoint + path-style flags
 * come from config.
 */
@Component
public class S3FileStorage implements FileStorage {

    private final AppProperties props;
    private final S3Client client;
    private final S3Presigner presigner;

    public S3FileStorage(AppProperties props) {
        this.props = props;

        var creds = StaticCredentialsProvider.create(
                AwsBasicCredentials.create(props.storage().accessKey(), props.storage().secretKey())
        );

        var s3Config = S3Configuration.builder()
                .pathStyleAccessEnabled(props.storage().pathStyleAccess())
                .build();

        var builder = S3Client.builder()
                .region(Region.of(props.storage().region()))
                .credentialsProvider(creds)
                .serviceConfiguration(s3Config);

        var presignerBuilder = S3Presigner.builder()
                .region(Region.of(props.storage().region()))
                .credentialsProvider(creds)
                .serviceConfiguration(s3Config);

        if (props.storage().endpoint() != null && !props.storage().endpoint().isBlank()) {
            builder.endpointOverride(URI.create(props.storage().endpoint()));
            presignerBuilder.endpointOverride(URI.create(props.storage().endpoint()));
        }

        this.client = builder.build();
        this.presigner = presignerBuilder.build();
    }

    @Override
    public String upload(String key, InputStream content, long contentLength, String contentType) {
        client.putObject(
                PutObjectRequest.builder()
                        .bucket(props.storage().bucket())
                        .key(key)
                        .contentType(contentType)
                        .contentLength(contentLength)
                        .build(),
                RequestBody.fromInputStream(content, contentLength)
        );
        return key;
    }

    @Override
    public String signedGetUrl(String key, Duration ttl) {
        var presign = presigner.presignGetObject(
                GetObjectPresignRequest.builder()
                        .signatureDuration(ttl)
                        .getObjectRequest(GetObjectRequest.builder()
                                .bucket(props.storage().bucket())
                                .key(key)
                                .build())
                        .build()
        );
        return presign.url().toString();
    }

    @Override
    public String signedPutUrl(String key, String contentType, Duration ttl) {
        var presign = presigner.presignPutObject(
                PutObjectPresignRequest.builder()
                        .signatureDuration(ttl)
                        .putObjectRequest(PutObjectRequest.builder()
                                .bucket(props.storage().bucket())
                                .key(key)
                                .contentType(contentType)
                                .build())
                        .build()
        );
        return presign.url().toString();
    }

    @Override
    public void delete(String key) {
        client.deleteObject(DeleteObjectRequest.builder()
                .bucket(props.storage().bucket())
                .key(key)
                .build());
    }
}
