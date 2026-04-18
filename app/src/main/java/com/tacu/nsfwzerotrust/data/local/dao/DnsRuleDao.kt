package com.tacu.nsfwzerotrust.data.local.dao

import androidx.lifecycle.LiveData
import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.tacu.nsfwzerotrust.data.local.entity.DnsRuleEntity

@Dao
interface DnsRuleDao {
    @Query("SELECT * FROM dns_rules ORDER BY domain ASC")
    fun observeAll(): LiveData<List<DnsRuleEntity>>

    @Query("SELECT * FROM dns_rules WHERE enabled = 1")
    suspend fun getEnabledRules(): List<DnsRuleEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: DnsRuleEntity)

    @Query("DELETE FROM dns_rules WHERE domain = :domain")
    suspend fun delete(domain: String)
}
