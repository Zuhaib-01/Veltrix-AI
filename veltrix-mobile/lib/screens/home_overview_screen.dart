import 'package:flutter/material.dart';

class HomeOverviewScreen extends StatelessWidget {
  final String? selectedEmail;
  final int localHistoryCount;
  final VoidCallback openScanTab;
  final VoidCallback openAlertsTab;

  const HomeOverviewScreen({
    super.key,
    required this.selectedEmail,
    required this.localHistoryCount,
    required this.openScanTab,
    required this.openAlertsTab,
  });

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          'Welcome to Veltrix AI',
          style: Theme.of(context)
              .textTheme
              .titleLarge
              ?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 6),
        Text(
          selectedEmail == null
              ? 'Scanning all accounts. Choose a profile email to sync mobile + extension alerts.'
              : 'Syncing alerts for $selectedEmail',
          style: TextStyle(
            fontSize: 13,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: _StatCard(
                label: 'Local Scan History',
                value: '$localHistoryCount',
                icon: Icons.history,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _StatCard(
                label: 'Active Scope',
                value: selectedEmail == null ? 'All' : '1 email',
                icon: Icons.sync,
              ),
            ),
          ],
        ),
        const SizedBox(height: 18),
        FilledButton.icon(
          onPressed: openScanTab,
          icon: const Icon(Icons.shield_outlined),
          label: const Text('Scan Message or URL'),
        ),
        const SizedBox(height: 10),
        OutlinedButton.icon(
          onPressed: openAlertsTab,
          icon: const Icon(Icons.notifications_active_outlined),
          label: const Text('Open Synced Alerts'),
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;

  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainer,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20),
          const SizedBox(height: 8),
          Text(
            value,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}
