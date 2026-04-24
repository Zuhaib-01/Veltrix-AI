import 'package:flutter/material.dart';

class ProfileScreen extends StatefulWidget {
  final List<String> emails;
  final String? selectedEmail;
  final Future<void> Function() onRefreshDeviceEmails;
  final Future<void> Function(String email) onAddManualEmail;
  final Future<void> Function(String? email) onSelectEmail;

  const ProfileScreen({
    super.key,
    required this.emails,
    required this.selectedEmail,
    required this.onRefreshDeviceEmails,
    required this.onAddManualEmail,
    required this.onSelectEmail,
  });

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _emailCtrl = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _emailCtrl.dispose();
    super.dispose();
  }

  Future<void> _saveManualEmail() async {
    final email = _emailCtrl.text.trim().toLowerCase();
    final emailMatch = RegExp(r'^[\w.+%-]+@[\w.-]+\.[A-Za-z]{2,}$').hasMatch(email);
    if (!emailMatch) {
      _showSnack('Enter a valid email address');
      return;
    }

    setState(() => _saving = true);
    try {
      await widget.onAddManualEmail(email);
      await widget.onSelectEmail(email);
      if (!mounted) return;
      _emailCtrl.clear();
      _showSnack('Email added and sync enabled', isError: false);
    } catch (_) {
      if (!mounted) return;
      _showSnack('Failed to add email');
    } finally {
      if (mounted) setState(() => _saving = false);
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
    final selected = widget.selectedEmail;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          IconButton(
            onPressed: widget.onRefreshDeviceEmails,
            icon: const Icon(Icons.sync),
            tooltip: 'Load emails from phone',
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'Account Sync',
            style: Theme.of(context)
                .textTheme
                .titleMedium
                ?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 6),
          Text(
            'Choose the email to sync alerts with your Chrome extension. '
            'When selected, only alerts for that email are shown.',
            style: TextStyle(
              fontSize: 13,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(10),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                isExpanded: true,
                value: selected ?? '__all__',
                items: [
                  const DropdownMenuItem(
                    value: '__all__',
                    child: Text('All emails'),
                  ),
                  ...widget.emails.map(
                    (e) => DropdownMenuItem(value: e, child: Text(e)),
                  ),
                ],
                onChanged: (v) => widget.onSelectEmail(v == '__all__' ? null : v),
              ),
            ),
          ),
          const SizedBox(height: 22),
          Text(
            'Add Email Manually',
            style: Theme.of(context)
                .textTheme
                .titleSmall
                ?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  decoration: InputDecoration(
                    hintText: 'name@example.com',
                    filled: true,
                    fillColor: Theme.of(context).colorScheme.surfaceContainerHighest,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton(
                onPressed: _saving ? null : _saveManualEmail,
                child: const Text('Add'),
              ),
            ],
          ),
          const SizedBox(height: 20),
          if (widget.emails.isNotEmpty) ...[
            Text(
              'Available emails on this phone',
              style: Theme.of(context)
                  .textTheme
                  .titleSmall
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            ...widget.emails.map(
              (e) => ListTile(
                dense: true,
                contentPadding: EdgeInsets.zero,
                title: Text(e),
                leading: const Icon(Icons.email_outlined),
                trailing: selected == e
                    ? const Icon(Icons.check_circle, color: Color(0xFF1D9E75))
                    : null,
                onTap: () => widget.onSelectEmail(e),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
