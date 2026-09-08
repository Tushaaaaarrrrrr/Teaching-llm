import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/services.dart';
import '../../core/api/api_client.dart';

/// Select a real file using the Android document picker, then upload it through
/// the authenticated client. Temporary picker copies are removed after upload.
Future<Map<String, String>?> pickCommunityAttachment(ApiClient api,
    {required bool images}) async {
  const channel = MethodChannel('com.teaching.lms/community_files');
  final picked = await channel
      .invokeMapMethod<String, dynamic>('pick', {'images': images});
  if (picked == null) return null;
  final file = File(picked['path'] as String);
  final name = picked['name'] as String;
  try {
    final extension = name.split('.').last.toLowerCase();
    final allowed = images
        ? ['jpg', 'jpeg', 'png', 'webp']
        : ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'zip'];
    if (!allowed.contains(extension)) {
      throw const FormatException('Please choose a supported file type.');
    }
    if (await file.length() > 20 * 1024 * 1024) {
      throw const FormatException('Maximum file size is 20 MB.');
    }
    final response =
        await api.post<Map<String, dynamic>>('/api/upload/chat-image',
            body: FormData.fromMap({
              'file': await MultipartFile.fromFile(file.path, filename: name),
            }));
    final url = response.data?['url'];
    if (url is! String || url.isEmpty) {
      throw const FormatException('Upload failed. Please try again.');
    }
    return {'url': url, 'name': name, 'type': images ? 'image' : 'document'};
  } finally {
    try {
      if (await file.exists()) await file.delete();
    } catch (_) {}
  }
}

String communityUploadError(Object error) {
  if (error is FormatException) return error.message;
  if (error is PlatformException) {
    return error.message ?? 'Could not select this file.';
  }
  if (error is DioException && error.response?.data is Map) {
    return '${error.response!.data['error'] ?? 'Upload failed. Please try again.'}';
  }
  return 'Could not upload the file. Please try again.';
}
