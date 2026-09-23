import { Amplify } from 'aws-amplify'

import type { TemporaryCredentials } from '@/features/profile/profile-api'

/** FaceLivenessDetector habla directo con Rekognition: se le entregan credenciales efímeras del backend. */
export function applyLivenessCredentials(credentials: TemporaryCredentials) {
  Amplify.configure(
    { Auth: { Cognito: { identityPoolId: '', allowGuestAccess: true } } } as never,
    {
      Auth: {
        credentialsProvider: {
          getCredentialsAndIdentityId: async () => ({
            credentials: {
              accessKeyId: credentials.accessKeyId,
              secretAccessKey: credentials.secretAccessKey,
              sessionToken: credentials.sessionToken,
              expiration: new Date(credentials.expiration),
            },
          }),
          clearCredentialsAndIdentityId: () => undefined,
        },
      },
    },
  )
}
