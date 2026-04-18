package com.tacu.nsfwzerotrust.ui.onboarding

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.tacu.nsfwzerotrust.BuildConfig
import com.tacu.nsfwzerotrust.core.ServiceLocator
import com.tacu.nsfwzerotrust.databinding.ActivityOnboardingBinding
import com.tacu.nsfwzerotrust.ui.MainActivity

class OnboardingActivity : AppCompatActivity() {
    private lateinit var binding: ActivityOnboardingBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityOnboardingBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.websiteValue.text = BuildConfig.WEBSITE_BASE_URL
        binding.continueButton.setOnClickListener {
            ServiceLocator.from(this).userPreferencesRepository.setOnboardingAccepted(true)
            startActivity(Intent(this, MainActivity::class.java))
            finish()
        }
    }
}
