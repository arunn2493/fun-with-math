import { useEffect, useMemo, useRef, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { auth, db, googleProvider } from './firebase'
import './App.css'

const operations = {
  addition: { label: 'Addition', symbol: '+' },
  subtraction: { label: 'Subtraction', symbol: '-' },
  multiplication: { label: 'Multiplication', symbol: 'x' },
  division: { label: 'Division', symbol: '÷' },
}

const operationKeys = Object.keys(operations)
const digitOptions = [1, 2, 3]
const durationOptions = [1, 2, 3, 4, 5]

const celebrationMessages = [
  'Candy superstar!',
  'That was sweet!',
  'Math magic!',
  'Candy champion!',
]

const keepTryingMessages = [
  'Good try. Want to collect candies next time?',
  'You showed up and practiced. That matters!',
  'Ready for another candy try?',
]

const lowCandyMessages = [
  'Nice start. Want to collect a few more?',
  'Sweet practice! Try again for more candies.',
  'You earned candies and kept going!',
]

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)]
}

function numberForDigits(digits) {
  if (digits === 1) return randomInt(0, 9)
  if (digits === 2) return randomInt(10, 99)
  return randomInt(100, 999)
}

function multiplicationPartner(digits) {
  if (digits === 1) return randomInt(0, 9)
  if (digits === 2) return randomInt(2, 9)
  return randomInt(2, 5)
}

function divisibleNumberForDigits(digits, divisor) {
  const min = digits === 1 ? 1 : Math.pow(10, digits - 1)
  const max = Math.pow(10, digits) - 1
  const minAnswer = Math.ceil(min / divisor)
  const maxAnswer = Math.floor(max / divisor)
  return randomInt(minAnswer, maxAnswer) * divisor
}

function formatQuestion(operation, digits, left, right, answer) {
  return {
    operation,
    digits,
    left,
    right,
    answer,
    prompt: `${left} ${operations[operation].symbol} ${right}`,
  }
}

function createQuestion(operation, digits) {
  if (operation === 'addition') {
    const left = numberForDigits(digits)
    const right = numberForDigits(digits)
    return formatQuestion(operation, digits, left, right, left + right)
  }

  if (operation === 'subtraction') {
    const first = numberForDigits(digits)
    const second = numberForDigits(digits)
    const left = Math.max(first, second)
    const right = Math.min(first, second)
    return formatQuestion(operation, digits, left, right, left - right)
  }

  if (operation === 'multiplication') {
    const left = numberForDigits(digits)
    const right = multiplicationPartner(digits)
    return formatQuestion(operation, digits, left, right, left * right)
  }

  const divisor = randomInt(2, 9)
  const left = divisibleNumberForDigits(digits, divisor)
  return formatQuestion(operation, digits, left, divisor, left / divisor)
}

function createUniqueQuestion(selectedOperations, selectedDigits, askedQuestionKeys) {
  for (let attempt = 0; attempt < 250; attempt += 1) {
    const question = createQuestion(randomItem(selectedOperations), randomItem(selectedDigits))
    const key = `${question.operation}:${question.left}:${question.right}`

    if (!askedQuestionKeys.includes(key)) {
      return { question, askedQuestionKeys: askedQuestionKeys.concat(key) }
    }
  }

  const question = createQuestion(randomItem(selectedOperations), randomItem(selectedDigits))
  return {
    question,
    askedQuestionKeys: [`${question.operation}:${question.left}:${question.right}`],
  }
}

function formatTime(secondsLeft) {
  const minutes = Math.floor(Math.max(secondsLeft, 0) / 60)
  const seconds = Math.max(secondsLeft, 0) % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function formatSessionDate(createdAt) {
  const date = createdAt?.toDate ? createdAt.toDate() : new Date(createdAt)

  if (Number.isNaN(date.getTime())) return 'Just now'

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatOperationPill(selectedOperations) {
  if (selectedOperations.length === operationKeys.length) return 'All operations'

  return selectedOperations.map((operation) => operations[operation]?.symbol || operation).join(' ')
}

function formatDigitPill(selectedDigits) {
  return selectedDigits.slice().sort().join('-')
}

function getEndMessage(candies) {
  if (candies === 0) return randomItem(keepTryingMessages)
  if (candies < 10) return randomItem(lowCandyMessages)
  return randomItem(celebrationMessages)
}

async function saveUserProfile(firebaseUser) {
  const userRef = doc(db, 'users', firebaseUser.uid)
  const userProfile = {
    uid: firebaseUser.uid,
    displayName: firebaseUser.displayName || '',
    email: firebaseUser.email || '',
    photoURL: firebaseUser.photoURL || '',
    lastLoginAt: serverTimestamp(),
  }

  const userSnapshot = await getDoc(userRef)

  if (userSnapshot.exists()) {
    await updateDoc(userRef, userProfile)
    return
  }

  await setDoc(userRef, {
    ...userProfile,
    createdAt: serverTimestamp(),
  })
}

function buildSessionRecord(userId, session) {
  const sessionRef = doc(collection(db, 'users', userId, 'sessions'))

  return {
    ref: sessionRef,
    data: {
      id: sessionRef.id,
      uid: userId,
      createdAt: serverTimestamp(),
      candies: session.candies,
      questionsAttempted: session.questionsAttempted,
      correctAnswers: session.correctAnswers,
      durationMinutes: session.durationMinutes,
      operations: session.operations,
      digitLevels: session.digitLevels,
    },
    optimisticData: {
      id: sessionRef.id,
      uid: userId,
      createdAt: new Date().toISOString(),
      candies: session.candies,
      questionsAttempted: session.questionsAttempted,
      correctAnswers: session.correctAnswers,
      durationMinutes: session.durationMinutes,
      operations: session.operations,
      digitLevels: session.digitLevels,
    },
  }
}

async function fetchUserSessions(userId) {
  const sessionsQuery = query(
    collection(db, 'users', userId, 'sessions'),
    orderBy('createdAt', 'desc'),
  )
  const snapshot = await getDocs(sessionsQuery)
  return snapshot.docs.map((sessionDoc) => ({
    id: sessionDoc.id,
    ...sessionDoc.data(),
  }))
}

function App() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  const [screen, setScreen] = useState('home')
  const [durationMinutes, setDurationMinutes] = useState(1)
  const [selectedOperations, setSelectedOperations] = useState([])
  const [selectedDigits, setSelectedDigits] = useState([])
  const [sessions, setSessions] = useState([])
  const [progressMessage, setProgressMessage] = useState('')
  const [isProgressLoading, setIsProgressLoading] = useState(false)
  const [currentSession, setCurrentSession] = useState(null)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState({ text: '', tone: '' })
  const [resultSession, setResultSession] = useState(null)
  const [saveMessage, setSaveMessage] = useState('')

  const answerInputRef = useRef(null)
  const finishTimerRef = useRef(null)
  const hasFinishedRef = useRef(false)
  const currentSessionRef = useRef(null)
  const finishGameRef = useRef(null)
  const isGameActive = screen === 'game' && Boolean(currentSession) && !currentSession?.ended
  const isInEndGrace = Boolean(currentSession?.isInGrace && !currentSession?.ended)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setIsLoading(false)
      setScreen('home')
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    currentSessionRef.current = currentSession
  }, [currentSession])

  useEffect(() => {
    if (!user) return undefined

    let isCurrent = true

    Promise.resolve().then(() => {
      if (!isCurrent) return
      setIsProgressLoading(true)
      setProgressMessage('')
    })

    fetchUserSessions(user.uid)
      .then((nextSessions) => {
        if (isCurrent) setSessions(nextSessions)
      })
      .catch((error) => {
        if (isCurrent) setProgressMessage('Progress is taking a break. Try again soon.')
        console.error('Could not load sessions:', error)
      })
      .finally(() => {
        if (isCurrent) setIsProgressLoading(false)
      })

    return () => {
      isCurrent = false
    }
  }, [user])

  useEffect(() => {
    if (!isGameActive) return undefined

    const timerId = window.setInterval(() => {
      setCurrentSession((session) => {
        if (!session || session.ended) return session

        const secondsLeft = Math.max(session.secondsLeft - 1, 0)
        return {
          ...session,
          secondsLeft,
          isInGrace: secondsLeft === 0 ? true : session.isInGrace,
        }
      })
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [isGameActive])

  useEffect(() => {
    if (!isInEndGrace || finishTimerRef.current) return undefined

    finishTimerRef.current = window.setTimeout(() => {
      finishGameRef.current?.(currentSessionRef.current)
    }, 700)

    return undefined
  }, [isInEndGrace])

  useEffect(() => {
    if (screen === 'game') {
      answerInputRef.current?.focus()
    }
  }, [screen, currentSession?.currentQuestion?.prompt])

  const lifetimeCandies = useMemo(
    () => sessions.reduce((total, session) => total + Number(session.candies || 0), 0),
    [sessions],
  )

  const lastSession = sessions[0]

  const handleSignIn = async () => {
    setAuthMessage('')
    setIsSavingProfile(true)

    try {
      const result = await signInWithPopup(auth, googleProvider)
      await saveUserProfile(result.user)
      setAuthMessage('Your candy adventure is ready to save.')
    } catch (error) {
      setAuthMessage('Sign in did not work this time. Please try again.')
      console.error('Google sign in failed:', error)
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleSignOut = async () => {
    setAuthMessage('')
    clearGameTimers()

    try {
      await signOut(auth)
      setCurrentSession(null)
      setResultSession(null)
      setSessions([])
      setScreen('home')
    } catch (error) {
      setAuthMessage('Sign out did not work this time. Please try again.')
      console.error('Sign out failed:', error)
    }
  }

  const toggleOperation = (operation) => {
    setSelectedOperations((currentOperations) =>
      currentOperations.includes(operation)
        ? currentOperations.filter((item) => item !== operation)
        : currentOperations.concat(operation),
    )
  }

  const toggleDigit = (digits) => {
    setSelectedDigits((currentDigits) =>
      currentDigits.includes(digits)
        ? currentDigits.filter((item) => item !== digits)
        : currentDigits.concat(digits),
    )
  }

  const startGame = () => {
    const operationsForGame = selectedOperations.length ? selectedOperations : operationKeys
    const digitsForGame = selectedDigits.length ? selectedDigits : digitOptions
    const firstQuestion = createUniqueQuestion(operationsForGame, digitsForGame, [])
    const totalSeconds = durationMinutes * 60

    clearGameTimers()
    hasFinishedRef.current = false
    setSaveMessage('')
    setResultSession(null)
    setAnswer('')
    setFeedback({ text: '', tone: '' })
    setCurrentSession({
      durationMinutes,
      operations: operationsForGame,
      digitLevels: digitsForGame,
      candies: 0,
      questionsAttempted: 0,
      correctAnswers: 0,
      secondsLeft: totalSeconds,
      totalSeconds,
      currentQuestion: firstQuestion.question,
      askedQuestionKeys: firstQuestion.askedQuestionKeys,
      ended: false,
      isInGrace: false,
      history: [],
    })
    setScreen('game')
  }

  const showNextQuestion = () => {
    setCurrentSession((session) => {
      const nextQuestion = createUniqueQuestion(
        session.operations,
        session.digitLevels,
        session.askedQuestionKeys,
      )

      return {
        ...session,
        currentQuestion: nextQuestion.question,
        askedQuestionKeys: nextQuestion.askedQuestionKeys,
      }
    })
    setAnswer('')
  }

  const handleSubmitAnswer = (event) => {
    event.preventDefault()
    if (!currentSession?.currentQuestion || currentSession.ended) return

    if (answer.trim() === '') {
      setFeedback({ text: 'Pop in a number when you are ready.', tone: 'try' })
      return
    }

    const guess = Number(answer)
    const question = currentSession.currentQuestion
    const isCorrect = guess === question.answer
    const nextSession = {
      ...currentSession,
      candies: isCorrect ? currentSession.candies + 1 : currentSession.candies,
      questionsAttempted: currentSession.questionsAttempted + 1,
      correctAnswers: isCorrect ? currentSession.correctAnswers + 1 : currentSession.correctAnswers,
      history: currentSession.history.concat({
        operation: question.operation,
        digits: question.digits,
        prompt: question.prompt,
        answer: question.answer,
        guess,
        correct: isCorrect,
        answeredAt: new Date().toISOString(),
      }),
    }

    setCurrentSession(nextSession)

    setFeedback(
      isCorrect
        ? {
            text: randomItem(['Sweet! One candy for you!', 'Great job!', 'You got it! Yum!']),
            tone: 'good',
          }
        : {
            text: randomItem([
              `Nice try. The answer was ${question.answer}.`,
              `Almost! It was ${question.answer}.`,
              `Good thinking. This one was ${question.answer}.`,
            ]),
            tone: 'try',
          },
    )

    if (currentSession.secondsLeft <= 0) {
      finishGame(nextSession)
      return
    }

    window.setTimeout(showNextQuestion, 0)
  }

  const clearGameTimers = () => {
    if (finishTimerRef.current) {
      window.clearTimeout(finishTimerRef.current)
      finishTimerRef.current = null
    }
  }

  const finishGame = async (sessionToFinish = currentSessionRef.current) => {
    if (!sessionToFinish || hasFinishedRef.current) return

    hasFinishedRef.current = true
    clearGameTimers()
    const finalSession = { ...sessionToFinish, ended: true, secondsLeft: 0 }
    setCurrentSession(finalSession)
    setResultSession(finalSession)
    setScreen('result')

    if (!user) return

    const sessionRecord = buildSessionRecord(user.uid, finalSession)
    setSessions((currentSessions) => [sessionRecord.optimisticData].concat(currentSessions))
    setSaveMessage('Saving your candies...')

    try {
      await setDoc(sessionRecord.ref, sessionRecord.data)
      setSaveMessage('Candies saved.')
    } catch (error) {
      setSaveMessage('Candies could not be saved this time.')
      console.error('Could not save session:', error)
    }
  }

  useEffect(() => {
    finishGameRef.current = finishGame
  })

  const goHome = () => {
    clearGameTimers()
    hasFinishedRef.current = true
    setCurrentSession(null)
    setResultSession(null)
    setFeedback({ text: '', tone: '' })
    setSaveMessage('')
    setScreen('home')
  }

  const showSetup = () => {
    clearGameTimers()
    setFeedback({ text: '', tone: '' })
    setSaveMessage('')
    setScreen('setup')
  }

  const showProgress = () => {
    setScreen('progress')
  }

  const showAllRounds = () => {
    setScreen('allRounds')
  }

  const refreshProgress = async () => {
    if (!user) return

    setIsProgressLoading(true)
    setProgressMessage('')

    try {
      setSessions(await fetchUserSessions(user.uid))
    } catch (error) {
      setProgressMessage('Progress is taking a break. Try again soon.')
      console.error('Could not refresh sessions:', error)
    } finally {
      setIsProgressLoading(false)
    }
  }

  if (isLoading) {
    return (
      <main className="app-shell">
        <section className="card home-card" aria-live="polite">
          <CandyDots />
          <h1 className="title">Fun with Math</h1>
          <p className="subtitle">Checking your sign in...</p>
        </section>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="app-shell">
        <section className="card home-card" aria-live="polite">
          <CandyDots />
          <h1 className="title">Fun with Math</h1>
          <p className="subtitle">Sign in to save your candy adventures.</p>
          <button
            className="primary"
            type="button"
            onClick={handleSignIn}
            disabled={isSavingProfile}
          >
            {isSavingProfile ? 'Getting ready...' : 'Sign in with Google'}
          </button>
          {authMessage && <p className="status-text">{authMessage}</p>}
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      {screen === 'home' && (
        <section className="card home-card" aria-live="polite">
          <div className="top-actions">
            <button className="small-button" type="button" onClick={showProgress}>
              View Progress
            </button>
            <button className="small-button" type="button" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
          <CandyDots />
          <h1 className="title">Fun with Math</h1>
          <p className="subtitle">Hi, {user.displayName || 'math friend'}!</p>
          <p className="home-message">
            {lastSession
              ? `Last time you earned ${lastSession.candies} candies. Can you earn more today?`
              : 'Collect candies while practicing math!'}
          </p>
          <button className="primary" type="button" onClick={showSetup}>
            Play Now
          </button>
          {authMessage && <p className="status-text">{authMessage}</p>}
        </section>
      )}

      {screen === 'progress' && (
        <section className="card progress-card" aria-live="polite">
          <div className="progress-actions">
            <button className="small-button" type="button" onClick={goHome}>
              Home
            </button>
            <button className="small-button" type="button" onClick={refreshProgress}>
              Refresh
            </button>
          </div>
          <h1 className="page-title">Candy Progress</h1>
          <div className="progress-summary">
            <div className="progress-stat">
              <span>Lifetime candies</span>
              <strong>{lifetimeCandies}</strong>
            </div>
            <div className="progress-stat">
              <span>Last session</span>
              <strong>{lastSession ? lastSession.candies : 0}</strong>
            </div>
          </div>
          {isProgressLoading && <p className="status-text">Gathering candies...</p>}
          {progressMessage && <p className="status-text">{progressMessage}</p>}
          <h2 className="timeline-heading">Recent Candy Rounds</h2>
          <SessionTimeline sessions={sessions.slice(0, 5)} isProgressLoading={isProgressLoading} />
          {sessions.length > 5 && (
            <button className="secondary timeline-more" type="button" onClick={showAllRounds}>
              View all candy rounds
            </button>
          )}
        </section>
      )}

      {screen === 'allRounds' && (
        <section className="card progress-card" aria-live="polite">
          <div className="progress-actions">
            <button className="small-button" type="button" onClick={showProgress}>
              Back
            </button>
            <button className="small-button" type="button" onClick={refreshProgress}>
              Refresh
            </button>
          </div>
          <h1 className="page-title">All Candy Rounds</h1>
          {isProgressLoading && <p className="status-text">Gathering candies...</p>}
          {progressMessage && <p className="status-text">{progressMessage}</p>}
          <div className="timeline-scroll">
            <SessionTimeline sessions={sessions} isProgressLoading={isProgressLoading} />
          </div>
        </section>
      )}

      {screen === 'setup' && (
        <section className="card setup-card">
          <div className="progress-actions">
            <button className="small-button" type="button" onClick={goHome}>
              Home
            </button>
          </div>
          <h1 className="page-title">Pick Your Round</h1>

          <p className="section-label">How long?</p>
          <div className="choices" aria-label="Duration">
            {durationOptions.map((duration) => (
              <button
                className={`choice ${durationMinutes === duration ? 'selected' : ''}`}
                type="button"
                key={duration}
                onClick={() => setDurationMinutes(duration)}
              >
                {duration} min
              </button>
            ))}
          </div>

          <p className="section-label">Which math?</p>
          <div className="choices" aria-label="Operations">
            {operationKeys.map((operation) => (
              <button
                className={`choice ${selectedOperations.includes(operation) ? 'selected' : ''}`}
                type="button"
                key={operation}
                onClick={() => toggleOperation(operation)}
              >
                {operations[operation].label}
              </button>
            ))}
          </div>
          <p className="helper">No math operation picked? We will mix them all together.</p>

          <p className="section-label">Number size?</p>
          <div className="choices" aria-label="Digit difficulty">
            {digitOptions.map((digits) => (
              <button
                className={`choice ${selectedDigits.includes(digits) ? 'selected' : ''}`}
                type="button"
                key={digits}
                onClick={() => toggleDigit(digits)}
              >
                {digits} {digits === 1 ? 'digit' : 'digits'}
              </button>
            ))}
          </div>
          <p className="helper">No number size picked? We will mix all the digits for extra fun.</p>

          <button className="primary" type="button" onClick={startGame}>
            Start
          </button>
        </section>
      )}

      {screen === 'game' && currentSession && (
        <section className="card game-card">
          <div className="game-actions">
            <button className="home-button" type="button" onClick={goHome}>
              Home
            </button>
          </div>
          <div className="topbar">
            <div className="stat timer-stat" style={{ '--time-left': currentSession.secondsLeft / currentSession.totalSeconds }}>
              <div className="stat-content">
                <div className="clock-face" aria-hidden="true">
                  <span className="clock-hand"></span>
                  <span className="clock-dot"></span>
                </div>
                <div>
                  <span className="stat-label">Time</span>
                  <span className="stat-value">{formatTime(currentSession.secondsLeft)}</span>
                </div>
              </div>
            </div>
            <div className="stat">
              <span className="stat-label">Candies</span>
              <span className="stat-value">{currentSession.candies}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Questions</span>
              <span className="stat-value">{currentSession.questionsAttempted}</span>
            </div>
          </div>

          <div className="question-wrap">
            <div className="question">{currentSession.currentQuestion.prompt}</div>
            <form className="answer-row" onSubmit={handleSubmitAnswer}>
              <input
                ref={answerInputRef}
                className="answer"
                type="number"
                inputMode="numeric"
                autoComplete="off"
                aria-label="Answer"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
              />
              <button className="submit" type="submit">
                Go
              </button>
            </form>
            <p className={`feedback ${feedback.tone}`}>{feedback.text}</p>
          </div>
        </section>
      )}

      {screen === 'result' && resultSession && (
        <section className="card result-card" aria-live="polite">
          <h1 className="end-title">{getEndMessage(resultSession.candies)}</h1>
          <StarRating
            correctAnswers={resultSession.correctAnswers}
            questionsAttempted={resultSession.questionsAttempted}
          />
          <div className="candies-big">
            <strong>{resultSession.candies}</strong>
            <span>{resultSession.candies === 1 ? ' candy collected' : ' candies collected'}</span>
          </div>
          <div className="end-stats">
            <div className="end-stat">Questions: {resultSession.questionsAttempted}</div>
            <div className="end-stat">Correct: {resultSession.correctAnswers}</div>
          </div>
          {saveMessage && <p className="status-text">{saveMessage}</p>}
          <div className="result-actions">
            <button className="primary" type="button" onClick={showSetup}>
              Play Again
            </button>
            <button className="secondary" type="button" onClick={showProgress}>
              View Progress
            </button>
          </div>
        </section>
      )}
    </main>
  )
}

function CandyDots() {
  return (
    <div className="candy-dots" aria-hidden="true">
      <span></span>
      <span></span>
      <span></span>
    </div>
  )
}

function SessionTimeline({ sessions, isProgressLoading }) {
  if (sessions.length === 0 && !isProgressLoading) {
    return <div className="empty-progress">Play a round to start collecting candies here.</div>
  }

  return (
    <div className="candy-timeline">
      {sessions.map((session, index) => (
        <article className="session-card" key={session.id}>
          <div className="timeline-marker" aria-hidden="true">
            <span>{index + 1}</span>
          </div>
          <div className="session-content">
            <div className="session-topline">
              <p className="session-candies">
                {session.candies} {session.candies === 1 ? 'candy' : 'candies'}
              </p>
              <div className="session-meta">
                <span>
                  <CalendarIcon />
                  {formatSessionDate(session.createdAt)}
                </span>
                <span>
                  <ClockIcon />
                  {session.durationMinutes} min
                </span>
              </div>
            </div>
            <div className="session-chips">
              <span>{session.questionsAttempted} questions</span>
              <span>{formatOperationPill(session.operations || [])}</span>
              <span>{formatDigitPill(session.digitLevels || [])} digits</span>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

function CalendarIcon() {
  return (
    <svg className="meta-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="3"></rect>
      <path d="M8 3v4M16 3v4M4 10h16"></path>
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg className="meta-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8"></circle>
      <path d="M12 8v5l3 2"></path>
    </svg>
  )
}

function StarRating({ correctAnswers, questionsAttempted }) {
  const filledStars = questionsAttempted
    ? Math.floor((correctAnswers / questionsAttempted) * 5)
    : 0

  return (
    <div className="star-rating" aria-label={`${filledStars} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <span
          className={`result-star ${index < filledStars ? 'filled' : ''}`}
          style={{ '--star-delay': `${index * 90}ms` }}
          key={index}
        ></span>
      ))}
    </div>
  )
}

export default App
