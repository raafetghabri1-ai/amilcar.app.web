# Firebase Setup For Flutter

## 1. Create / open Firebase project

1. Open Firebase Console
2. Create project for `AMILCAR`
3. Enable Cloud Messaging

## 2. Register Android app

Use the future package name you want for the Flutter app, for example:

- `tn.amilcar.client`

Then download:

- `google-services.json`

Place it here after running `flutter create .`:

- `mobile_app/android/app/google-services.json`

## 3. Register iOS app

Download:

- `GoogleService-Info.plist`

Place it here:

- `mobile_app/ios/Runner/GoogleService-Info.plist`

## 4. Install FlutterFire config later

When you are ready for step 3 of the push implementation:

```bash
dart pub global activate flutterfire_cli
flutterfire configure
```

This will generate `firebase_options.dart`.

## 5. Current dependencies already added

- `firebase_core`
- `firebase_messaging`
- `flutter_local_notifications`

## 6. Important

Because Flutter native folders were not generated in this workspace yet, first run:

```bash
cd mobile_app
flutter create .
flutter pub get
```

Then copy the Firebase config files into the generated Android/iOS paths.
