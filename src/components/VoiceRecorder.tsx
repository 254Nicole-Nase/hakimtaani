import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { transcribeQuestion } from "@/lib/voice.functions";
import { Mic, Square, Loader2 } from "lucide-react";

type Props = {
  onTranscript: (text: string) => void;
  onError: (message: string) => void;
  disabled?: boolean;
};

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = ["audio/webm", "audio/mp4", "audio/ogg"];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t));
}

function formatFromMime(mime: string): "webm" | "m4a" | "ogg" {
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}

export function VoiceRecorder({ onTranscript, onError, disabled }: Props) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const transcribe = useServerFn(transcribeQuestion);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        setBusy(true);
        try {
          const type = recorder.mimeType || mimeType || "audio/webm";
          const blob = new Blob(chunks, { type });
          const buffer = new Uint8Array(await blob.arrayBuffer());
          let binary = "";
          for (let i = 0; i < buffer.length; i += 1) binary += String.fromCharCode(buffer[i]!);
          const base64 = btoa(binary);
          const { transcript } = await transcribe({
            data: { audioBase64: base64, format: formatFromMime(type) },
          });
          if (transcript) onTranscript(transcript);
          else onError("I could not hear a question in that recording. Try again closer to the mic.");
        } catch {
          onError("Could not transcribe that recording. Please type your question instead.");
        } finally {
          setBusy(false);
        }
      };

      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      onError("Microphone access was blocked. Allow the mic or type your question.");
    }
  }

  function stop() {
    recorderRef.current?.stop();
    recorderRef.current = null;
  }

  return (
    <Button
      type="button"
      size="icon"
      variant={recording ? "destructive" : "outline"}
      className="shrink-0"
      disabled={disabled || busy}
      aria-label={recording ? "Stop recording" : "Ask by voice in English or Kiswahili"}
      title={recording ? "Stop recording" : "Ask by voice — English, Kiswahili or Sheng"}
      onClick={() => (recording ? stop() : void start())}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : recording ? (
        <Square className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </Button>
  );
}
