import 'dart:async';
import 'package:flutter/material.dart';
import 'package:receive_sharing_intent/receive_sharing_intent.dart';
import '../models/analysis_result.dart';
import '../services/api_service.dart';
import '../widgets/scan_input.dart';
import '../widgets/result_card.dart';
import '../widgets/health_badge.dart';
import 'alerts_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool? _isOnline;
  bool _isLoading = false;
  AnalysisResult? _result;
  String? _lastSender;
  String? _lastUrl;

  StreamSubscription? _shareIntentSub;
  final _scanInputKey = GlobalKey<ScanInputState>();

  @override
  void initState() {
    super.initState();
    _checkHealth();
    _setupShareIntent();
  }

  @override
  void dispose() {
    _shareIntentSub?.cancel();
    super.dispose();
  }

  Future<void> _checkHealth() async {
    final online = await ApiService.checkHealth();
    if (mounted) setState(() => _isOnline = online);
  }

  void _setupShareIntent() {
    _shareIntentSub = ReceiveSharingIntent.instance
        .getMediaStream()
        .listen((List<SharedMediaFile> files) {
      final text = files.map((f) => f.path).join('\n');
      if (text.isNotEmpty) _prefillAndScan(text);
    });
    ReceiveSharingIntent.instance.getInitialMedia().then((files) {
      final text = files.map((f) => f.path).join('\n');
      if (text.isNotEmpty) _prefillAndScan(text);
    });
  }

  void _prefillAndScan(String text) {
    _scanInputKey.currentState?.prefill(text);
    _analyze(text: text, mode: ScanMode.text);
  }

  Future<void> _analyze({
    required String text,
    required ScanMode mode,
    String? sender,
    String? subject,
  }) async {
    setState(() { _isLoading = true; _result = null; _lastSender = sender; _lastUrl = mode == ScanMode.url ? text : null; });
    try {
      final result = mode == ScanMode.url
          ? await ApiService.analyzeUrl(text)
          : await ApiService.analyzeText(text: text, sender: sender, subject: subject);
      if (mounted) setState(() => _result = result);
    } on ApiException catch (e) {
      if (mounted) _showSnack(e.message);
    } catch (e) {
      if (mounted) _showSnack('Unexpected error: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _blockUrl(String url) async {
    try { await ApiService.blockUrl(url); if (mounted) _showSnack('URL blocked', isError: false); }
    catch (_) { if (mounted) _showSnack('Failed to block URL'); }
  }

  Future<void> _blockSender(String sender) async {
    try { await ApiService.blockSender(sender); if (mounted) _showSnack('Sender blocked', isError: false); }
    catch (_) { if (mounted) _showSnack('Failed to block sender'); }
  }

  void _showSnack(String msg, {bool isError = true}) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: isError ? const Color(0xFFE24B4A) : const Color(0xFF1D9E75),
    ));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(children: [
          Container(
            width: 28, height: 28,
            decoration: BoxDecoration(color: const Color(0xFF1D9E75), borderRadius: BorderRadius.circular(6)),
            child: const Icon(Icons.shield, size: 16, color: Colors.white),
          ),
          const SizedBox(width: 10),
          const Text('Veltrix', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 18)),
        ]),
        actions: [
          Padding(padding: const EdgeInsets.only(right: 8), child: HealthBadge(isOnline: _isOnline)),
          IconButton(icon: const Icon(Icons.notifications_none_outlined),
              onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AlertsScreen()))),
          IconButton(icon: const Icon(Icons.refresh), onPressed: _checkHealth),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _checkHealth,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Scan for phishing', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
              const SizedBox(height: 4),
              Text('Paste text, a URL, or share content directly from any app.',
                  style: TextStyle(fontSize: 13, color: Theme.of(context).colorScheme.onSurfaceVariant)),
              const SizedBox(height: 20),
              ScanInput(
                key: _scanInputKey,
                isLoading: _isLoading,
                onAnalyze: ({required text, required mode, sender, subject}) =>
                    _analyze(text: text, mode: mode, sender: sender, subject: subject),
              ),
              const SizedBox(height: 24),
              if (_result != null)
                ResultCard(result: _result!, sender: _lastSender, url: _lastUrl,
                    onBlockUrl: _blockUrl, onBlockSender: _blockSender),
            ],
          ),
        ),
      ),
    );
  }
}
