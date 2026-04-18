package com.tacu.nsfwzerotrust.ui.dashboard

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.tacu.nsfwzerotrust.core.ServiceLocator
import com.tacu.nsfwzerotrust.databinding.FragmentDashboardBinding
import com.tacu.nsfwzerotrust.domain.model.ProtectionStatus
import com.tacu.nsfwzerotrust.ui.MainActivity

class DashboardFragment : Fragment() {
    private var binding: FragmentDashboardBinding? = null
    private val container by lazy { ServiceLocator.from(requireContext()) }

    private val viewModel by lazy {
        ViewModelProvider(this, object : ViewModelProvider.Factory {
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                @Suppress("UNCHECKED_CAST")
                return DashboardViewModel(
                    firewallRepository = container.firewallRepository,
                    logRepository = container.logRepository
                ) as T
            }
        })[DashboardViewModel::class.java]
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        binding = FragmentDashboardBinding.inflate(inflater, container, false)
        return binding!!.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        val localBinding = binding ?: return

        viewModel.protectionStatus.observe(viewLifecycleOwner) { status ->
            localBinding.statusValue.text = status.name
            localBinding.toggleProtection.text = if (status == ProtectionStatus.RUNNING) {
                getString(com.tacu.nsfwzerotrust.R.string.stop_protection)
            } else {
                getString(com.tacu.nsfwzerotrust.R.string.start_protection)
            }
        }

        viewModel.summary.observe(viewLifecycleOwner) { summary ->
            localBinding.allowedCount.text = summary.allowedCount.toString()
            localBinding.blockedCount.text = summary.blockedCount.toString()
            localBinding.totalCount.text = summary.totalCount.toString()
        }

        localBinding.toggleProtection.setOnClickListener {
            val status = viewModel.protectionStatus.value ?: ProtectionStatus.STOPPED
            if (status == ProtectionStatus.RUNNING || status == ProtectionStatus.STARTING) {
                container.firewallController.stopProtection(requireActivity() as MainActivity)
            } else {
                container.firewallController.startProtection(requireActivity() as MainActivity)
            }
        }
    }

    override fun onDestroyView() {
        binding = null
        super.onDestroyView()
    }
}
