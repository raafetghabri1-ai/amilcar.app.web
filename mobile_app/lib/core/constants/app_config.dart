class AppConfig {
  static const String appName = 'AMILCAR';
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:8000',
  );

  static const List<String> bookingSlots = [
    '08:00:00',
    '09:00:00',
    '10:00:00',
    '11:00:00',
    '12:00:00',
    '14:00:00',
    '15:00:00',
    '16:00:00',
    '17:00:00',
  ];
}
