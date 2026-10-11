package com.tubalhub.app

import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.widget.Toast
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

/**
 * Checks the GitHub Releases API for a published Android release.
 * A release must include a version tag (for example v1.2.8) and an APK asset.
 * Installation is user-confirmed through Android; this class never silently installs packages.
 */
object AppUpdateChecker {
    private const val RELEASE_API =
        "https://api.github.com/repos/tubalrr/tubalhub/releases/latest"
    private const val RELEASES_PAGE =
        "https://github.com/tubalrr/tubalhub/releases/latest"
    private val mainHandler = Handler(Looper.getMainLooper())

    fun check(activity: Activity, currentVersion: String, showUpToDate: Boolean = true) {
        Toast.makeText(activity, "Checking for updates…", Toast.LENGTH_SHORT).show()
        thread(name = "tubalhub-update-check") {
            var result: ResultData? = null
            var failure: String? = null
            var connection: HttpURLConnection? = null
            try {
                connection = (URL(RELEASE_API).openConnection() as HttpURLConnection).apply {
                    requestMethod = "GET"
                    connectTimeout = 8000
                    readTimeout = 8000
                    setRequestProperty("Accept", "application/vnd.github+json")
                    setRequestProperty("X-GitHub-Api-Version", "2022-11-28")
                    setRequestProperty("User-Agent", "TUBAL-HUB-Android")
                }
                if (connection.responseCode !in 200..299) {
                    throw IllegalStateException("No published release is available yet.")
                }
                val payload = connection.inputStream.bufferedReader().use { it.readText() }
                val json = JSONObject(payload)
                val tag = json.optString("tag_name").removePrefix("android-").removePrefix("v").removePrefix("V")
                val page = json.optString("html_url").ifBlank { RELEASES_PAGE }
                val notes = json.optString("body").take(600)
                val apk = json.optJSONArray("assets")
                var apkUrl: String? = null
                if (apk != null) {
                    for (i in 0 until apk.length()) {
                        val asset = apk.optJSONObject(i) ?: continue
                        if (asset.optString("name").endsWith(".apk", ignoreCase = true)) {
                            apkUrl = asset.optString("browser_download_url")
                            break
                        }
                    }
                }
                result = ResultData(tag, page, apkUrl, notes)
            } catch (e: Exception) {
                failure = e.message ?: "Unable to check for updates."
            } finally {
                connection?.disconnect()
            }

            val update = result
            val error = failure
            mainHandler.post {
                if (activity.isFinishing || activity.isDestroyed) return@post
                if (update == null) {
                    AlertDialog.Builder(activity)
                        .setTitle("Update check unavailable")
                        .setMessage(error ?: "Please try again later.")
                        .setPositiveButton("Retry") { _, _ -> check(activity, currentVersion, showUpToDate) }
                        .setNegativeButton("Close", null)
                        .show()
                    return@post
                }
                if (compareVersions(update.version, currentVersion) > 0) {
                    val message = buildString {
                        append("Version ")
                        append(update.version)
                        append(" is available. You have ")
                        append(currentVersion)
                        append('.')
                        if (update.notes.isNotBlank()) {
                            append("\n\nRelease notes:\n")
                            append(update.notes)
                        }
                        if (update.apkUrl == null) {
                            append("\n\nNo APK asset was attached to this release yet.")
                        }
                    }
                    AlertDialog.Builder(activity)
                        .setTitle("TUBAL HUB update available")
                        .setMessage(message)
                        .setPositiveButton(if (update.apkUrl == null) "View release" else "Download APK") { _, _ ->
                            openLink(activity, update.apkUrl ?: update.pageUrl)
                        }
                        .setNegativeButton("Later", null)
                        .show()
                } else if (showUpToDate) {
                    AlertDialog.Builder(activity)
                        .setTitle("You're up to date")
                        .setMessage("Installed version: $currentVersion\nLatest published version: ${update.version}")
                        .setPositiveButton("OK", null)
                        .show()
                }
            }
        }
    }

    private data class ResultData(
        val version: String,
        val pageUrl: String,
        val apkUrl: String?,
        val notes: String
    )

    private fun compareVersions(remote: String, local: String): Int {
        val a = remote.split('.', '-', '+').map { it.toIntOrNull() ?: 0 }
        val b = local.split('.', '-', '+').map { it.toIntOrNull() ?: 0 }
        for (i in 0 until maxOf(a.size, b.size)) {
            val left = a.getOrElse(i) { 0 }
            val right = b.getOrElse(i) { 0 }
            if (left != right) return left.compareTo(right)
        }
        return 0
    }

    private fun openLink(activity: Activity, url: String) {
        try {
            activity.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
        } catch (_: Exception) {
            Toast.makeText(activity, "Can't open the release link on this device.", Toast.LENGTH_LONG).show()
        }
    }
}
