import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { createAudioPlayer, readMutePreference, saveMutePreference } from '../audio/player';
import type { Product } from '../billing/api';
import { captureInvite, inviteUrl } from '../billing/invite';
import { es } from '../i18n/es';
import { encodeShared, hasSharedHash, sendLink, sharedFrom } from './share/groupLink';
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

const SharedView = lazy(() =>
  import('./shared/SharedView').then((m) => ({ default: m.SharedView })),
);

/** Read once per page load: the URL is cleaned as soon as the app starts. */
const RETURNING_FROM_PAYMENT = new URLSearchParams(window.location.search).has('checkout');
/** Opened from a link sent to a group: "#w=…" holds that group's podium and cards. */
const SHARED_HASH = hasSharedHash(window.location.hash) ? window.location.hash : null;
// Came through someone's link: remember their invite code (and tidy the address).
captureInvite();

const INVITE_SEEN = 'wr_invite_seen';

/** A short message at the top that goes away by itself. */
function Toast({ text, onDone }: { text: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!text) return;
    const timer = setTimeout(onDone, 6000);
    return () => clearTimeout(timer);
  }, [text, onDone]);
  if (!text) return null;
  return (
    <button
      type="button"
      role="status"
      onClick={onDone}
      className="absolute inset-x-4 top-[max(0.75rem,env(safe-area-inset-top))] z-[60] cursor-pointer rounded-2xl border border-white/15 bg-[#12062b]/95 px-4 py-3 text-left text-sm font-semibold shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-md"
    >
      {text}
    </button>
  );
}

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

  const [sharedHash, setSharedHash] = useState(SHARED_HASH);
  const [toast, setToast] = useState<string | null>(null);
  const clearToast = useCallback(() => setToast(null), []);

  // Someone made their Wrapped through this device's link: say so once, with the progress.
  const invite = billing.status?.invite;
  useEffect(() => {
    if (!invite) return;
    try {
      const seen = localStorage.getItem(INVITE_SEEN);
      localStorage.setItem(INVITE_SEEN, `${invite.friends}:${invite.earned}`);
      if (seen === null) return;
      const [friends = 0, earned = 0] = seen.split(':').map(Number);
      if (invite.earned > earned) setToast(es.invite.toastEarned);
      else if (invite.friends > friends) {
        setToast(es.invite.toastFriend(invite.progress, invite.needed));
      }
    } catch {
      // Storage blocked: no message, the progress is still in the plans.
    }
  }, [invite]);

  /**
   * "Invitar" in the plans: from a Wrapped, its group link (the most convincing invite);
   * anywhere else, the web with this device's code.
   */
  const sendInvite = async (): Promise<string | null> => {
    try {
      const code = billing.status?.invite?.code;
      const onWrapped = screen.name === 'story' || screen.name === 'report';
      const result = onWrapped
        ? await sendLink(
            inviteUrl(code, await encodeShared(sharedFrom(screen.wrapped, screen.unlocked))),
            es.share.linkText(screen.wrapped.chatName),
          )
        : await sendLink(inviteUrl(code), es.invite.shareText);
      return result === 'copied'
        ? es.share.linkCopied
        : result === 'error'
          ? es.share.linkError
          : null;
    } catch {
      return es.share.linkError;
    }
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

  if (sharedHash) {
    return (
      <PhoneFrame>
        <Suspense fallback={<Loading />}>
          <SharedView
            hash={sharedHash}
            onMakeYours={() => {
              window.history.replaceState(null, '', window.location.pathname);
              setSharedHash(null);
              goUpload();
            }}
          />
        </Suspense>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <Toast text={toast} onDone={clearToast} />
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
            inviteCode={billing.status?.invite?.code}
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
        onInvite={sendInvite}
        onRestore={billing.restore}
        onTerms={() => {
          setPaywall(null);
          goTerms();
        }}
      />
    </PhoneFrame>
  );
}
