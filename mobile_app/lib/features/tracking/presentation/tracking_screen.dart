import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';
import '../../../models/booking_model.dart';

class TrackingScreen extends StatefulWidget {
  const TrackingScreen({super.key});

  @override
  State<TrackingScreen> createState() => _TrackingScreenState();
}

class _TrackingScreenState extends State<TrackingScreen> {
  Timer? _timer;
  bool _loading = true;
  String? _error;
  List<BookingModel> _bookings = const [];

  @override
  void initState() {
    super.initState();
    _load();
    _timer = Timer.periodic(const Duration(seconds: 30), (_) => _load(silent: true));
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent && mounted) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }

    try {
      final bookings = await context.read<ApiClient>().getBookings();
      if (!mounted) {
        return;
      }
      setState(() {
        _bookings = bookings.where((booking) => booking.status != 'cancelled').toList();
        _error = null;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() => _error = error.toString());
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(child: Text(_error!, style: const TextStyle(color: AppTheme.muted)));
    }

    if (_bookings.isEmpty) {
      return const Center(
        child: Text('No active vehicles to track right now.', style: TextStyle(color: AppTheme.muted)),
      );
    }

    return ListView(
      padding: const EdgeInsets.all(20),
      children: _bookings.map((booking) => _TrackingCard(booking: booking)).toList(),
    );
  }
}

class _TrackingCard extends StatelessWidget {
  const _TrackingCard({required this.booking});

  final BookingModel booking;

  double get progress {
    switch (booking.status) {
      case 'pending':
        return 0.2;
      case 'confirmed':
        return 0.45;
      case 'in_progress':
        return 0.75;
      case 'completed':
        return 1;
      default:
        return 0;
    }
  }

  String get stageLabel {
    switch (booking.status) {
      case 'pending':
        return 'Waiting';
      case 'confirmed':
        return 'Accepted';
      case 'in_progress':
        return 'Processing';
      case 'completed':
        return 'Ready';
      default:
        return 'Unknown';
    }
  }

  @override
  Widget build(BuildContext context) {
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
          Text(booking.serviceName ?? 'Service', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 6),
          Text(booking.vehicleInfo ?? 'Vehicle not specified', style: const TextStyle(color: AppTheme.muted)),
          const SizedBox(height: 16),
          LinearProgressIndicator(
            value: progress,
            minHeight: 10,
            borderRadius: BorderRadius.circular(999),
            backgroundColor: Colors.white10,
            valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.primary),
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: const [Text('Waiting'), Text('Processing'), Text('Ready')],
          ),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: AppTheme.accent.withOpacity(0.14),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text('Current stage: $stageLabel'),
          ),
        ],
      ),
    );
  }
}
