import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/scan_history_item.dart';

class HistoryService {
  static const String _historyKey = 'veltrix_scan_history';
  static const int _maxItems = 200;

  static Future<List<ScanHistoryItem>> getHistory() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_historyKey);
    if (raw == null || raw.isEmpty) return const [];

    final decoded = jsonDecode(raw) as List<dynamic>;
    return decoded
        .whereType<Map<String, dynamic>>()
        .map(ScanHistoryItem.fromJson)
        .toList();
  }

  static Future<void> addHistory(ScanHistoryItem item) async {
    final items = await getHistory();
    final updated = [item, ...items];
    if (updated.length > _maxItems) {
      updated.removeRange(_maxItems, updated.length);
    }

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _historyKey,
      jsonEncode(updated.map((e) => e.toJson()).toList()),
    );
  }

  static Future<void> clearHistory() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_historyKey);
  }
}
