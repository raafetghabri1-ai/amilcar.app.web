class ServiceItemModel {
  ServiceItemModel({
    required this.id,
    required this.name,
    this.nameAr,
    this.description,
    required this.category,
    required this.price,
    required this.durationMinutes,
    required this.isActive,
    this.imageUrl,
    required this.createdAt,
  });

  static int _toInt(dynamic v) => v is int ? v : int.tryParse(v.toString()) ?? 0;
  static double _toDouble(dynamic v) => v is num ? v.toDouble() : double.tryParse(v.toString()) ?? 0;

  factory ServiceItemModel.fromJson(Map<String, dynamic> json) {
    return ServiceItemModel(
      id: _toInt(json['id']),
      name: json['name'] as String? ?? '',
      nameAr: json['name_ar'] as String?,
      description: json['description'] as String?,
      category: json['category'] as String? ?? '',
      price: _toDouble(json['price']),
      durationMinutes: _toInt(json['duration_minutes']),
      isActive: json['is_active'] as bool? ?? false,
      imageUrl: json['image_url'] as String?,
      createdAt: json['created_at'] as String? ?? '',
    );
  }

  final int id;
  final String name;
  final String? nameAr;
  final String? description;
  final String category;
  final double price;
  final int durationMinutes;
  final bool isActive;
  final String? imageUrl;
  final String createdAt;
}
