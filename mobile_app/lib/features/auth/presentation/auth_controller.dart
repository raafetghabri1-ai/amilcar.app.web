import 'package:flutter/foundation.dart';

import '../../../core/network/api_client.dart';
import '../../../models/user_model.dart';
import '../data/auth_repository.dart';

enum AuthStatus { initial, loading, authenticated, unauthenticated }

class AuthController extends ChangeNotifier {
  AuthController({required AuthRepository repository}) : _repository = repository;

  final AuthRepository _repository;

  AuthStatus _status = AuthStatus.initial;
  UserModel? _user;
  String? _errorMessage;
  bool _submitting = false;

  AuthStatus get status => _status;
  UserModel? get user => _user;
  String? get errorMessage => _errorMessage;
  bool get submitting => _submitting;

  Future<void> bootstrap() async {
    if (_status == AuthStatus.loading) {
      return;
    }
    _status = AuthStatus.loading;
    notifyListeners();

    try {
      final hasToken = await _repository.hasToken();
      if (!hasToken) {
        _status = AuthStatus.unauthenticated;
        _errorMessage = null;
        notifyListeners();
        return;
      }

      final currentUser = await _repository.getMe();
      if (currentUser.role != 'client') {
        await _repository.logout();
        throw ApiException('This mobile app is restricted to client accounts.');
      }

      _user = currentUser;
      _errorMessage = null;
      _status = AuthStatus.authenticated;
    } catch (error) {
      await _repository.logout();
      _user = null;
      _status = AuthStatus.unauthenticated;
      _errorMessage = error.toString();
    }
    notifyListeners();
  }

  Future<bool> login({required String email, required String password}) async {
    _submitting = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final currentUser = await _repository.login(email: email, password: password);
      if (currentUser.role != 'client') {
        await _repository.logout();
        throw ApiException('Only client accounts can sign in here.');
      }
      _user = currentUser;
      _status = AuthStatus.authenticated;
      return true;
    } catch (error) {
      _errorMessage = error.toString().replaceFirst('Exception: ', '');
      _status = AuthStatus.unauthenticated;
      return false;
    } finally {
      _submitting = false;
      notifyListeners();
    }
  }

  Future<bool> register({
    required String fullName,
    required String email,
    required String phone,
    required String password,
  }) async {
    _submitting = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await _repository.register(
        fullName: fullName,
        email: email,
        phone: phone,
        password: password,
      );
      final currentUser = await _repository.login(email: email, password: password);
      _user = currentUser;
      _status = AuthStatus.authenticated;
      return true;
    } catch (error) {
      _errorMessage = error.toString().replaceFirst('Exception: ', '');
      _status = AuthStatus.unauthenticated;
      return false;
    } finally {
      _submitting = false;
      notifyListeners();
    }
  }

  Future<void> refreshProfile() async {
    if (_user == null) {
      return;
    }
    try {
      _user = await _repository.getMe();
      notifyListeners();
    } catch (_) {
      // Keep current view state if refresh fails.
    }
  }

  Future<void> logout() async {
    await _repository.logout();
    _user = null;
    _errorMessage = null;
    _status = AuthStatus.unauthenticated;
    notifyListeners();
  }
}
