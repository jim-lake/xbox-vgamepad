import React from 'react';
import { StyleSheet, Text, View } from '@/components/base_components';
import TextButton from '@/components/buttons/text_button';
import SectionHeader from '@/components/popup/section-header';
import { sendStartFindSprites } from './messaging';
import { errorLog } from '@/tools/log';

type ModelState =
  | 'checking'
  | 'unsupported'
  | 'unavailable'
  | 'downloadable'
  | 'downloading'
  | 'ready'
  | 'error';

const styles = StyleSheet.create({
  section: { padding: '0.8rem', flexDirection: 'column' },
  row: {
    paddingTop: '0.5rem',
    paddingBottom: '0.5rem',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: { color: 'var(--text-muted)', fontSize: '1.3rem' },
  progressBar: {
    height: '4px',
    borderRadius: '2px',
    backgroundColor: 'var(--row-border)',
    marginTop: '0.4rem',
  },
  progressFill: {
    height: '100%',
    borderRadius: '2px',
    backgroundColor: 'var(--accent)',
  },
});

function getInitialState(): ModelState {
  if (typeof LanguageModel === 'undefined') {
    return 'unsupported';
  }
  return 'checking';
}

export default function FindSpritesSection() {
  const [modelState, setModelState] =
    React.useState<ModelState>(getInitialState);
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    if (modelState !== 'checking') {
      return;
    }
    let cancelled = false;
    void LanguageModel.availability({
      expectedInputs: [{ type: 'image' }, { type: 'text', languages: ['en'] }],
      expectedOutputs: [{ type: 'text', languages: ['en'] }],
    }).then((avail) => {
      if (cancelled) {
        return;
      }
      if (avail === 'unavailable') {
        setModelState('unavailable');
      } else if (avail === 'downloadable') {
        setModelState('downloadable');
      } else if (avail === 'downloading') {
        setModelState('downloading');
      } else {
        setModelState('ready');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [modelState]);

  async function ensureReady(): Promise<void> {
    setModelState('downloading');
    try {
      const session = await LanguageModel.create({
        expectedInputs: [
          { type: 'image' },
          { type: 'text', languages: ['en'] },
        ],
        expectedOutputs: [{ type: 'text', languages: ['en'] }],
        monitor(m: EventTarget) {
          m.addEventListener('downloadprogress', (e: Event) => {
            const pe = e as ProgressEvent;
            if (pe.total > 0) {
              setProgress(pe.loaded / pe.total);
            }
          });
        },
      });
      session.destroy();
      setModelState('ready');
    } catch (e) {
      errorLog('ensureReady: model create failed', e);
      setModelState('error');
    }
  }

  async function onFindSprites(): Promise<void> {
    await sendStartFindSprites();
    window.close();
  }

  function renderContent() {
    switch (modelState) {
      case 'checking':
        return <Text style={styles.label}>Checking AI model…</Text>;
      case 'unsupported':
      case 'unavailable':
        return (
          <Text style={styles.label}>
            Requires Chrome Canary + Gemini Nano flags
          </Text>
        );
      case 'downloadable':
        return (
          <TextButton
            text='Download AI model (~1.5 GB)'
            onPress={() => void ensureReady()}
          />
        );
      case 'downloading':
        return (
          <View>
            <Text style={styles.label}>
              Downloading… {Math.round(progress * 100)}%
            </Text>
            <View style={styles.progressBar}>
              <View
                style={{
                  ...styles.progressFill,
                  width: `${String(Math.round(progress * 100))}%`,
                }}
              />
            </View>
          </View>
        );
      case 'ready':
        return (
          <TextButton
            text='Find Sprites'
            onPress={() => void onFindSprites()}
          />
        );
      case 'error':
        return (
          <View>
            <Text style={styles.label}>Model error</Text>
            <TextButton text='Retry' onPress={() => void ensureReady()} />
          </View>
        );
    }
  }

  return (
    <View style={styles.section}>
      <SectionHeader title='Sprite Extraction' />
      <View style={styles.row}>{renderContent()}</View>
    </View>
  );
}
