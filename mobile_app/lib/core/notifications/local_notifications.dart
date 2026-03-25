import 'dart:convert';

import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import 'notification_handler.dart';

class LocalNotificationsService {
  LocalNotificationsService(this._notificationHandler);

  final NotificationHandler _notificationHandler;
  final FlutterLocalNotificationsPlugin _plugin = FlutterLocalNotificationsPlugin();

  Future<void> initialize() async {
    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    const ios = DarwinInitializationSettings();
    const settings = InitializationSettings(android: android, iOS: ios);

    await _plugin.initialize(
      settings,
      onDidReceiveNotificationResponse: (response) {
        final payload = response.payload;
        if (payload == null || payload.isEmpty) {
          return;
        }
        final decoded = jsonDecode(payload);
        if (decoded is Map<String, dynamic>) {
          _notificationHandler.handlePayload(decoded);
          return;
        }
        if (decoded is Map) {
          _notificationHandler.handlePayload(decoded.map((key, value) => MapEntry(key.toString(), value)));
        }
      },
    );
  }

  Future<void> show({
    required String title,
    required String body,
    Map<String, dynamic>? payload,
  }) async {
    const android = AndroidNotificationDetails(
      'amilcar_general',
      'AMILCAR Notifications',
      channelDescription: 'General AMILCAR push notifications',
      importance: Importance.max,
      priority: Priority.high,
    );
    const ios = DarwinNotificationDetails();

    await _plugin.show(
      DateTime.now().millisecondsSinceEpoch ~/ 1000,
      title,
      body,
      const NotificationDetails(android: android, iOS: ios),
      payload: payload == null ? null : jsonEncode(payload),
    );
  }
}
