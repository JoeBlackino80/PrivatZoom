/**
 * LiveKit implementácia ICallTransport — E2EE hovory, self-hosted, žiadne
 * poplatky za minútu. Na transport ide LEN už zaclonený MediaStream z engine.
 *
 * Access token (JWT) sa generuje na serveri (LiveKit secret nikdy nie je v
 * klientovi) → adaptér ho získa cez injektovaný `tokenProvider`.
 */
import {
  Room,
  RoomEvent,
  ExternalE2EEKeyProvider,
  type RemoteTrack,
  type RemoteTrackPublication,
  type RemoteParticipant as LKParticipant,
} from 'livekit-client';
import type { ICallTransport, RemoteParticipant } from '@zavoj/rooms';

export interface LiveKitConfig {
  /** wss URL LiveKit servera (tvoja infra). */
  url: string;
  /** Vráti access token pre danú miestnosť (zo servera). */
  tokenProvider: (roomId: string) => Promise<string>;
  /** E2EE passphrase — keď je daná spolu s workerom, zapne sa E2EE. */
  e2eePassphrase?: string;
  /** E2EE worker (vyžaduje LiveKit pre šifrovanie). */
  e2eeWorker?: Worker;
}

export class LiveKitTransport implements ICallTransport {
  private room: Room;
  readonly e2ee: boolean;
  private readonly tokenProvider: (roomId: string) => Promise<string>;
  private readonly url: string;

  constructor(cfg: LiveKitConfig) {
    this.url = cfg.url;
    this.tokenProvider = cfg.tokenProvider;
    this.e2ee = Boolean(cfg.e2eePassphrase && cfg.e2eeWorker);

    if (this.e2ee) {
      const keyProvider = new ExternalE2EEKeyProvider();
      void keyProvider.setKey(cfg.e2eePassphrase as string);
      this.room = new Room({
        e2ee: { keyProvider, worker: cfg.e2eeWorker as Worker },
      });
    } else {
      this.room = new Room();
    }
  }

  async connect(roomId: string, anonymizedStream: MediaStream): Promise<void> {
    const token = await this.tokenProvider(roomId);
    if (this.e2ee) await this.room.setE2EEEnabled(true);
    await this.room.connect(this.url, token);
    // publikuj LEN zaclonený výstup z engine
    for (const track of anonymizedStream.getTracks()) {
      await this.room.localParticipant.publishTrack(track);
    }
  }

  async disconnect(): Promise<void> {
    await this.room.disconnect();
  }

  onParticipant(cb: (p: RemoteParticipant) => void): void {
    this.room.on(RoomEvent.ParticipantConnected, (p: LKParticipant) => {
      cb(toRemote(p));
    });
  }

  onRemoteTrack(cb: (p: RemoteParticipant, track: MediaStreamTrack) => void): void {
    this.room.on(
      RoomEvent.TrackSubscribed,
      (track: RemoteTrack, _pub: RemoteTrackPublication, participant: LKParticipant) => {
        if (track.mediaStreamTrack) cb(toRemote(participant), track.mediaStreamTrack);
      },
    );
  }
}

function toRemote(p: LKParticipant): RemoteParticipant {
  return p.name ? { id: p.identity, displayName: p.name } : { id: p.identity };
}
