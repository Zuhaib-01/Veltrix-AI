import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

class ProfilePrefsService {
  static const String _selectedEmailKey = 'veltrix_selected_email';
  static const String _manualEmailsKey = 'veltrix_manual_emails';

  static Future<String?> getSelectedEmail() async {
    final prefs = await SharedPreferences.getInstance();
    final v = prefs.getString(_selectedEmailKey);
    if (v == null || v.trim().isEmpty) return null;
    return v.trim().toLowerCase();
  }

  static Future<void> setSelectedEmail(String? email) async {
    final prefs = await SharedPreferences.getInstance();
    if (email == null || email.trim().isEmpty) {
      await prefs.remove(_selectedEmailKey);
      return;
    }
    await prefs.setString(_selectedEmailKey, email.trim().toLowerCase());
  }

  static Future<List<String>> getManualEmails() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_manualEmailsKey);
    if (raw == null || raw.isEmpty) return const [];
    final decoded = jsonDecode(raw) as List<dynamic>;
    return decoded
        .map((e) => e.toString().trim().toLowerCase())
        .where((e) => e.contains('@'))
        .toSet()
        .toList()
      ..sort();
  }

  static Future<void> addManualEmail(String email) async {
    final normalized = email.trim().toLowerCase();
    if (!normalized.contains('@')) return;
    final emails = await getManualEmails();
    if (!emails.contains(normalized)) emails.add(normalized);
    emails.sort();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_manualEmailsKey, jsonEncode(emails));
  }
}
