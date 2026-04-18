package com.tacu.nsfwzerotrust.data.local.dao

import androidx.lifecycle.LiveData
import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.tacu.nsfwzerotrust.data.local.entity.FirewallLogEntity

@Dao
interface FirewallLogDao {
    @Query("SELECT * FROM firewall_logs ORDER BY timestamp DESC")
    fun observeAll(): LiveData<List<FirewallLogEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entity: FirewallLogEntity)

    @Query("DELETE FROM firewall_logs")
    suspend fun clear()
}
