package com.tacu.nsfwzerotrust.ui.logs

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.recyclerview.widget.LinearLayoutManager
import com.tacu.nsfwzerotrust.core.ServiceLocator
import com.tacu.nsfwzerotrust.databinding.FragmentLogsBinding

class LogsFragment : Fragment() {
    private var binding: FragmentLogsBinding? = null
    private val container by lazy { ServiceLocator.from(requireContext()) }

    private val viewModel by lazy {
        ViewModelProvider(this, object : ViewModelProvider.Factory {
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                @Suppress("UNCHECKED_CAST")
                return LogsViewModel(container.logRepository) as T
            }
        })[LogsViewModel::class.java]
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        binding = FragmentLogsBinding.inflate(inflater, container, false)
        return binding!!.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        val localBinding = binding ?: return
        val adapter = LogsAdapter()
        localBinding.logsRecycler.layoutManager = LinearLayoutManager(requireContext())
        localBinding.logsRecycler.adapter = adapter
        localBinding.clearLogsButton.setOnClickListener { viewModel.clearLogs() }
        viewModel.logs.observe(viewLifecycleOwner) { adapter.submitList(it) }
    }

    override fun onDestroyView() {
        binding = null
        super.onDestroyView()
    }
}
