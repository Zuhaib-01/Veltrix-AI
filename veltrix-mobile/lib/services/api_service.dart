import 'dart:convert';
import 'dart:io';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;
import '../models/analysis_result.dart';

class ApiService {
  static const String _definedBaseUrl =
      String.fromEnvironment('API_BASE_URL', defaultValue: '');

  static String get baseUrl {
    if (_definedBaseUrl.isNotEmpty) {
      return _definedBaseUrl;
    }

    final envBaseUrl = dotenv.env['API_BASE_URL'];
    if (envBaseUrl != null && envBaseUrl.isNotEmpty) {
      return envBaseUrl;
    }

    // `adb reverse tcp:8000 tcp:8000` makes localhost the easiest default
    // for a USB-connected Android phone during development.
    if (Platform.isAndroid) {
      return 'http://127.0.0.1:8000';
    }

    return 'http://localhost:8000';
  }

  static const Duration _timeout = Duration(seconds: 10);

  static Future<bool> checkHealth() async {
    try {
      final res = await http.get(Uri.parse('$baseUrl/health')).timeout(_timeout);
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  static Future<AnalysisResult> analyzeText({
    required String text,
    String? sender,
    String? subject,
    List<String> urls = const [],
  }) async {
    final res = await http.post(
      Uri.parse('$baseUrl/analyze-text'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'text': text,
        if (sender != null) 'sender': sender,
        if (subject != null) 'subject': subject,
        'urls': urls,
      }),
    ).timeout(_timeout);
    if (res.statusCode != 200) throw ApiException('analyze-text failed: ${res.statusCode}');
    return AnalysisResult.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  static Future<AnalysisResult> analyzeUrl(String url) async {
    final res = await http.post(
      Uri.parse('$baseUrl/analyze-url'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'url': url}),
    ).timeout(_timeout);
    if (res.statusCode != 200) throw ApiException('analyze-url failed: ${res.statusCode}');
    return AnalysisResult.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  static Future<void> blockUrl(String url) async {
    final res = await http.post(
      Uri.parse('$baseUrl/block-url'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'url': url}),
    ).timeout(_timeout);
    if (res.statusCode != 200) throw ApiException('block-url failed: ${res.statusCode}');
  }

  static Future<void> blockSender(String sender) async {
    final res = await http.post(
      Uri.parse('$baseUrl/block-sender'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'sender': sender}),
    ).timeout(_timeout);
    if (res.statusCode != 200) throw ApiException('block-sender failed: ${res.statusCode}');
  }

  static Future<List<Map<String, dynamic>>> getAlerts({int limit = 20}) async {
    final res = await http
        .get(Uri.parse('$baseUrl/alerts?limit=$limit'))
        .timeout(_timeout);
    if (res.statusCode != 200) throw ApiException('get-alerts failed: ${res.statusCode}');
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    return List<Map<String, dynamic>>.from(data['alerts'] ?? []);
  }
}

class ApiException implements Exception {
  final String message;
  const ApiException(this.message);
  @override
  String toString() => 'ApiException: $message';
}
