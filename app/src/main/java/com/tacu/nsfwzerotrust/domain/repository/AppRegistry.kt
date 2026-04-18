package com.tacu.nsfwzerotrust.domain.repository

import com.tacu.nsfwzerotrust.domain.model.InstalledApp

interface AppRegistry {
    fun getInstalledApps(): List<InstalledApp>
    fun getLabel(packageName: String): String
    fun getPackageForUid(uid: Int): String?
}
