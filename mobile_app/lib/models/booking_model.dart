class BookingModel {
  BookingModel({
    required this.id,
    required this.clientId,
    this.vehicleId,
    this.workerId,
    required this.serviceId,
    required this.bookingDate,
    required this.bookingTime,
    required this.status,
    required this.totalPrice,
    this.paymentMethod,
    required this.isPaid,
    this.notes,
    required this.createdAt,
    this.clientName,
    this.clientPhone,
    this.serviceName,
    this.serviceNameAr,
    this.serviceDuration,
    this.vehicleInfo,
    this.workerName,
    required this.isVip,
    required this.vipDiscountPercent,
    this.originalPrice,
  });

  static int _toInt(dynamic v) => v is int ? v : int.tryParse(v.toString()) ?? 0;
  static int? _toIntN(dynamic v) => v == null ? null : (v is int ? v : int.tryParse(v.toString()));
  static double _toDouble(dynamic v) => v is num ? v.toDouble() : double.tryParse(v.toString()) ?? 0;
  static double? _toDoubleN(dynamic v) => v == null ? null : (v is num ? v.toDouble() : double.tryParse(v.toString()));

  factory BookingModel.fromJson(Map<String, dynamic> json) {
    return BookingModel(
      id: _toInt(json['id']),
      clientId: _toInt(json['client_id']),
      vehicleId: _toIntN(json['vehicle_id']),
      workerId: _toIntN(json['worker_id']),
      serviceId: _toInt(json['service_id']),
      bookingDate: json['booking_date'] as String? ?? '',
      bookingTime: json['booking_time'] as String? ?? '',
      status: json['status'] as String? ?? 'pending',
      totalPrice: _toDouble(json['total_price']),
      paymentMethod: json['payment_method'] as String?,
      isPaid: json['is_paid'] as bool? ?? false,
      notes: json['notes'] as String?,
      createdAt: json['created_at'] as String? ?? '',
      clientName: json['client_name'] as String?,
      clientPhone: json['client_phone'] as String?,
      serviceName: json['service_name'] as String?,
      serviceNameAr: json['service_name_ar'] as String?,
      serviceDuration: _toIntN(json['service_duration']),
      vehicleInfo: json['vehicle_info'] as String?,
      workerName: json['worker_name'] as String?,
      isVip: json['is_vip'] as bool? ?? false,
      vipDiscountPercent: _toInt(json['vip_discount_percent']),
      originalPrice: _toDoubleN(json['original_price']),
    );
  }

  final int id;
  final int clientId;
  final int? vehicleId;
  final int? workerId;
  final int serviceId;
  final String bookingDate;
  final String bookingTime;
  final String status;
  final double totalPrice;
  final String? paymentMethod;
  final bool isPaid;
  final String? notes;
  final String createdAt;
  final String? clientName;
  final String? clientPhone;
  final String? serviceName;
  final String? serviceNameAr;
  final int? serviceDuration;
  final String? vehicleInfo;
  final String? workerName;
  final bool isVip;
  final int vipDiscountPercent;
  final double? originalPrice;
}
