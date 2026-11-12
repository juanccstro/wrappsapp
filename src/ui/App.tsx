import { PhoneFrame } from './components/Shell';
import { Landing } from './landing/Landing';
import { Loading } from './loading/Loading';
import { PeriodSelect } from './period/PeriodSelect';
import { StoryPlayer } from './story/StoryPlayer';
import { Upload } from './upload/Upload';
import { useWrappsapp } from './useWrappsapp';

export function App() {
  const { screen, goUpload, loadFile, loadDemo, start, reset } = useWrappsapp();

  return (
    <PhoneFrame>
      {screen.name === 'landing' && <Landing onStart={goUpload} onDemo={loadDemo} />}
      {screen.name === 'upload' && <Upload error={screen.error} onFile={loadFile} onBack={reset} />}
      {screen.name === 'loading' && <Loading />}
      {screen.name === 'period' && (
        <PeriodSelect
          summary={screen.summary}
          onStart={(period) => start(period)}
          onDiscard={reset}
        />
      )}
      {screen.name === 'story' && (
        <StoryPlayer
          key={screen.wrapped.seed}
          wrapped={screen.wrapped}
          isDemo={screen.isDemo}
          onClose={reset}
        />
      )}
    </PhoneFrame>
  );
}
