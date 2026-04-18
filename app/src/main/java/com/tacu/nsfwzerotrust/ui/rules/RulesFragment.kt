package com.tacu.nsfwzerotrust.ui.rules

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.recyclerview.widget.LinearLayoutManager
import com.tacu.nsfwzerotrust.core.ServiceLocator
import com.tacu.nsfwzerotrust.databinding.FragmentRulesBinding
import com.tacu.nsfwzerotrust.domain.model.FirewallAction

class RulesFragment : Fragment() {
    private var binding: FragmentRulesBinding? = null
    private val container by lazy { ServiceLocator.from(requireContext()) }

    private val viewModel by lazy {
        ViewModelProvider(this, object : ViewModelProvider.Factory {
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                @Suppress("UNCHECKED_CAST")
                return RulesViewModel(container.appRuleRepository) as T
            }
        })[RulesViewModel::class.java]
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        binding = FragmentRulesBinding.inflate(inflater, container, false)
        return binding!!.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        val localBinding = binding ?: return
        val adapter = RulesAdapter(
            onAllow = { item -> viewModel.setAction(item.installedApp, FirewallAction.ALLOW) },
            onBlock = { item -> viewModel.setAction(item.installedApp, FirewallAction.BLOCK) }
        )
        localBinding.rulesRecycler.layoutManager = LinearLayoutManager(requireContext())
        localBinding.rulesRecycler.adapter = adapter
        viewModel.items.observe(viewLifecycleOwner) { adapter.submitList(it) }
    }

    override fun onDestroyView() {
        binding = null
        super.onDestroyView()
    }
}
