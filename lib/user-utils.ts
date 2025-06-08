import { findUserById, findUserByEmail, createUser, updateUser } from "@/lib/repositories"

interface SessionUser {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
}

/**
 * Ensures a user exists in the database, creating or updating as needed
 * This handles the user initialization logic that was previously in the dashboard
 */
export async function ensureUserExists(sessionUser: SessionUser): Promise<void> {
  if (!sessionUser.email) {
    throw new Error('User email is required')
  }

  try {
    // Try to find user by ID first
    let dbUser = await findUserById(sessionUser.id)
    
    if (!dbUser) {
      // If not found by ID, try to find by email
      const userByEmail = await findUserByEmail(sessionUser.email)
      
      if (userByEmail) {
        // User exists with same email but different ID - update their info
        await updateUser(userByEmail.id, {
          name: sessionUser.name ?? null,
          image: sessionUser.image ?? null,
        })
        dbUser = userByEmail
      } else {
        // No user exists - create new one
        await createUser({
          id: sessionUser.id,
          name: sessionUser.name ?? null,
          email: sessionUser.email,
          image: sessionUser.image ?? null,
        })
      }
    } else {
      // User exists - update their info in case it changed
      await updateUser(dbUser.id, {
        name: sessionUser.name ?? null,
        email: sessionUser.email,
        image: sessionUser.image ?? null,
      })
    }
  } catch (error) {
    console.error('Failed to ensure user exists:', error)
    throw new Error('User initialization failed')
  }
} 