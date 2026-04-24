import 'package:flutter/material.dart';

enum ScanMode { text, url }

class ScanInput extends StatefulWidget {
  final bool isLoading;
  final void Function({
    required String text,
    required ScanMode mode,
    String? sender,
    String? subject,
  }) onAnalyze;

  const ScanInput({super.key, required this.isLoading, required this.onAnalyze});

  @override
  State<ScanInput> createState() => ScanInputState();
}

class ScanInputState extends State<ScanInput> {
  ScanMode _mode = ScanMode.text;
  final _textCtrl = TextEditingController();
  final _senderCtrl = TextEditingController();
  final _subjectCtrl = TextEditingController();
  bool _showAdvanced = false;

  @override
  void dispose() { _textCtrl.dispose(); _senderCtrl.dispose(); _subjectCtrl.dispose(); super.dispose(); }

  void _submit() {
    final input = _textCtrl.text.trim();
    if (input.isEmpty) return;
    widget.onAnalyze(text: input, mode: _mode,
        sender: _senderCtrl.text.trim().isEmpty ? null : _senderCtrl.text.trim(),
        subject: _subjectCtrl.text.trim().isEmpty ? null : _subjectCtrl.text.trim());
  }

  void prefill(String text) { _textCtrl.text = text; setState(() => _mode = ScanMode.text); }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Container(
        decoration: BoxDecoration(color: cs.surfaceContainerHighest, borderRadius: BorderRadius.circular(10)),
        padding: const EdgeInsets.all(3),
        child: Row(children: ScanMode.values.map((m) {
          final selected = _mode == m;
          return Expanded(child: GestureDetector(
            onTap: () => setState(() => _mode = m),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              padding: const EdgeInsets.symmetric(vertical: 8),
              decoration: BoxDecoration(
                color: selected ? cs.primaryContainer : Colors.transparent,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(m == ScanMode.text ? 'Text / Email' : 'URL',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 13,
                      fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
                      color: selected ? cs.onPrimaryContainer : cs.onSurfaceVariant)),
            ),
          ));
        }).toList()),
      ),
      const SizedBox(height: 12),
      TextField(
        controller: _textCtrl,
        maxLines: _mode == ScanMode.text ? 5 : 1,
        decoration: InputDecoration(
          hintText: _mode == ScanMode.text ? 'Paste email body or suspicious text…' : 'https://example.com/link',
          filled: true, fillColor: cs.surfaceContainerHighest,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
          contentPadding: const EdgeInsets.all(14),
        ),
        style: const TextStyle(fontSize: 14),
        keyboardType: _mode == ScanMode.url ? TextInputType.url : TextInputType.multiline,
      ),
      const SizedBox(height: 8),
      if (_mode == ScanMode.text) ...[
        GestureDetector(
          onTap: () => setState(() => _showAdvanced = !_showAdvanced),
          child: Row(children: [
            Icon(_showAdvanced ? Icons.expand_less : Icons.expand_more, size: 16, color: cs.onSurfaceVariant),
            const SizedBox(width: 4),
            Text('Advanced (sender / subject)', style: TextStyle(fontSize: 12, color: cs.onSurfaceVariant)),
          ]),
        ),
        if (_showAdvanced) ...[
          const SizedBox(height: 8),
          TextField(controller: _senderCtrl,
              decoration: InputDecoration(hintText: 'Sender email', prefixIcon: const Icon(Icons.person_outline, size: 18),
                  filled: true, fillColor: cs.surfaceContainerHighest,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12)),
              style: const TextStyle(fontSize: 13)),
          const SizedBox(height: 8),
          TextField(controller: _subjectCtrl,
              decoration: InputDecoration(hintText: 'Subject line', prefixIcon: const Icon(Icons.subject, size: 18),
                  filled: true, fillColor: cs.surfaceContainerHighest,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12)),
              style: const TextStyle(fontSize: 13)),
        ],
        const SizedBox(height: 8),
      ],
      SizedBox(width: double.infinity, child: FilledButton(
        onPressed: widget.isLoading ? null : _submit,
        style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
        child: widget.isLoading
            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
            : const Text('Analyze', style: TextStyle(fontWeight: FontWeight.w600)),
      )),
    ]);
  }
}
