import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';
import '../../../models/client_history_model.dart';
import '../../auth/presentation/auth_controller.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  Future<ClientHistoryModel>? _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= _load();
  }

  Future<ClientHistoryModel> _load() {
    final user = context.read<AuthController>().user!;
    return context.read<ApiClient>().getClientHistory(user.id);
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthController>().user;
    if (user == null) {
      return const SizedBox.shrink();
    }

    return FutureBuilder<ClientHistoryModel>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(child: Text(snapshot.error.toString()));
        }

        final history = snapshot.data!;
        return ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppTheme.surface,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: Colors.white10),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 30,
                        backgroundColor: AppTheme.primary.withOpacity(0.18),
                        child: Text(user.fullName.isEmpty ? 'A' : user.fullName[0].toUpperCase()),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(user.fullName, style: Theme.of(context).textTheme.titleLarge),
                            const SizedBox(height: 4),
                            Text(user.email, style: const TextStyle(color: AppTheme.muted)),
                            Text(user.phone, style: const TextStyle(color: AppTheme.muted)),
                          ],
                        ),
                      ),
                      if (user.isVip)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: AppTheme.accent.withOpacity(0.14),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text('VIP ${user.vipDiscountPercent}%'),
                        ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    children: [
                      _InfoPill(label: 'Visits', value: '${history.totalVisits}'),
                      _InfoPill(label: 'Spent', value: '${history.totalSpent.toStringAsFixed(3)} TND'),
                      _InfoPill(label: 'Cars', value: '${history.vehicles.length}'),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            Text('My vehicles', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 10),
            if (history.vehicles.isEmpty)
              const _EmptyCard(message: 'No vehicles added yet.')
            else
              ...history.vehicles.map(
                (vehicle) => Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppTheme.surface,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.white10),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.directions_car_filled_outlined, color: AppTheme.accent),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text('${vehicle.brand} ${vehicle.model} • ${vehicle.plateNumber}'),
                      ),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 20),
            Text('Visit history', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 10),
            if (history.bookings.isEmpty)
              const _EmptyCard(message: 'No visit history yet.')
            else
              ...history.bookings.take(6).map(
                (booking) => Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppTheme.surface,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.white10),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(booking.serviceName ?? 'Service', style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 6),
                      Text('${booking.bookingDate} • ${booking.status}', style: const TextStyle(color: AppTheme.muted)),
                    ],
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}

class _InfoPill extends StatelessWidget {
  const _InfoPill({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: AppTheme.surfaceSoft,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: AppTheme.muted, fontSize: 12)),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}

class _EmptyCard extends StatelessWidget {
  const _EmptyCard({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white10),
      ),
      child: Text(message, style: const TextStyle(color: AppTheme.muted)),
    );
  }
}