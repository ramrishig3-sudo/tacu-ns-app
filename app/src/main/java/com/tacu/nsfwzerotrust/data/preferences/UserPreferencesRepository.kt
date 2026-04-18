package com.tacu.nsfwzerotrust.data.preferences

import android.content.Context
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData

class UserPreferencesRepository(context: Context) {
    private val prefs = context.getSharedPreferences("tacu_prefs", Context.MODE_PRIVATE)
    private val startOnBoot = MutableLiveData(isStartOnBootEnabled())

    fun hasAcceptedOnboarding(): Boolean = prefs.getBoolean(KEY_ONBOARDING_ACCEPTED, false)

    fun setOnboardingAccepted(value: Boolean) {
        prefs.edit().putBoolean(KEY_ONBOARDING_ACCEPTED, value).apply()
    }

    fun isStartOnBootEnabled(): Boolean = prefs.getBoolean(KEY_START_ON_BOOT, false)

    fun setStartOnBootEnabled(value: Boolean) {
        prefs.edit().putBoolean(KEY_START_ON_BOOT, value).apply()
        startOnBoot.postValue(value)
    }

    fun observeStartOnBoot(): LiveData<Boolean> = startOnBoot

    companion object {
        private const val KEY_ONBOARDING_ACCEPTED = "onboarding_accepted"
        private const val KEY_START_ON_BOOT = "start_on_boot"
    }
}
