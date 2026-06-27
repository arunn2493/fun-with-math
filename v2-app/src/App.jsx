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
const nextQuestionDelayMs = 900
const progressLoadingMessage = 'Gathering your candy progress...'
const progressErrorMessage = 'We could not load progress right now. You can still play a round.'

const celebrationMessages = [
  'Candy superstar!',
  'That was sweet!',
  'Math magic!',
  'Candy champion!',
]

const keepTryingMessages = [
  'Good try. Want to collect candies next time?',
  'Ready for another candy try?',
  'Try again to collect your first candy!',
]

const noAttemptMessages = [
  'Try a question to collect candies!',
  'Give one question a try next time!',
  'No candies yet. Try one question!',
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

function getUsableFirstName(displayName = '') {
  const trimmedName = displayName.trim()
  if (!trimmedName) return ''

  const lowerName = trimmedName.toLowerCase()
  if (
    /[\d@&]/.test(trimmedName) ||
    lowerName.includes('account') ||
    lowerName.includes('gmail') ||
    lowerName.includes('email')
  ) {
    return ''
  }

  const [firstName] = trimmedName.split(/\s+/)
  if (!firstName || firstName.length < 2 || firstName.length > 20) return ''
  if (!/^[\p{L}\p{M}'-]+$/u.test(firstName)) return ''

  return firstName
}

function getEndMessage(session) {
  if (session.questionsAttempted === 0) return randomItem(noAttemptMessages)
  if (session.correctAnswers === 0) return randomItem(keepTryingMessages)
  if (session.candies < 10) return randomItem(lowCandyMessages)
  return randomItem(celebrationMessages)
}

function shouldShowConfetti(session) {
  if (!session?.questionsAttempted) return false
  return session.correctAnswers / session.questionsAttempted > 0.9
}

function createEmptyOperationStats() {
  return operationKeys.reduce((stats, operation) => {
    stats[operation] = { attempted: 0, correct: 0 }
    return stats
  }, {})
}

function createEmptyDigitStats() {
  return digitOptions.reduce((stats, digits) => {
    stats[String(digits)] = { attempted: 0, correct: 0 }
    return stats
  }, {})
}

function buildPracticeStats(history = []) {
  const operationStats = createEmptyOperationStats()
  const digitStats = createEmptyDigitStats()

  history.forEach((answerRecord) => {
    const operationStat = operationStats[answerRecord.operation]
    const digitStat = digitStats[String(answerRecord.digits)]

    if (operationStat) {
      operationStat.attempted += 1
      if (answerRecord.correct) operationStat.correct += 1
    }

    if (digitStat) {
      digitStat.attempted += 1
      if (answerRecord.correct) digitStat.correct += 1
    }
  })

  return { operationStats, digitStats }
}

function addStats(targetStats, sourceStats) {
  Object.entries(targetStats).forEach(([key, target]) => {
    const source = sourceStats?.[key]
    if (!source) return

    target.attempted += Number(source.attempted || 0)
    target.correct += Number(source.correct || 0)
  })
}

function hasTrackedStats(stats) {
  return Object.values(stats || {}).some((stat) => Number(stat?.attempted || 0) > 0)
}

function getPercent(stat) {
  const attempted = Number(stat?.attempted || 0)
  if (attempted === 0) return null
  return Math.round((Number(stat.correct || 0) / attempted) * 100)
}

function buildRecentPracticeSummary(sessions) {
  const operationStats = createEmptyOperationStats()
  const digitStats = createEmptyDigitStats()

  sessions.slice(0, 5).forEach((session) => {
    addStats(operationStats, session.operationStats)
    addStats(digitStats, session.digitStats)
  })

  return { operationStats, digitStats }
}

function getLowestStatItems(stats, labels) {
  const practicedItems = Object.entries(stats)
    .map(([key, stat]) => ({
      key,
      label: labels[key],
      percent: getPercent(stat),
    }))
    .filter((item) => item.percent !== null)

  if (practicedItems.length === 0) return []

  const lowestPercent = Math.min(...practicedItems.map((item) => item.percent))
  return practicedItems.filter((item) => item.percent === lowestPercent)
}

function formatList(items) {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
}

function buildSetupRecommendation(practiceSummary) {
  const operationLabels = Object.fromEntries(
    operationKeys.map((operation) => [operation, operations[operation].label.toLowerCase()]),
  )
  const digitLabels = Object.fromEntries(
    digitOptions.map((digits) => [String(digits), `${digits}-digit`]),
  )
  const recommendedOperations = getLowestStatItems(practiceSummary.operationStats, operationLabels)
  const recommendedDigits = getLowestStatItems(practiceSummary.digitStats, digitLabels)

  if (!recommendedOperations.length && !recommendedDigits.length) {
    return {
      hasData: false,
      text: 'Play a round and I will find a sweet practice idea.',
      intro: '',
      highlight: '',
      outro: '',
      operationItems: [],
      digitItems: [],
    }
  }

  const operationText = formatList(recommendedOperations.map((operation) => operation.label))
  const digitText = formatList(recommendedDigits.map((digit) => digit.label))
  const targetText =
    operationText && digitText
      ? `${operationText} of ${digitText} number sizes`
      : operationText || `${digitText} number sizes`

  return {
    hasData: true,
    text: `Maybe you could practice ${targetText}.`,
    intro: 'Maybe you could practice ',
    highlight: targetText,
    outro: '.',
    operationItems: operationKeys.map((operation) => ({
      key: operation,
      label: operations[operation].symbol,
    })),
    digitItems: digitOptions.map((digits) => ({
      key: String(digits),
      label: String(digits),
    })),
  }
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
  const practiceStats = buildPracticeStats(session.history)

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
      operationStats: practiceStats.operationStats,
      digitStats: practiceStats.digitStats,
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
      operationStats: practiceStats.operationStats,
      digitStats: practiceStats.digitStats,
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
  const [isAnswerLocked, setIsAnswerLocked] = useState(false)
  const [answerEffect, setAnswerEffect] = useState({ tone: '', id: 0 })
  const [feedback, setFeedback] = useState({ text: '', tone: '' })
  const [resultSession, setResultSession] = useState(null)
  const [saveMessage, setSaveMessage] = useState('')
  const [usesOnScreenKeypad, setUsesOnScreenKeypad] = useState(false)

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
    const mediaQuery = window.matchMedia?.('(pointer: coarse)')
    if (!mediaQuery) return undefined

    const updateKeypadMode = () => setUsesOnScreenKeypad(mediaQuery.matches)
    updateKeypadMode()
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', updateKeypadMode)
    } else {
      mediaQuery.addListener(updateKeypadMode)
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', updateKeypadMode)
      } else {
        mediaQuery.removeListener(updateKeypadMode)
      }
    }
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
        if (isCurrent) setProgressMessage(progressErrorMessage)
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
    if (screen === 'game' && !usesOnScreenKeypad) {
      answerInputRef.current?.focus()
    }
  }, [screen, currentSession?.currentQuestion?.prompt, usesOnScreenKeypad])

  const lifetimeCandies = useMemo(
    () => sessions.reduce((total, session) => total + Number(session.candies || 0), 0),
    [sessions],
  )
  const recentPracticeSummary = useMemo(() => buildRecentPracticeSummary(sessions), [sessions])
  const setupRecommendation = useMemo(
    () => buildSetupRecommendation(recentPracticeSummary),
    [recentPracticeSummary],
  )

  const lastSession = sessions[0]
  const firstName = getUsableFirstName(user?.displayName || '')
  const greetingName = firstName || 'math friend'

  const handleSignIn = async () => {
    setAuthMessage('')
    setIsSavingProfile(true)

    try {
      const result = await signInWithPopup(auth, googleProvider)
      await saveUserProfile(result.user)
    } catch (error) {
      setAuthMessage('Google sign-in did not open this time. Please try again.')
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
      setAuthMessage('Sign out did not finish this time. Please try again.')
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
    setIsAnswerLocked(false)
    setAnswerEffect({ tone: '', id: 0 })
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
    setIsAnswerLocked(false)
    setAnswerEffect({ tone: '', id: 0 })
  }

  const submitAnswer = (answerOverride = answer) => {
    if (!currentSession?.currentQuestion || currentSession.ended || isAnswerLocked) return

    if (answerOverride.trim() === '') {
      setFeedback({ text: 'Pop in a number when you are ready.', tone: 'try' })
      return
    }

    setIsAnswerLocked(true)

    const guess = Number(answerOverride)
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
    setAnswerEffect((effect) => ({
      tone: isCorrect ? 'good' : 'try',
      id: effect.id + 1,
    }))

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

    window.setTimeout(showNextQuestion, nextQuestionDelayMs)
  }

  const handleSubmitAnswer = (event) => {
    event.preventDefault()
    submitAnswer()
  }

  const handleKeypadPress = (key) => {
    if (!currentSession || currentSession.ended || isAnswerLocked) return

    if (key === 'minus') {
      const nextAnswer = answer.startsWith('-') ? answer.slice(1) : `-${answer}`
      setAnswer(nextAnswer)
      return
    }

    if (key === 'backspace') {
      setAnswer(answer.slice(0, -1))
      return
    }

    const nextAnswer = `${answer}${key}`
    setAnswer(nextAnswer)
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
      setSaveMessage('Candies could not be saved this time, but you still practiced!')
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

  if (isLoading) {
    return (
      <main className="app-shell">
        <MathSprinkles />
        <section className="card home-card" aria-live="polite">
          <CandyDots />
          <h1 className="title">Fun with Math</h1>
          <FriendlyState
            tone="loading"
            title="Warming up your candy trail..."
            message="Checking your sign-in."
          />
        </section>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="app-shell">
        <MathSprinkles />
        <section className="card home-card" aria-live="polite">
          <BrandMark className="sign-in-brand-mark" />
          <CandyDots />
          <button
            className="primary"
            type="button"
            onClick={handleSignIn}
            disabled={isSavingProfile}
          >
            {isSavingProfile ? 'Getting ready...' : 'Sign in with Google'}
          </button>
          <p className="subtitle sign-in-helper">Sign in to save your candy adventures.</p>
          {authMessage && <FriendlyState tone="error" title="Let us try that again." message={authMessage} />}
        </section>
      </main>
    )
  }

  return (
    <main className={`app-shell app-${screen}`}>
      <MathSprinkles />
      {screen === 'home' && (
        <section className="card home-card" aria-live="polite">
          <BrandMark className="home-corner-title" />
          <div className="top-actions">
            <button className="small-button progress-button" type="button" onClick={showProgress}>
              View Progress
            </button>
            <button className="small-button signout-button" type="button" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
          <CandyDots />
          <UserAvatar user={user} />
          <p className="subtitle">Hi, {greetingName}!</p>
          <p className="home-message">
            {isProgressLoading && !lastSession
              ? progressLoadingMessage
              : lastSession
              ? `Last time you earned ${lastSession.candies} candies. Can you earn more today?`
              : 'Collect candies while practicing math!'}
          </p>
          <button className="primary" type="button" onClick={showSetup}>
            Play Now
          </button>
          <div className="home-trust-stamps" aria-label="Trust badges">
            <span>Secure Space</span>
            <span>Kid-Approved</span>
          </div>
          {authMessage && <FriendlyState tone="error" title="One more try." message={authMessage} />}
        </section>
      )}

      {screen === 'progress' && (
        <section className="card progress-card" aria-live="polite">
          <div className="progress-actions progress-actions-split">
            <button className="small-button" type="button" onClick={goHome}>
              Home
            </button>
            <BrandMark className="progress-brand-mark" />
            <button className="small-button signout-button" type="button" onClick={handleSignOut}>
              Sign out
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
          {isProgressLoading && (
            <FriendlyState tone="loading" title={progressLoadingMessage} message="Your candy trail will be ready soon." />
          )}
          {progressMessage && (
            <FriendlyState tone="error" title="Progress is taking a break." message={progressMessage} />
          )}
          <h2 className="timeline-heading">Recent Candy Rounds</h2>
          {(sessions.length > 0 || !progressMessage) && (
            <SessionTimeline
              sessions={sessions.slice(0, 5)}
              isProgressLoading={isProgressLoading}
              emptyTitle="Your candy trail starts here."
              emptyMessage="Play one round to start collecting candies."
            />
          )}
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
          </div>
          <h1 className="page-title">All Candy Rounds</h1>
          {isProgressLoading && (
            <FriendlyState tone="loading" title={progressLoadingMessage} message="Checking every candy round." />
          )}
          {progressMessage && (
            <FriendlyState tone="error" title="Progress is taking a break." message={progressMessage} />
          )}
          <div className="timeline-scroll">
            {(sessions.length > 0 || !progressMessage) && (
              <SessionTimeline
                sessions={sessions}
                isProgressLoading={isProgressLoading}
                emptyTitle="No candy rounds yet."
                emptyMessage="Your full candy history will appear after your first saved round."
              />
            )}
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
          <h1 className="page-title setup-title">Pick Your Round</h1>
          <SetupRecommendation
            recommendation={setupRecommendation}
            practiceSummary={recentPracticeSummary}
          />

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

          <p className="section-label">Which Operation?</p>
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
          <p className="helper setup-helper">No operation picked? We will mix them all together.</p>

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
          <p className="helper setup-helper">No number size picked? We will mix all digits for extra fun.</p>

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
            <div className={`stat candy-stat ${answerEffect.tone === 'good' ? 'candy-earned' : ''}`}>
              <div className="stat-content">
                <CandyIcon />
                <div>
                  <span className="stat-label">Candies</span>
                  <span className="stat-value">{currentSession.candies}</span>
                </div>
              </div>
            </div>
            <div className="stat question-stat">
              <div className="stat-content">
                <QuestionIcon />
                <div>
                  <span className="stat-label">Questions</span>
                  <span className="stat-value">{currentSession.questionsAttempted}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="question-wrap">
            <div className="question">{currentSession.currentQuestion.prompt}</div>
            <form className="answer-row" onSubmit={handleSubmitAnswer}>
              <input
                ref={answerInputRef}
                className={`answer ${answerEffect.tone === 'try' ? 'answer-shake' : ''}`}
                type="number"
                inputMode={usesOnScreenKeypad ? 'none' : 'numeric'}
                autoComplete="off"
                aria-label="Answer"
                readOnly={usesOnScreenKeypad}
                disabled={isAnswerLocked}
                value={answer}
                onChange={(event) => {
                  setAnswer(event.target.value)
                }}
              />
              <button className="submit" type="submit" disabled={isAnswerLocked}>
                Submit
              </button>
            </form>
            {answerEffect.tone === 'good' && <CandyBurst key={answerEffect.id} />}
            <p className={`feedback ${feedback.tone}`}>{feedback.text}</p>
            {usesOnScreenKeypad && <NumberPad onPress={handleKeypadPress} />}
          </div>
        </section>
      )}

      {screen === 'result' && resultSession && (
        <section className="card result-card" aria-live="polite">
          {shouldShowConfetti(resultSession) && <ConfettiRain />}
          <div className="progress-actions">
            <button className="small-button" type="button" onClick={goHome}>
              Home
            </button>
          </div>
          <h1 className="end-title">{getEndMessage(resultSession)}</h1>
          <div className="candies-big">
            <strong>{resultSession.candies}</strong>
            <span>{resultSession.candies === 1 ? ' candy collected' : ' candies collected'}</span>
          </div>
          <div className="end-stats">
            <div className="end-stat end-stat-questions">Questions: {resultSession.questionsAttempted}</div>
            <div className="end-stat end-stat-correct">Correct: {resultSession.correctAnswers}</div>
          </div>
          {saveMessage && (
            <FriendlyState
              tone={saveMessage.includes('could not') ? 'error' : saveMessage.includes('Saving') ? 'loading' : 'empty'}
              title={
                saveMessage.includes('could not')
                  ? 'Saving took a break.'
                  : saveMessage.includes('Saving')
                    ? 'Saving your candies...'
                    : 'Candies saved.'
              }
              message={
                saveMessage.includes('could not')
                  ? saveMessage
                  : saveMessage.includes('Saving')
                    ? 'Your candy round is heading to your progress.'
                    : 'Your progress is ready for next time.'
              }
            />
          )}
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

function MathSprinkles() {
  return (
    <div className="math-sprinkles" aria-hidden="true">
      <span>+</span>
      <span>−</span>
      <span>×</span>
      <span>÷</span>
      <span>=</span>
      <span>?</span>
    </div>
  )
}

function ConfettiRain() {
  return (
    <div className="confetti-rain" aria-hidden="true">
      {Array.from({ length: 28 }, (_, index) => (
        <span key={index}></span>
      ))}
    </div>
  )
}

function UserAvatar({ user }) {
  const photoURL = user?.photoURL || ''
  const shouldUseGooglePhoto =
    photoURL &&
    !photoURL.includes('googleusercontent.com/a/') &&
    !photoURL.includes('googleusercontent.com/oa/')

  return (
    <div className="home-avatar" aria-label="Player profile">
      {shouldUseGooglePhoto ? (
        <img src={photoURL} alt="" referrerPolicy="no-referrer" />
      ) : (
        <img src="/owl-avatar-512.png" alt="" />
      )}
    </div>
  )
}

function NumberPad({ onPress }) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'minus', '0', 'backspace']

  return (
    <div className="number-pad" aria-label="On-screen number pad">
      {keys.map((key) => (
        <button
          className={`number-pad-key ${key.length > 1 ? 'number-pad-action' : ''}`}
          type="button"
          key={key}
          onClick={() => onPress(key)}
          aria-label={key === 'minus' ? 'Minus sign' : key === 'backspace' ? 'Delete digit' : key}
        >
          {key === 'minus' ? '-' : key === 'backspace' ? '⌫' : key}
        </button>
      ))}
    </div>
  )
}

function CandyBurst() {
  return (
    <div className="candy-burst" aria-hidden="true">
      <CandyIcon />
      <span></span>
      <span></span>
      <span></span>
      <span></span>
    </div>
  )
}

function BrandMark({ className }) {
  return (
    <div className={className}>
      <img src="/logo.png" alt="" />
      <span>Fun with Math</span>
    </div>
  )
}

function SetupRecommendation({ recommendation, practiceSummary }) {
  if (!recommendation.hasData) {
    return <p className="setup-recommendation-empty">{recommendation.text}</p>
  }

  return (
    <details className="setup-recommendation">
      <summary>
        <span>Need a practice idea?</span>
        <span className="setup-recommendation-toggle" aria-hidden="true">+</span>
      </summary>
      <p>
        {recommendation.intro}
        <strong>{recommendation.highlight}</strong>
        {recommendation.outro}
      </p>
      <h2>In the last 5 sessions:</h2>
      <StatChipGroup
        label="Operations"
        stats={practiceSummary.operationStats}
        items={recommendation.operationItems}
        display="percent"
      />
      <StatChipGroup
        label="Number size"
        stats={practiceSummary.digitStats}
        items={recommendation.digitItems}
        display="percent"
      />
    </details>
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

function SessionTimeline({
  sessions,
  isProgressLoading,
  emptyTitle = 'Your candy trail starts here.',
  emptyMessage = 'Play a round to start collecting candies.',
}) {
  if (sessions.length === 0 && !isProgressLoading) {
    return <FriendlyState tone="empty" title={emptyTitle} message={emptyMessage} />
  }

  return (
    <div className="candy-timeline">
      {sessions.map((session, index) => (
        <details className="session-card" key={session.id}>
          <summary className="session-summary">
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
                <span className="round-toggle" aria-hidden="true">⌄</span>
              </div>
            </div>
          </summary>
          <div className="round-details">
            {hasTrackedStats(session.operationStats) || hasTrackedStats(session.digitStats) ? (
              <>
                <StatChipGroup
                  label="Operations"
                  stats={session.operationStats}
                  items={operationKeys.map((operation) => ({
                    key: operation,
                    label: operations[operation].symbol,
                  }))}
                />
                <StatChipGroup
                  label="Number size"
                  stats={session.digitStats}
                  items={digitOptions.map((digits) => ({
                    key: String(digits),
                    label: String(digits),
                  }))}
                />
              </>
            ) : (
              <p className="round-details-empty">Detailed stats start with your next saved round.</p>
            )}
          </div>
        </details>
      ))}
    </div>
  )
}

function FriendlyState({ tone = 'empty', title, message }) {
  return (
    <div className={`friendly-state friendly-state-${tone}`} role={tone === 'error' ? 'status' : undefined}>
      <CandyIcon />
      <div>
        <strong>{title}</strong>
        <span>{message}</span>
      </div>
    </div>
  )
}

function StatChipGroup({ label, stats, items, display = 'count' }) {
  return (
    <div className="stat-chip-group">
      <span className="stat-chip-label">{label}</span>
      <div className="stat-chip-row">
        {items.map((item) => (
          <StatChip key={item.key} label={item.label} stat={stats?.[item.key]} display={display} />
        ))}
      </div>
    </div>
  )
}

function StatChip({ label, stat, display = 'count' }) {
  const attempted = Number(stat?.attempted || 0)
  const correct = Number(stat?.correct || 0)
  const percent = getPercent(stat)
  const tone = percent === null ? 'empty' : percent < 70 ? 'weak' : percent < 85 ? 'watch' : 'strong'
  const value = display === 'percent' ? `${percent}%` : `${correct}/${attempted}`

  return (
    <div className={`stat-chip ${tone}`}>
      <span>{label}</span>
      <strong>{attempted === 0 ? '-' : value}</strong>
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

function CandyIcon() {
  return (
    <svg className="counter-icon candy-icon" viewBox="0 0 48 48" aria-hidden="true">
      <path d="M8 17 2 12v24l6-5 6 4V13l-6 4Z"></path>
      <path d="M40 17 46 12v24l-6-5-6 4V13l6 4Z"></path>
      <circle cx="24" cy="24" r="13"></circle>
      <path d="M15 24c4-2 7-5 9-13M24 37c1-7 4-11 13-13M12 18c8 1 13 6 18 18"></path>
    </svg>
  )
}

function QuestionIcon() {
  return (
    <svg className="counter-icon question-icon" viewBox="0 0 48 48" aria-hidden="true">
      <rect x="8" y="7" width="32" height="34" rx="8"></rect>
      <path d="M17 18h14M17 26h9M17 34h14"></path>
      <circle cx="33" cy="13" r="6"></circle>
      <path d="M33 10v3l2 1"></path>
    </svg>
  )
}

export default App
