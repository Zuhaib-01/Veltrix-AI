import 'package:flutter/material.dart';
import '../models/analysis_result.dart';

class ResultCard extends StatelessWidget {
  final AnalysisResult result;
  final String? sender;
  final String? url;
  final void Function(String)? onBlockUrl;
  final void Function(String)? onBlockSender;

  const ResultCard({super.key, required this.result, this.sender, this.url, this.onBlockUrl, this.onBlockSender});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final (labelColor, labelBg, icon) = _labelStyle(result.label);

    return Container(
      decoration: BoxDecoration(
        color: cs.surfaceContainer,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: labelColor.withOpacity(0.4)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(color: labelBg, borderRadius: const BorderRadius.vertical(top: Radius.circular(13))),
          child: Row(children: [
            Icon(icon, color: labelColor, size: 20),
            const SizedBox(width: 10),
            Text(result.label.toUpperCase(), style: TextStyle(color: labelColor, fontWeight: FontWeight.w700, fontSize: 15, letterSpacing: 0.5)),
            const Spacer(),
            Container(width: 44, height: 44,
                decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: labelColor, width: 2)),
                child: Center(child: Text('${result.riskScore}', style: TextStyle(color: labelColor, fontWeight: FontWeight.w700, fontSize: 14)))),
          ]),
        ),
        Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Wrap(spacing: 8, children: [
            _chip(context, result.language.toUpperCase(), Icons.language),
            _chip(context, '${(result.confidence * 100).toStringAsFixed(0)}% confidence', Icons.analytics_outlined),
          ]),
          if (result.threats.isNotEmpty) ...[
            const SizedBox(height: 14),
            _label(context, 'Threat categories'),
            const SizedBox(height: 6),
            Wrap(spacing: 6, runSpacing: 6,
                children: result.threats.map((t) => _chip(context, t, null, bg: labelColor.withOpacity(0.15), fg: labelColor)).toList()),
          ],
          if (result.reasons.isNotEmpty) ...[
            const SizedBox(height: 14),
            _label(context, 'Detection signals'),
            const SizedBox(height: 6),
            ...result.reasons.map((r) => Padding(padding: const EdgeInsets.only(bottom: 5),
                child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Icon(Icons.chevron_right, size: 14, color: cs.onSurfaceVariant),
                  const SizedBox(width: 4),
                  Expanded(child: Text(r, style: TextStyle(fontSize: 13, color: cs.onSurfaceVariant))),
                ]))),
          ],
          if (result.urlRisk != null) ...[
            const SizedBox(height: 14),
            _label(context, 'URL risk detail'),
            const SizedBox(height: 6),
            ...result.urlRisk!.reasons.map((r) => Padding(padding: const EdgeInsets.only(bottom: 5),
                child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Icon(Icons.link, size: 14, color: cs.onSurfaceVariant),
                  const SizedBox(width: 4),
                  Expanded(child: Text(r, style: TextStyle(fontSize: 13, color: cs.onSurfaceVariant))),
                ]))),
          ],
          if (!result.isSafe && (sender != null || url != null)) ...[
            const SizedBox(height: 16),
            const Divider(height: 1),
            const SizedBox(height: 12),
            _label(context, 'Actions'),
            const SizedBox(height: 8),
            Wrap(spacing: 8, runSpacing: 8, children: [
              if (url != null && onBlockUrl != null)
                _actionBtn(context, 'Block URL', Icons.block, labelColor, () => onBlockUrl!(url!)),
              if (sender != null && sender!.isNotEmpty && onBlockSender != null)
                _actionBtn(context, 'Block sender', Icons.person_off_outlined, labelColor, () => onBlockSender!(sender!)),
            ]),
          ],
        ])),
      ]),
    );
  }

  Widget _label(BuildContext context, String text) => Text(text,
      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Theme.of(context).colorScheme.onSurfaceVariant, letterSpacing: 0.5));

  Widget _chip(BuildContext context, String label, IconData? icon, {Color? bg, Color? fg}) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: bg ?? cs.surfaceContainerHighest, borderRadius: BorderRadius.circular(6)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        if (icon != null) ...[Icon(icon, size: 12, color: fg ?? cs.onSurfaceVariant), const SizedBox(width: 4)],
        Text(label, style: TextStyle(fontSize: 11, color: fg ?? cs.onSurfaceVariant, fontWeight: FontWeight.w500)),
      ]),
    );
  }

  Widget _actionBtn(BuildContext context, String label, IconData icon, Color color, VoidCallback onTap) =>
      OutlinedButton.icon(
        onPressed: onTap,
        icon: Icon(icon, size: 15, color: color),
        label: Text(label, style: TextStyle(color: color, fontSize: 13)),
        style: OutlinedButton.styleFrom(
          side: BorderSide(color: color.withOpacity(0.5)),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
      );

  (Color, Color, IconData) _labelStyle(String label) => switch (label) {
    'phishing'   => (const Color(0xFFE24B4A), const Color(0xFF3D1010), Icons.dangerous_outlined),
    'suspicious' => (const Color(0xFFEF9F27), const Color(0xFF3D2800), Icons.warning_amber_outlined),
    _            => (const Color(0xFF1D9E75), const Color(0xFF0A2B1E), Icons.verified_outlined),
  };
}
