import 'package:flutter_test/flutter_test.dart';
import 'package:teaching_llm/core/models/user.dart';

void main() {
  group('User Model Tests', () {
    test('User deserializes correctly from backend JSON', () {
      final json = {
        'id': 'usr_123',
        'email': 'student@study.iitm.ac.in',
        'name': 'Aarav Sharma',
        'firstName': 'Aarav',
        'lastName': 'Sharma',
        'role': 'STUDENT',
        'avatar': 'https://example.com/avatar.png',
        'mobileNumber': '9876543210',
        'aboutMe': 'BS Data Science Student at IIT Madras',
        'isIdentityUpdated': true,
        'iitmJoinYear': '2024',
        'iitmJoinMonth': 'JAN',
        'iitmLevel': 'FOUNDATION',
        'iitmUserType': 'STUDENT',
      };

      final user = User.fromJson(json);

      expect(user.id, 'usr_123');
      expect(user.email, 'student@study.iitm.ac.in');
      expect(user.name, 'Aarav Sharma');
      expect(user.firstName, 'Aarav');
      expect(user.lastName, 'Sharma');
      expect(user.role, 'STUDENT');
      expect(user.isStudent, isTrue);
      expect(user.isManager, isFalse);
      expect(user.isAdmin, isFalse);
      expect(user.isIdentityUpdated, isTrue);
      expect(user.needsIdentitySetup, isFalse);
    });

    test('User needsIdentitySetup returns true when identity is incomplete', () {
      final json = {
        'id': 'usr_456',
        'email': 'newstudent@gmail.com',
        'name': 'New Student',
        'role': 'STUDENT',
        'isIdentityUpdated': false,
        'iitmJoinYear': null,
      };

      final user = User.fromJson(json);

      expect(user.isIdentityUpdated, isFalse);
      expect(user.needsIdentitySetup, isTrue);
    });

    test('Manager / Admin never triggers needsIdentitySetup', () {
      final json = {
        'id': 'usr_admin',
        'email': 'admin@genziitian.in',
        'name': 'Admin User',
        'role': 'MANAGER',
        'isIdentityUpdated': false,
      };

      final user = User.fromJson(json);

      expect(user.isManager, isTrue);
      expect(user.needsIdentitySetup, isFalse);
    });
  });
}
