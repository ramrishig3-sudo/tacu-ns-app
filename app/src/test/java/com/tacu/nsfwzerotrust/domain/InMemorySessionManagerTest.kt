package com.tacu.nsfwzerotrust.domain

import com.tacu.nsfwzerotrust.data.repository.InMemorySessionManager
import com.tacu.nsfwzerotrust.domain.model.FirewallAction
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test

class InMemorySessionManagerTest {
    @Test
    fun `cache hit returns existing session`() {
        val manager = InMemorySessionManager()
        manager.storeSession("one", FirewallAction.ALLOW, 5_000)

        val session = manager.findSession("one")

        assertNotNull(session)
        assertEquals(FirewallAction.ALLOW, session?.decision)
    }

    @Test
    fun `expired session is ignored`() {
        val manager = InMemorySessionManager()
        manager.storeSession("one", FirewallAction.ALLOW, -1)

        val session = manager.findSession("one")

        assertNull(session)
    }

    @Test
    fun `new session is absent before storage`() {
        val manager = InMemorySessionManager()

        assertNull(manager.findSession("missing"))
    }
}
