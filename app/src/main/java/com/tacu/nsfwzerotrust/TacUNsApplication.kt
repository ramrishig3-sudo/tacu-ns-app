package com.tacu.nsfwzerotrust

import android.app.Application
import com.tacu.nsfwzerotrust.core.AppContainer

class TacUNsApplication : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
    }
}
