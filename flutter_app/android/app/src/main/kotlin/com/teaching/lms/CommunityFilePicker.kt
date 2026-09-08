package com.teaching.lms

import android.app.Activity
import android.content.Intent
import android.provider.OpenableColumns
import io.flutter.plugin.common.BinaryMessenger
import io.flutter.plugin.common.MethodChannel
import java.io.File

/** Uses Android's system picker; no broad storage permission is required. */
class CommunityFilePicker(private val activity: Activity, messenger: BinaryMessenger) {
    private val channel = MethodChannel(messenger, "com.teaching.lms/community_files")
    private var pending: MethodChannel.Result? = null
    @Volatile private var disposed = false
    private val requestCode = 1042
    private val maxBytes = 20 * 1024 * 1024

    init {
        channel.setMethodCallHandler { call, result ->
            if (call.method != "pick") {
                result.notImplemented()
            } else if (pending != null) {
                result.error("BUSY", "A file is already being selected", null)
            } else {
                val images = call.argument<Boolean>("images") == true
                val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = if (images) "image/*" else "*/*"
                    putExtra(Intent.EXTRA_MIME_TYPES, if (images) arrayOf("image/jpeg", "image/png", "image/webp") else arrayOf(
                        "application/pdf", "application/msword",
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                        "application/vnd.ms-powerpoint",
                        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                        "application/vnd.ms-excel",
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        "application/zip", "application/x-zip-compressed"
                    ))
                }
                pending = result
                try {
                    activity.startActivityForResult(intent, requestCode)
                } catch (error: Exception) {
                    pending = null
                    result.error("PICKER_ERROR", "Could not open the file picker", null)
                }
            }
        }
    }

    fun onActivityResult(code: Int, resultCode: Int, data: Intent?): Boolean {
        if (code != requestCode) return false
        val result = pending ?: return true
        val uri = data?.data
        if (resultCode != Activity.RESULT_OK || uri == null) {
            pending = null
            result.success(null)
            return true
        }
        Thread {
            var temp: File? = null
            try {
                val resolver = activity.contentResolver
                var name = "Attachment"
                resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE), null, null, null)?.use { cursor ->
                    if (cursor.moveToFirst()) {
                        val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                        if (nameIndex >= 0) name = cursor.getString(nameIndex) ?: name
                        val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)
                        if (sizeIndex >= 0 && !cursor.isNull(sizeIndex) && cursor.getLong(sizeIndex) > maxBytes) {
                            throw IllegalArgumentException("Choose a file smaller than 20 MB")
                        }
                    }
                }
                val file = File.createTempFile("community-", ".upload", activity.cacheDir)
                temp = file
                resolver.openInputStream(uri)?.use { input ->
                    file.outputStream().use { output ->
                        val buffer = ByteArray(8192)
                        var total = 0
                        while (true) {
                            val count = input.read(buffer)
                            if (count < 0) break
                            total += count
                            if (total > maxBytes) throw IllegalArgumentException("Choose a file smaller than 20 MB")
                            output.write(buffer, 0, count)
                        }
                    }
                } ?: throw IllegalArgumentException("Could not read the selected file")
                activity.runOnUiThread {
                    pending = null
                    if (disposed) file.delete() else result.success(mapOf("path" to file.absolutePath, "name" to name))
                }
            } catch (error: Exception) {
                temp?.delete()
                activity.runOnUiThread {
                    pending = null
                    if (!disposed) result.error("FILE_ERROR", error.message ?: "Could not read the selected file", null)
                }
            }
        }.start()
        return true
    }

    fun dispose() {
        disposed = true
        channel.setMethodCallHandler(null)
        pending?.error("CANCELLED", "File selection was cancelled", null)
        pending = null
    }
}
