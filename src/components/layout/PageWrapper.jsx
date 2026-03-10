import { Header } from './Header'
import { BottomNav } from './BottomNav'
import { Ticker } from './Ticker'

export function PageWrapper({ children, showTicker = false }) {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Header />
      {showTicker && <Ticker />}
      <main className="flex-1 pb-20 page-enter">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
