import 'package:flutter_test/flutter_test.dart';
import 'package:dance_coach/main.dart';

void main() {
  testWidgets('App renders Library screen', (WidgetTester tester) async {
    await tester.pumpWidget(const DanceCoachApp());
    expect(find.text('Lesson Library'), findsOneWidget);
  });
}
