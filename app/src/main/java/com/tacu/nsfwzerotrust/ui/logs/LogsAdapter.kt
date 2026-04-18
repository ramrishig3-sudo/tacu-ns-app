package com.tacu.nsfwzerotrust.ui.logs

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.tacu.nsfwzerotrust.databinding.ItemFirewallLogBinding
import com.tacu.nsfwzerotrust.domain.model.FirewallLog
import java.text.DateFormat
import java.util.Date

class LogsAdapter : RecyclerView.Adapter<LogsAdapter.LogViewHolder>() {
    private val items = mutableListOf<FirewallLog>()

    fun submitList(list: List<FirewallLog>) {
        items.clear()
        items.addAll(list)
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): LogViewHolder {
        val binding = ItemFirewallLogBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return LogViewHolder(binding)
    }

    override fun getItemCount(): Int = items.size

    override fun onBindViewHolder(holder: LogViewHolder, position: Int) {
        holder.bind(items[position])
    }

    inner class LogViewHolder(
        private val binding: ItemFirewallLogBinding
    ) : RecyclerView.ViewHolder(binding.root) {
        fun bind(item: FirewallLog) {
            binding.logTitle.text = "${item.appName} -> ${item.action.name}"
            binding.logSubtitle.text = listOfNotNull(item.host, item.reason).joinToString(" • ")
            binding.logTime.text = DateFormat.getDateTimeInstance().format(Date(item.timestamp))
        }
    }
}
