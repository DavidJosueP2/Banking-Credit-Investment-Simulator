package com.edu.uta.backend.verification;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "aws")
public record AwsProperties(String region, String accessKeyId, String secretAccessKey,
                            Rekognition rekognition) {

    public record Rekognition(String collection) {}

    public boolean configured() {
        return region != null && !region.isBlank()
                && accessKeyId != null && !accessKeyId.isBlank()
                && secretAccessKey != null && !secretAccessKey.isBlank();
    }

    public String collection() {
        return rekognition == null || rekognition.collection() == null || rekognition.collection().isBlank()
                ? "brunexa-clientes" : rekognition.collection();
    }
}
