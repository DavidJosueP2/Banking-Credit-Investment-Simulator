package com.edu.uta.backend.verification;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "aws")
public record AwsProperties(String region, Rekognition rekognition, String livenessRoleArn) {

    public record Rekognition(String collection) {}

    public String collection() {
        return rekognition == null || rekognition.collection() == null || rekognition.collection().isBlank()
                ? "brn-clients" : rekognition.collection();
    }
}
