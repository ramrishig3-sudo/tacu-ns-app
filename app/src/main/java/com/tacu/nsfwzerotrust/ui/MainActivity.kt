package com.tacu.nsfwzerotrust.ui

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.commit
import com.google.android.material.navigation.NavigationBarView
import com.tacu.nsfwzerotrust.R
import com.tacu.nsfwzerotrust.core.ServiceLocator
import com.tacu.nsfwzerotrust.databinding.ActivityMainBinding
import com.tacu.nsfwzerotrust.vpn.FirewallVpnService
import com.tacu.nsfwzerotrust.ui.dashboard.DashboardFragment
import com.tacu.nsfwzerotrust.ui.dns.DnsRulesFragment
import com.tacu.nsfwzerotrust.ui.logs.LogsFragment
import com.tacu.nsfwzerotrust.ui.rules.RulesFragment
import com.tacu.nsfwzerotrust.ui.settings.SettingsFragment

class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        if (savedInstanceState == null) {
            supportFragmentManager.commit {
                replace(R.id.fragmentContainer, DashboardFragment())
            }
        }

        binding.bottomNavigation.setOnItemSelectedListener(navListener)
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == FirewallVpnService.VPN_REQUEST_CODE && resultCode == Activity.RESULT_OK) {
            FirewallVpnService.start(applicationContext)
            ServiceLocator.from(this).firewallRepository.setProtectionStatus(
                com.tacu.nsfwzerotrust.domain.model.ProtectionStatus.STARTING
            )
        }
    }

    private val navListener = NavigationBarView.OnItemSelectedListener { item ->
        val fragment = when (item.itemId) {
            R.id.menu_dashboard -> DashboardFragment()
            R.id.menu_rules -> RulesFragment()
            R.id.menu_dns -> DnsRulesFragment()
            R.id.menu_logs -> LogsFragment()
            R.id.menu_settings -> SettingsFragment()
            else -> DashboardFragment()
        }

        supportFragmentManager.commit {
            replace(R.id.fragmentContainer, fragment)
        }
        true
    }
}
