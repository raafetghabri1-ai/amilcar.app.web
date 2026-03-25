import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/notifications/notification_handler.dart';
import '../../../core/theme/app_theme.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../booking/presentation/booking_screen.dart';
import '../../profile/presentation/profile_screen.dart';
import '../../services/presentation/services_screen.dart';
import '../../store/presentation/store_screen.dart';
import '../../tracking/presentation/tracking_screen.dart';
import 'home_screen.dart';

class MainShellScreen extends StatefulWidget {
  const MainShellScreen({super.key});

  @override
  State<MainShellScreen> createState() => _MainShellScreenState();
}

class _MainShellScreenState extends State<MainShellScreen> {
  int _currentIndex = 0;
  int? _preselectedServiceId;
  late final NotificationHandler _notificationHandler;

  @override
  void initState() {
    super.initState();
    _notificationHandler = context.read<NotificationHandler>();
    _notificationHandler.routeNotifier.addListener(_handleNotificationRoute);
    WidgetsBinding.instance.addPostFrameCallback((_) => _handleNotificationRoute());
  }

  @override
  void dispose() {
    _notificationHandler.routeNotifier.removeListener(_handleNotificationRoute);
    super.dispose();
  }

  void _handleNotificationRoute() {
    final route = _notificationHandler.routeNotifier.value;
    if (route == null) {
      return;
    }

    setState(() {
      if (route.contains('/tracking')) {
        _currentIndex = 2;
      } else if (route.contains('/booking')) {
        _currentIndex = 1;
      } else if (route.contains('/services')) {
        _currentIndex = 3;
      } else if (route.contains('/store')) {
        _currentIndex = 4;
      } else if (route.contains('/profile')) {
        _currentIndex = 5;
      } else {
        _currentIndex = 0;
      }
    });

    _notificationHandler.clearRoute();
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthController>().user;
    final titles = [
      'Home',
      'Booking',
      'Tracking',
      'Services',
      'Store',
      'Profile',
    ];

    final pages = [
      const HomeScreen(),
      BookingScreen(
        preselectedServiceId: _preselectedServiceId,
        onBookingCreated: () => setState(() => _currentIndex = 0),
      ),
      const TrackingScreen(),
      ServicesScreen(
        onBookNow: (serviceId) {
          setState(() {
            _preselectedServiceId = serviceId;
            _currentIndex = 1;
          });
        },
      ),
      const StoreScreen(),
      const ProfileScreen(),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(titles[_currentIndex]),
            if (user != null)
              Text(
                user.fullName,
                style: const TextStyle(fontSize: 12, color: AppTheme.muted),
              ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Logout',
            onPressed: () => context.read<AuthController>().logout(),
            icon: const Icon(Icons.logout_rounded),
          ),
        ],
      ),
      body: SafeArea(child: IndexedStack(index: _currentIndex, children: pages)),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (index) => setState(() => _currentIndex = index),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.event_available_outlined), selectedIcon: Icon(Icons.event_available), label: 'Booking'),
          NavigationDestination(icon: Icon(Icons.local_shipping_outlined), selectedIcon: Icon(Icons.local_shipping), label: 'Tracking'),
          NavigationDestination(icon: Icon(Icons.design_services_outlined), selectedIcon: Icon(Icons.design_services), label: 'Services'),
          NavigationDestination(icon: Icon(Icons.shopping_bag_outlined), selectedIcon: Icon(Icons.shopping_bag), label: 'Store'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }
}
