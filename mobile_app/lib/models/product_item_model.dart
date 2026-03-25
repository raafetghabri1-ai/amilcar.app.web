class ProductItemModel {
  ProductItemModel({
    required this.id,
    required this.name,
    this.nameAr,
    this.description,
    required this.category,
    required this.price,
    required this.unit,
    required this.stockQuantity,
    this.imageUrl,
    required this.isActive,
  });

  static int _toInt(dynamic v) => v is int ? v : int.tryParse(v.toString()) ?? 0;
  static double _toDouble(dynamic v) => v is num ? v.toDouble() : double.tryParse(v.toString()) ?? 0;

  factory ProductItemModel.fromJson(Map<String, dynamic> json) {
    return ProductItemModel(
      id: _toInt(json['id']),
      name: json['name'] as String? ?? '',
      nameAr: json['name_ar'] as String?,
      description: json['description'] as String?,
      category: json['category'] as String? ?? '',
      price: _toDouble(json['price']),
      unit: json['unit'] as String? ?? '',
      stockQuantity: _toInt(json['stock_quantity']),
      imageUrl: json['image_url'] as String?,
      isActive: json['is_active'] as bool? ?? false,
    );
  }

  final int id;
  final String name;
  final String? nameAr;
  final String? description;
  final String category;
  final double price;
  final String unit;
  final int stockQuantity;
  final String? imageUrl;
  final bool isActive;
}
