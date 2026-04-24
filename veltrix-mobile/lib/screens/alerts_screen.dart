import 'package:flutter/material.dart';
import '../services/api_service.dart';

class AlertsScreen extends StatefulWidget {
  final String? selectedEmail;

  const AlertsScreen({super.key, this.selectedEmail});

  @override
  State<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends State<AlertsScreen> {
  List<Map<String, dynamic>> _alerts = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(covariant AlertsScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.selectedEmail != widget.selectedEmail) {
      _load();
    }
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final alerts = await ApiService.getAlerts(limit: 100);
        final selectedRaw = widget.selectedEmail?.trim().toLowerCase();
        final selected = (selectedRaw == null || selectedRaw.isEmpty)
          ? null
          : _extractEmail(selectedRaw);
      final filtered = (selected == null || selected.isEmpty)
          ? <Map<String, dynamic>>[]
          : alerts.where((a) {
              final label = (a['label'] as String? ?? '').toLowerCase();
              if (label != 'phishing') return false;

              final sender = (a['sender'] as String? ?? '').toLowerCase();
              final senderEmail = _extractEmail(sender);
              return senderEmail == selected;
            }).toList();
      if (mounted) setState(() { _alerts = filtered; _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  String _extractEmail(String value) {
    final m = RegExp(r'[\w.+%-]+@[\w.-]+\.[A-Za-z]{2,}').firstMatch(value);
    return (m?.group(0) ?? value).trim().toLowerCase();
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Alerts', style: TextStyle(fontWeight: FontWeight.w600)),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _load),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!, style: TextStyle(color: cs.error)))
              : _alerts.isEmpty
                  ? Center(
                      child: Text(
                        widget.selectedEmail == null
                            ? 'Select an email in Profile to view phishing alerts'
                            : 'No phishing alerts for selected email',
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _alerts.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (_, i) {
                          final a = _alerts[i];
                          final label = a['label'] as String? ?? 'safe';
                          final color = _labelColor(label);
                          return Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: cs.surfaceContainer,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: color.withValues(alpha: 0.3),
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: color.withValues(alpha: 0.15),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        label.toUpperCase(),
                                        style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w700),
                                      ),
                                    ),
                                    const Spacer(),
                                    Text(
                                      a['timestamp'] as String? ?? '',
                                      style: TextStyle(fontSize: 11, color: cs.onSurfaceVariant),
                                    ),
                                  ],
                                ),
                                if (a['sender'] != null) ...[
                                  const SizedBox(height: 8),
                                  Text(a['sender'] as String,
                                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                                ],
                                if (a['reasons'] != null) ...[
                                  const SizedBox(height: 6),
                                  Text(
                                    (a['reasons'] as List).take(2).join(' · '),
                                    style: TextStyle(fontSize: 12, color: cs.onSurfaceVariant),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ],
                            ),
                          );
                        },
                      ),
                    ),
    );
  }

  Color _labelColor(String label) => switch (label) {
    'phishing'  => const Color(0xFFE24B4A),
    'suspicious' => const Color(0xFFEF9F27),
    _           => const Color(0xFF1D9E75),
  };
}
