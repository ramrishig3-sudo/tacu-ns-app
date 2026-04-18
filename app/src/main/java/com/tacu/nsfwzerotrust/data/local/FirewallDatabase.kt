package com.tacu.nsfwzerotrust.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.tacu.nsfwzerotrust.data.local.dao.AppRuleDao
import com.tacu.nsfwzerotrust.data.local.dao.DnsRuleDao
import com.tacu.nsfwzerotrust.data.local.dao.FirewallLogDao
import com.tacu.nsfwzerotrust.data.local.entity.AppRuleEntity
import com.tacu.nsfwzerotrust.data.local.entity.DnsRuleEntity
import com.tacu.nsfwzerotrust.data.local.entity.FirewallLogEntity

@Database(
    entities = [AppRuleEntity::class, DnsRuleEntity::class, FirewallLogEntity::class],
    version = 1,
    exportSchema = false
)
abstract class FirewallDatabase : RoomDatabase() {
    abstract fun appRuleDao(): AppRuleDao
    abstract fun dnsRuleDao(): DnsRuleDao
    abstract fun firewallLogDao(): FirewallLogDao

    companion object {
        fun create(context: Context): FirewallDatabase {
            return Room.databaseBuilder(
                context,
                FirewallDatabase::class.java,
                "tacu_firewall.db"
            ).build()
        }
    }
}
