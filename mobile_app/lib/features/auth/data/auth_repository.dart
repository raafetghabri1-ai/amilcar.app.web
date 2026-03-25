import '../../../core/network/api_client.dart';
import '../../../models/user_model.dart';

class AuthRepository {
  AuthRepository(this._apiClient);

  final ApiClient _apiClient;

  Future<bool> hasToken() => _apiClient.hasToken();

  Future<UserModel> login({required String email, required String password}) async {
    final result = await _apiClient.login(email: email, password: password);
    return result.user;
  }

  Future<UserModel> register({
    required String fullName,
    required String email,
    required String phone,
    required String password,
  }) {
    return _apiClient.register(
      fullName: fullName,
      email: email,
      phone: phone,
      password: password,
    );
  }

  Future<UserModel> getMe() => _apiClient.getMe();

  Future<void> logout() => _apiClient.logout();
}

