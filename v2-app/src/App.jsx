import { useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, googleProvider } from './firebase'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authMessage, setAuthMessage] = useState('')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setIsLoading(false)
    })

    return unsubscribe
  }, [])

  const handleSignIn = async () => {
    setAuthMessage('')

    try {
      await signInWithPopup(auth, googleProvider)
    } catch (error) {
      setAuthMessage('Sign in did not work this time. Please try again.')
      console.error('Google sign in failed:', error)
    }
  }

  const handleSignOut = async () => {
    setAuthMessage('')

    try {
      await signOut(auth)
    } catch (error) {
      setAuthMessage('Sign out did not work this time. Please try again.')
      console.error('Sign out failed:', error)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-live="polite">
        <div className="candy-dots" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </div>

        <h1>Fun with Math</h1>
        <p className="tagline">Sign in to save your candy adventures.</p>

        {isLoading ? (
          <p className="status-text">Checking your sign in...</p>
        ) : user ? (
          <div className="user-panel">
            <p className="welcome-text">Hi, {user.displayName || 'math friend'}!</p>
            <div className="user-details">
              <span>Name</span>
              <strong>{user.displayName || 'No name shared'}</strong>
              <span>Email</span>
              <strong>{user.email}</strong>
            </div>
            <button className="secondary-button" type="button" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        ) : (
          <button className="primary-button" type="button" onClick={handleSignIn}>
            Sign in with Google
          </button>
        )}

        {authMessage && <p className="status-text">{authMessage}</p>}
      </section>
    </main>
  )
}

export default App
