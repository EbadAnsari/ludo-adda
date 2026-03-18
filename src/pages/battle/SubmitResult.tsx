import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { updateBattle, getBattle } from '../../firebase/firestore'
import { uploadScreenshot } from '../../firebase/storage'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { Button } from '../../components/ui/Button'
import { UploadZone } from '../../components/ui/UploadZone'
import { formatAmount } from '../../utils/currency'
import { CheckCircle, XCircle, Star, AlertTriangle } from 'lucide-react'

export default function SubmitResult() {
  const { battleId } = useParams()
  const { user } = useAuthStore()
  const [choice, setChoice] = useState(null) // 'won' | 'lost'
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [resultState, setResultState] = useState(null) // 'won' | 'lost' | 'disputed'
  const navigate = useNavigate()

  const submit = async () => {
    setLoading(true)
    try {
      const snap = await getBattle(battleId)
      const battle = snap.data()
      const isCreator = battle.creatorId === user.uid
      const field = isCreator ? 'creatorResult' : 'joinerResult'

      const updates = { [field]: choice }

      if (choice === 'won' && file) {
        const url = await uploadScreenshot(battleId, user.uid, file)
        updates.winnerScreenshot = url
      }

      await updateBattle(battleId, updates)
      setSubmitted(true)

      // Determine display result
      const otherResult = isCreator ? battle.joinerResult : battle.creatorResult
      if (otherResult) {
        if (
          (choice === 'won' && otherResult === 'lost') ||
          (choice === 'lost' && otherResult === 'won')
        ) setResultState(choice)
        else setResultState('disputed')
      } else {
        setResultState(choice)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (submitted && resultState === 'won') return (
    <PageWrapper>
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 gap-5 page-enter">
        <CheckCircle size={56} className="text-green" />
        <div className="text-center">
          <h2 className="font-display font-bold text-2xl text-text1">Match Won</h2>
          <p className="text-text3 text-sm mt-1">Result submitted. Awaiting verification.</p>
        </div>
        <Button variant="primary" className="w-full" onClick={() => navigate('/home')}>Continue</Button>
      </div>
    </PageWrapper>
  )

  if (submitted && resultState === 'lost') return (
    <PageWrapper>
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 gap-5 page-enter">
        <XCircle size={56} className="text-text3" />
        <div className="text-center">
          <h2 className="font-display font-bold text-2xl text-text2">Match Lost</h2>
          <p className="text-text3 text-sm mt-1">Better luck next time</p>
        </div>
        <Button variant="outline" className="w-full" onClick={() => navigate('/home')}>Back to Home</Button>
      </div>
    </PageWrapper>
  )

  if (submitted && resultState === 'disputed') return (
    <PageWrapper>
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 gap-5 page-enter">
        <AlertTriangle size={56} className="text-amber" />
        <div className="text-center">
          <h2 className="font-display font-bold text-2xl text-text1">Under Review</h2>
          <p className="text-text3 text-sm mt-1">Admin will resolve within 24 hours</p>
        </div>
        <Button variant="outline" className="w-full" onClick={() => navigate('/home')}>Back to Home</Button>
      </div>
    </PageWrapper>
  )

  return (
    <PageWrapper>
      <div className="px-4 pt-4 space-y-5 pb-6">
        <h1 className="font-display font-bold text-xl text-text1">Match Result</h1>
        <p className="text-text3 text-xs">Select the outcome of your match honestly. Both players must submit their result.</p>

        {!choice && (
          <div className="space-y-3">
            <button
              onClick={() => setChoice('won')}
              className="btn-press w-full bg-surface border border-green/30 bg-green/5 rounded-[8px] p-4 flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-green/20 flex items-center justify-center shrink-0">
                <Star size={16} className="text-green" />
              </div>
              <span className="font-display font-semibold text-green text-sm">I Won This Match</span>
            </button>
            <button
              onClick={() => setChoice('lost')}
              className="btn-press w-full bg-surface border border-border rounded-[8px] p-4 flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-surface2 flex items-center justify-center shrink-0">
                <XCircle size={16} className="text-text3" />
              </div>
              <span className="font-display font-semibold text-text2 text-sm">I Lost This Match</span>
            </button>
          </div>
        )}

        {choice === 'won' && (
          <div className="space-y-4">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-text3 font-semibold mb-2">Upload Match Screenshot</p>
              <UploadZone onFile={setFile} />
            </div>
            <Button variant="primary" className="w-full" disabled={!file} loading={loading} onClick={submit}>
              Submit Result
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setChoice(null)}>Cancel</Button>
          </div>
        )}

        {choice === 'lost' && (
          <div className="bg-surface border border-border rounded-[8px] p-4 space-y-3">
            <h3 className="font-display font-semibold text-text1">Confirm Loss?</h3>
            <p className="text-text3 text-xs">By confirming, you acknowledge that you lost this match. This action cannot be undone.</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" loading={loading} onClick={submit}>Yes, I Lost</Button>
              <Button variant="ghost" className="flex-1" onClick={() => setChoice(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
