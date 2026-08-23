/// Maps to the User shape returned by /api/auth/me and /api/auth/google.
class User {
  const User({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.firstName,
    this.lastName,
    this.gender,
    this.avatar,
    this.mobileNumber,
    this.securityNumber,
    this.bio,
    this.iitmJoinYear,
    this.iitmJoinMonth,
    this.iitmLevel,
    this.iitmUserType,
    this.isIdentityUpdated = false,
    this.isProfileComplete = false,
    this.appTourCompleted = false,
    this.appTourCompletedAt,
    this.completedTourVersion = 0,
  });

  final String id;
  final String name;
  final String email;
  final String role; // STUDENT | ADMIN | MANAGER
  final String? firstName;
  final String? lastName;
  final String? gender;
  final String? avatar;
  final String? mobileNumber;
  final String? securityNumber;
  final String? bio;
  final String? iitmJoinYear;
  final String? iitmJoinMonth;
  final String? iitmLevel;
  final String? iitmUserType;
  final bool isIdentityUpdated;
  final bool isProfileComplete;
  final bool appTourCompleted;
  final String? appTourCompletedAt;
  final int completedTourVersion;

  bool get isManager => role == 'MANAGER';
  bool get isAdmin => role == 'ADMIN';
  bool get isStudent => role == 'STUDENT';
  bool get needsIdentitySetup => !isIdentityUpdated;

  User copyWith({
    String? id,
    String? name,
    String? email,
    String? role,
    String? firstName,
    String? lastName,
    String? gender,
    String? avatar,
    String? mobileNumber,
    String? securityNumber,
    String? bio,
    String? iitmJoinYear,
    String? iitmJoinMonth,
    String? iitmLevel,
    String? iitmUserType,
    bool? isIdentityUpdated,
    bool? isProfileComplete,
    bool? appTourCompleted,
    String? appTourCompletedAt,
    int? completedTourVersion,
  }) {
    return User(
      id: id ?? this.id,
      name: name ?? this.name,
      email: email ?? this.email,
      role: role ?? this.role,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      gender: gender ?? this.gender,
      avatar: avatar ?? this.avatar,
      mobileNumber: mobileNumber ?? this.mobileNumber,
      securityNumber: securityNumber ?? this.securityNumber,
      bio: bio ?? this.bio,
      iitmJoinYear: iitmJoinYear ?? this.iitmJoinYear,
      iitmJoinMonth: iitmJoinMonth ?? this.iitmJoinMonth,
      iitmLevel: iitmLevel ?? this.iitmLevel,
      iitmUserType: iitmUserType ?? this.iitmUserType,
      isIdentityUpdated: isIdentityUpdated ?? this.isIdentityUpdated,
      isProfileComplete: isProfileComplete ?? this.isProfileComplete,
      appTourCompleted: appTourCompleted ?? this.appTourCompleted,
      appTourCompletedAt: appTourCompletedAt ?? this.appTourCompletedAt,
      completedTourVersion: completedTourVersion ?? this.completedTourVersion,
    );
  }

  factory User.fromJson(Map<String, dynamic> j) {
    return User(
      id: j['id'] as String,
      name: (j['name'] as String?) ?? '',
      email: (j['email'] as String?) ?? '',
      role: (j['role'] as String?) ?? 'STUDENT',
      firstName: j['firstName'] as String?,
      lastName: j['lastName'] as String?,
      gender: j['gender'] as String?,
      avatar: j['avatar'] as String?,
      mobileNumber: j['mobileNumber'] as String?,
      securityNumber: j['securityNumber'] as String?,
      bio: j['bio'] as String?,
      iitmJoinYear: j['iitmJoinYear'] as String?,
      iitmJoinMonth: j['iitmJoinMonth'] as String?,
      iitmLevel: j['iitmLevel'] as String?,
      iitmUserType: j['iitmUserType'] as String?,
      isIdentityUpdated: (j['isIdentityUpdated'] as bool?) ?? false,
      isProfileComplete: (j['isProfileComplete'] as bool?) ?? false,
      appTourCompleted: (j['appTourCompleted'] as bool?) ?? false,
      appTourCompletedAt: j['appTourCompletedAt'] as String?,
      completedTourVersion: (j['completedTourVersion'] as int?) ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'role': role,
      'firstName': firstName,
      'lastName': lastName,
      'gender': gender,
      'avatar': avatar,
      'mobileNumber': mobileNumber,
      'securityNumber': securityNumber,
      'bio': bio,
      'iitmJoinYear': iitmJoinYear,
      'iitmJoinMonth': iitmJoinMonth,
      'iitmLevel': iitmLevel,
      'iitmUserType': iitmUserType,
      'isIdentityUpdated': isIdentityUpdated,
      'isProfileComplete': isProfileComplete,
      'appTourCompleted': appTourCompleted,
      'appTourCompletedAt': appTourCompletedAt,
      'completedTourVersion': completedTourVersion,
    };
  }
}
