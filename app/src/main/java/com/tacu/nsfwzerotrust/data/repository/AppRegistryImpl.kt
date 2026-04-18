package com.tacu.nsfwzerotrust.data.repository

import android.content.Intent
import android.content.pm.PackageManager
import android.provider.Settings
import com.tacu.nsfwzerotrust.domain.model.InstalledApp
import com.tacu.nsfwzerotrust.domain.repository.AppRegistry

class AppRegistryImpl(
    private val packageManager: PackageManager
) : AppRegistry {
    override fun getInstalledApps(): List<InstalledApp> {
        val intent = Intent(Intent.ACTION_MAIN).apply {
            addCategory(Intent.CATEGORY_LAUNCHER)
        }
        return packageManager.queryIntentActivities(intent, PackageManager.MATCH_ALL)
            .map {
                InstalledApp(
                    packageName = it.activityInfo.packageName,
                    appLabel = it.loadLabel(packageManager).toString()
                )
            }
            .distinctBy { it.packageName }
            .sortedBy { it.appLabel.lowercase() }
    }

    override fun getLabel(packageName: String): String {
        return runCatching {
            val info = packageManager.getApplicationInfo(packageName, PackageManager.GET_META_DATA)
            packageManager.getApplicationLabel(info).toString()
        }.getOrElse { packageName }
    }

    override fun getPackageForUid(uid: Int): String? {
        return packageManager.getPackagesForUid(uid)?.firstOrNull()
            ?: if (uid == android.os.Process.SYSTEM_UID) Settings.AUTHORITY else null
    }
}
