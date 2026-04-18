package com.tacu.nsfwzerotrust.ui.settings

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import com.tacu.nsfwzerotrust.BuildConfig
import com.tacu.nsfwzerotrust.core.ServiceLocator
import com.tacu.nsfwzerotrust.databinding.FragmentSettingsBinding

class SettingsFragment : Fragment() {
    private var binding: FragmentSettingsBinding? = null

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        binding = FragmentSettingsBinding.inflate(inflater, container, false)
        return binding!!.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        val localBinding = binding ?: return
        val prefs = ServiceLocator.from(requireContext()).userPreferencesRepository
        localBinding.startOnBootSwitch.isChecked = prefs.isStartOnBootEnabled()
        localBinding.startOnBootSwitch.setOnCheckedChangeListener { _, checked ->
            prefs.setStartOnBootEnabled(checked)
        }
        localBinding.privacyButton.setOnClickListener {
            openLink("${BuildConfig.WEBSITE_BASE_URL}/privacy")
        }
        localBinding.supportButton.setOnClickListener {
            openLink("${BuildConfig.WEBSITE_BASE_URL}/support")
        }
    }

    private fun openLink(url: String) {
        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
    }

    override fun onDestroyView() {
        binding = null
        super.onDestroyView()
    }
}
