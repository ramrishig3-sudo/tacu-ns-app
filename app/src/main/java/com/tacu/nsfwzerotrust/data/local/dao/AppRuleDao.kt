package com.tacu.nsfwzerotrust.data.local.dao

import androidx.lifecycle.LiveData
import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.tacu.nsfwzerotrust.data.local.entity.AppRuleEntity

@Dao
interface AppRuleDao {
    @Query("SELECT * FROM app_rules ORDER BY appLabel ASC")
    fun observeAll(): LiveData<List<AppRuleEntity>>

    @Query("SELECT * FROM app_rules WHERE packageName = :packageName LIMIT 1")
    suspend fun getByPackageName(packageName: String): AppRuleEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: AppRuleEntity)
}
