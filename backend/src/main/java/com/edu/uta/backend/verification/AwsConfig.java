package com.edu.uta.backend.verification;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.rekognition.RekognitionClient;
import software.amazon.awssdk.services.sts.StsClient;
import software.amazon.awssdk.services.textract.TextractClient;

@Configuration
@EnableConfigurationProperties(AwsProperties.class)
@ConditionalOnProperty(prefix = "aws", name = {"access-key-id", "secret-access-key"})
public class AwsConfig {

    private StaticCredentialsProvider credentials(AwsProperties properties) {
        return StaticCredentialsProvider.create(
                AwsBasicCredentials.create(properties.accessKeyId(), properties.secretAccessKey()));
    }

    @Bean
    RekognitionClient rekognitionClient(AwsProperties properties) {
        return RekognitionClient.builder()
                .region(Region.of(properties.region()))
                .credentialsProvider(credentials(properties))
                .build();
    }

    @Bean
    TextractClient textractClient(AwsProperties properties) {
        return TextractClient.builder()
                .region(Region.of(properties.region()))
                .credentialsProvider(credentials(properties))
                .build();
    }

    @Bean
    StsClient stsClient(AwsProperties properties) {
        return StsClient.builder()
                .region(Region.of(properties.region()))
                .credentialsProvider(credentials(properties))
                .build();
    }
}
