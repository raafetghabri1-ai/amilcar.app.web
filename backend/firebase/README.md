# Firebase Service Account

Place your Firebase Admin SDK service account file here:

- `backend/firebase/service-account.json`

How to get it:

1. Open Firebase Console
2. Project Settings
3. Service Accounts
4. Generate new private key
5. Save the JSON file here as `service-account.json`

The backend reads this file through `FIREBASE_SERVICE_ACCOUNT_FILE`.
