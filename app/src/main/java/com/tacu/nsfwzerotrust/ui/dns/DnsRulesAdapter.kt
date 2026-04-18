package com.tacu.nsfwzerotrust.ui.dns

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.tacu.nsfwzerotrust.databinding.ItemDnsRuleBinding
import com.tacu.nsfwzerotrust.domain.model.DnsRule

class DnsRulesAdapter(
    private val onDelete: (DnsRule) -> Unit
) : RecyclerView.Adapter<DnsRulesAdapter.DnsRuleViewHolder>() {
    private val items = mutableListOf<DnsRule>()

    fun submitList(list: List<DnsRule>) {
        items.clear()
        items.addAll(list)
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): DnsRuleViewHolder {
        val binding = ItemDnsRuleBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return DnsRuleViewHolder(binding)
    }

    override fun getItemCount(): Int = items.size

    override fun onBindViewHolder(holder: DnsRuleViewHolder, position: Int) {
        holder.bind(items[position])
    }

    inner class DnsRuleViewHolder(
        private val binding: ItemDnsRuleBinding
    ) : RecyclerView.ViewHolder(binding.root) {
        fun bind(item: DnsRule) {
            binding.domainValue.text = item.domain
            binding.actionValue.text = item.action.name
            binding.deleteButton.setOnClickListener { onDelete(item) }
        }
    }
}
