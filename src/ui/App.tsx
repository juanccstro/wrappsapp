import { lazy, Suspense, useCallback, useState } from 'react';
import { createAudioPlayer, readMutePreference, saveMutePreference } from '../audio/player';
import { PhoneFrame } from './components/Shell';
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

export function App() {
  const { screen, goUpload, goPrivacy, loadFile, loadDemo, start, reset } = useWrappsapp();
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
          onDemo={() => {
            // Sound may only start from a tap: unlock it here, play it when the story opens.
            audio.unlock();
            void loadStory();
            void loadDemo();
          }}
        />
      )}
      {screen.name === 'privacy' && <Privacy onBack={reset} />}
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
            audio.unlock();
            void start(period);
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
            audio={audio}
            muted={muted}
            onToggleMute={toggleMute}
            onClose={reset}
          />
        </Suspense>
      )}
    </PhoneFrame>
  );
}
