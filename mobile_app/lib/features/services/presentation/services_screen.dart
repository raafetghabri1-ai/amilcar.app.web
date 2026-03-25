import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/constants/service_marketing.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';
import '../../../models/service_item_model.dart';

class ServicesScreen extends StatefulWidget {
  const ServicesScreen({super.key, required this.onBookNow});

  final ValueChanged<int> onBookNow;

  @override
  State<ServicesScreen> createState() => _ServicesScreenState();
}

class _ServicesScreenState extends State<ServicesScreen> {
  late Future<List<ServiceItemModel>> _future;

  @override
  void initState() {
    super.initState();
    _future = context.read<ApiClient>().getServices();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<ServiceItemModel>>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(child: Text(snapshot.error.toString()));
        }

        final services = snapshot.data ?? const <ServiceItemModel>[];
        return ListView.builder(
          padding: const EdgeInsets.all(20),
          itemCount: services.length,
          itemBuilder: (context, index) {
            final service = services[index];
            final marketing = getServiceMarketing(service);
            return Container(
              margin: const EdgeInsets.only(bottom: 14),
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AppTheme.surface,
                borderRadius: BorderRadius.circular(22),
                border: Border.all(color: Colors.white10),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: marketing.color.withOpacity(0.14),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Icon(marketing.icon, color: marketing.color),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(service.name, style: Theme.of(context).textTheme.titleLarge),
                      ),
                      Text(formatServicePriceLabel(service), style: const TextStyle(color: AppTheme.accent)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(marketing.headline, style: TextStyle(color: marketing.color, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  Text(service.description ?? 'Professional auto care service.', style: const TextStyle(color: AppTheme.muted)),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Chip(label: Text(service.category)),
                      const SizedBox(width: 8),
                      Chip(label: Text('${service.durationMinutes} min')),
                      const Spacer(),
                      ElevatedButton(
                        onPressed: () => widget.onBookNow(service.id),
                        child: const Text('Book now'),
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}
