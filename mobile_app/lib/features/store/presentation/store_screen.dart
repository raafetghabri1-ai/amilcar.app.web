import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';
import '../../../models/product_item_model.dart';

class StoreScreen extends StatefulWidget {
  const StoreScreen({super.key});

  @override
  State<StoreScreen> createState() => _StoreScreenState();
}

class _StoreScreenState extends State<StoreScreen> {
  late Future<List<ProductItemModel>> _future;
  final Map<int, int> _cart = {};
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _future = context.read<ApiClient>().getProducts();
  }

  int get _cartCount => _cart.values.fold(0, (sum, value) => sum + value);

  Future<void> _checkout() async {
    if (_cart.isEmpty || _submitting) {
      return;
    }
    setState(() => _submitting = true);
    try {
      await context.read<ApiClient>().createOrder(_cart);
      if (!mounted) {
        return;
      }
      setState(() => _cart.clear());
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Order placed successfully.')),
      );
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
    return Column(
      children: [
        if (_cartCount > 0)
          Container(
            margin: const EdgeInsets.fromLTRB(20, 20, 20, 0),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppTheme.primary.withOpacity(0.12),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Row(
              children: [
                Expanded(child: Text('Cart items: $_cartCount')),
                ElevatedButton(
                  onPressed: _submitting ? null : _checkout,
                  child: _submitting ? const Text('Processing...') : const Text('Checkout'),
                ),
              ],
            ),
          ),
        Expanded(
          child: FutureBuilder<List<ProductItemModel>>(
            future: _future,
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }
              if (snapshot.hasError) {
                return Center(child: Text(snapshot.error.toString()));
              }

              final products = snapshot.data ?? const <ProductItemModel>[];
              return ListView.builder(
                padding: const EdgeInsets.all(20),
                itemCount: products.length,
                itemBuilder: (context, index) {
                  final product = products[index];
                  final quantity = _cart[product.id] ?? 0;
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
                            Expanded(
                              child: Text(product.name, style: Theme.of(context).textTheme.titleLarge),
                            ),
                            Text('${product.price.toStringAsFixed(3)} TND'),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(product.description ?? 'Premium product for your next service visit.', style: const TextStyle(color: AppTheme.muted)),
                        const SizedBox(height: 14),
                        Row(
                          children: [
                            Chip(label: Text(product.category)),
                            const SizedBox(width: 8),
                            Chip(label: Text('Stock ${product.stockQuantity}')),
                            const Spacer(),
                            IconButton(
                              onPressed: quantity == 0
                                  ? null
                                  : () => setState(() {
                                        if (quantity == 1) {
                                          _cart.remove(product.id);
                                        } else {
                                          _cart[product.id] = quantity - 1;
                                        }
                                      }),
                              icon: const Icon(Icons.remove_circle_outline),
                            ),
                            Text('$quantity'),
                            IconButton(
                              onPressed: quantity >= product.stockQuantity
                                  ? null
                                  : () => setState(() => _cart[product.id] = quantity + 1),
                              icon: const Icon(Icons.add_circle_outline),
                            ),
                          ],
                        ),
                      ],
                    ),
                  );
                },
              );
            },
          ),
        ),
      ],
    );
  }
}
