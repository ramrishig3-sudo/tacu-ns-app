package com.tacu.nsfwzerotrust.ui.dns

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.recyclerview.widget.LinearLayoutManager
import com.tacu.nsfwzerotrust.R
import com.tacu.nsfwzerotrust.core.ServiceLocator
import com.tacu.nsfwzerotrust.databinding.FragmentDnsRulesBinding
import com.tacu.nsfwzerotrust.domain.model.FirewallAction

class DnsRulesFragment : Fragment() {
    private var binding: FragmentDnsRulesBinding? = null
    private val container by lazy { ServiceLocator.from(requireContext()) }

    private val viewModel by lazy {
        ViewModelProvider(this, object : ViewModelProvider.Factory {
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                @Suppress("UNCHECKED_CAST")
                return DnsRulesViewModel(container.dnsRuleRepository) as T
            }
        })[DnsRulesViewModel::class.java]
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        binding = FragmentDnsRulesBinding.inflate(inflater, container, false)
        return binding!!.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        val localBinding = binding ?: return
        val adapter = DnsRulesAdapter { viewModel.deleteDomain(it.domain) }
        localBinding.dnsRecycler.layoutManager = LinearLayoutManager(requireContext())
        localBinding.dnsRecycler.adapter = adapter
        localBinding.actionSpinner.adapter = ArrayAdapter.createFromResource(
            requireContext(),
            R.array.firewall_actions,
            android.R.layout.simple_spinner_dropdown_item
        )
        localBinding.addDomainButton.setOnClickListener {
            val domain = localBinding.domainInput.text?.toString().orEmpty()
            if (domain.isNotBlank()) {
                val action = if (localBinding.actionSpinner.selectedItemPosition == 0) {
                    FirewallAction.ALLOW
                } else {
                    FirewallAction.BLOCK
                }
                viewModel.addDomain(domain, action)
                localBinding.domainInput.text?.clear()
            }
        }
        viewModel.rules.observe(viewLifecycleOwner) { adapter.submitList(it) }
    }

    override fun onDestroyView() {
        binding = null
        super.onDestroyView()
    }
}
