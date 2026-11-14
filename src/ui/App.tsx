import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { createAudioPlayer, readMutePreference, saveMutePreference } from '../audio/player';
import type { Product } from '../billing/api';
import { savePendingChat, takePendingChat, type PendingChat } from '../billing/pendingChat';
import { useBilling } from '../billing/useBilling';
import { Paywall, type PaywallView } from './billing/Paywall';
import { UsageBadge } from './billing/UsageBadge';
import { PhoneFrame } from './components/Shell';
import { Terms } from './legal/Terms';
import { Landing } from './landing/Landing';
import { Loading } from './loading/Loading';
import { PeriodSelect } from './period/PeriodSelect';
import { Privacy } from './privacy/Privacy';
import { Upload } from './upload/Upload';
import { useWrappsapp } from './useWrappsapp';

// The stories (slides, charts, export) are most of the code and are not needed to paint the
// landing: they load while the chat is being analysed.
const loadStory = () => import('./story/StoryPlayer');
const StoryPlayer = lazy(() => loadStory().then((m) => ({ default: m.StoryPlayer })));
const Report = lazy(() => import('./report/Report').then((m) => ({ default: m.Report })));

/** Read once per page load: the URL is cleaned as soon as the app starts. */
const RETURNING_FROM_PAYMENT = new URLSearchParams(window.location.search).has('checkout');

/** The chat kept before paying, taken (and deleted) once per page load. */
let pendingOnce: Promise<PendingChat | null> | null = null;
const pendingChat = () => (pendingOnce ??= takePendingChat());

export function App() {
  const {
    screen,
    goUpload,
    goPrivacy,
    goTerms,
    loadFile,
    loadDemo,
    start,
    openReport,
    backToStory,
    markUnlocked,
    currentChat,
    chatText,
    resumeChat,
    reset,
  } = useWrappsapp();
  const billing = useBilling();
  const [paywall, setPaywall] = useState<PaywallView | null>(null);
  const [paywallError] = useState<string>();

  const [unlocking, setUnlocking] = useState(false);
  /** Slide where the visitor tapped a lock: the story comes back there after paying. */
  const unlockAt = useRef(0);

  // A chat kept for a payment that was never finished is not kept any longer.
  useEffect(() => {
    if (!RETURNING_FROM_PAYMENT) void pendingChat();
  }, []);

  // Back from the Stripe page: bring back the chat that was on screen, unlock it if the
  // payment went through, and show how it went.
  const { returned, clearReturned, consume } = billing;
  useEffect(() => {
    if (!returned) return;
    clearReturned();
    void (async () => {
      const chat = await pendingChat();
      if (chat) {
        const summary = await resumeChat(chat.text, chat.fileName);
        if (summary) {
          const unlocked = returned !== 'cancel' && (await consume(summary.chatKey)) === 'ok';
          await start(chat.period, { unlocked, at: chat.at });
        }
      }
      setPaywall(returned);
    })();
  }, [returned, clearReturned, consume, resumeChat, start]);

  /** A lock was tapped: use what this device already has, or offer to pay. */
  const unlock = useCallback(
    async (at: number) => {
      const chat = currentChat();
      if (!chat) return;
      unlockAt.current = at;
      setUnlocking(true);
      const result = await consume(chat.chatKey);
      setUnlocking(false);
      if (result === 'ok') markUnlocked();
      else setPaywall('unlock');
    },
    [consume, currentChat, markUnlocked],
  );

  /** Paying leaves the page: keep the chat on screen (on this device) to come back to it. */
  const checkout = async (product: Product) => {
    const chat = currentChat();
    if (chat && (screen.name === 'story' || screen.name === 'report') && !screen.unlocked) {
      const text = await chatText().catch(() => null);
      if (text) {
        await savePendingChat({
          text,
          fileName: chat.fileName,
          period: chat.period,
          at: screen.name === 'report' ? 'report' : unlockAt.current,
        });
      }
    }
    return billing.checkout(product);
  };

  const showBadge =
    screen.name === 'landing' || screen.name === 'upload' || screen.name === 'period';
  const [audio] = useState(createAudioPlayer);
  const [muted, setMuted] = useState(readMutePreference);

  const toggleMute = useCallback(() => {
    setMuted((current) => {
      saveMutePreference(!current);
      return !current;
    });
  }, []);

  return (
    <PhoneFrame>
      {screen.name === 'landing' && (
        <Landing
          onStart={goUpload}
          onPrivacy={goPrivacy}
          onTerms={goTerms}
          onDemo={() => {
            // Sound may only start from a tap: unlock it here, play it when the story opens.
            audio.unlock();
            void loadStory();
            void loadDemo();
          }}
        />
      )}
      {screen.name === 'privacy' && <Privacy onBack={reset} />}
      {screen.name === 'terms' && <Terms onBack={reset} />}
      {screen.name === 'upload' && (
        <Upload
          error={screen.error}
          onFile={(file) => {
            void loadStory();
            void loadFile(file);
          }}
          onBack={reset}
        />
      )}
      {screen.name === 'loading' && <Loading />}
      {screen.name === 'period' && (
        <PeriodSelect
          summary={screen.summary}
          onStart={(period) => {
            // Sound may only start from a tap: unlock it now, before waiting for the server.
            audio.unlock();
            // Unlocked if it is the free chat, was unlocked before, or a purchase covers it;
            // otherwise it plays with some slides locked. If the check fails, it plays locked
            // and the lock checks again.
            const { chatKey } = screen.summary;
            void billing
              .consume(chatKey)
              .then((result) => start(period, { unlocked: result === 'ok' }));
          }}
          onDiscard={reset}
        />
      )}
      {screen.name === 'story' && (
        <Suspense fallback={<Loading />}>
          <StoryPlayer
            key={screen.wrapped.seed}
            wrapped={screen.wrapped}
            isDemo={screen.isDemo}
            startAt={screen.at}
            unlocked={screen.unlocked}
            onUnlock={(at) => void unlock(at)}
            unlocking={unlocking}
            onOpenReport={openReport}
            audio={audio}
            muted={muted}
            onToggleMute={toggleMute}
            onClose={reset}
          />
        </Suspense>
      )}
      {screen.name === 'report' && (
        <Suspense fallback={<Loading />}>
          <Report
            wrapped={screen.wrapped}
            analytics={screen.analytics}
            unlocked={screen.unlocked}
            onUnlock={() => void unlock(screen.wrapped.slides.length - 1)}
            unlocking={unlocking}
            onBack={backToStory}
            onClose={reset}
          />
        </Suspense>
      )}
      {showBadge && <UsageBadge status={billing.status} onOpen={() => setPaywall('more')} />}
      <Paywall
        view={paywall}
        status={billing.status}
        purchase={billing.purchase}
        errorCode={paywallError}
        onClose={() => setPaywall(null)}
        onCheckout={checkout}
        onRestore={billing.restore}
        onTerms={() => {
          setPaywall(null);
          goTerms();
        }}
      />
    </PhoneFrame>
  );
}
