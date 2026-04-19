package com.sentinel.ui.viewmodel

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider

class AppControlViewModelFactory(private val context: Context) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(AppControlViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return AppControlViewModel(context) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
