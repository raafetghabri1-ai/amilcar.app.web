import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../../core/constants/app_config.dart';
import '../../../core/constants/service_marketing.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';
import '../../../models/service_item_model.dart';
import '../../../models/vehicle_model.dart';

class BookingScreen extends StatefulWidget {
  const BookingScreen({
    super.key,
    this.preselectedServiceId,
    required this.onBookingCreated,
  });

  final int? preselectedServiceId;
  final VoidCallback onBookingCreated;

  @override
  State<BookingScreen> createState() => _BookingScreenState();
}

class _BookingScreenState extends State<BookingScreen> {
  final TextEditingController _notesController = TextEditingController();

  List<ServiceItemModel> _services = const [];
  List<VehicleModel> _vehicles = const [];
  ServiceItemModel? _selectedService;
  VehicleModel? _selectedVehicle;
  DateTime _selectedDate = DateTime.now().add(const Duration(days: 1));
  String? _selectedTime;
  bool _loading = true;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void didUpdateWidget(covariant BookingScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.preselectedServiceId != widget.preselectedServiceId && widget.preselectedServiceId != null) {
      final match = _services.where((service) => service.id == widget.preselectedServiceId).firstOrNull;
      if (match != null) {
        setState(() => _selectedService = match);
      }
    }
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final api = context.read<ApiClient>();
      final results = await Future.wait([api.getServices(), api.getVehicles()]);
      final services = results[0] as List<ServiceItemModel>;
      final vehicles = results[1] as List<VehicleModel>;
      ServiceItemModel? selectedService;
      if (widget.preselectedServiceId != null) {
        for (final service in services) {
          if (service.id == widget.preselectedServiceId) {
            selectedService = service;
            break;
          }
        }
      }
      setState(() {
        _services = services;
        _vehicles = vehicles;
        _selectedService = selectedService ?? services.firstOrNull;
        _selectedVehicle = vehicles.firstOrNull;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString())));
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 90)),
    );
    if (picked != null) {
      setState(() {
        _selectedDate = picked;
        _selectedTime = null;
      });
    }
  }

  Future<void> _submitBooking() async {
    if (_selectedService == null || _selectedTime == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Choose a service, date, and time slot.')),
      );
      return;
    }

    setState(() => _submitting = true);
    final api = context.read<ApiClient>();
    final date = DateFormat('yyyy-MM-dd').format(_selectedDate);

    try {
      final availability = await api.checkSlot(
        date: date,
        time: _selectedTime!,
        serviceId: _selectedService!.id,
      );

      if (availability['available'] != true) {
        throw ApiException(
          'Selected slot is not available. Conflict at ${availability['conflict_time']}.',
        );
      }

      await api.createBooking(
        vehicleId: _selectedVehicle?.id,
        serviceId: _selectedService!.id,
        bookingDate: date,
        bookingTime: _selectedTime!,
        notes: _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
      );

      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Booking created successfully.')),
      );
      _notesController.clear();
      widget.onBookingCreated();
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString())));
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

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
              Text('Book a service', style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 8),
              const Text(
                'Choose a service, pick an available slot, then confirm your appointment.',
                style: TextStyle(color: AppTheme.muted),
              ),
              const SizedBox(height: 20),
              DropdownButtonFormField<ServiceItemModel>(
                value: _selectedService,
                items: _services
                    .map(
                      (service) => DropdownMenuItem(
                        value: service,
                        child: Text('${service.name} • ${formatServicePriceLabel(service)}'),
                      ),
                    )
                    .toList(),
                onChanged: (value) => setState(() => _selectedService = value),
                decoration: const InputDecoration(labelText: 'Service'),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<VehicleModel?>(
                value: _selectedVehicle,
                items: [
                  const DropdownMenuItem<VehicleModel?>(value: null, child: Text('No vehicle selected')),
                  ..._vehicles.map(
                    (vehicle) => DropdownMenuItem<VehicleModel?>(
                      value: vehicle,
                      child: Text('${vehicle.brand} ${vehicle.model} • ${vehicle.plateNumber}'),
                    ),
                  ),
                ],
                onChanged: (value) => setState(() => _selectedVehicle = value),
                decoration: const InputDecoration(labelText: 'Vehicle'),
              ),
              const SizedBox(height: 16),
              InkWell(
                onTap: _pickDate,
                borderRadius: BorderRadius.circular(16),
                child: Ink(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppTheme.surfaceSoft,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.white12),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.calendar_month_outlined, color: AppTheme.accent),
                      const SizedBox(width: 12),
                      Expanded(child: Text(DateFormat('EEEE, yyyy-MM-dd').format(_selectedDate))),
                      const Icon(Icons.chevron_right_rounded),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 18),
              Text('Available times', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 10),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: AppConfig.bookingSlots
                    .map(
                      (slot) => ChoiceChip(
                        label: Text(slot.substring(0, 5)),
                        selected: _selectedTime == slot,
                        onSelected: (_) => setState(() => _selectedTime = slot),
                      ),
                    )
                    .toList(),
              ),
              const SizedBox(height: 18),
              TextFormField(
                controller: _notesController,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Notes',
                  hintText: 'Optional details about the appointment',
                ),
              ),
              const SizedBox(height: 22),
              ElevatedButton(
                onPressed: _submitting ? null : _submitBooking,
                child: _submitting
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(strokeWidth: 2.4),
                      )
                    : const Text('Confirm booking'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

extension _FirstOrNull<T> on List<T> {
  T? get firstOrNull => isEmpty ? null : first;
}
