import 'package:flutter/material.dart';

class HealthBadge extends StatelessWidget {
  final bool? isOnline;
  const HealthBadge({super.key, required this.isOnline});

  @override
  Widget build(BuildContext context) {
    final (color, label) = switch (isOnline) {
      null  => (Colors.grey,                 'Checking…'),
      true  => (const Color(0xFF1D9E75),     'Backend online'),
      false => (const Color(0xFFE24B4A),     'Backend offline'),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(width: 6, height: 6,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
          const SizedBox(width: 6),
          Text(label,
              style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}
