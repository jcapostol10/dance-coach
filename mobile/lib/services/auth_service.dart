import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';

class AuthService extends ChangeNotifier {
  static const _adminEmails = {'josecarlo.apostol@gmail.com'};

  final GoogleSignIn _googleSignIn = GoogleSignIn(scopes: ['email']);

  GoogleSignInAccount? _user;
  bool _isLoading = false;

  GoogleSignInAccount? get user => _user;
  bool get isLoading => _isLoading;
  bool get isSignedIn => _user != null;
  bool get isAdmin =>
      _user != null && _adminEmails.contains(_user!.email.toLowerCase());
  String get displayName => _user?.displayName ?? '';
  String get email => _user?.email ?? '';
  String? get photoUrl => _user?.photoUrl;

  Future<void> init() async {
    _isLoading = true;
    notifyListeners();

    _user = await _googleSignIn.signInSilently();

    _isLoading = false;
    notifyListeners();
  }

  Future<bool> signInWithGoogle() async {
    try {
      _isLoading = true;
      notifyListeners();

      _user = await _googleSignIn.signIn();

      _isLoading = false;
      notifyListeners();
      return _user != null;
    } catch (e) {
      debugPrint('Google sign-in error: $e');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> signOut() async {
    await _googleSignIn.signOut();
    _user = null;
    notifyListeners();
  }
}
