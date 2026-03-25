import 'package:flutter/material.dart';

import '../../models/service_item_model.dart';

class ServiceMarketing {
  const ServiceMarketing({
    required this.icon,
    required this.headline,
    required this.startsFrom,
    required this.color,
  });

  final IconData icon;
  final String headline;
  final bool startsFrom;
  final Color color;
}

String _normalize(String? value) {
  return (value ?? '').toLowerCase().trim();
}

ServiceMarketing getServiceMarketing(ServiceItemModel service) {
  final name = _normalize(service.name);
  final nameAr = _normalize(service.nameAr);

  bool has(List<String> values) => values.any((value) => name.contains(value) || nameAr.contains(value));

  if (has(['lavage interieur et exterieur', 'غسيل داخلي و خارجي'])) {
    return const ServiceMarketing(
      icon: Icons.auto_awesome,
      headline: 'Full inside and outside refresh for daily shine.',
      startsFrom: true,
      color: Color(0xFF4FC3F7),
    );
  }
  if (has(['nettoyant ceramique en spray', 'غسيل سيراميك سبراي'])) {
    return const ServiceMarketing(
      icon: Icons.diamond_outlined,
      headline: 'Quick ceramic glow with extra surface protection.',
      startsFrom: false,
      color: Color(0xFFBA68C8),
    );
  }
  if (has(['nettoyage a la vapeur en profondeur', 'تنظيف عميق بالبوخار'])) {
    return const ServiceMarketing(
      icon: Icons.mode_fan_off_outlined,
      headline: 'Deep steam treatment for fabrics and hard-to-reach areas.',
      startsFrom: true,
      color: Color(0xFF4DB6AC),
    );
  }
  if (has(['detailing', 'تفصيل'])) {
    return const ServiceMarketing(
      icon: Icons.search,
      headline: 'Premium detailing finish built for showroom presentation.',
      startsFrom: true,
      color: Color(0xFFFFD54F),
    );
  }
  if (has(['polissage lustrage', 'ازالة خدوش'])) {
    return const ServiceMarketing(
      icon: Icons.auto_fix_high,
      headline: 'Polishing and gloss correction for visible paint defects.',
      startsFrom: true,
      color: Color(0xFFFF8A65),
    );
  }
  if (has(['elimination des rayures profondes', 'ازالة خدوش عميقة عملية دقيقة'])) {
    return const ServiceMarketing(
      icon: Icons.build_circle_outlined,
      headline: 'Precise local correction for deeper scratches.',
      startsFrom: false,
      color: Color(0xFFE57373),
    );
  }
  if (has(['nano ceramic', 'نانو سيراميك'])) {
    return const ServiceMarketing(
      icon: Icons.shield_moon_outlined,
      headline: 'Long-lasting premium coating for advanced body protection.',
      startsFrom: true,
      color: Color(0xFF7986CB),
    );
  }

  return const ServiceMarketing(
    icon: Icons.miscellaneous_services_outlined,
    headline: 'Professional vehicle care tailored to your needs.',
    startsFrom: false,
    color: Color(0xFF9E9E9E),
  );
}

String formatServicePriceLabel(ServiceItemModel service) {
  final marketing = getServiceMarketing(service);
  final amount = '${service.price.toStringAsFixed(3)} TND';
  return marketing.startsFrom ? 'Starting from $amount' : amount;
}
