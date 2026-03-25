class UserModel {
  UserModel({
    required this.id,
    required this.fullName,
    required this.email,
    required this.phone,
    required this.role,
    required this.isActive,
    required this.isVip,
    required this.vipDiscountPercent,
    this.dateOfBirth,
    this.avatarUrl,
    this.specialty,
    this.salary,
    this.vipSince,
    required this.createdAt,
  });

  static int _toInt(dynamic v) => v is int ? v : int.tryParse(v.toString()) ?? 0;
  static double _toDouble(dynamic v) => v is num ? v.toDouble() : double.tryParse(v.toString()) ?? 0;

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: _toInt(json['id']),
      fullName: json['full_name'] as String? ?? '',
      email: json['email'] as String? ?? '',
      phone: json['phone'] as String? ?? '',
      role: json['role'] as String? ?? 'client',
      isActive: json['is_active'] as bool? ?? false,
      isVip: json['is_vip'] as bool? ?? false,
      vipDiscountPercent: _toInt(json['vip_discount_percent']),
      dateOfBirth: json['date_of_birth'] as String?,
      avatarUrl: json['avatar_url'] as String?,
      specialty: json['specialty'] as String?,
      salary: json['salary'] != null ? _toDouble(json['salary']) : null,
      vipSince: json['vip_since'] as String?,
      createdAt: json['created_at'] as String? ?? '',
    );
  }

  final int id;
  final String fullName;
  final String email;
  final String phone;
  final String? dateOfBirth;
  final String role;
  final bool isActive;
  final String? avatarUrl;
  final String? specialty;
  final double? salary;
  final bool isVip;
  final int vipDiscountPercent;
  final String? vipSince;
  final String createdAt;
}
