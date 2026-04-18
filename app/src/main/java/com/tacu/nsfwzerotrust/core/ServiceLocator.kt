package com.tacu.nsfwzerotrust.core

import android.content.Context
import com.tacu.nsfwzerotrust.TacUNsApplication

object ServiceLocator {
    fun from(context: Context): AppContainer {
        return (context.applicationContext as TacUNsApplication).container
    }
}
