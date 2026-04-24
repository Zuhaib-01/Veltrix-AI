import 'dart:async';

import 'package:flutter/material.dart';
import 'package:receive_sharing_intent/receive_sharing_intent.dart';

import '../models/scan_history_item.dart';
import '../services/device_email_service.dart';
import '../services/history_service.dart';
import '../services/profile_prefs_service.dart';
import 'alerts_screen.dart';
import 'history_screen.dart';
import 'home_overview_screen.dart';
import 'profile_screen.dart';
import 'scan_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _tabIndex = 0;
  int _historyCount = 0;

  String? _selectedEmail;
  List<String> _availableEmails = [];

  String? _pendingSharedText;
  StreamSubscription<List<SharedMediaFile>>? _shareMediaSub;
  final GlobalKey<ScanScreenState> _scanScreenKey = GlobalKey<ScanScreenState>();

  @override
  void initState() {
    super.initState();
    _loadProfileState();
    _loadHistoryCount();
    _setupShareIntent();
  }

  @override
  void dispose() {
    _shareMediaSub?.cancel();
    super.dispose();
  }

  Future<void> _loadProfileState() async {
    final selected = await ProfilePrefsService.getSelectedEmail();
    final phoneEmails = await DeviceEmailService.getDeviceEmails();
    final manualEmails = await ProfilePrefsService.getManualEmails();
    if (!mounted) return;

    setState(() {
      _selectedEmail = selected;
      _availableEmails = {
        ...phoneEmails,
        ...manualEmails,
      }.toList()
        ..sort();
    });
  }

  Future<void> _loadHistoryCount() async {
    final items = await HistoryService.getHistory();
    if (!mounted) return;
    setState(() => _historyCount = items.length);
  }

  void _setupShareIntent() {
    _shareMediaSub = ReceiveSharingIntent.instance
        .getMediaStream()
        .listen((List<SharedMediaFile> files) {
      final textItems = files
          .where((f) => f.type == SharedMediaType.text)
          .map((f) => f.path)
          .where((p) => p.trim().isNotEmpty)
          .toList();
      final fallbackItems = files
          .where((f) => f.type != SharedMediaType.text)
          .map((f) => f.path)
          .toList();
      final text = (textItems.isNotEmpty ? textItems : fallbackItems).join('\n').trim();
      if (text.isEmpty) return;
      _handleSharedText(text);
    }, onError: (_) {});

    ReceiveSharingIntent.instance.getInitialMedia().then((files) {
      final textItems = files
          .where((f) => f.type == SharedMediaType.text)
          .map((f) => f.path)
          .where((p) => p.trim().isNotEmpty)
          .toList();
      final fallbackItems = files
          .where((f) => f.type != SharedMediaType.text)
          .map((f) => f.path)
          .toList();
      final text = (textItems.isNotEmpty ? textItems : fallbackItems).join('\n').trim();
      if (text.isEmpty) return;
      _handleSharedText(text);
      ReceiveSharingIntent.instance.reset();
    });
  }

  void _handleSharedText(String text) {
    final normalized = text.trim();
    if (normalized.isEmpty) return;

    setState(() {
      _tabIndex = 1;
      _pendingSharedText = normalized;
    });
    _dispatchSharedText();
  }

  void _dispatchSharedText() {
    if (_pendingSharedText == null) return;
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final pending = _pendingSharedText;
      if (pending == null) return;
      if (_scanScreenKey.currentState == null) return;

      await _scanScreenKey.currentState!.prefillAndAnalyzeShared(pending);
      if (!mounted) return;
      setState(() => _pendingSharedText = null);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Shared content received and analyzed'),
          backgroundColor: Color(0xFF1D9E75),
        ),
      );
    });
  }

  Future<void> _refreshDeviceEmails() async {
    final phoneEmails = await DeviceEmailService.getDeviceEmails();
    final manualEmails = await ProfilePrefsService.getManualEmails();
    if (!mounted) return;
    setState(() {
      _availableEmails = {
        ...phoneEmails,
        ...manualEmails,
      }.toList()
        ..sort();
    });
  }

  Future<void> _addManualEmail(String email) async {
    await ProfilePrefsService.addManualEmail(email);
    await _refreshDeviceEmails();
  }

  Future<void> _setSelectedEmail(String? email) async {
    await ProfilePrefsService.setSelectedEmail(email);
    if (!mounted) return;
    setState(() => _selectedEmail = email);
  }

  @override
  Widget build(BuildContext context) {
    final tabs = [
      Scaffold(
        appBar: AppBar(
          title: const Text('Veltrix Home'),
        ),
        body: HomeOverviewScreen(
          selectedEmail: _selectedEmail,
          localHistoryCount: _historyCount,
          openScanTab: () => setState(() => _tabIndex = 1),
          openAlertsTab: () => setState(() => _tabIndex = 2),
        ),
      ),
      Scaffold(
        appBar: AppBar(
          title: const Text('Manual Scan'),
        ),
        body: ScanScreen(
          key: _scanScreenKey,
          selectedEmail: _selectedEmail,
          onHistoryAdded: (ScanHistoryItem _) => _loadHistoryCount(),
        ),
      ),
      AlertsScreen(selectedEmail: _selectedEmail),
      HistoryScreen(
        key: ValueKey('history_$_historyCount'),
        selectedEmail: _selectedEmail,
        onHistoryChanged: _loadHistoryCount,
      ),
      ProfileScreen(
        emails: _availableEmails,
        selectedEmail: _selectedEmail,
        onRefreshDeviceEmails: _refreshDeviceEmails,
        onAddManualEmail: _addManualEmail,
        onSelectEmail: _setSelectedEmail,
      ),
    ];

    return Scaffold(
      body: IndexedStack(index: _tabIndex, children: tabs),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tabIndex,
        onDestinationSelected: (i) {
          setState(() => _tabIndex = i);
          if (i == 1) _dispatchSharedText();
        },
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.shield_outlined), label: 'Scan'),
          NavigationDestination(icon: Icon(Icons.notifications_none_outlined), label: 'Alerts'),
          NavigationDestination(icon: Icon(Icons.history), label: 'History'),
          NavigationDestination(icon: Icon(Icons.person_outline), label: 'Profile'),
        ],
      ),
    );
  }
}
