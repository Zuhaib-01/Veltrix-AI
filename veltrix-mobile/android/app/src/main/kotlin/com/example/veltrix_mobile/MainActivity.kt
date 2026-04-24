package com.example.veltrix_mobile

import android.accounts.AccountManager
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.embedding.android.FlutterActivity
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
	private val channelName = "veltrix/device_accounts"

	override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
		super.configureFlutterEngine(flutterEngine)

		MethodChannel(flutterEngine.dartExecutor.binaryMessenger, channelName)
			.setMethodCallHandler { call, result ->
				if (call.method == "getEmails") {
					try {
						val accountManager = AccountManager.get(this)
						val emails = accountManager.accounts
							.mapNotNull { it.name }
							.map { it.trim().lowercase() }
							.filter { it.contains("@") }
							.distinct()
							.sorted()
						result.success(emails)
					} catch (_: Exception) {
						result.success(emptyList<String>())
					}
				} else {
					result.notImplemented()
				}
			}
	}
}
