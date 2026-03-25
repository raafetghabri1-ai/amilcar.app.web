import 'dart:async';
import 'dart:io';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

import '../network/api_client.dart';
import 'local_notifications.dart';
import 'notification_handler.dart';

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  try {
    await Firebase.initializeApp();
  } catch (_) {
    // Firebase native config may not be present yet during development.
  }
}

class FcmService {
  FcmService(
    this._apiClient,
    this._localNotifications,
    this._notificationHandler,
  );

  final ApiClient _apiClient;
  final LocalNotificationsService _localNotifications;
  final NotificationHandler _notificationHandler;

  bool _initialized = false;
  bool _firebaseReady = false;
  StreamSubscription<String>? _tokenRefreshSubscription;
  StreamSubscription<RemoteMessage>? _foregroundSubscription;
  StreamSubscription<RemoteMessage>? _openAppSubscription;

  Future<void> initialize() async {
    if (_initialized) {
      return;
    }
    _initialized = true;

    await _localNotifications.initialize();

    try {
      await Firebase.initializeApp();
      _firebaseReady = true;
    } catch (_) {
      _firebaseReady = false;
      return;
    }

    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

    final messaging = FirebaseMessaging.instance;
    await messaging.requestPermission(alert: true, badge: true, sound: true);
    await messaging.setForegroundNotificationPresentationOptions(
      alert: true,
      badge: true,
      sound: true,
    );

    _foregroundSubscription = FirebaseMessaging.onMessage.listen((message) async {
      final title = message.notification?.title ?? 'AMILCAR';
      final body = message.notification?.body ?? 'You have a new notification.';
      await _localNotifications.show(
        title: title,
        body: body,
        payload: Map<String, dynamic>.from(message.data),
      );
    });

    _openAppSubscription = FirebaseMessaging.onMessageOpenedApp.listen((message) {
      _notificationHandler.handlePayload(Map<String, dynamic>.from(message.data));
    });

    final initialMessage = await messaging.getInitialMessage();
    if (initialMessage != null) {
      _notificationHandler.handlePayload(Map<String, dynamic>.from(initialMessage.data));
    }

    _tokenRefreshSubscription = messaging.onTokenRefresh.listen((token) async {
      await registerDeviceToken(explicitToken: token);
    });
  }

  Future<void> registerDeviceToken({String? explicitToken}) async {
    if (!_firebaseReady) {
      return;
    }

    final token = explicitToken ?? await FirebaseMessaging.instance.getToken();
    if (token == null || token.isEmpty) {
      return;
    }

    try {
      await _apiClient.registerDeviceToken(
        fcmToken: token,
        platform: _resolvePlatform(),
      );
    } catch (_) {
      // Do not block auth flow or app launch if token registration fails.
    }
  }

  String _resolvePlatform() {
    if (kIsWeb) {
      return 'web';
    }
    if (Platform.isAndroid) {
      return 'android';
    }
    if (Platform.isIOS) {
      return 'ios';
    }
    return 'unknown';
  }

  Future<void> dispose() async {
    await _tokenRefreshSubscription?.cancel();
    await _foregroundSubscription?.cancel();
    await _openAppSubscription?.cancel();
  }
}
