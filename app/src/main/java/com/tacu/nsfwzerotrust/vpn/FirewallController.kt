package com.tacu.nsfwzerotrust.vpn

import android.app.Activity
import androidx.lifecycle.LiveData
import com.tacu.nsfwzerotrust.domain.model.ProtectionStatus

interface FirewallController {
    fun startProtection(activity: Activity)
    fun stopProtection(activity: Activity)
    fun getProtectionStatus(): LiveData<ProtectionStatus>
}
