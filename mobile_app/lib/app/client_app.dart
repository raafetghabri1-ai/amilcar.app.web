import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:provider/provider.dart';

import '../core/network/api_client.dart';
import '../core/network/server_config.dart';
import '../core/notifications/fcm_service.dart';
import '../core/notifications/local_notifications.dart';
import '../core/notifications/notification_handler.dart';
import '../core/storage/token_storage.dart';
import '../core/theme/app_theme.dart';
import '../features/auth/data/auth_repository.dart';
import '../features/auth/presentation/auth_controller.dart';
import '../features/auth/presentation/login_screen.dart';
import '../features/auth/presentation/splash_screen.dart';
import '../features/home/presentation/main_shell_screen.dart';

class ClientApp extends StatelessWidget {
  const ClientApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider(create: (_) => const FlutterSecureStorage()),
        ProxyProvider<FlutterSecureStorage, TokenStorage>(
          update: (_, storage, __) => TokenStorage(storage),
        ),
        ProxyProvider<FlutterSecureStorage, ServerConfig>(
          update: (_, storage, __) => ServerConfig(storage),
        ),
        Provider(create: (_) => NotificationHandler()),
        ProxyProvider2<TokenStorage, ServerConfig, ApiClient>(
          update: (_, tokenStorage, serverConfig, __) => ApiClient(tokenStorage, serverConfig),
        ),
        ProxyProvider<NotificationHandler, LocalNotificationsService>(
          update: (_, notificationHandler, __) => LocalNotificationsService(notificationHandler),
        ),
        ProxyProvider3<ApiClient, LocalNotificationsService, NotificationHandler, FcmService>(
          update: (_, apiClient, localNotifications, notificationHandler, __) =>
              FcmService(apiClient, localNotifications, notificationHandler),
        ),
        ProxyProvider<ApiClient, AuthRepository>(
          update: (_, apiClient, __) => AuthRepository(apiClient),
        ),
        ChangeNotifierProvider(
          create: (context) => AuthController(
            repository: context.read<AuthRepository>(),
          ),
        ),
      ],
      child: Consumer<NotificationHandler>(
        builder: (context, notificationHandler, _) => MaterialApp(
          title: 'AMILCAR',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.darkTheme,
          navigatorKey: notificationHandler.navigatorKey,
          home: const _AppGate(),
        ),
      ),
    );
  }
}

class _AppGate extends StatefulWidget {
  const _AppGate();

  @override
  State<_AppGate> createState() => _AppGateState();
}

class _AppGateState extends State<_AppGate> {
  bool _bootstrapped = false;
  int? _lastRegisteredUserId;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_bootstrapped) {
      return;
    }
    _bootstrapped = true;
    Future.microtask(() async {
      await context.read<ServerConfig>().load();
      context.read<ApiClient>().refreshBaseUrl();
      await context.read<FcmService>().initialize();
      await context.read<AuthController>().bootstrap();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthController>(
      builder: (context, auth, _) {
        if (auth.status == AuthStatus.authenticated && auth.user != null && auth.user!.id != _lastRegisteredUserId) {
          _lastRegisteredUserId = auth.user!.id;
          Future.microtask(() => context.read<FcmService>().registerDeviceToken());
        }

        if (auth.status == AuthStatus.unauthenticated) {
          _lastRegisteredUserId = null;
        }

        switch (auth.status) {
          case AuthStatus.initial:
          case AuthStatus.loading:
            return const SplashScreen();
          case AuthStatus.authenticated:
            return const MainShellScreen();
          case AuthStatus.unauthenticated:
            return const LoginScreen();
        }
      },
    );
  }
}
