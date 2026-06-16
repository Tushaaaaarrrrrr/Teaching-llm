/// Maps to the User shape returned by /api/auth/me and /api/auth/google.
class User {
  const User({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.firstName,
    this.gender,
    this.avatar,
    this.mobileNumber,
    this.securityNumber,
    this.isProfileComplete = false,
  });

  final String id;
  final String name;
  final String email;
  final String role; // STUDENT | ADMIN | MANAGER
  final String? firstName;
  final String? gender;
  final String? avatar;
  final String? mobileNumber;
  final String? securityNumber;
  final bool isProfileComplete;

  bool get isManager => role == 'MANAGER';
  bool get isStudent => role == 'STUDENT';

  factory User.fromJson(Map<String, dynamic> j) {
    return User(
      id: j['id'] as String,
      name: (j['name'] as String?) ?? '',
      email: (j['email'] as String?) ?? '',
      role: (j['role'] as String?) ?? 'STUDENT',
      firstName: j['firstName'] as String?,
      gender: j['gender'] as String?,
      avatar: j['avatar'] as String?,
      mobileNumber: j['mobileNumber'] as String?,
      securityNumber: j['securityNumber'] as String?,
      isProfileComplete: (j['isProfileComplete'] as bool?) ?? false,
    );
  }
}
