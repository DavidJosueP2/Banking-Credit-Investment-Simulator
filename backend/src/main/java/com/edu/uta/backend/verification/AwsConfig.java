package com.edu.uta.backend.verification;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.rekognition.RekognitionClient;
import software.amazon.awssdk.services.sts.StsClient;
import software.amazon.awssdk.services.textract.TextractClient;

@Configuration
@EnableConfigurationProperties(AwsProperties.class)
public class AwsConfig {

    @Bean
    AwsCredentialsProvider awsCredentialsProvider() {
        return DefaultCredentialsProvider.builder().build();
    }

    @Bean
    RekognitionClient rekognitionClient(AwsProperties properties, AwsCredentialsProvider credentials) {
        return RekognitionClient.builder()
                .region(Region.of(properties.region()))
                .credentialsProvider(credentials)
                .build();
    }

    @Bean
    TextractClient textractClient(AwsProperties properties, AwsCredentialsProvider credentials) {
        return TextractClient.builder()
                .region(Region.of(properties.region()))
                .credentialsProvider(credentials)
                .build();
    }

    @Bean
    StsClient stsClient(AwsProperties properties, AwsCredentialsProvider credentials) {
        return StsClient.builder()
                .region(Region.of(properties.region()))
                .credentialsProvider(credentials)
                .build();
    }
}
