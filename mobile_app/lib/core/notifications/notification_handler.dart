import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

class NotificationHandler {
  final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();
  final ValueNotifier<String?> routeNotifier = ValueNotifier<String?>(null);

  void handlePayload(Map<String, dynamic> data) {
    final screen = data['screen']?.toString();
    if (screen == null || screen.isEmpty) {
      return;
    }
    routeNotifier.value = screen;
  }

  void clearRoute() {
    routeNotifier.value = null;
  }
}
