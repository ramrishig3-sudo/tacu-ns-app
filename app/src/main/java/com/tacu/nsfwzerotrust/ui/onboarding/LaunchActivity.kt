package com.tacu.nsfwzerotrust.ui.onboarding

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.tacu.nsfwzerotrust.core.ServiceLocator
import com.tacu.nsfwzerotrust.ui.MainActivity

class LaunchActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val prefs = ServiceLocator.from(this).userPreferencesRepository
        val next = if (prefs.hasAcceptedOnboarding()) {
            Intent(this, MainActivity::class.java)
        } else {
            Intent(this, OnboardingActivity::class.java)
        }
        startActivity(next)
        finish()
    }
}
