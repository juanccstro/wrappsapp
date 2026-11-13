import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { createAudioPlayer, readMutePreference, saveMutePreference } from '../audio/player';
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
    reset,
  } = useWrappsapp();
  const billing = useBilling();
  const [paywall, setPaywall] = useState<PaywallView | null>(null);
  const [paywallError, setPaywallError] = useState<string>();

  // Back from the Stripe page: show how it went.
  const { returned, clearReturned } = billing;
  useEffect(() => {
    if (!returned) return;
    setPaywall(returned);
    clearReturned();
  }, [returned, clearReturned]);

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
          onStart={() => (billing.exhausted ? setPaywall('limit') : goUpload())}
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
            const { chatKey } = screen.summary;
            void billing.consume(chatKey).then((result) => {
              if (result === 'ok') void start(period);
              else if (result === 'blocked') setPaywall('limit');
              else {
                setPaywallError('check');
                setPaywall('error');
              }
            });
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
            startAtEnd={screen.atEnd}
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
        onCheckout={billing.checkout}
        onRestore={billing.restore}
        onTerms={() => {
          setPaywall(null);
          goTerms();
        }}
      />
    </PhoneFrame>
  );
}
