# AMILCAR Client Mobile App

Flutter client application for AMILCAR Auto Care.

## Current scope

- splash screen
- client login and registration
- JWT storage with `flutter_secure_storage`
- `dio` API client with bearer token injection
- home dashboard
- booking form
- vehicle tracking polling every 30 seconds
- services catalog
- store with simple cart and checkout
- profile and visit history

## API URL

Default API URL is `http://localhost:8000`.

Override it at runtime:

```bash
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000
```

Use `10.0.2.2` for Android emulator when the backend runs on the host machine.

## Generate platform folders

Flutter SDK is not installed in this environment, so native folders were not generated here.
After installing Flutter, run inside this directory:

```bash
flutter create .
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000
```

`flutter create .` will generate `android/`, `ios/`, and other platform folders around the existing `lib/` and `pubspec.yaml` files.