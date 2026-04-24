import 'package:flutter_test/flutter_test.dart';
import 'package:veltrix_mobile/main.dart';

void main() {
  testWidgets('app boots into the Veltrix home screen', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const VeltrixApp());

    expect(find.text('Veltrix'), findsOneWidget);
    expect(find.text('Scan for phishing'), findsOneWidget);
  });
}
