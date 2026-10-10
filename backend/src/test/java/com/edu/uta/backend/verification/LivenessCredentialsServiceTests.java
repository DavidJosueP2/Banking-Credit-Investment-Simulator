package com.edu.uta.backend.verification;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import software.amazon.awssdk.services.sts.StsClient;
import software.amazon.awssdk.services.sts.model.AssumeRoleRequest;
import software.amazon.awssdk.services.sts.model.AssumeRoleResponse;
import software.amazon.awssdk.services.sts.model.Credentials;
import software.amazon.awssdk.services.sts.model.StsException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class LivenessCredentialsServiceTests {
    private final StsClient sts = mock(StsClient.class);
    private LivenessCredentialsService service(String role) {
        return new LivenessCredentialsService(sts, new AwsProperties("us-east-1", null, role));
    }

    @Test void delegatesOnlyLivenessForFifteenMinutes() {
        var credentials = Credentials.builder().accessKeyId("temporary-key").sessionToken("token").build();
        when(sts.assumeRole(any(AssumeRoleRequest.class)))
                .thenReturn(AssumeRoleResponse.builder().credentials(credentials).build());
        assertSame(credentials, service("arn:aws:iam::123456789012:role/liveness").issue());
        var capture = ArgumentCaptor.forClass(AssumeRoleRequest.class);
        verify(sts).assumeRole(capture.capture());
        var request = capture.getValue();
        assertEquals(900, request.durationSeconds());
        assertEquals("arn:aws:iam::123456789012:role/liveness", request.roleArn());
        assertEquals("{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\","
                + "\"Action\":\"rekognition:StartFaceLivenessSession\",\"Resource\":\"*\"}]}",
                request.policy().replaceAll("\\s", ""));
        verifyNoMoreInteractions(sts);
    }

    @Test void missingRoleFailsBeforeCallingAws() {
        assertThrows(IllegalStateException.class, () -> service("").issue());
        verifyNoInteractions(sts);
    }

    @Test void deniedRoleDoesNotFallBackToBackendCredentials() {
        when(sts.assumeRole(any(AssumeRoleRequest.class))).thenThrow(StsException.builder().message("denied").build());
        assertThrows(StsException.class, () -> service("arn:aws:iam::123456789012:role/liveness").issue());
        verify(sts).assumeRole(any(AssumeRoleRequest.class));
        verifyNoMoreInteractions(sts);
    }
}
