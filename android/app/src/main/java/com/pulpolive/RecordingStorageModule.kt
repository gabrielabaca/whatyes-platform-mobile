package com.pulpolive

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Environment
import android.provider.DocumentsContract
import android.util.Log
import androidx.documentfile.provider.DocumentFile
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream

private const val TAG = "RecordingStorage"
private const val PREFS = "pulpolive_recording_storage"
private const val KEY_FOLDER_URI = "folder_uri"
private const val KEY_DISPLAY_PATH = "display_path"
private const val REQUEST_PICK_FOLDER = 9102
private const val DEFAULT_SUBFOLDER = "PulpoLive/Grabaciones"

class RecordingStorageModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var pickFolderPromise: Promise? = null

    private val activityEventListener = object : BaseActivityEventListener() {
        override fun onActivityResult(
            activity: Activity,
            requestCode: Int,
            resultCode: Int,
            data: Intent?,
        ) {
            if (requestCode != REQUEST_PICK_FOLDER) return
            val promise = pickFolderPromise ?: return
            pickFolderPromise = null
            if (resultCode != Activity.RESULT_OK || data?.data == null) {
                promise.reject("PICK_CANCELLED", "Folder selection cancelled")
                return
            }
            val uri = data.data!!
            try {
                val flags =
                    Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                reactContext.contentResolver.takePersistableUriPermission(uri, flags)
            } catch (e: Exception) {
                Log.w(TAG, "takePersistableUriPermission: ${e.message}")
            }
            val display = uri.lastPathSegment ?: DEFAULT_SUBFOLDER
            reactContext.getSharedPreferences(PREFS, android.content.Context.MODE_PRIVATE)
                .edit()
                .putString(KEY_FOLDER_URI, uri.toString())
                .putString(KEY_DISPLAY_PATH, display)
                .apply()
            val map = Arguments.createMap()
            map.putString("uri", uri.toString())
            map.putString("displayPath", display)
            promise.resolve(map)
        }
    }

    init {
        reactContext.addActivityEventListener(activityEventListener)
    }

    override fun getName(): String = "RecordingStorage"

    private fun prefs() =
        reactContext.getSharedPreferences(PREFS, android.content.Context.MODE_PRIVATE)

    private fun defaultDir(): File {
        val movies = reactContext.getExternalFilesDir(Environment.DIRECTORY_MOVIES)
            ?: reactContext.filesDir
        return File(movies, DEFAULT_SUBFOLDER).apply { mkdirs() }
    }

    @ReactMethod
    fun getDefaultDirectory(promise: Promise) {
        promise.resolve(defaultDir().absolutePath)
    }

    @ReactMethod
    fun getDirectoryDisplayPath(promise: Promise) {
        val display = prefs().getString(KEY_DISPLAY_PATH, null)
        if (!display.isNullOrBlank()) {
            promise.resolve(display)
            return
        }
        promise.resolve(defaultDir().absolutePath)
    }

    @ReactMethod
    fun pickDirectory(promise: Promise) {
        val activity = reactContext.currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No activity")
            return
        }
        pickFolderPromise = promise
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).apply {
            addFlags(
                Intent.FLAG_GRANT_READ_URI_PERMISSION or
                    Intent.FLAG_GRANT_WRITE_URI_PERMISSION or
                    Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
            )
        }
        activity.startActivityForResult(intent, REQUEST_PICK_FOLDER)
    }

    @ReactMethod
    fun openDirectory(promise: Promise) {
        try {
            val folderUri = prefs().getString(KEY_FOLDER_URI, null)
            if (!folderUri.isNullOrBlank()) {
                val uri = Uri.parse(folderUri)
                val docId = DocumentsContract.getTreeDocumentId(uri)
                val documentUri = DocumentsContract.buildDocumentUriUsingTree(uri, docId)
                val intent = Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(documentUri, DocumentsContract.Document.MIME_TYPE_DIR)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                val activity = reactContext.currentActivity
                if (activity != null) {
                    activity.startActivity(intent)
                    promise.resolve(null)
                    return
                }
            }
            val dir = defaultDir()
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(Uri.fromFile(dir), "resource/folder")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(intent)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("OPEN_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun saveRecordingFile(sourcePath: String, fileName: String, promise: Promise) {
        try {
            val source = File(sourcePath.replace("file://", ""))
            if (!source.exists()) {
                promise.reject("SOURCE_MISSING", "Recording file not found")
                return
            }
            val folderUri = prefs().getString(KEY_FOLDER_URI, null)
            if (!folderUri.isNullOrBlank()) {
                val tree = DocumentFile.fromTreeUri(reactContext, Uri.parse(folderUri))
                val dest = tree?.createFile("video/mp4", fileName)
                if (dest != null) {
                    reactContext.contentResolver.openOutputStream(dest.uri)?.use { out ->
                        FileInputStream(source).use { input -> input.copyTo(out) }
                    }
                    source.delete()
                    promise.resolve(dest.uri.toString())
                    return
                }
            }
            val destDir = defaultDir()
            destDir.mkdirs()
            val dest = File(destDir, fileName)
            FileInputStream(source).use { input ->
                FileOutputStream(dest).use { output -> input.copyTo(output) }
            }
            source.delete()
            promise.resolve(dest.absolutePath)
        } catch (e: Exception) {
            Log.e(TAG, "saveRecordingFile", e)
            promise.reject("SAVE_FAILED", e.message, e)
        }
    }
}
