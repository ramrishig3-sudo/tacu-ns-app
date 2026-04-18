package com.tacu.nsfwzerotrust.ui.rules

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.tacu.nsfwzerotrust.databinding.ItemAppRuleBinding
import com.tacu.nsfwzerotrust.domain.model.FirewallAction

class RulesAdapter(
    private val onAllow: (AppRuleItem) -> Unit,
    private val onBlock: (AppRuleItem) -> Unit
) : RecyclerView.Adapter<RulesAdapter.RuleViewHolder>() {
    private val items = mutableListOf<AppRuleItem>()

    fun submitList(list: List<AppRuleItem>) {
        items.clear()
        items.addAll(list)
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RuleViewHolder {
        val binding = ItemAppRuleBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return RuleViewHolder(binding)
    }

    override fun getItemCount(): Int = items.size

    override fun onBindViewHolder(holder: RuleViewHolder, position: Int) {
        holder.bind(items[position])
    }

    inner class RuleViewHolder(
        private val binding: ItemAppRuleBinding
    ) : RecyclerView.ViewHolder(binding.root) {
        fun bind(item: AppRuleItem) {
            binding.appName.text = item.installedApp.appLabel
            binding.packageName.text = item.installedApp.packageName
            binding.currentAction.text = item.rule?.action?.name ?: FirewallAction.DEFAULT.name
            binding.allowButton.setOnClickListener { onAllow(item) }
            binding.blockButton.setOnClickListener { onBlock(item) }
        }
    }
}
