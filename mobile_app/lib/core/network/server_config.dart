import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../constants/app_config.dart';

class ServerConfig {
  ServerConfig(this._storage);

  static const String _key = 'server_base_url';
  final FlutterSecureStorage _storage;

  String _cachedUrl = AppConfig.apiBaseUrl;

  String get baseUrl => _cachedUrl;

  Future<void> load() async {
    final saved = await _storage.read(key: _key);
    if (saved != null && saved.isNotEmpty) {
      _cachedUrl = saved;
    }
  }

  Future<void> save(String url) async {
    final cleaned = url.trimRight().replaceAll(RegExp(r'/+$'), '');
    _cachedUrl = cleaned;
    await _storage.write(key: _key, value: cleaned);
  }
}
