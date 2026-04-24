import 'package:flutter/services.dart';

class DeviceEmailService {
  static const MethodChannel _channel =
      MethodChannel('veltrix/device_accounts');

  static Future<List<String>> getDeviceEmails() async {
    try {
      final dynamic result = await _channel.invokeMethod('getEmails');
      if (result is! List) return const [];
      return result
          .map((e) => e.toString().trim().toLowerCase())
          .where((e) => e.contains('@'))
          .toSet()
          .toList()
        ..sort();
    } catch (_) {
      return const [];
    }
  }
}
