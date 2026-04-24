import 'package:flutter/material.dart';

import '../models/analysis_result.dart';
import '../models/scan_history_item.dart';
import '../services/api_service.dart';
import '../services/history_service.dart';
import '../widgets/health_badge.dart';
import '../widgets/result_card.dart';
import '../widgets/scan_input.dart';

class ScanScreen extends StatefulWidget {
  final String? selectedEmail;
  final void Function(ScanHistoryItem item)? onHistoryAdded;

  const ScanScreen({
    super.key,
    this.selectedEmail,
    this.onHistoryAdded,
  });

  @override
  State<ScanScreen> createState() => ScanScreenState();
}

class ScanScreenState extends State<ScanScreen> {
  bool? _isOnline;
  bool _isLoading = false;
  AnalysisResult? _result;
  String? _lastSender;
  String? _lastUrl;

  final _scanInputKey = GlobalKey<ScanInputState>();

  @override
  void initState() {
    super.initState();
    _checkHealth();
  }

  Future<void> _checkHealth() async {
    final online = await ApiService.checkHealth();
    if (mounted) setState(() => _isOnline = online);
  }

  Future<void> prefillAndAnalyzeShared(String text) async {
    _scanInputKey.currentState?.prefill(text);
    await _analyze(text: text, mode: ScanMode.text);
  }

  Future<void> _analyze({
    required String text,
    required ScanMode mode,
    String? sender,
    String? subject,
  }) async {
    final normalizedSender =
        (sender == null || sender.trim().isEmpty) ? widget.selectedEmail : sender;

    setState(() {
      _isLoading = true;
      _result = null;
      _lastSender = normalizedSender;
      _lastUrl = mode == ScanMode.url ? text : null;
    });

    try {
      final result = mode == ScanMode.url
          ? await ApiService.analyzeUrl(text)
          : await ApiService.analyzeText(
              text: text,
              sender: normalizedSender,
              subject: subject,
            );
      if (!mounted) return;

      setState(() => _result = result);
      final item = ScanHistoryItem(
        id: DateTime.now().microsecondsSinceEpoch.toString(),
        input: text,
        mode: mode.name,
        sender: normalizedSender,
        subject: subject,
        result: result,
        createdAt: DateTime.now(),
      );
      await HistoryService.addHistory(item);
      widget.onHistoryAdded?.call(item);
    } on ApiException catch (e) {
      if (mounted) _showSnack(e.message);
    } catch (e) {
      if (mounted) _showSnack('Unexpected error: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _blockUrl(String url) async {
    try {
      await ApiService.blockUrl(url);
      if (mounted) _showSnack('URL blocked', isError: false);
    } catch (_) {
      if (mounted) _showSnack('Failed to block URL');
    }
  }

  Future<void> _blockSender(String sender) async {
    try {
      await ApiService.blockSender(sender);
      if (mounted) _showSnack('Sender blocked', isError: false);
    } catch (_) {
      if (mounted) _showSnack('Failed to block sender');
    }
  }

  void _showSnack(String msg, {bool isError = true}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor:
            isError ? const Color(0xFFE24B4A) : const Color(0xFF1D9E75),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _checkHealth,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  'Scan for phishing',
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.w600),
                ),
                const Spacer(),
                HealthBadge(isOnline: _isOnline),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              'Paste text, a URL, or share content directly from any app.',
              style: TextStyle(
                fontSize: 13,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
            if (widget.selectedEmail != null) ...[
              const SizedBox(height: 8),
              Text(
                'Using selected email: ${widget.selectedEmail}',
                style: TextStyle(
                  fontSize: 12,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
            ],
            const SizedBox(height: 20),
            ScanInput(
              key: _scanInputKey,
              isLoading: _isLoading,
              onAnalyze: ({required text, required mode, sender, subject}) =>
                  _analyze(
                text: text,
                mode: mode,
                sender: sender,
                subject: subject,
              ),
            ),
            const SizedBox(height: 24),
            if (_result != null)
              ResultCard(
                result: _result!,
                sender: _lastSender,
                url: _lastUrl,
                onBlockUrl: _blockUrl,
                onBlockSender: _blockSender,
              ),
          ],
        ),
      ),
    );
  }
}
