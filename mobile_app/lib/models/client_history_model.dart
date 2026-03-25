import 'booking_model.dart';
import 'vehicle_model.dart';

class ClientHistoryModel {
  ClientHistoryModel({
    required this.clientId,
    required this.fullName,
    required this.email,
    required this.phone,
    required this.isVip,
    required this.vipDiscountPercent,
    this.vipSince,
    required this.vehicles,
    required this.bookings,
    required this.totalSpent,
    required this.totalVisits,
  });

  factory ClientHistoryModel.fromJson(Map<String, dynamic> json) {
    return ClientHistoryModel(
      clientId: json['client_id'] is int ? json['client_id'] as int : int.tryParse(json['client_id'].toString()) ?? 0,
      fullName: json['full_name'] as String? ?? '',
      email: json['email'] as String? ?? '',
      phone: json['phone'] as String? ?? '',
      isVip: json['is_vip'] as bool? ?? false,
      vipDiscountPercent: json['vip_discount_percent'] is int ? json['vip_discount_percent'] as int : int.tryParse(json['vip_discount_percent'].toString()) ?? 0,
      vipSince: json['vip_since'] as String?,
      vehicles: (json['vehicles'] as List<dynamic>? ?? const [])
          .map((item) => VehicleModel.fromJson(item as Map<String, dynamic>))
          .toList(),
      bookings: (json['bookings'] as List<dynamic>? ?? const [])
          .map((item) => BookingModel.fromJson(item as Map<String, dynamic>))
          .toList(),
      totalSpent: (json['total_spent'] as num?)?.toDouble() ?? 0,
      totalVisits: json['total_visits'] as int? ?? 0,
    );
  }

  final int clientId;
  final String fullName;
  final String email;
  final String phone;
  final bool isVip;
  final int vipDiscountPercent;
  final String? vipSince;
  final List<VehicleModel> vehicles;
  final List<BookingModel> bookings;
  final double totalSpent;
  final int totalVisits;
}
