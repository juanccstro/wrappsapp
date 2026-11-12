import { useCallback, useState } from 'react';
import { createAudioPlayer, readMutePreference, saveMutePreference } from '../audio/player';
import { PhoneFrame } from './components/Shell';
import { Landing } from './landing/Landing';
import { Loading } from './loading/Loading';
import { PeriodSelect } from './period/PeriodSelect';
import { StoryPlayer } from './story/StoryPlayer';
import { Upload } from './upload/Upload';
import { useWrappsapp } from './useWrappsapp';

export function App() {
  const { screen, goUpload, loadFile, loadDemo, start, reset } = useWrappsapp();
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
          onDemo={() => {
            // Sound may only start from a tap: unlock it here, play it when the story opens.
            audio.unlock();
            void loadDemo();
          }}
        />
      )}
      {screen.name === 'upload' && <Upload error={screen.error} onFile={loadFile} onBack={reset} />}
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
        <StoryPlayer
          key={screen.wrapped.seed}
          wrapped={screen.wrapped}
          isDemo={screen.isDemo}
          audio={audio}
          muted={muted}
          onToggleMute={toggleMute}
          onClose={reset}
        />
      )}
    </PhoneFrame>
  );
}
