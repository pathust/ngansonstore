import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSpeechRecognition } from './voiceRecognition';

// Minimal fake SpeechRecognition matching the subset of the Web Speech API createSpeechRecognition
// actually uses. Lets tests fire synthetic onresult events with a hand-crafted `results` array to
// reproduce device-specific quirks (Android WebViews are known to sometimes re-deliver
// already-finalized result entries in a later event instead of only appending new ones).
class FakeSpeechRecognition {
  lang = '';
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  onresult: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();
}

function makeResult(transcript: string, isFinal: boolean) {
  const alt = { transcript };
  const result: any = [alt];
  result.isFinal = isFinal;
  return result;
}

describe('createSpeechRecognition — transcript accumulation', () => {
  let fakeInstance: FakeSpeechRecognition;

  beforeEach(() => {
    fakeInstance = new FakeSpeechRecognition();
    // Must be a regular function (not an arrow function) so `new SpeechRecognition()` can
    // actually construct it — arrow functions aren't constructable and would throw, silently
    // swallowed by createSpeechRecognition's own try/catch, leaving onresult unassigned.
    (window as any).SpeechRecognition = vi.fn(function () {
      return fakeInstance;
    });
    // Ensure no TTS-speaking short-circuit interferes with these tests.
    (window as any).speechSynthesis = { speaking: false, cancel: vi.fn(), speak: vi.fn() };
  });

  afterEach(() => {
    delete (window as any).SpeechRecognition;
    delete (window as any).speechSynthesis;
  });

  it('không lặp lại tiền tố khi event sau lặp lại các kết quả đã final trước đó (lỗi Android WebView)', () => {
    const onResult = vi.fn();
    createSpeechRecognition(onResult, vi.fn(), vi.fn());

    // Event 1: "Xin" vừa được final hoá ở index 0.
    fakeInstance.onresult!({ results: [makeResult('Xin', true)] });

    // Event 2 (lỗi thiết bị): server/engine trả lại index 0 ("Xin") LẦN NỮA thay vì chỉ thêm mới,
    // cộng thêm 1 kết quả final mới ở index 1 ("chào").
    fakeInstance.onresult!({
      results: [makeResult('Xin', true), makeResult('chào', true)],
    });

    // Event 3: lặp lại y hệt 2 kết quả cũ, thêm 1 kết quả final mới ở index 2.
    fakeInstance.onresult!({
      results: [makeResult('Xin', true), makeResult('chào', true), makeResult('tôi muốn', true)],
    });

    const allTranscripts = onResult.mock.calls.map((call) => call[0] as string);
    const finalTranscript = allTranscripts[allTranscripts.length - 1];

    // Phải là "Xin chào tôi muốn" — KHÔNG được là "Xin Xin chào Xin chào tôi muốn" (lặp tiền tố).
    expect(finalTranscript).toBe('Xin chào tôi muốn');
    expect(finalTranscript.match(/Xin/g)?.length).toBe(1);
    expect(finalTranscript.match(/chào/g)?.length).toBe(1);
  });

  it('vẫn cập nhật đúng phần interim (chưa final) đang thay đổi liên tục', () => {
    const onResult = vi.fn();
    createSpeechRecognition(onResult, vi.fn(), vi.fn());

    fakeInstance.onresult!({ results: [makeResult('xin', false)] });
    fakeInstance.onresult!({ results: [makeResult('xin chào', false)] });
    fakeInstance.onresult!({ results: [makeResult('xin chào bạn', true)] });

    const allTranscripts = onResult.mock.calls.map((call) => call[0] as string);
    expect(allTranscripts).toEqual(['xin', 'xin chào', 'xin chào bạn']);
  });
});
