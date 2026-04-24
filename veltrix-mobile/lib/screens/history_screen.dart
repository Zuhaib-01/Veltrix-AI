import 'package:flutter/material.dart';

import '../models/scan_history_item.dart';
import '../services/history_service.dart';
import '../widgets/result_card.dart';

class HistoryScreen extends StatefulWidget {
  final String? selectedEmail;
  final VoidCallback? onHistoryChanged;

  const HistoryScreen({
    super.key,
    this.selectedEmail,
    this.onHistoryChanged,
  });

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  List<ScanHistoryItem> _items = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final items = await HistoryService.getHistory();
    if (!mounted) return;

    setState(() {
      _items = items;
      _loading = false;
    });
    widget.onHistoryChanged?.call();
  }

  Future<void> _clearHistory() async {
    final shouldClear = await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('Clear history?'),
            content: const Text('This will remove all scan history from this phone.'),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(ctx).pop(false),
                child: const Text('Cancel'),
              ),
              FilledButton(
                onPressed: () => Navigator.of(ctx).pop(true),
                child: const Text('Clear'),
              ),
            ],
          ),
        ) ??
        false;
    if (!shouldClear) return;

    await HistoryService.clearHistory();
    if (!mounted) return;
    setState(() => _items = []);
    widget.onHistoryChanged?.call();
  }

  @override
  Widget build(BuildContext context) {
    final filtered = widget.selectedEmail == null
        ? _items
        : _items.where((e) {
            final s = (e.sender ?? '').toLowerCase();
            return s.contains(widget.selectedEmail!.toLowerCase());
          }).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Scan History'),
        actions: [
          IconButton(onPressed: _load, icon: const Icon(Icons.refresh)),
          IconButton(
            onPressed: _items.isEmpty ? null : _clearHistory,
            icon: const Icon(Icons.delete_sweep_outlined),
            tooltip: 'Clear history',
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : filtered.isEmpty
              ? Center(
                  child: Text(
                    widget.selectedEmail == null
                        ? 'No scan history yet'
                        : 'No history for selected email',
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: filtered.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (_, i) {
                      final item = filtered[i];
                      final label = item.result.label;
                      final labelColor = switch (label) {
                        'phishing' => const Color(0xFFE24B4A),
                        'suspicious' => const Color(0xFFEF9F27),
                        _ => const Color(0xFF1D9E75),
                      };

                      return InkWell(
                        borderRadius: BorderRadius.circular(12),
                        onTap: () {
                          showModalBottomSheet<void>(
                            context: context,
                            isScrollControlled: true,
                            useSafeArea: true,
                            builder: (_) => Padding(
                              padding: const EdgeInsets.all(12),
                              child: SingleChildScrollView(
                                child: ResultCard(
                                  result: item.result,
                                  sender: item.sender,
                                  url: item.mode == 'url' ? item.input : null,
                                ),
                              ),
                            ),
                          );
                        },
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(12),
                            color: Theme.of(context).colorScheme.surfaceContainer,
                            border: Border.all(
                              color: labelColor.withValues(alpha: 0.3),
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 3,
                                    ),
                                    decoration: BoxDecoration(
                                      color: labelColor.withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      item.result.label.toUpperCase(),
                                      style: TextStyle(
                                        color: labelColor,
                                        fontSize: 11,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ),
                                  const Spacer(),
                                  Text(
                                    item.createdAt.toLocal().toString().substring(0, 16),
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: Theme.of(context)
                                          .colorScheme
                                          .onSurfaceVariant,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text(
                                item.input,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 13),
                              ),
                              if ((item.sender ?? '').isNotEmpty) ...[
                                const SizedBox(height: 5),
                                Text(
                                  'Sender: ${item.sender}',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onSurfaceVariant,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
