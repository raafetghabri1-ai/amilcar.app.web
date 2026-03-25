import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/network/server_config.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/amilcar_logo.dart';
import 'auth_controller.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _loginFormKey = GlobalKey<FormState>();
  final _registerFormKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _registerNameController = TextEditingController();
  final _registerEmailController = TextEditingController();
  final _registerPhoneController = TextEditingController();
  final _registerPasswordController = TextEditingController();

  bool _isRegisterMode = false;
  bool _obscureLoginPassword = true;
  bool _obscureRegisterPassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _registerNameController.dispose();
    _registerEmailController.dispose();
    _registerPhoneController.dispose();
    _registerPasswordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final auth = context.read<AuthController>();
    final formState = _isRegisterMode
        ? _registerFormKey.currentState
        : _loginFormKey.currentState;

    if (!(formState?.validate() ?? false)) {
      return;
    }

    final success = _isRegisterMode
        ? await auth.register(
            fullName: _registerNameController.text.trim(),
            email: _registerEmailController.text.trim(),
            phone: _registerPhoneController.text.trim(),
            password: _registerPasswordController.text,
          )
        : await auth.login(
            email: _emailController.text.trim(),
            password: _passwordController.text,
          );

    if (!mounted || success) {
      return;
    }

    final message = context.read<AuthController>().errorMessage;
    if (message != null && message.isNotEmpty) {
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text(message)));
    }
  }

  String? _validateEmail(String? value) {
    final email = value?.trim() ?? '';
    if (email.isEmpty) {
      return 'Email is required';
    }
    if (!email.contains('@')) {
      return 'Enter a valid email';
    }
    return null;
  }

  Future<void> _showServerDialog(BuildContext context) async {
    final serverConfig = context.read<ServerConfig>();
    final controller = TextEditingController(text: serverConfig.baseUrl);

    final result = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Server Address'),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.url,
          decoration: const InputDecoration(
            hintText: 'http://192.168.1.16:8000',
            labelText: 'API Base URL',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, controller.text.trim()),
            child: const Text('Save'),
          ),
        ],
      ),
    );

    if (result != null && result.isNotEmpty && mounted) {
      await serverConfig.save(result);
      context.read<ApiClient>().refreshBaseUrl();
      setState(() {});
      if (mounted) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(SnackBar(content: Text('Server: $result')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();

    return Scaffold(
      body: SafeArea(
        child: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF0A0A0A), Color(0xFF170E0E)],
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
            ),
          ),
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 460),
                child: Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: AppTheme.surface.withOpacity(0.96),
                    borderRadius: BorderRadius.circular(28),
                    border: Border.all(color: Colors.white10),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Center(child: AmilcarLogo(size: 84)),
                      const SizedBox(height: 20),
                      Text(
                        _isRegisterMode ? 'Create your account' : 'Welcome back',
                        style: Theme.of(context).textTheme.headlineMedium,
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Connect to AMILCAR with your client account.',
                        style: const TextStyle(color: AppTheme.muted),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 20),
                      Container(
                        decoration: BoxDecoration(
                          color: AppTheme.surfaceSoft,
                          borderRadius: BorderRadius.circular(18),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: _ModeButton(
                                label: 'Login',
                                selected: !_isRegisterMode,
                                onTap: () => setState(() => _isRegisterMode = false),
                              ),
                            ),
                            Expanded(
                              child: _ModeButton(
                                label: 'Register',
                                selected: _isRegisterMode,
                                onTap: () => setState(() => _isRegisterMode = true),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),
                      AnimatedSwitcher(
                        duration: const Duration(milliseconds: 220),
                        child: _isRegisterMode
                            ? Form(
                                key: _registerFormKey,
                                child: Column(
                                  key: const ValueKey('register-form'),
                                  children: [
                                    TextFormField(
                                      controller: _registerNameController,
                                      textInputAction: TextInputAction.next,
                                      validator: (value) => (value == null || value.trim().isEmpty)
                                          ? 'Full name is required'
                                          : null,
                                      decoration: const InputDecoration(labelText: 'Full name'),
                                    ),
                                    const SizedBox(height: 14),
                                    TextFormField(
                                      controller: _registerEmailController,
                                      keyboardType: TextInputType.emailAddress,
                                      textInputAction: TextInputAction.next,
                                      validator: _validateEmail,
                                      decoration: const InputDecoration(labelText: 'Email'),
                                    ),
                                    const SizedBox(height: 14),
                                    TextFormField(
                                      controller: _registerPhoneController,
                                      keyboardType: TextInputType.phone,
                                      textInputAction: TextInputAction.next,
                                      validator: (value) => (value == null || value.trim().length < 8)
                                          ? 'Enter a valid phone number'
                                          : null,
                                      decoration: const InputDecoration(labelText: 'Phone'),
                                    ),
                                    const SizedBox(height: 14),
                                    TextFormField(
                                      controller: _registerPasswordController,
                                      obscureText: _obscureRegisterPassword,
                                      validator: (value) => (value == null || value.length < 6)
                                          ? 'Password must be at least 6 characters'
                                          : null,
                                      decoration: InputDecoration(
                                        labelText: 'Password',
                                        suffixIcon: IconButton(
                                          onPressed: () => setState(
                                            () => _obscureRegisterPassword = !_obscureRegisterPassword,
                                          ),
                                          icon: Icon(
                                            _obscureRegisterPassword
                                                ? Icons.visibility_outlined
                                                : Icons.visibility_off_outlined,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              )
                            : Form(
                                key: _loginFormKey,
                                child: Column(
                                  key: const ValueKey('login-form'),
                                  children: [
                                    TextFormField(
                                      controller: _emailController,
                                      keyboardType: TextInputType.emailAddress,
                                      textInputAction: TextInputAction.next,
                                      validator: _validateEmail,
                                      decoration: const InputDecoration(labelText: 'Email'),
                                    ),
                                    const SizedBox(height: 14),
                                    TextFormField(
                                      controller: _passwordController,
                                      obscureText: _obscureLoginPassword,
                                      validator: (value) => (value == null || value.isEmpty)
                                          ? 'Password is required'
                                          : null,
                                      decoration: InputDecoration(
                                        labelText: 'Password',
                                        suffixIcon: IconButton(
                                          onPressed: () => setState(
                                            () => _obscureLoginPassword = !_obscureLoginPassword,
                                          ),
                                          icon: Icon(
                                            _obscureLoginPassword
                                                ? Icons.visibility_outlined
                                                : Icons.visibility_off_outlined,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                      ),
                      const SizedBox(height: 22),
                      ElevatedButton(
                        onPressed: auth.submitting ? null : _submit,
                        child: auth.submitting
                            ? const SizedBox(
                                width: 22,
                                height: 22,
                                child: CircularProgressIndicator(strokeWidth: 2.4),
                              )
                            : Text(_isRegisterMode ? 'Create account' : 'Sign in'),
                      ),
                      const SizedBox(height: 14),
                      TextButton.icon(
                        onPressed: () => _showServerDialog(context),
                        icon: const Icon(Icons.dns_outlined, size: 16),
                        label: Text(
                          'Server: ${context.read<ServerConfig>().baseUrl}',
                          style: const TextStyle(color: AppTheme.muted, fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ModeButton extends StatelessWidget {
  const _ModeButton({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(18),
          color: selected ? AppTheme.primary : Colors.transparent,
        ),
        child: Text(
          label,
          textAlign: TextAlign.center,
          style: TextStyle(
            fontWeight: FontWeight.w700,
            color: selected ? Colors.white : AppTheme.muted,
          ),
        ),
      ),
    );
  }
}
