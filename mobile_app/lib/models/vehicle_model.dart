class VehicleModel {
  VehicleModel({
    required this.id,
    required this.clientId,
    required this.brand,
    required this.model,
    this.year,
    this.color,
    required this.plateNumber,
    required this.createdAt,
  });

  static int _toInt(dynamic v) => v is int ? v : int.tryParse(v.toString()) ?? 0;
  static int? _toIntN(dynamic v) => v == null ? null : (v is int ? v : int.tryParse(v.toString()));

  factory VehicleModel.fromJson(Map<String, dynamic> json) {
    return VehicleModel(
      id: _toInt(json['id']),
      clientId: _toInt(json['client_id']),
      brand: json['brand'] as String? ?? '',
      model: json['model'] as String? ?? '',
      year: _toIntN(json['year']),
      color: json['color'] as String?,
      plateNumber: json['plate_number'] as String? ?? '',
      createdAt: json['created_at'] as String? ?? '',
    );
  }

  final int id;
  final int clientId;
  final String brand;
  final String model;
  final int? year;
  final String? color;
  final String plateNumber;
  final String createdAt;
}
