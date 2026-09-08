/// Maps to the CourseEvent shape returned by /api/events and /api/live-sessions.
class CourseEvent {
  const CourseEvent({
    required this.id,
    required this.title,
    required this.startTime,
    required this.endTime,
    this.description,
    this.meetLink,
    this.courseId,
    this.courseName,
    this.courseColor,
    this.instructorId,
    this.instructorName,
    this.status = 'SCHEDULED',
    this.streamProvider = 'MEET',
    this.streamStatus = 'SCHEDULED',
    this.agoraChannelName,
  });

  final String id;
  final String title;
  final DateTime startTime;
  final DateTime endTime;
  final String? description;
  final String? meetLink;
  final String? courseId;
  final String? courseName;
  final String? courseColor;
  final String? instructorId;
  final String? instructorName;
  final String status;
  final String streamProvider; // MEET | YOUTUBE | DRIVE | AGORA
  final String streamStatus; // SCHEDULED | LIVE | ENDED
  final String? agoraChannelName;

  bool get isLive {
    final now = DateTime.now();
    return now.isAfter(startTime) && now.isBefore(endTime);
  }

  bool get isUpcoming => startTime.isAfter(DateTime.now());

  bool get isAgora => streamProvider == 'AGORA';
  bool get isStreamLive => streamStatus == 'LIVE';

  factory CourseEvent.fromJson(Map<String, dynamic> j) {
    final course = j['course'] as Map<String, dynamic>?;
    final instructor = j['instructor'] as Map<String, dynamic>?;
    // Match Capacitor: the course's configured teacher takes priority.
    final courseTeacher = (course?['teacherName'] as String?)?.trim();
    final assignedInstructor = (instructor?['name'] as String?)?.trim();
    return CourseEvent(
      id: j['id'] as String,
      title: (j['title'] as String?) ?? '',
      startTime: DateTime.parse(j['startTime'] as String),
      endTime: DateTime.parse(j['endTime'] as String),
      description: j['description'] as String?,
      meetLink: j['meetLink'] as String?,
      courseId: j['courseId'] as String?,
      courseName: course?['name'] as String?,
      courseColor: course?['color'] as String?,
      instructorId: j['instructorId'] as String?,
      instructorName: courseTeacher != null && courseTeacher.isNotEmpty
          ? courseTeacher
          : assignedInstructor != null && assignedInstructor.isNotEmpty
              ? assignedInstructor
              : null,
      status: (j['status'] as String?) ?? 'SCHEDULED',
      streamProvider: (j['streamProvider'] as String?) ?? 'MEET',
      streamStatus: (j['streamStatus'] as String?) ?? 'SCHEDULED',
      agoraChannelName: j['agoraChannelName'] as String?,
    );
  }
}
