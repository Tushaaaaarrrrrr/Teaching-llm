import 'dart:async';
import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';

/// Lightweight SQLite store for tracking which PDFs the student has
/// downloaded. User-scoped queries prevent cross-account data leaks.
///
/// Schema is intentionally flat — one table, simple queries, easy to
/// extend with `version`/`checksum` columns when the backend supports it.
class DownloadDb {
  DownloadDb._();
  static final DownloadDb instance = DownloadDb._();

  static const _dbName = 'downloads.db';
  static const _tableName = 'downloads';
  static const _dbVersion = 1;

  Database? _db;

  Future<Database> get database async {
    if (_db != null) return _db!;
    _db = await _open();
    return _db!;
  }

  Future<Database> _open() async {
    final dbPath = await getDatabasesPath();
    final path = p.join(dbPath, _dbName);
    return openDatabase(
      path,
      version: _dbVersion,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE $_tableName (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            userId        TEXT    NOT NULL,
            contentId     TEXT    NOT NULL,
            contentType   TEXT    NOT NULL DEFAULT 'CONTENT',
            courseId      TEXT,
            courseName    TEXT,
            title         TEXT    NOT NULL,
            localPath     TEXT    NOT NULL,
            originalUrl   TEXT,
            fileSize      INTEGER DEFAULT 0,
            downloadedAt  TEXT    NOT NULL,
            version       TEXT
          )
        ''');
        await db.execute('''
          CREATE UNIQUE INDEX idx_user_content
            ON $_tableName (userId, contentId)
        ''');
        await db.execute('''
          CREATE INDEX idx_user
            ON $_tableName (userId)
        ''');
      },
    );
  }

  // ─── QUERIES ───────────────────────────────────────────────────────

  /// All downloads for [userId], newest first.
  Future<List<Map<String, dynamic>>> listForUser(String userId) async {
    final db = await database;
    return db.query(
      _tableName,
      where: 'userId = ?',
      whereArgs: [userId],
      orderBy: 'downloadedAt DESC',
    );
  }

  /// Lookup a single download by contentId + userId. Returns null if the
  /// material hasn't been downloaded by this user.
  Future<Map<String, dynamic>?> find(String userId, String contentId) async {
    final db = await database;
    final rows = await db.query(
      _tableName,
      where: 'userId = ? AND contentId = ?',
      whereArgs: [userId, contentId],
      limit: 1,
    );
    return rows.isEmpty ? null : rows.first;
  }

  /// Insert or replace a download record (upsert on userId + contentId).
  Future<void> upsert({
    required String userId,
    required String contentId,
    required String contentType,
    String? courseId,
    String? courseName,
    required String title,
    required String localPath,
    String? originalUrl,
    int fileSize = 0,
    String? version,
  }) async {
    final db = await database;
    await db.insert(
      _tableName,
      {
        'userId': userId,
        'contentId': contentId,
        'contentType': contentType,
        'courseId': courseId,
        'courseName': courseName,
        'title': title,
        'localPath': localPath,
        'originalUrl': originalUrl,
        'fileSize': fileSize,
        'downloadedAt': DateTime.now().toIso8601String(),
        'version': version,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  /// Remove a download record.
  Future<void> delete(String userId, String contentId) async {
    final db = await database;
    await db.delete(
      _tableName,
      where: 'userId = ? AND contentId = ?',
      whereArgs: [userId, contentId],
    );
  }

  /// Total bytes of all downloaded files for the given user.
  Future<int> totalSize(String userId) async {
    final db = await database;
    final result = await db.rawQuery(
      'SELECT COALESCE(SUM(fileSize), 0) AS total FROM $_tableName WHERE userId = ?',
      [userId],
    );
    return (result.first['total'] as int?) ?? 0;
  }

  /// All downloads for [userId] filtered by type (Video vs Documents).
  Future<List<Map<String, dynamic>>> listByTypeForUser(String userId,
      {required bool isVideo}) async {
    final db = await database;
    if (isVideo) {
      return db.query(
        _tableName,
        where: 'userId = ? AND contentType = ?',
        whereArgs: [userId, 'VIDEO'],
        orderBy: 'downloadedAt DESC',
      );
    } else {
      return db.query(
        _tableName,
        where: 'userId = ? AND contentType != ?',
        whereArgs: [userId, 'VIDEO'],
        orderBy: 'downloadedAt DESC',
      );
    }
  }

  /// Total bytes of downloaded files for the given user filtered by type.
  Future<int> totalSizeByType(String userId, {required bool isVideo}) async {
    final db = await database;
    final whereClause =
        isVideo ? 'userId = ? AND contentType = ?' : 'userId = ? AND contentType != ?';
    final args = isVideo ? [userId, 'VIDEO'] : [userId, 'VIDEO'];
    final result = await db.rawQuery(
      'SELECT COALESCE(SUM(fileSize), 0) AS total FROM $_tableName WHERE $whereClause',
      args,
    );
    return (result.first['total'] as int?) ?? 0;
  }

  /// Delete all rows of a specific type for [userId].
  Future<void> deleteAllByType(String userId, {required bool isVideo}) async {
    final db = await database;
    if (isVideo) {
      await db.delete(
        _tableName,
        where: 'userId = ? AND contentType = ?',
        whereArgs: [userId, 'VIDEO'],
      );
    } else {
      await db.delete(
        _tableName,
        where: 'userId = ? AND contentType != ?',
        whereArgs: [userId, 'VIDEO'],
      );
    }
  }

  /// Delete **all** rows for [userId]. Used when user wants to clear all
  /// downloads. The caller is responsible for deleting the actual files.
  Future<void> deleteAllForUser(String userId) async {
    final db = await database;
    await db.delete(
      _tableName,
      where: 'userId = ?',
      whereArgs: [userId],
    );
  }
}
