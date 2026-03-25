import 'package:dio/dio.dart';

import '../../models/booking_model.dart';
import '../../models/client_history_model.dart';
import '../../models/login_response_model.dart';
import '../../models/product_item_model.dart';
import '../../models/service_item_model.dart';
import '../../models/user_model.dart';
import '../../models/vehicle_model.dart';
import '../storage/token_storage.dart';
import 'server_config.dart';

class ApiException implements Exception {
  ApiException(this.message);

  final String message;

  @override
  String toString() => message;
}

class ApiClient {
  ApiClient(this._tokenStorage, this._serverConfig)
      : _dio = Dio(
          BaseOptions(
            baseUrl: _serverConfig.baseUrl,
            connectTimeout: const Duration(seconds: 30),
            receiveTimeout: const Duration(seconds: 30),
            sendTimeout: const Duration(seconds: 30),
            headers: {'Accept': 'application/json'},
          ),
        ) {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _tokenStorage.readToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) {
          handler.reject(
            DioException(
              requestOptions: error.requestOptions,
              response: error.response,
              type: error.type,
              error: _extractError(error),
              message: _extractError(error),
            ),
          );
        },
      ),
    );
  }

  final Dio _dio;
  final TokenStorage _tokenStorage;
  final ServerConfig _serverConfig;

  void refreshBaseUrl() {
    _dio.options.baseUrl = _serverConfig.baseUrl;
  }

  String _extractError(DioException error) {
    final data = error.response?.data;
    if (data is Map<String, dynamic> && data['detail'] != null) {
      return data['detail'].toString();
    }
    return error.message ?? 'Connection error';
  }

  Never _throwFriendlyError(Object error) {
    if (error is DioException) {
      throw ApiException(error.message ?? 'Connection error');
    }
    throw ApiException(error.toString());
  }

  Future<LoginResponseModel> login({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _dio.post(
        '/api/v1/auth/login',
        data: {
          'username': email,
          'password': password,
        },
        options: Options(contentType: Headers.formUrlEncodedContentType),
      );
      final result = LoginResponseModel.fromJson(response.data as Map<String, dynamic>);
      await _tokenStorage.saveToken(result.accessToken);
      return result;
    } catch (error) {
      _throwFriendlyError(error);
    }
  }

  Future<UserModel> register({
    required String fullName,
    required String email,
    required String phone,
    required String password,
  }) async {
    try {
      final response = await _dio.post(
        '/api/v1/auth/register',
        data: {
          'full_name': fullName,
          'email': email,
          'phone': phone,
          'password': password,
          'role': 'client',
        },
      );
      return UserModel.fromJson(response.data as Map<String, dynamic>);
    } catch (error) {
      _throwFriendlyError(error);
    }
  }

  Future<UserModel> getMe() async {
    try {
      final response = await _dio.get('/api/v1/auth/me');
      return UserModel.fromJson(response.data as Map<String, dynamic>);
    } catch (error) {
      _throwFriendlyError(error);
    }
  }

  Future<List<ServiceItemModel>> getServices() async {
    try {
      final response = await _dio.get('/api/v1/services/');
      return (response.data as List<dynamic>)
          .map((item) => ServiceItemModel.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (error) {
      _throwFriendlyError(error);
    }
  }

  Future<List<ProductItemModel>> getProducts() async {
    try {
      final response = await _dio.get('/api/v1/products/');
      return (response.data as List<dynamic>)
          .map((item) => ProductItemModel.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (error) {
      _throwFriendlyError(error);
    }
  }

  Future<List<BookingModel>> getBookings() async {
    try {
      final response = await _dio.get('/api/v1/bookings/');
      return (response.data as List<dynamic>)
          .map((item) => BookingModel.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (error) {
      _throwFriendlyError(error);
    }
  }

  Future<List<VehicleModel>> getVehicles() async {
    try {
      final response = await _dio.get('/api/v1/bookings/vehicles');
      return (response.data as List<dynamic>)
          .map((item) => VehicleModel.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (error) {
      _throwFriendlyError(error);
    }
  }

  Future<Map<String, dynamic>> checkSlot({
    required String date,
    required String time,
    required int serviceId,
  }) async {
    try {
      final response = await _dio.get(
        '/api/v1/bookings/check-slot',
        queryParameters: {
          'date': date,
          'time': time,
          'service_id': serviceId,
        },
      );
      return Map<String, dynamic>.from(response.data as Map);
    } catch (error) {
      _throwFriendlyError(error);
    }
  }

  Future<BookingModel> createBooking({
    int? vehicleId,
    required int serviceId,
    required String bookingDate,
    required String bookingTime,
    String? notes,
  }) async {
    try {
      final response = await _dio.post(
        '/api/v1/bookings/',
        data: {
          'vehicle_id': vehicleId,
          'service_id': serviceId,
          'booking_date': bookingDate,
          'booking_time': bookingTime,
          'notes': notes,
        },
      );
      return BookingModel.fromJson(response.data as Map<String, dynamic>);
    } catch (error) {
      _throwFriendlyError(error);
    }
  }

  Future<ClientHistoryModel> getClientHistory(int clientId) async {
    try {
      final response = await _dio.get('/api/v1/bookings/clients/$clientId/history');
      return ClientHistoryModel.fromJson(response.data as Map<String, dynamic>);
    } catch (error) {
      _throwFriendlyError(error);
    }
  }

  Future<void> createOrder(Map<int, int> cart) async {
    try {
      await _dio.post(
        '/api/v1/orders/',
        data: {
          'items': cart.entries
              .map(
                (entry) => {
                  'product_id': entry.key,
                  'quantity': entry.value,
                },
              )
              .toList(),
        },
      );
    } catch (error) {
      _throwFriendlyError(error);
    }
  }

  Future<void> registerDeviceToken({
    required String fcmToken,
    required String platform,
  }) async {
    try {
      await _dio.post(
        '/api/v1/devices/',
        data: {
          'fcm_token': fcmToken,
          'platform': platform,
        },
      );
    } catch (error) {
      _throwFriendlyError(error);
    }
  }

  Future<bool> hasToken() async => (await _tokenStorage.readToken()) != null;

  Future<void> logout() => _tokenStorage.clearToken();
}
