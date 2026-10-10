package com.edu.uta.backend.verification;

import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.sts.StsClient;
import software.amazon.awssdk.services.sts.model.AssumeRoleRequest;
import software.amazon.awssdk.services.sts.model.Credentials;

/** Credenciales del navegador: nunca se entregan las credenciales del backend. */
@Service
public class LivenessCredentialsService {
    private static final String POLICY = """
            {"Version":"2012-10-17","Statement":[{"Effect":"Allow",
            "Action":"rekognition:StartFaceLivenessSession","Resource":"*"}]}
            """;
    private final StsClient sts;
    private final AwsProperties properties;

    public LivenessCredentialsService(StsClient sts, AwsProperties properties) {
        this.sts = sts;
        this.properties = properties;
    }

    public Credentials issue() {
        if (properties.livenessRoleArn() == null || properties.livenessRoleArn().isBlank()) {
            throw new IllegalStateException("Configura AWS_LIVENESS_ROLE_ARN para iniciar la prueba de vida");
        }
        return sts.assumeRole(AssumeRoleRequest.builder()
                .roleArn(properties.livenessRoleArn())
                .roleSessionName("brunexa-liveness")
                .durationSeconds(900)
                .policy(POLICY)
                .build()).credentials();
    }
}
