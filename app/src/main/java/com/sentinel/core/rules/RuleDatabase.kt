package com.sentinel.core.rules

import androidx.room.*

@Dao
interface RuleDao {
    @Query("SELECT * FROM firewall_rules WHERE isBlocked = 1")
    suspend fun getBlockedDomains(): List<FirewallRule>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertRule(rule: FirewallRule)

    @Query("DELETE FROM firewall_rules WHERE uid = :uid")
    suspend fun deleteRulesForApp(uid: Int)

    @Query("UPDATE firewall_rules SET isBlocked = 1 WHERE uid = :uid")
    suspend fun blockAllForApp(uid: Int)

    @Query("SELECT * FROM app_policies WHERE uid = :uid")
    suspend fun getPolicy(uid: Int): AppPolicy?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun updatePolicy(policy: AppPolicy)

    @Query("SELECT * FROM firewall_rules WHERE domain = :domain")
    suspend fun getRuleForDomain(domain: String): FirewallRule?

    @Query("SELECT * FROM domain_reputations WHERE domain = :domain")
    suspend fun getReputation(domain: String): DomainReputation?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun updateReputation(reputation: DomainReputation)
}

@Database(entities = [FirewallRule::class, AppPolicy::class, DomainReputation::class], version = 2)
abstract class RuleDatabase : RoomDatabase() {
    abstract fun ruleDao(): RuleDao
}
