import '../../config/api_config.dart';

/// Uploaded files can be returned as /uploads/... by the same web backend.
Uri? resolveAdminContentUrl(String? value) {
  if (value == null || value.trim().isEmpty) return null;
  final uri = Uri.tryParse(value.trim());
  if (uri == null) return null;
  final resolved = Uri.parse('${ApiConfig.baseUrl}/').resolveUri(uri);
  return resolved.scheme == 'https' || resolved.scheme == 'http'
      ? resolved
      : null;
}
