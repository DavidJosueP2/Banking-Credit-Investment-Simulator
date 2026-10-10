package com.edu.uta.backend.verification;

import org.junit.jupiter.api.Test;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import static org.junit.jupiter.api.Assertions.*;

class AwsConfigTests {
    @Test void usesTheSdkDefaultCredentialChain() {
        var provider = new AwsConfig().awsCredentialsProvider();
        assertInstanceOf(DefaultCredentialsProvider.class, provider);
        ((DefaultCredentialsProvider) provider).close();
    }
}
